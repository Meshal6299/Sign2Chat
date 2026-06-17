# Sign2Chat: Real-Time UAE Sign Language Assistant 🤟💬

> **Breaking the communication barrier between Deaf and hearing users — in the browser, in real time.**

Sign2Chat is a web application that recognizes **UAE Sign Language (UAESL)** from a live webcam feed and turns it into natural, spoken language — and back. A Deaf user signs into the camera, an on-device model recognizes each word, and a cloud LLM smooths the raw word sequence into a fluent Emirati-Arabic / English sentence that is then displayed in a chat and spoken aloud. The hearing user can reply, and their words are shown back to the Deaf user as sign-reference video playback.

All computer vision runs **on-device in the browser** (privacy-first). Only the final list of recognized words is sent to the cloud for sentence smoothing.

---

## 🚀 Key Features

* **Real-time sign recognition** — MediaPipe Holistic extracts skeletal landmarks per frame in-browser; a CNN + BiLSTM model (running in TensorFlow.js) predicts the signed word.
* **Motion-gated detection** — signing is auto-detected by hand presence and motion, so isolated words are captured cleanly without manual start/stop. Captured signs are resampled to 30 fps before inference, so signing speed doesn't matter.
* **Intelligent translation** — Google **Gemini 2.5 Flash** reconstructs isolated word sequences into coherent sentences in authentic **Emirati dialect** *and* English, inferring the missing pronouns, prepositions, and tense.
* **Bi-directional communication:**
  * **Deaf ➡ Hearing:** signs → text → spoken audio (Web Speech TTS).
  * **Hearing ➡ Deaf:** the reply is shown as **sign-reference video playback** so the Deaf user can *see* the response.

---

## 🛠️ Architecture

A 4-stage hybrid edge-cloud pipeline:

1. **Perception (on-device):** MediaPipe Holistic Landmarker → 55 keypoints/frame (21 left hand + 21 right hand + 9 pose + 4 face), normalized to the shoulder midpoint → `165`-dim feature vector.
2. **Recognition (on-device, TF.js):** CNN + BiLSTM classifier over a `(180, 165)` sequence → one of 100 UAESL words.
3. **Cognition (cloud):** Gemini LLM smooths the recognized word list into a natural Emirati-Arabic + English sentence.
4. **Interaction (app):** Chat display, Text-to-Speech, and reverse sign-video playback.

---

## 🧠 Model

| Property | Value |
| :--- | :--- |
| Architecture | `Masking → Conv1D (causal) → Bidirectional LSTM → Dense → Softmax` |
| Input shape | `(180, 165)` — 180 frames (6 s @ 30 fps) × 165 features |
| Classes | **100** UAESL words |
| Landmarks | 55 nodes: L-hand (21) + R-hand (21) + pose (9) + face (4) |
| Normalization | Shoulder-midpoint centered, coords in `[-1, 1]` |
| Padding | Zeros at the front; sign at the end (Masking ignores zeros) |
| Reported accuracy | **~95% Top-1** on the held-out test split |

**Feature vector layout** (per frame, flat 165-dim):

```
[0:63]    left hand   21 × (x,y,z)
[63:126]  right hand  21 × (x,y,z)
[126:153] pose         9 × (x,y,z)
[153:165] face         4 × (x,y,z)
```

**Training pipeline:** MediaPipe extraction → 10× augmentation (rotation, scale, noise, translation, time warp, temporal stretch/shift, hand occlusion — **no mirroring**, since UAESL has hand-specific signs) → Keras Tuner Bayesian hyperparameter search → final training with class weights, label smoothing, and early stopping.

---

## 💻 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19 + Vite |
| **Computer Vision** | MediaPipe Tasks — Holistic Landmarker |
| **Browser Inference** | TensorFlow.js |
| **Model Training** | Python, TensorFlow / Keras, Keras Tuner, NumPy, OpenCV |
| **LLM Smoothing** | Google Gemini 2.5 Flash API |
| **Text-to-Speech** | Web Speech API (`ar-AE` / `en-US`) |
| **Dataset** | UAE Sign Language — Zayed Higher Organization (ZHO) dictionary |

---

## 📂 Project Structure

```text
Sign2Chat/
├── UAE100/                     # raw .mp4 source videos (subfolder = label category)
├── UAE-dataset/               # full ZHO dictionary source
├── notebooks/
│   ├── 01_feature_extraction.ipynb   # MediaPipe extraction + augmentation
│   ├── 02_training.ipynb             # AutoML CNN+BiLSTM training
│   └── 03_evaluation.ipynb           # Top-1/5/10, confusion matrix, per-class report
├── models/
│   ├── uaesl_best.keras              # trained Keras model
│   ├── uaesl_class_index.json        # softmax index → word mapping
│   ├── holistic_landmarker.task      # MediaPipe model
│   └── uaesl_confusion_matrix.png
├── frontend/                   # React + Vite web app
│   ├── public/
│   │   ├── model/                    # TF.js model (model.json + .bin shards)
│   │   ├── reference/                # sign-reference videos for playback
│   │   ├── class_map.json
│   │   └── holistic_landmarker.task
│   └── src/
│       ├── components/        # CameraPanel, ChatPanel, SignReference, ...
│       ├── hooks/             # useMediaPipe, useModel, useSignSession,
│       │                      #   useLLMSmoothing, useTTS, useTextToSign, ...
│       └── utils/             # landmarks, drawLandmarks, constants
├── demo_inference.py           # standalone Python live/webcam inference demo
├── requirements.txt
└── README.md
```

---

## 📊 Dataset

UAE Sign Language (Arabic), sourced from the **Zayed Higher Organization for People of Determination** dictionary (1,245 classes). Sign2Chat uses a curated subset of **100 words** spanning numbers, colors, family, emotions, verbs, health, UAE clothing, landmarks, cuisines, animals, directions, sports, and education.

---

## ⚡ Getting Started

### 1. Frontend (web app)

```bash
cd frontend
npm install
# add your Gemini key to frontend/.env.local:
#   VITE_GEMINI_API_KEY=your_key_here   (get one at https://aistudio.google.com/apikey)
npm run dev
```

Open the printed local URL, allow camera access, and sign one of the 100 supported words into the camera.

### 2. Python training pipeline (optional)

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Run the notebooks in order:

1. `notebooks/01_feature_extraction.ipynb` — extract landmarks + augment.
2. `notebooks/02_training.ipynb` — AutoML search + final training → `models/uaesl_best.keras`.
3. `notebooks/03_evaluation.ipynb` — accuracy, confusion matrix, per-class report.

### 3. Standalone live demo (Python)

```bash
python demo_inference.py                      # webcam
python demo_inference.py --video path/to.mp4  # from a video file
```

### 4. Convert a new model to TensorFlow.js

```bash
tensorflowjs_converter --input_format=keras \
  models/uaesl_best.keras \
  frontend/public/model/
```
