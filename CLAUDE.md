# Sign2Chat — Full Project Handoff for Claude Code

## What This Project Is
A real-time UAE Sign Language recognition app.
A deaf user signs into a webcam → landmarks extracted → CNN+BiLSTM model
predicts the word → LLM smooths raw words into a natural sentence →
displayed in a chat interface + spoken via TTS.

---

## Project Structure

```
Sign2Chat/
├── UAE100/                          ← raw .mp4 videos, subfolders are labels
│   ├── 34_Cat/                      ← folder name = label_id_cleanname
│   │   ├── video1.mp4
│   │   └── video2.mp4  ...
│   ├── 46_Falcon/
│   └── ...  (55 folders now, 100 for viva)
│
├── UAE_SL/
│   ├── class_map.json               ← {label_id: {label_id, word, clean_name, folder}}
│   ├── split_100_selected.csv       ← 100 chosen words (label_id, word)
│   ├── landmarks_index.csv          ← extracted videos index (after notebook 01)
│   ├── landmarks_index_augmented.csv ← with augmented samples (after notebook 01)
│   └── processed/                   ← .npy files shape (180, 165)
│       ├── 34_Cat/
│       │   └── 34_Cat__video1.npy
│       └── augmented/
│           └── 34_Cat/
│               └── 34_Cat__video1_aug00.npy
│
├── models/
│   ├── holistic_landmarker.task     ← MediaPipe model (auto-downloaded)
│   ├── uaesl_best.keras             ← trained model (after notebook 02)
│   ├── uaesl_class_index.json       ← {0: {label_id, clean_name, word}, ...}
│   ├── uaesl_best_hps.json          ← best hyperparameters from AutoML
│   ├── uaesl_training_history.png
│   └── uaesl_results.json
│
├── notebooks/
│   ├── 01_feature_extraction.ipynb  ← MediaPipe extraction + augmentation ✅ DONE
│   └── 02_automl_training.ipynb     ← AutoML CNN+BiLSTM training 🔴 BLOCKED
│
├── sign2chat/                       ← React frontend (separate repo/folder)
│   ├── public/
│   │   ├── dummy_signing_session.json
│   │   ├── class_map.json
│   │   └── holistic_landmarker.task
│   └── src/
│       └── ...
│
└── UAE_SL/
    └── 01_setup_dataset.py          ← creates folder structure
```

---

## Current Status

### ✅ DONE

#### Dataset Planning
- 100 words selected from 1246-word ZHO dictionary (`split_100_selected.csv`)
- Categories: Numbers(10), Colors(8), Family(8), Emotions(11), Verbs(16),
  Health(8), UAE Clothing(5), Landmarks(6), Cuisines(5), Animals(5),
  Directions(6), Sports(6), Education(6)
- `class_map.json` built — keyed by `label_id`, includes `clean_name` and `folder`
- `01_setup_dataset.py` — creates UAE100 folder structure

#### Recording Plan
- 100 words × 10 videos/person × 5 people = 5,000 + 100 ZHO = 5,100 total
- Folder naming: `<label_id>_<clean_name>/` e.g. `34_Cat/`
- Video naming: any filename — subfolder name IS the label
- Currently recording: **55 words** for pipeline validation, scale to 100 for viva

#### Notebook 01 — Feature Extraction ✅ WORKING
- MediaPipe HolisticLandmarker (Tasks API, VIDEO mode)
- Output shape: `(180, 165)` — 180 frames @ 30fps = 6 seconds
- 55 nodes: left hand(21) + right hand(21) + pose(9) + face(4)
- Normalization: shoulder-midpoint, coords in [-1, 1]
- Padding: zeros at FRONT, sign at END (Masking layer ignores zeros)
- Augmentation: 10× copies, 8 transforms (NO mirroring — UAE SL has hand-specific signs)
- Augmentation transforms kept: rotation±15°, scale±15°, noise σ=0.01,
  translation±0.05, time warp, temporal stretch, temporal shift, hand occlusion
- Split: per-class stratified 70/15/15, saved to `landmarks_index_augmented.csv`
- Known fixes applied:
  - `cv2.resize(frame, (640, 480))` before MediaPipe — fixes resolution mismatch crash
  - `ts_counter += 10000` gap between videos — fixes monotonic timestamp error
  - `builtins._ts_counter` — persists across cell re-runs
  - Landmarker recreated on error — fixes corrupted internal state
  - Detection rate check: measures within actual video frames, not full buffer

