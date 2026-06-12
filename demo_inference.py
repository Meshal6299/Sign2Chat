"""
Sign2Chat — Live Inference Demo
Usage:
  python demo_inference.py                      # webcam
  python demo_inference.py --video path/to.mp4  # video file
  python demo_inference.py --no-display          # print-only, no OpenCV window
  python demo_inference.py --video path/to.mp4 --loop
"""
import os
import sys

# 1. Suppress TensorFlow and oneDNN logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# 2. Suppress MediaPipe / absl C++ logging noise
os.environ['GLOG_minloglevel'] = '3'

# 3. Suppress OpenCV / Qt font warnings
os.environ['QT_LOGGING_RULES'] = '*.debug=false;*.info=false;*.warning=false'

import os
os.environ['GLOG_minloglevel'] = '3'
os.environ['ABSL_MIN_LOG_LEVEL'] = '3'

import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="keras")

import argparse, json, time, collections
import numpy as np
import cv2

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["XLA_FLAGS"]            = "--xla_gpu_autotune_level=0"
os.environ["TF_XLA_FLAGS"]         = "--tf_xla_auto_jit=0"


import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import (
    Masking, TimeDistributed, BatchNormalization,
    Dropout, Bidirectional, LSTM, Dense,
)
from tensorflow.keras.regularizers import l2

import mediapipe as mp
from mediapipe.tasks.python.vision import (
    HolisticLandmarker, HolisticLandmarkerOptions,
)
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python import vision as mp_vision

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT       = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT, "models", "uaesl_best.keras")
CLASS_IDX  = os.path.join(ROOT, "models", "uaesl_class_index.json")
MP_MODEL   = os.path.join(ROOT, "models", "holistic_landmarker.task")

# ── Model constants (must match training) ─────────────────────────────────────
MAX_FRAMES  = 180
FEATURE_DIM = 165
DROPOUT     = 0.4
L2_REG      = 1e-3
TOP_K       = 3

PREDICT_EVERY         = 5   # run inference every N frames
MIN_FRAMES_TO_PREDICT = 30   # minimum buffer size before first inference

# ── Feature extraction (mirrors notebook 01 exactly) ──────────────────────────
POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24]
FACE_INDICES = [152, 10, 234, 454]

def _lm_to_arr(lm_list, indices=None, n=21):
    if not lm_list:
        k = len(indices) if indices is not None else n
        return np.zeros((k, 3), dtype=np.float32)
    arr = np.array([[l.x, l.y, l.z] for l in lm_list], dtype=np.float32)
    if indices is not None:
        arr = arr[indices]
    arr[:, :2] = 2.0 * (arr[:, :2] - 0.5)
    return arr

def extract_frame_features(result):
    lh   = _lm_to_arr(result.left_hand_landmarks,  n=21)
    rh   = _lm_to_arr(result.right_hand_landmarks, n=21)
    pose = _lm_to_arr(result.pose_landmarks,  POSE_INDICES, 33)
    face = _lm_to_arr(result.face_landmarks,  FACE_INDICES, 468)
    origin = (pose[1] + pose[2]) / 2.0 if result.pose_landmarks else np.zeros(3, dtype=np.float32)
    return np.concatenate([
        (lh   - origin).flatten(),
        (rh   - origin).flatten(),
        (pose - origin).flatten(),
        (face - origin).flatten(),
    ]).astype(np.float32)

# ── Build model (same arch as training, use_cudnn=False for left-pad masks) ───
def build_model(num_classes):
    model = Sequential([
        Masking(mask_value=0.0, input_shape=(MAX_FRAMES, FEATURE_DIM)),
        TimeDistributed(Dense(128, activation="relu")),
        BatchNormalization(), Dropout(DROPOUT),
        TimeDistributed(Dense(128, activation="relu")),
        BatchNormalization(), Dropout(DROPOUT),
        Bidirectional(LSTM(128, return_sequences=False, use_cudnn=False)),
        BatchNormalization(), Dropout(DROPOUT),
        Dense(256, activation="relu", kernel_regularizer=l2(L2_REG)),
        BatchNormalization(), Dropout(DROPOUT),
        Dense(num_classes, activation="softmax", dtype="float32",
              kernel_regularizer=l2(L2_REG)),
    ])
    model.compile(optimizer="adam", loss="categorical_crossentropy")
    return model

# ── Overlay drawing ────────────────────────────────────────────────────────────
COLORS = [(46, 204, 113), (52, 152, 219), (155, 89, 182)]  # green, blue, purple

# Display state constants
STATE_FILLING    = 0  # buffer < MIN_FRAMES_TO_PREDICT
STATE_PREDICTING = 1  # buffer ready, showing predictions

