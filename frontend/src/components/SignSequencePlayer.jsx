import { useCallback, useEffect, useRef, useState } from 'react'

// Plays a list of reference sign clips back-to-back (the sign-language rendering
// of a hearing user's typed message). Auto-advances when each clip ends.
export default function SignSequencePlayer({ items, text, onClose }) {
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const videoRef = useRef(null)
  const current = items[idx]

  const goto = useCallback(i => {
    setIdx(Math.max(0, Math.min(i, items.length - 1)))
    setDone(false)
  }, [items.length])

  const replayAll = () => goto(0)

  // When a clip ends, move to the next; stop on the last one.
  const handleEnded = () => {
    if (idx < items.length - 1) setIdx(idx + 1)
    else setDone(true)
  }

  // Esc closes; arrow keys step through clips.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goto(idx + 1)
      else if (e.key === 'ArrowLeft') goto(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, goto, onClose])

  return (
    <div className="player-overlay" onClick={onClose}>
      <div className="player-box" onClick={e => e.stopPropagation()}>
        <div className="player-header">
          <span className="player-title">Sign for: “{text}”</span>
          <span className="ref-count">{idx + 1} / {items.length}</span>
          <button className="ref-close" onClick={onClose} aria-label="Close player">✕</button>
        </div>

        <div className="player-stage">
          {items.length > 1 && (
            <button className="player-nav prev" onClick={() => goto(idx - 1)} aria-label="Previous sign">‹</button>
          )}
          <video
            key={`${idx}-${current.video}`}  /* remount each step so it autoplays */
            ref={videoRef}
            className="player-video"
            src={current.video}
            autoPlay
            playsInline
            controls
            onEnded={handleEnded}
          />
          {items.length > 1 && (
            <button className="player-nav next" onClick={() => goto(idx + 1)} aria-label="Next sign">›</button>
          )}
        </div>

        <div className="seq-footer">
          <div className="seq-strip">
            {items.map((it, i) => (
              <button
                key={`${it.word}-${i}`}
                className={`seq-chip${i === idx ? ' active' : ''}${i < idx || done ? ' played' : ''}`}
                onClick={() => goto(i)}
              >
                {it.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary seq-replay" onClick={replayAll}>↻ Replay</button>
        </div>
      </div>
    </div>
  )
}