#### Frontend UI ✅ ESTABLISHED (Claude Design)
- React + Vite, light color scheme
- Two panels: camera (deaf user, left) + chat (non-deaf user, right)
- Language toggle EN/AR with RTL chat support
- Dummy pipeline with scripted sessions from `dummy_signing_session.json`

#### Dummy Pipeline ✅ DESIGNED (not yet implemented in code)
- `dummy_signing_session.json` — 10 scripted sessions using actual 100-word vocab
- `useDummyModel.js` — replays words with delays
- `useLLMSmoothing.js` — Claude API, EN + AR prompts
- `useTTS.js` — Web Speech API, `ar-AE` / `en-US`

---

### 🔴 BLOCKED / IN PROGRESS

#### Notebook 02 — AutoML Training
**Status:** Crashes with CUDA/cuDNN error on first training epoch

**Error:**
```
UnknownError: CUDNN_BACKEND_TENSOR_DESCRIPTOR cudnnFinalize failed
<unknown cudnn status: 1002>
node sequential_1/conv1d_1/convolution
```

**Root cause:** cuDNN GPU error — likely VRAM pressure or
cuDNN version mismatch with the TF build.

**Fixes to try (in order):**
1. Add mixed precision at top of notebook:
   ```python
   tf.keras.mixed_precision.set_global_policy('mixed_float16')
   ```
   And change output layer to:
   ```python
   Dense(NUM_CLASSES, activation='softmax', dtype='float32')
   ```

2. Reduce batch size: `BATCH_SIZE = 16` (was 32)

3. Change Conv1D padding to causal:
   ```python
   Conv1D(..., padding='causal', ...)  # instead of 'same'
   ```

4. Force CPU to diagnose:
   ```python
   import os
   os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
   ```

5. Run tiny model test first to isolate GPU vs code issue:
   ```python
   tiny_x = np.random.randn(4, 180, 165).astype('float32')
   tiny_y = tf.keras.utils.to_categorical(np.array([0,1,2,3]), 55)
   tiny_model = tf.keras.Sequential([
       tf.keras.layers.Masking(input_shape=(180, 165)),
       tf.keras.layers.Conv1D(32, 3, padding='causal', activation='relu'),
       tf.keras.layers.GlobalAveragePooling1D(),
       tf.keras.layers.Dense(55, activation='softmax', dtype='float32'),
   ])
   tiny_model.compile(optimizer='adam', loss='categorical_crossentropy')
   tiny_model.fit(tiny_x, tiny_y, epochs=2)
   ```

**Environment:**
- WSL2 Ubuntu 22.04
- GPU: NVIDIA RTX 3080
- TF: 2.21.0
- Python: 3.10.12
- `.venv` at `~/projects/Sign2Chat/.venv`

---

### ⏳ NOT STARTED

#### Notebook 03 — Evaluation
Once training works, build evaluation notebook:
- Load `uaesl_best.keras`
- Evaluate on test set (never seen during training)
- Top-1, Top-5, Top-10 accuracy
- Confusion matrix
- Per-class report
- Save `uaesl_results.json`

#### TF.js Model Conversion
After training completes:
```bash
tensorflowjs_converter \
  --input_format=keras \
  ../models/uaesl_best.keras \
  ./sign2chat/public/model/
```
Produces `model.json` + `.bin` shards for browser inference.

#### Frontend Integration (Real Model)
Replace `useDummyModel` with `useModel` + `useMediaPipe`:
- Load TF.js model from `public/model/model.json`
- Load `class_map.json` for index → clean_name mapping
- Rolling 180-frame buffer
- Predict every 15 frames
- Same `extractFrameFeatures()` logic as Python notebook 01

#### Recording — Scale to 100 Words
Currently recording 55 words. Need 45 more for viva.

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Model architecture | CNN + BiLSTM | Best accuracy/risk for 51 videos/class |
| Hyperparameter search | Keras Tuner Bayesian | Finds best config automatically |
| Landmark tool | MediaPipe Tasks API | Current recommended, not legacy solutions |
| Input shape | (180, 165) | 6s @ 30fps covers all sign durations |
| Coordinate space | [-1, 1] | Shoulder-midpoint normalized |
| No mirroring | ✅ | UAE SL has hand-specific signs |
| Padding | Zeros at FRONT | Sign at end, Masking ignores zeros |
| Class key | label_id | Unique ZHO identifier, no artificial indexing |
| Framework | TensorFlow/Keras | Existing pipeline |
| Frontend | React + Vite | Standard modern stack |
| LLM smoothing | Claude API | Best Arabic/English quality |
| TTS | Web Speech API | No external dependency |

