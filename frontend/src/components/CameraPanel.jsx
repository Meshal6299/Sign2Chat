import { useEffect, useRef, useCallback, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { useModel } from '../hooks/useModel'
import { extractFrameFeatures, hasBothHands, hasAnyHand } from '../utils/landmarks'
import { drawLandmarks } from '../utils/drawLandmarks'
import { PREDICT_EVERY, CONFIDENCE_CONFIRMED, HAND_HOLD_MS, HANDS_AWAY_MS } from '../utils/constants'
import PredictionOverlay from './PredictionOverlay'

export default function CameraPanel({ onSendToChat, onSigningChange }) {
  const { videoRef, isActive, error, startCamera } = useCamera()
  const { init: initMediaPipe, detect, ready: mpReady } = useMediaPipe()
  const { load, loaded, pushFrame, runInference, clearBuffer, topPredictions } = useModel()

  const [showLandmarks, setShowLandmarks] = useState(false)
  const showLandmarksRef = useRef(false)
  useEffect(() => { showLandmarksRef.current = showLandmarks }, [showLandmarks])

  // Gating state machine: 'idle' (no hands / not held long enough) -> 'active' (signing & predicting)
  const [phase, setPhase]         = useState('idle')
  const [countdown, setCountdown] = useState(null) // seconds remaining while both hands are held
  const [sentenceWords, setSentenceWords] = useState([])

  const phaseRef          = useRef('idle')
  const handsSinceRef     = useRef(null)
  const handsAwaySinceRef = useRef(null)
  const sentenceWordsRef  = useRef([])
  const lastWordRef       = useRef(null)

  const canvasRef     = useRef(null)
  const frameCountRef = useRef(0)
  const rafRef        = useRef(null)

  useEffect(() => {
    initMediaPipe()
    load()
    startCamera()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => { onSigningChange?.(phase === 'active') }, [phase, onSigningChange])

  // Ends the current signing session, optionally flushing the accumulated
  // sentence to chat, and resets the gate back to idle.
  const finalizeSession = useCallback((send) => {
    phaseRef.current = 'idle'
    setPhase('idle')
    handsSinceRef.current = null
    handsAwaySinceRef.current = null
    setCountdown(null)
    lastWordRef.current = null
    clearBuffer()
    frameCountRef.current = 0

    const words = sentenceWordsRef.current
    sentenceWordsRef.current = []
    setSentenceWords([])
    if (send && words.length > 0) onSendToChat?.(words)
  }, [clearBuffer, onSendToChat])

  useEffect(() => {
    if (!isActive || !mpReady || !loaded) return

    const loop = () => {
      const video = videoRef.current
      if (video && video.readyState >= 2) {
        const result = detect(video)
        if (result) {
          const now  = performance.now()
          const both = hasBothHands(result)

          if (phaseRef.current === 'idle') {
            if (both) {
              if (handsSinceRef.current === null) handsSinceRef.current = now
              const elapsed = now - handsSinceRef.current
              if (elapsed >= HAND_HOLD_MS) {
                phaseRef.current = 'active'
                setPhase('active')
                handsAwaySinceRef.current = null
                setCountdown(null)
              } else {
                setCountdown(Math.ceil((HAND_HOLD_MS - elapsed) / 1000))
              }
            } else {
              if (handsSinceRef.current !== null) setCountdown(null)
              handsSinceRef.current = null
            }
          } else {
            // Active: track how long NO hand has been visible so the
            // session can auto-end and flush the sentence to chat.
            // (One-handed signs are common, so only "no hands at all"
            // counts as the signer stepping away.)
            if (hasAnyHand(result)) {
              handsAwaySinceRef.current = null
            } else {
              if (handsAwaySinceRef.current === null) handsAwaySinceRef.current = now
              if (now - handsAwaySinceRef.current >= HANDS_AWAY_MS) {
                finalizeSession(true)
              }
            }

            if (phaseRef.current === 'active') {
              const vec = extractFrameFeatures(result)
              pushFrame(vec)
              frameCountRef.current++
              if (frameCountRef.current % PREDICT_EVERY === 0) {
                const top3 = runInference()
                const best = top3?.[0]
                if (best && best.prob >= CONFIDENCE_CONFIRMED && best.name !== lastWordRef.current) {
                  lastWordRef.current = best.name
                  sentenceWordsRef.current = [...sentenceWordsRef.current, best.name]
                  setSentenceWords(sentenceWordsRef.current)
                }
              }
            }
          }

          const canvas = canvasRef.current
          if (canvas && video.videoWidth) {
            if (canvas.width !== video.videoWidth)   canvas.width  = video.videoWidth
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            drawLandmarks(ctx, showLandmarksRef.current ? result : null, canvas.width, canvas.height)
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, mpReady, loaded, detect, pushFrame, runInference, finalizeSession])

  const isLoading    = !mpReady || !loaded
  const loadingLabel = !mpReady ? 'Initializing MediaPipe…' : 'Loading sign model…'

  return (
    <div className="panel camera-panel">
      <div className="panel-header">
        <span className="panel-label">Camera</span>
        <div className="panel-header-right">
          {isActive && <span className="panel-status">● Webcam active</span>}
        </div>
      </div>

      <div className={`video-wrapper${phase === 'active' ? ' signing-active' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <canvas ref={canvasRef} className="landmark-canvas" />
        <PredictionOverlay predictions={topPredictions} />

        {phase === 'active' && <div className="signing-badge">✋ Signing</div>}

        {phase === 'idle' && countdown === null && (
          <div className="gate-hint">Show both hands to start signing</div>
        )}

        {phase === 'idle' && countdown !== null && (
          <div className="gate-countdown">
            <span className="gate-countdown-ring">{countdown}</span>
            Hold steady…
          </div>
        )}

        {phase === 'active' && sentenceWords.length > 0 && (
          <div className="sentence-strip">
            {sentenceWords.map((w, i) => (
              <span className="sentence-chip" key={i}>{w}</span>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {isLoading && (
        <div className="loading-status">
          <span className="spinner" />
          {loadingLabel}
        </div>
      )}

      <div className="panel-actions">
        <button
          className={`landmark-toggle${showLandmarks ? ' active' : ''}`}
          onClick={() => setShowLandmarks(v => !v)}
          aria-pressed={showLandmarks}
        >
          Landmarks: {showLandmarks ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  )
}
