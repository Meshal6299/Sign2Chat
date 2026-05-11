# Sign2Chat: AI-Powered Bi-Directional Sign Language Assistant 📱🤖

> **Breaking the Communication Barrier with Hybrid Edge-Cloud AI.**

Sign2Chat is a mobile accessibility application designed to bridge the gap between Deaf/Hard of Hearing (DHH) individuals and hearing non-signers. Unlike traditional tools, it uses a **Hybrid Architecture** combining on-device computer vision for privacy and Cloud LLMs for intelligent translation, enabling fluid, two-way communication.


## 🚀 Key Features

* **Real-Time Sign Detection:** Uses **MediaPipe & "ST_GCN MODEL"** to detect sign language gestures locally on the phone (Privacy-First).
* **Intelligent Translation:** Uses **Google Gemini / OpenAI** to convert broken sign "glosses" (e.g., *[ME]* *[WANT]* *[WATER]*) into polite, fluent English sentences.
* **Bi-Directional Communication:**
    * **Deaf ➡ Hearing:** Translates signs into Spoken Audio (Text-to-Speech).
    * **Hearing ➡ Deaf:** Converts spoken voice into **Sign Language Video Playback**, allowing Deaf users to *see* the reply (solving the literacy barrier).
* **Cross-Platform:** Built with **Flutter**, running on Android and iOS.

## 🛠️ System Architecture

Our system follows a **4-Layer Hybrid Pipeline**:

1.  **Perception (Mobile):** Extracts 543 skeletal landmarks using MediaPipe (On-Device).
2.  **Recognition (Edge):** ST GCN model
3.  **Cognition (Cloud):** An **LLM API** performs grammar smoothing and context understanding.
4.  **Interaction (App):** Handles Text-to-Speech (TTS) and Video Retrieval logic.


## 💻 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Mobile Framework** | Flutter (Dart) |
| **Computer Vision** | MediaPipe Tasks (Mobile SDK) |
| **AI Model** |  |
| **Training Backend** | Python, TensorFlow, Keras, NumPy |
| **LLM Engine** | Google Generative AI SDK (Gemini Flash) |
| **Dataset** | WLASL (Word-Level American Sign Language) |


## 📂 Project Structure

```text
Sign2Chat/
├── dataset/
│   ├── processed/                 
│   └── videos/           
├── notebooks/                                      
├── models/                                         
├── mobile_app/            
├── requirements.txt         
└── README.md                
```

## 📊 Dataset Setup
This project utilizes the UAE Sign lanugage (Arabic) from Zayed Authority for People of Determination. 1157 classes including 31 alphabets and some numbers