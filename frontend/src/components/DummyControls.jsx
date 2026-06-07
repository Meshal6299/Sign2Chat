import { useState, useEffect } from 'react'

export function DummyControls({ onSessionPlay, onStop, isPlaying, isSmoothing, signedWords, lang }) {
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/dummy_signing_session.json')
      .then(r => r.json())
      .then(data => {
        const sessions = data.map((s, i) => ({
          id:           String(i),
          context:      s.signer_words.slice(0, 3).join(' · '),
          signer_words: s.signer_words,
        }))
        setSessions(sessions)
        setSelected(sessions[0])
      })
  }, [])

  const statusLabel = isSmoothing
    ? (lang === 'ar' ? '✦ جاري المعالجة…' : '✦ Smoothing with AI…')
    : isPlaying
    ? '● Playing session'
    : null

  return (
    <div className="dummy-controls">
      <span className="dummy-label">DEMO</span>

      <select
        className="dummy-select"
        value={selected?.id || ''}
        onChange={e => setSelected(sessions.find(s => s.id === e.target.value))}
        disabled={isPlaying}
      >
        {sessions.map(s => (
          <option key={s.id} value={s.id}>{s.context}</option>
        ))}
      </select>

      <div className="dummy-actions">
        <button
          className="btn btn-primary dummy-btn"
          onClick={() => selected && onSessionPlay(selected)}
          disabled={isPlaying || !selected}
        >
          {isPlaying ? 'Playing…' : '▶ Play'}
        </button>
        <button
          className="btn btn-secondary dummy-btn"
          onClick={onStop}
          disabled={!isPlaying}
        >
          ■ Stop
        </button>
      </div>

      {signedWords?.length > 0 && (
        <div className="dummy-words">
          {signedWords.map((w, i) => (
            <span key={i} className="dummy-word-pill">
              {w.replace(/_\d+$/, '').replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {statusLabel && (
        <span className="dummy-status">{statusLabel}</span>
      )}
    </div>
  )
}
