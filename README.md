# Sign2Chat: Real-Time Sign-to-English Translation with an Assistive Chatbot🤟🤖

## 📖 Overview

**Sign2Chat** is a real-time assistive system designed to bridge the communication gap between Deaf and Hard of Hearing (DHH) individuals and non-signers.Unlike traditional tools that only recognize static gestures (like the alphabet), this project builds a pipeline that translates continuous sign language sequences into fluent English text and speech, enabling two-way conversation via an integrated chatbot.

The system focuses on robustness, low-cost deployment (using standard webcams), and accessible interaction.

## 🚀 Key Features

* **Real-Time Sign Capture:** Utilizes **MediaPipe** for privacy-preserving, lightweight hand and pose landmark extraction.
* **Sequence Modeling:** Implements Deep Learning models (comparing **LSTM** vs. **Transformers**) to recognize dynamic words and phrases from continuous video streams.
* **Language Smoothing:** An NLP post-processing module converts raw sign tokens into fluent, grammatically correct English.
* **Two-Way Communication:** The output is piped into an assistive chatbot that responds via text and **Text-to-Speech (TTS)**, allowing a natural dialogue loop.

## 🛠️ System Architecture

The pipeline consists of three main stages:

1. **Visual Recognition:** Extracting skeletal landmarks (x, y, z coordinates) from webcam video.
2. **Sequence Modeling:** Classifying the stream of coordinates into linguistic units (words/phrases).
3. **Conversational Integration:** Smoothing the output and generating a response.

## 📂 Repository Structure

```text
Sign2Chat/
├── data/              # Dataset files (WLASL) - *Not tracked by Git*
├── notebooks/         # Jupyter notebooks for EDA and experiments
├── src/               # Source code
│   ├── data_loader.py # Scripts to process video to landmarks
│   ├── model.py       # LSTM/Transformer Architecture
│   ├── app.py         # Main Application (UI)
│   └── utils.py       # NLP and TTS helper functions
├── checkpoints/       # Trained model weights
├── requirements.txt   # Python dependencies
└── README.md          # Project documentation
```

## ⚙️ Getting Started

### Prerequisites
1. Python 3.8+
2. Webcam

### Installation
1. Clone the repository
```
git clone https://github.com/Meshal6299/Sign2Chat.git
cd Sign2Chat
```

2. Install dependencies
```
pip install -r requirements.txt
```

3. **Download the dataset**: This project uses the WLASL (Word-Level American Sign Language) dataset. Please download the JSON and video files and place them in the `data/` directory.

### Running the App

*Will be added later*