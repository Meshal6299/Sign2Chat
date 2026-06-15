export const MAX_FRAMES = 180
export const FEATURE_DIM = 165
export const NUM_CLASSES = 100
export const PREDICT_EVERY = 30
export const MIN_FRAMES_FOR_INFERENCE = 20
export const CONFIDENCE_CONFIRMED = 0.8
export const CONFIDENCE_UNCERTAIN = 0.5
// Minimum confidence for a motion-gated sign's top prediction to enter the sentence
export const CONFIDENCE_LOW = 0.7

// Capture cadence: throttle live frames to the 30fps the model was trained on.
// Browser rAF runs at 60fps+, which would feed the BiLSTM a slowed-down sign.
export const TARGET_FPS        = 30
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS   // ~33.3ms between processed frames

// Gating: how long both hands must be held in frame before detection turns on
export const HAND_HOLD_MS = 3000
// How long both hands can be absent during an active session before it auto-ends
export const HANDS_AWAY_MS = 5000

// ── Motion-gated sign detection ────────────────────────────────────────────────
export const MOTION_START_THRESHOLD = 0.04   // motion above this = a sign started
export const MOTION_STOP_THRESHOLD  = 0.008  // motion below this = sign may be ending (lower = harder to cancel)
export const PAUSE_FRAMES           = 18     // consecutive low-motion frames = sign complete (higher = harder to cancel)
export const MIN_SIGN_FRAMES        = 20     // ignore motion bursts shorter than this (noise)
export const MAX_SIGN_FRAMES        = 180    // hard cap — force inference if a sign runs too long
export const FINALIZE_FRAMES        = 150    // no-hands frames before finalizing sentence (~5s)
export const TRACKING_GRACE_FRAMES  = 10     // tolerate this many lost-tracking frames mid-sign

// Two thresholds (hysteresis) prevent flickering on borderline motion:
//   START is higher → only deliberate movement begins a sign
//   STOP is lower    → sign isn't "ended" until motion really drops
