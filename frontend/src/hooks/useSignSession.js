import { useRef, useState, useCallback } from 'react'
import { extractFrameFeatures, hasAnyHand as hasHands, resampleToFps } from '../utils/landmarks'
import {
  MOTION_START_THRESHOLD, MOTION_STOP_THRESHOLD, PAUSE_FRAMES,
  MIN_SIGN_FRAMES, MAX_SIGN_FRAMES, FINALIZE_FRAMES, TRACKING_GRACE_FRAMES, CONFIDENCE_LOW,
  TARGET_FPS, MAX_FRAMES
} from '../utils/constants'

export const SESSION_STATE = {
  IDLE:       'idle',        // no hands / no motion, buffer empty
  COLLECTING: 'collecting',  // motion detected, filling buffer with one sign
  WAITING:    'waiting',     // sign done, hand still present, awaiting next sign
}

export function useSignSession({ runInference, onFinalize }) {
  const [state,       setState]       = useState(SESSION_STATE.IDLE)
  const [predictions, setPredictions] = useState([])
  const [sentence,    setSentence]    = useState([])
  const [bufferLen,   setBufferLen]   = useState(0)

  // Refs — mutable state safe inside the rAF loop (no stale closures)
  const buffer        = useRef([])      // Float32Array(165)[]
  const bufferTimes   = useRef([])      // wall-clock ms per buffered frame (for resampling)
  const prevVec       = useRef(null)
  const isCollecting  = useRef(false)
  const pauseCounter  = useRef(0)
  const noHandsCount  = useRef(0)
  const sentenceRef   = useRef([])
  const stateRef      = useRef(SESSION_STATE.IDLE)
  const frameCount    = useRef(0)       // for the temporary motion debug log

  const setStateSynced = (s) => { stateRef.current = s; setState(s) }

  // Motion = mean abs diff of HAND columns [0:126] only (face/pose barely move)
  const computeMotion = (vec) => {
    if (!prevVec.current) return 0
    let sum = 0
    for (let i = 0; i < 126; i++) sum += Math.abs(vec[i] - prevVec.current[i])
    return sum / 126
  }

  // Run inference on the collected single-sign buffer, add word to sentence
  const finishSign = () => {
    if (buffer.current.length >= MIN_SIGN_FRAMES) {
      // Resample the captured sign to the 30fps cadence the model trained on,
      // using real timestamps. This makes prediction independent of the laptop's
      // (often sub-30fps) MediaPipe throughput, so users can sign at normal speed.
      const frames = resampleToFps(buffer.current, bufferTimes.current, TARGET_FPS, MAX_FRAMES)
      const top3 = runInference(frames)
      setPredictions(top3)
      if (top3.length > 0 && top3[0].confidence >= CONFIDENCE_LOW) {
        sentenceRef.current = [...sentenceRef.current, top3[0].clean_name]
        setSentence([...sentenceRef.current])
      }
    }
    buffer.current = []
    bufferTimes.current = []
    setBufferLen(0)
    isCollecting.current = false
    pauseCounter.current = 0
  }

  const onFrame = useCallback((result) => {
    const handsPresent = hasHands(result)

    // ── No hands — tolerate brief tracking dropouts, else end the sign ────────
    if (!handsPresent) {
      noHandsCount.current++

      // Brief dropout mid-sign (motion blur, hand at frame edge, low light):
      // hold the buffer and keep collecting so a few lost-tracking frames don't
      // chop the sign in half. Only a sustained gap counts as the signer
      // actually lowering their hands.
      if (isCollecting.current && noHandsCount.current < TRACKING_GRACE_FRAMES) {
        return
      }

      if (isCollecting.current) finishSign()   // gap is real — flush the sign

      if (stateRef.current !== SESSION_STATE.IDLE) {
        setStateSynced(SESSION_STATE.WAITING)
      }

      if (noHandsCount.current >= FINALIZE_FRAMES) {
        if (sentenceRef.current.length > 0) {
          onFinalize([...sentenceRef.current])
        }
        // full reset
        sentenceRef.current = []
        setSentence([])
        setPredictions([])
        noHandsCount.current = 0
        setStateSynced(SESSION_STATE.IDLE)
      }
      return
    }

    // ── Hands present ──────────────────────────────────────────────────────────
    noHandsCount.current = 0
    const now    = performance.now()
    const vec    = extractFrameFeatures(result)
    const motion = computeMotion(vec)
    prevVec.current = vec

    // ── Temporary debug: watch these values while signing to tune thresholds ──
    frameCount.current++
    if (frameCount.current % 5 === 0) {
      console.log(`motion=${motion.toFixed(4)} collecting=${isCollecting.current} buf=${buffer.current.length}`)
    }

    if (!isCollecting.current) {
      // Waiting for a sign to start — needs deliberate motion
      if (motion > MOTION_START_THRESHOLD) {
        isCollecting.current = true
        buffer.current       = [vec]
        bufferTimes.current  = [now]
        pauseCounter.current = 0
        setBufferLen(1)
        setStateSynced(SESSION_STATE.COLLECTING)
      }
    } else {
      // Collecting one sign
      buffer.current.push(vec)
      bufferTimes.current.push(now)
      setBufferLen(buffer.current.length)

      // Hard cap — sign running too long, force inference
      if (buffer.current.length >= MAX_SIGN_FRAMES) {
        finishSign()
        setStateSynced(SESSION_STATE.WAITING)
        return
      }

      if (motion < MOTION_STOP_THRESHOLD) {
        pauseCounter.current++
        if (pauseCounter.current >= PAUSE_FRAMES) {
          // Pause detected — this sign is complete
          finishSign()
          setStateSynced(SESSION_STATE.WAITING)
        }
      } else {
        pauseCounter.current = 0   // still moving — reset pause
      }
    }
  }, [runInference, onFinalize])

  const reset = useCallback(() => {
    buffer.current = []
    bufferTimes.current = []
    prevVec.current = null
    isCollecting.current = false
    pauseCounter.current = 0
    noHandsCount.current = 0
    sentenceRef.current = []
    setSentence([])
    setPredictions([])
    setBufferLen(0)
    setStateSynced(SESSION_STATE.IDLE)
  }, [])

  return { state, predictions, sentence, bufferLen, onFrame, reset }
}