def draw_overlay(frame, state, predictions, buffer_len, frame_count, fps):
    h, w = frame.shape[:2]
    panel_w = 280

    overlay = frame.copy()
    cv2.rectangle(overlay, (w - panel_w, 0), (w, h), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    x = w - panel_w + 12
    cv2.putText(frame, "Sign2Chat", (x, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
    cv2.putText(frame, f"FPS: {fps:.0f}  Frame: {frame_count}",
                (x, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1)

    if state == STATE_FILLING:
        cv2.putText(frame, "Signing...", (x, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 50), 1)
        bar_x1, bar_y1 = x, 108
        bar_x2, bar_y2 = x + panel_w - 24, 124
        progress = min(buffer_len / MIN_FRAMES_TO_PREDICT, 1.0)
        fill_x2  = bar_x1 + int((bar_x2 - bar_x1) * progress)
        cv2.rectangle(frame, (bar_x1, bar_y1), (bar_x2, bar_y2), (50, 50, 50), -1)
        cv2.rectangle(frame, (bar_x1, bar_y1), (fill_x2, bar_y2), (255, 200, 50), -1)
        cv2.putText(frame, f"{buffer_len}/{MIN_FRAMES_TO_PREDICT} frames",
                    (x, 142), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1)

    else:  # STATE_PREDICTING
        cv2.putText(frame, "Predictions:", (x, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
        for rank, (name, prob) in enumerate(predictions):
            y = 105 + rank * 58
            color = COLORS[rank]
            cv2.rectangle(frame, (x, y), (x + panel_w - 24, y + 40), (50, 50, 50), -1)
            bar_w = int((panel_w - 24) * prob)
            cv2.rectangle(frame, (x, y), (x + bar_w, y + 40), color, -1)
            cv2.putText(frame, f"#{rank+1} {name}", (x + 5, y + 16),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, f"{prob*100:.1f}%", (x + 5, y + 34),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (230, 230, 230), 1)

    return frame

def draw_buffer_bar(frame, filled, total):
    h, w = frame.shape[:2]
    bar_h = 6
    fill_w = int(w * filled / total)
    cv2.rectangle(frame, (0, h - bar_h), (w, h), (40, 40, 40), -1)
    color = (46, 204, 113) if filled >= MIN_FRAMES_TO_PREDICT else (52, 152, 219)
    cv2.rectangle(frame, (0, h - bar_h), (fill_w, h), color, -1)
    return frame

# ── Main inference loop ────────────────────────────────────────────────────────
def run(source, show_display, loop_video=False):
    with open(CLASS_IDX) as f:
        class_idx = json.load(f)
    num_classes = len(class_idx)
    idx_to_name = {int(k): v["clean_name"] for k, v in class_idx.items()}

    print(f"Loading model ({num_classes} classes)...")
    model = build_model(num_classes)
    model.load_weights(MODEL_PATH)
    print("✅ Model loaded")

    dummy = np.zeros((1, MAX_FRAMES, FEATURE_DIM), dtype=np.float32)
    model.predict(dummy, verbose=0)
    print("✅ Model warmed up")

    print("Loading MediaPipe HolisticLandmarker...")
    options = HolisticLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MP_MODEL),
        running_mode=mp_vision.RunningMode.VIDEO,
        min_face_detection_confidence=0.5,
        min_pose_detection_confidence=0.5,
        min_hand_landmarks_confidence=0.5,
        output_face_blendshapes=False,
        output_segmentation_mask=False,
    )
    landmarker = HolisticLandmarker.create_from_options(options)
    print("✅ MediaPipe ready\n")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"❌ Cannot open source: {source}")
        sys.exit(1)

    src_label = "webcam" if source == 0 else os.path.basename(str(source))
    print(f"Source : {src_label}")
    print(f"Press Q to quit\n")

    frame_buffer  = collections.deque(maxlen=MAX_FRAMES)
    frame_count   = 0
    predictions   = None
    display_state = STATE_FILLING
    ts_ms         = 0
    fps_deque     = collections.deque(maxlen=30)
    prev_time     = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            if loop_video and source != 0:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_buffer.clear()
                predictions   = None
                display_state = STATE_FILLING
                ts_ms = 0
                continue
            break

        frame_count += 1
        ts_ms += 33  # ~30 fps timestamps for MediaPipe VIDEO mode

        frame_resized = cv2.resize(frame, (640, 480))
        rgb      = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result   = landmarker.detect_for_video(mp_image, ts_ms)

        # Always buffer every frame regardless of hand visibility
        frame_buffer.append(extract_frame_features(result))
        buf_len = len(frame_buffer)

        # ── Inference (no confidence gate) ────────────────────────────────
        if buf_len >= MIN_FRAMES_TO_PREDICT and frame_count % PREDICT_EVERY == 0:
            seq = np.zeros((1, MAX_FRAMES, FEATURE_DIM), dtype=np.float32)
            frames_list = list(frame_buffer)
            n = len(frames_list)
            seq[0, MAX_FRAMES - n:] = np.stack(frames_list)  # left-pad

            probs   = model.predict(seq, verbose=0)[0]
            top_idx = np.argsort(probs)[::-1][:TOP_K]

            predictions   = [(idx_to_name[i], float(probs[i])) for i in top_idx]
            display_state = STATE_PREDICTING
            names_str = "  |  ".join(f"{nm} {p*100:.0f}%" for nm, p in predictions)
            print(f"[{frame_count:5d}] {names_str}")

        now = time.time()
        fps_deque.append(1.0 / max(now - prev_time, 1e-6))
        prev_time = now
        fps = sum(fps_deque) / len(fps_deque)

        if show_display:
            disp = cv2.resize(frame_resized, (760, 480))
            disp = draw_overlay(disp, display_state, predictions, buf_len, frame_count, fps)
            disp = draw_buffer_bar(disp, buf_len, MAX_FRAMES)
            cv2.imshow("Sign2Chat — Inference Demo", disp)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), ord("Q"), 27):
                break

    cap.release()
    landmarker.close()
    if show_display:
        cv2.destroyAllWindows()
    print("\nDone.")
    os._exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video",      type=str, default=None,
                        help="Path to video file (omit for webcam)")
    parser.add_argument("--no-display", action="store_true",
                        help="Disable OpenCV window, print-only mode")
    parser.add_argument("--loop",       action="store_true",
                        help="Loop video file continuously")
    args = parser.parse_args()

    source       = args.video if args.video else 0
    show_display = not args.no_display

    if show_display and not os.environ.get("DISPLAY") and source != 0:
        print("⚠  No DISPLAY found — switching to print-only mode")
        show_display = False

    run(source, show_display, loop_video=args.loop)
