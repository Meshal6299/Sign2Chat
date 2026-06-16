import { useEffect, useRef, useCallback, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { useModel } from '../hooks/useModel'
import { useSignSession, SESSION_STATE } from '../hooks/useSignSession'
import { drawLandmarks } from '../utils/drawLandmarks'
import { FRAME_INTERVAL_MS } from '../utils/constants'
import PredictionOverlay from './PredictionOverlay'

export default function CameraPanel({ onSendToChat, onSigningChange }) {
  const { videoRef, isActive, error, startCamera } = useCamera()
  const { init: initMediaPipe, detect, ready: mpReady } = useMediaPipe()
  const { load, loaded, pushFrame, runInference, clearBuffer, topPredictions } = useModel()

  const [showLandmarks, setShowLandmarks] = useState(false)
  const showLandmarksRef = useRef(false)
  useEffect(() => { showLandmarksRef.current = showLandmarks }, [showLandmarks])

  const canvasRef       = useRef(null)
  const rafRef          = useRef(null)
  const lastProcessRef  = useRef(0)   // timestamp of last processed frame (30fps throttle)

  // Adapter: run model inference on one explicit single-sign buffer of frames.
  // useModel owns its own internal frame buffer (it also drives the prediction
  // overlay), so we load the collected sign's frames into it, infer, then map
  // the result to the { clean_name, confidence } shape useSignSession expects.
  const runInferenceOnBuffer = useCallback((frames) => {
    clearBuffer()
    frames.forEach(f => pushFrame(f))
    const top3 = runInference() || []
    return top3.map(t => ({ ...t, clean_name: t.name, confidence: t.prob }))
  }, [clearBuffer, pushFrame, runInference])

  const { state, sentence, bufferLen, onFrame } = useSignSession({
    runInference: runInferenceOnBuffer,
    onFinalize:   onSendToChat,
  })

  // Keep onFrame in a ref so the rAF loop never restarts on its identity change
  // and never reads a stale closure (all its real state lives in refs anyway).
  const onFrameRef = useRef(onFrame)
  useEffect(() => { onFrameRef.current = onFrame }, [onFrame])

  useEffect(() => {
    initMediaPipe()
    load()
    startCamera()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => { onSigningChange?.(state !== SESSION_STATE.IDLE) }, [state, onSigningChange])

  useEffect(() => {
    if (!isActive || !mpReady || !loaded) return

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)

      // Throttle to ~30fps so the per-frame motion cadence the model sees matches
      // the fixed 30fps it was trained on (browser rAF runs at 60fps+, which would
      // feed a slowed-down sign). Also makes the frame-count gates map to real time.
      const now = performance.now()
      if (now - lastProcessRef.current < FRAME_INTERVAL_MS) return
      lastProcessRef.current = now

      const video = videoRef.current
      if (video && video.readyState >= 2) {
        const result = detect(video)
        if (result) {
          onFrameRef.current(result)

          const canvas = canvasRef.current
          if (canvas && video.videoWidth) {
            if (canvas.width !== video.videoWidth)   canvas.width  = video.videoWidth
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            drawLandmarks(ctx, showLandmarksRef.current ? result : null, canvas.width, canvas.height)
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, mpReady, loaded, detect])

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

      <div className={`video-wrapper${state !== SESSION_STATE.IDLE ? ' signing-active' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <canvas ref={canvasRef} className="landmark-canvas" />
        <PredictionOverlay predictions={topPredictions} />

        {state === SESSION_STATE.COLLECTING && <div className="signing-badge">✋ Signing</div>}

        {state === SESSION_STATE.IDLE && (
          <div className="gate-hint">Show your hands and start signing</div>
        )}

        {state === SESSION_STATE.COLLECTING && (
          <div className="gate-hint">Signing… ({bufferLen})</div>
        )}

        {state === SESSION_STATE.WAITING && (
          <div className="gate-hint">Sign next word, or lower hands to send</div>
        )}

        {sentence.length > 0 && (
          <div className="sentence-strip">
            {sentence.map((w, i) => (
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
