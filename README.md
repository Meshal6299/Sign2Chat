# Sign2Chat: Real-Time Sign-to-English Translation with an Assistive Chatbot🤟🤖
**Course:** CSAI405 - Conputer Science AI Capstone Project.

**Institution:** The British University in Dubai

## 📖 Overview

**Sign2Chat** is a real-time assistive system designed to bridge the communication gap between Deaf and Hard of Hearing (DHH) individuals and non-signers.Unlike traditional tools that only recognize static gestures (like the alphabet), this project builds a pipeline that translates continuous sign language sequences into fluent English text and speech, enabling two-way conversation via an integrated chatbot.

The system focuses on robustness, low-cost deployment (using standard webcams), and accessible interaction.

## 🚀 Key Features

* **Real-Time Sign Capture:** Utilizes **MediaPipe** for privacy-preserving, lightweight hand and pose landmark extraction.
* **Sequence Modeling:** Implements Deep Learning models (comparing **LSTM** vs. **Transformers**) to recognize dynamic words and phrases from continuous video streams.
* **Language Smoothing:** An NLP post-processing module converts raw sign tokens into fluent, grammatically correct English.
* **Two-Way Communication:** The output is piped into an assistive chatbot that responds via text and **Text-to-Speech (TTS)**, allowing a natural dialogue loop.

## 🛠️ System Architecture

This System consists of fours Layers:

- Layer 1: **User Enviroment (*The Input*)**: This layer manages the hardware interface. It captures the raw video feed from the user's webcam and prepares the environment for the signer.
- Layer 2: **Computer Vision (*The Skeleton*)**: This is the perception module. Instead of processing raw pixels, we utilize MediaPipe to extract 543 skeletal landmarks (hands, pose, face) per frame, creating a lightweight and privacy-preserving data stream.
- Layer 3: **Sequence Recognition (*The Logic*)**: This is the core Deep Learning module. A rolling buffer collects frames over time and feeds them into an LSTM/Transformer model to classify dynamic gestures into discrete linguistic units (words).
- Layer 4: **Application & Chatbot (*The Interface*)**: This layer handles the output and dialogue. It smooths the predicted signs into fluent English using NLP, generates a conversational response via the Chatbot, and converts that response into audio using Text-to-Speech (TTS). 


<img src="./docs/4layers.svg" alt="alt text" height="1200"/>

## 📂 Repository Structure

```text
Sign2Chat/
├── data/              # Dataset files (WLASL) - *Not tracked by Git*
├── notebooks/         # Jupyter notebooks for EDA and experiments
├── src/               # Source code
├── checkpoints/       # Trained model weights
├── docs/              # Reports and resources for documentation
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