---

## Model Architecture (CNN + BiLSTM AutoML)

```
Input: (180, 165)
  → Masking(mask_value=0.0)          ← ignores zero-padded frames
  → Conv1D(filters, kernel, padding='causal') + BN + Dropout
  → Conv1D(filters, kernel, padding='causal') + BN + Dropout  [optional]
  → Bidirectional(LSTM(units))       + BN + Dropout
  → Dense(units, relu, L2)           + BN + Dropout
  → Dense(NUM_CLASSES, softmax, dtype='float32')
```

**Search space (Keras Tuner Bayesian, 30 trials × 40 epochs):**
- CNN layers: 1–2
- CNN filters: 32/64/128 and 64/128/256
- CNN kernel: 3, 5, 7
- LSTM units: 64/128/256
- Dense units: 128/256/512
- Dropout: 0.3–0.6
- L2: 1e-4–1e-2
- LR: 1e-4–5e-3
- Label smoothing: 0.05–0.20

**Training config:**
- Adam optimizer, clipnorm=1.0
- Label smoothing (tuned by search)
- Class weights (balanced)
- EarlyStopping patience=20
- ReduceLROnPlateau factor=0.5, patience=8
- OverfitGuard: stops if train-val gap > 25% for 3 epochs

---

## Feature Extraction Details

### Node layout in (180, 165) flat vector
```
[0:63]    left hand   21 × (x,y,z)
[63:126]  right hand  21 × (x,y,z)
[126:153] pose         9 × (x,y,z)  — POSE_INDICES = [0,11,12,13,14,15,16,23,24]
[153:165] face         4 × (x,y,z)  — FACE_INDICES = [152,10,234,454]
```

### Normalization
```python
origin = (pose[1] + pose[2]) / 2.0  # shoulder midpoint
# all coords subtracted by origin
# x,y converted: 2.0 * (x - 0.5)   # [0,1] → [-1,1]
```

### Augmentation (8 transforms, NO mirror)
```python
# 1. Rotation ±15°
# 2. Scale ±15%
# 3. Noise σ=0.01
# 4. Translation ±0.05 on x,y
# 5. Time warp — drop 20% active frames (prob=0.7)
# 6. Temporal stretch — duplicate 10-20% frames (prob=0.5)
# 7. Temporal shift ±5 frames
# 8. Hand occlusion — zero 1-4 frames (prob=0.5)
```

---

## class_map.json Format
```json
{
  "34": {"label_id": 34, "word": "Animals_03_Cat", "clean_name": "Cat", "folder": "34_Cat"},
  "46": {"label_id": 46, "word": "Animals_14_Falcon", "clean_name": "Falcon", "folder": "46_Falcon"}
}
```

## uaesl_class_index.json Format (produced by notebook 02)
```json
{
  "0": {"label_id": 34, "clean_name": "Cat", "word": "Animals_03_Cat"},
  "1": {"label_id": 38, "clean_name": "Elephant", "word": "Animals_07_Elephant"}
}
```
Keys 0..N-1 map to model softmax output indices (sorted by label_id).

---

## LLM Smoothing Prompts

### English
```
You are a real-time sign language interpreter for UAE Sign Language.
You receive signed words separated by " · " in sign language grammar order.
Convert to a single natural English sentence.
Rules: output ONLY the sentence, keep UAE terms as-is (Majboos, Burj Khalifa,
abaya, JBR, Harees, Saloona, Laqeemat, Hijaab, Jumairah, Masjid Sheikh Zayed,
Jabal Jais, Camel Racing, Horse Racing), fix typos (Happly→Happy).
```

### Arabic
```
أنت مترجم فوري للغة الإشارة الإماراتية.
تتلقى كلمات مُشار إليها مفصولة بـ " · ".
حوّلها إلى جملة عربية طبيعية.
القواعد: اكتب الجملة فقط، احتفظ بالمصطلحات الإماراتية كما هي.
```

---

## Dummy Signing Sessions (10 scripted scenarios)
Located at `sign2chat/public/dummy_signing_session.json`

