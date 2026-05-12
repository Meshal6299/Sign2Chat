# Sign2Chat: AI-Powered Bi-Directional Sign Language Assistant 📱🤖

> **Breaking the Communication Barrier with Hybrid Edge-Cloud AI.**

Sign2Chat is a mobile accessibility application designed to bridge the gap between Deaf/Hard of Hearing (DHH) individuals and hearing non-signers. Unlike traditional tools, it uses a **Hybrid Architecture** combining on-device computer vision for privacy and Cloud LLMs for intelligent translation, enabling fluid, two-way communication.


## 🚀 Key Features

* **Real-Time Sign Detection:** MediaPipe extracts 75 skeletal landmarks per frame on-device (privacy-first), fed into a Two-Stream ST-GCN + BiLSTM model for recognition.
* **Intelligent Translation:** Uses **Google Gemini / OpenAI** to convert broken sign "glosses" (e.g., *[ME]* *[WANT]* *[WATER]*) into polite, fluent English sentences.
* **Bi-Directional Communication:**
    * **Deaf ➡ Hearing:** Translates signs into Spoken Audio (Text-to-Speech).
    * **Hearing ➡ Deaf:** Converts spoken voice into **Sign Language Video Playback**, allowing Deaf users to *see* the reply (solving the literacy barrier).
* **Cross-Platform:** Built with **Flutter**, running on Android and iOS.

## 🛠️ System Architecture

Our system follows a **4-Layer Hybrid Pipeline**:

1.  **Perception (On-Device):** MediaPipe Holistic Landmarker
  → 75 keypoints/frame: 33 pose + 21 left hand + 21 right hand
  → Normalized relative to shoulder width (signer-agnostic)
2.  **Recognition (On-Device / TFLite):** Two-Stream Model: ST-GCN + BiLSTM 
3.  **Cognition (Cloud):** An **LLM API** performs grammar smoothing and context understanding.
4.  **Interaction (App):** Handles Text-to-Speech (TTS) and .

## 🧠 Model Architecture
 
### Two-Stream Design
 
| Stream | Input | Purpose |
| :--- | :--- | :--- |
| **ST-GCN** | Full 75-joint skeleton (60, 75, 2) | Captures *what shape* hands/body make |
| **BiLSTM** | Hand joint velocity (60, 84) | Captures *how* the sign moves |
| **Fusion** | Concatenated → FC(512) → FC(256) → Softmax | Final classification |
 
### Input Representation
- Fixed sequence length: **60 frames** (~2 seconds at 30fps)
- Keypoints: **75 joints** × (x, y) = 150-dim per frame
- Normalized to shoulder width, zero-centered
### Training Details
- Augmentation: scale, mirror, rotate, translate, speed perturbation, noise, frame drop
- Label smoothing: 0.1
- Callbacks: ModelCheckpoint (val_top5_acc), EarlyStopping, ReduceLROnPlateau

## 💻 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Mobile Framework** | Flutter (Dart) |
| **Computer Vision** | MediaPipe Tasks (Holistic Landmarker) |
| **AI Model** | Two-Stream ST-GCN + BiLSTM (TFLite) |
| **Training Backend** | Python, TensorFlow, Keras, NumPy |
| **LLM Engine** | Google Gemini Flash API |
| **Dataset** | UAE Sign Language — Zayed Authority for People of Determination |
| **Dataset size** | 1,245 classes (31 alphabets + numbers + common words/objects) |


## 📂 Project Structure

```text
Sign2Chat/                                                                                    
├── mobile_app/
├── models/ 
├── notebooks/  
├── src/  
├── UAE-dataset/
│   ├── processed/                 
│   └── *glosses*/            
├── README.md          
└── requirements.txt               
```

## 📊 Dataset
This project utilizes the UAE Sign lanugage (Arabic) from Zayed Authority for People of Determination. 1245 classes including 31 alphabets and some numbers