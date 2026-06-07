import { useEffect, useRef, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { useModel } from '../hooks/useModel'
import { extractFrameFeatures } from '../utils/landmarks'
import { PREDICT_EVERY } from '../utils/constants'
import PredictionOverlay from './PredictionOverlay'

export default function CameraPanel({ onSignSent, overridePredictions, onSendToChat, canSendOverride }) {
  const { videoRef, isActive, error, startCamera } = useCamera()
  const { init: initMediaPipe, detect, ready: mpReady } = useMediaPipe()
  const { load, loaded, pushFrame, runInference, clearBuffer, topPredictions, bufferLength } = useModel()

  const frameCountRef = useRef(0)
  const rafRef        = useRef(null)

  useEffect(() => {
    initMediaPipe()
    load()
    startCamera()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!isActive || !mpReady || !loaded) return

    const loop = () => {
      const video = videoRef.current
      if (video && video.readyState >= 2) {
        const result = detect(video)
        if (result) {
          const vec = extractFrameFeatures(result)
          pushFrame(vec)
          frameCountRef.current++
          if (frameCountRef.current % PREDICT_EVERY === 0) runInference()
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, mpReady, loaded])

  const handleSend = useCallback(() => {
    if (onSendToChat) { onSendToChat(); return }
    if (!topPredictions?.length) return
    onSignSent(topPredictions[0].name)
  }, [topPredictions, onSignSent, onSendToChat])

  const handleClear = useCallback(() => {
    clearBuffer()
    frameCountRef.current = 0
  }, [clearBuffer])

  const isSigning    = bufferLength() > 5
  const canSend      = canSendOverride ?? (topPredictions?.[0]?.prob >= 0.5)
  const activePredictions = overridePredictions ?? topPredictions
  const isLoading    = !mpReady || !loaded
  const loadingLabel = !mpReady ? 'Initializing MediaPipe…' : 'Loading sign model…'

  return (
    <div className="panel camera-panel">
      <div className="panel-header">
        <span className="panel-label">Camera</span>
        {isActive && <span className="panel-status">● Webcam active</span>}
      </div>

      <div className={`video-wrapper${isSigning ? ' signing-active' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        <PredictionOverlay predictions={activePredictions} />
        {isSigning && <div className="signing-badge">✋ Signing</div>}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {isLoading && (
        <div className="loading-status">
          <span className="spinner" />
          {loadingLabel}
        </div>
      )}

      <div className="panel-actions">
        <button className="btn btn-primary" onClick={handleSend} disabled={!canSend}>
          Send to chat
        </button>
        <button className="btn btn-secondary" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  )
}