| Session | Scenario | Words |
|---|---|---|
| 1 | Greeting | How_are_you → Fine → Happly |
| 2 | Food | Hungry → Biryani → Love |
| 3 | Family trip | Family → Travels → Burj_Khalifa → Happly |
| 4 | Health | Pain → Headache → Fever → Appointment_Booking |
| 5 | Sports | Love → Football → Camel_Racing → Fast |
| 6 | Weather | Hot → Fatigue → Walk → Jumairah |
| 7 | School | Education → Exam → Difficult → Think → Read |
| 8 | Weekend | Father → Mother → Travels → JBR → drink |
| 9 | Prayer | Pray → Masjid_Shaikh_Zayed → Family → Happly |
| 10 | Cooking | Mother → Cooking → Majboos → Saloona → Love |

---

## Immediate Next Tasks (in order)

### 1. Fix notebook 02 CUDA error
File: `notebooks/02_automl_training.ipynb`
Steps:
- Add `tf.keras.mixed_precision.set_global_policy('mixed_float16')` in Step 1
- Change output Dense to `dtype='float32'`
- Change `BATCH_SIZE = 16`
- Change Conv1D `padding='causal'`
- Run tiny model test first to confirm GPU works
- Run full AutoML search (30 trials)
- Run final training with best HPs

### 2. Build notebook 03 — Evaluation
File: `notebooks/03_evaluation.ipynb`
- Load `uaesl_best.keras` + `uaesl_class_index.json`
- Evaluate on test split of `landmarks_index.csv` (original, no augmentation)
- Compute Top-1, Top-5, Top-10
- Confusion matrix (seaborn heatmap)
- Per-class report (best/worst 10 classes)
- Save all to `uaesl_results.json`

### 3. Convert model to TF.js
```bash
cd ~/projects/Sign2Chat
tensorflowjs_converter \
  --input_format=keras \
  models/uaesl_best.keras \
  sign2chat/public/model/
```

### 4. Implement dummy pipeline in frontend
Files to create:
- `sign2chat/src/hooks/useDummyModel.js`
- `sign2chat/src/hooks/useLLMSmoothing.js`
- `sign2chat/src/hooks/useTTS.js`
- `sign2chat/src/components/DummyControls.jsx`
See `CLAUDE_dummy_pipeline.md` for full implementation details.

### 5. Implement real model inference in frontend
Files to create:
- `sign2chat/src/hooks/useMediaPipe.js`
- `sign2chat/src/hooks/useModel.js`
- `sign2chat/src/utils/landmarks.js`
See `CLAUDE.md` (frontend handoff) for `extractFrameFeatures()` implementation.

### 6. Record remaining 45 words (55 → 100)
Use `split_100_selected.csv` as recording checklist.

---

## Expected Results When Training Works

```
55 words, 51 videos/class:
  Val Top-1  : 65–75%
  Val Top-5  : 88–94%

100 words, 51 videos/class:
  Val Top-1  : 60–70%  (harder problem, more classes)
  Val Top-5  : 85–92%
```

---

## Environment

```
OS      : WSL2 Ubuntu 22.04
GPU     : NVIDIA RTX 3080 (10GB VRAM)
Python  : 3.10.12
venv    : ~/projects/Sign2Chat/.venv
TF      : 2.21.0
mediapipe: 0.10.35 (Tasks API)
Node    : for React frontend
```

---

## Files Inventory

| File | Status | Purpose |
|---|---|---|
| `UAE_SL/class_map.json` | ✅ | label_id → word/folder mapping |
| `UAE_SL/split_100_selected.csv` | ✅ | 100 words to record |
| `UAE_SL/01_setup_dataset.py` | ✅ | Creates UAE100 folder structure |
| `notebooks/01_feature_extraction.ipynb` | ✅ Working | MediaPipe extraction + augmentation |
| `notebooks/02_automl_training.ipynb` | 🔴 Blocked | AutoML CNN+BiLSTM — CUDA error |
| `notebooks/03_evaluation.ipynb` | ⏳ | Not built yet |
| `sign2chat/public/dummy_signing_session.json` | ✅ | 10 scripted demo sessions |
| `CLAUDE_dummy_pipeline.md` | ✅ | Dummy pipeline implementation guide |
| `CLAUDE.md` (frontend) | ✅ | Frontend UI implementation guide |
