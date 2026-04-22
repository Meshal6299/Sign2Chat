import cv2
import mediapipe as mp
import os
import numpy as np

DATA_PATH = os.path.join('dataset', 'videos')
OUTPUT_PATH = os.path.join('dataset', 'processed_data')
MODEL_PATH = os.path.join('ai_lab', 'hand_landmarker.task')

if not os.path.exists(OUTPUT_PATH):
    os.makedirs(OUTPUT_PATH)

BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_hands=2
)

def extract_landmarks(video_file, landmarker):
    cap = cv2.VideoCapture(video_file)
    sequence = []
    
    # We want exactly 30 frames per video for the LSTM model
    for frame_num in range(30): 
        success, frame = cap.read()
        if not success:
            # If video is shorter than 30 frames, pad with zeros
            sequence.append(np.zeros(21 * 3 * 2)) # 21 points * (x,y,z) * 2 hands
            continue

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
        
        detection_result = landmarker.detect(mp_image)
        
        frame_landmarks = []
        for hand_idx in range(2):
            if detection_result.hand_landmarks and len(detection_result.hand_landmarks) > hand_idx:
                for res in detection_result.hand_landmarks[hand_idx]:
                    frame_landmarks.extend([res.x, res.y, res.z])
            else:
                frame_landmarks.extend([0] * (21 * 3))
        
        sequence.append(frame_landmarks)
        
    cap.release()
    return np.array(sequence)

with HandLandmarker.create_from_options(options) as landmarker:
    video_files = [f for f in os.listdir(DATA_PATH) if f.endswith('.mp4')]
    print(f"Found {len(video_files)} videos in {DATA_PATH}")

    for idx, video_name in enumerate(video_files):
        video_input_path = os.path.join(DATA_PATH, video_name)
        
        landmarks = extract_landmarks(video_input_path, landmarker)
            
        video_name_no_ext = os.path.splitext(video_name)[0]
            
        save_path = os.path.join(OUTPUT_PATH, f"{video_name_no_ext}.npy")
        np.save(save_path, landmarks)
            
        if idx % 10 == 0:
            print(f"Processed {idx}/{len(video_files)} videos...")

print(f"Extraction Complete")