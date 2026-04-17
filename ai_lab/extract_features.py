import cv2
import mediapipe as mp
import numpy as np
import os
import json
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- CONFIGURATION ---
VIDEO_DIR = "dataset/videos/"
JSON_PATH = "dataset/nslt_100.json"
OUTPUT_DIR = "processed_data"
MODEL_PATH = "ai_lab/hand_landmarker.task"  # The file you just downloaded

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- INITIALIZE MEDIAPIPE TASKS ---
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=2,
    min_hand_detection_confidence=0.5,
    running_mode=vision.RunningMode.VIDEO # Optimized for frame sequences
)
detector = vision.HandLandmarker.create_from_options(options)

def extract_landmarks(video_path):
    # Move detector initialization INSIDE the function to reset the clock for each video
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        running_mode=vision.RunningMode.VIDEO 
    )
    
    # Create a fresh detector for this specific video
    with vision.HandLandmarker.create_from_options(options) as detector:
        cap = cv2.VideoCapture(video_path)
        video_data = []
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Fallback if FPS is not detected correctly
        if fps <= 0: fps = 30 
        
        frame_count = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            frame_timestamp_ms = int(1000 * frame_count / fps)
            
            detection_result = detector.detect_for_video(mp_image, frame_timestamp_ms)

            frame_landmarks = np.zeros((21, 3))
            if detection_result.hand_landmarks:
                hand = detection_result.hand_landmarks[0]
                for i, lm in enumerate(hand):
                    frame_landmarks[i] = [lm.x, lm.y, lm.z]
            
            video_data.append(frame_landmarks)
            frame_count += 1

        cap.release()
        return np.array(video_data)

# --- MAIN EXECUTION ---
def run_batch_processing():
    with open(JSON_PATH, 'r') as f:
        data_map = json.load(f)

    print(f"🚀 Tasks API: Processing {len(data_map)} videos...")

    for video_id, info in data_map.items():
        video_path = os.path.join(VIDEO_DIR, f"{video_id}.mp4")
        output_path = os.path.join(OUTPUT_DIR, f"{video_id}.npy")

        if os.path.exists(output_path) or not os.path.exists(video_path):
            continue

        landmarks = extract_landmarks(video_path)
        np.save(output_path, landmarks)
        print(f"✅ Extracted {video_id} ({len(landmarks)} frames)")

if __name__ == "__main__":
    run_batch_processing()