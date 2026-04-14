# Sign2Chat: AI-Powered Bi-Directional Sign Language Assistant 📱🤖

> **Breaking the Communication Barrier with Hybrid Edge-Cloud AI.**

Sign2Chat is a mobile accessibility application designed to bridge the gap between Deaf/Hard of Hearing (DHH) individuals and hearing non-signers. Unlike traditional tools, it uses a **Hybrid Architecture** combining on-device computer vision for privacy and Cloud LLMs for intelligent translation, enabling fluid, two-way communication.


## 🚀 Key Features

* **Real-Time Sign Detection:** Uses **MediaPipe & TFLite** to detect sign language gestures locally on the phone (Privacy-First).
* **Intelligent Translation:** Uses **Google Gemini / OpenAI** to convert broken sign "glosses" (e.g., *[ME]* *[WANT]* *[WATER]*) into polite, fluent English sentences.
* **Bi-Directional Communication:**
    * **Deaf ➡ Hearing:** Translates signs into Spoken Audio (Text-to-Speech).
    * **Hearing ➡ Deaf:** Converts spoken voice into **Sign Language Video Playback**, allowing Deaf users to *see* the reply (solving the literacy barrier).
* **Cross-Platform:** Built with **Flutter**, running on Android and iOS.

## 🛠️ System Architecture

Our system follows a **4-Layer Hybrid Pipeline**:

1.  **Perception (Mobile):** Extracts 543 skeletal landmarks using MediaPipe (On-Device).
2.  **Recognition (Edge):** A quantized **TensorFlow Lite (LSTM)** model detects raw signs in real-time.
3.  **Cognition (Cloud):** An **LLM API** performs grammar smoothing and context understanding.
4.  **Interaction (App):** Handles Text-to-Speech (TTS) and Video Retrieval logic.


## 💻 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Mobile Framework** | Flutter (Dart) |
| **Computer Vision** | MediaPipe Tasks (Mobile SDK) |
| **AI Model** | TensorFlow Lite (Quantized LSTM) |
| **Training Backend** | Python, TensorFlow, Keras, NumPy |
| **LLM Engine** | Google Generative AI SDK (Gemini Flash) |
| **Dataset** | WLASL (Word-Level American Sign Language) |


## 📂 Project Structure

```text
Sign2Chat/
├── mobile_app/           # The Flutter Application
│
├── ai_lab/               # The Python Research Lab
│
└── README.md             # Project Documentation
```

## 📊 Dataset Setup
This project utilizes the WLASL (World Level American Sign Language) dataset. Because the dataset contains over 21,000 videos and exceeds GitHub's storage limits, the video files must be downloaded and added manually to your local environment.

 1. Download the Video Files: https://drive.google.com/file/d/1FQSqG00QueCo00fgDLf2lrUg01IMe63M/view?usp=sharing
 2. Installation Instructions: \
 2.1. Extract the downloaded **video.zip** on your machine. \
 2.2. Locate the extracted videos folder. \
 2.3. Move the entire videos folder into the dataset/ directory of this project.

now the dataset folder should look like this
```
dataset/
├── videos/              <-- (21,095 .mp4 files should be inside here)
├── nslt_100.json
├── nslt_300.json
├── nslt_1000.json
├── nslt_2000.json
├── WLASL_v0.3.json
├── wlasl_class_list.txt
└── missing.txt
```