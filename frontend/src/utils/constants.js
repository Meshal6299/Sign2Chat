export const MAX_FRAMES = 180
export const FEATURE_DIM = 165
export const NUM_CLASSES = 100
export const PREDICT_EVERY = 45
export const MIN_FRAMES_FOR_INFERENCE = 60
export const CONFIDENCE_CONFIRMED = 0.8
export const CONFIDENCE_UNCERTAIN = 0.5

// Gating: how long both hands must be held in frame before detection turns on
export const HAND_HOLD_MS = 3000
// How long both hands can be absent during an active session before it auto-ends
export const HANDS_AWAY_MS = 5000
