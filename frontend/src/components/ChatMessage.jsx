export default function ChatMessage({ sender, text, arabic, english, timestamp, viaSigning, lang }) {
  const isDeaf     = sender === 'deaf'
  const isBilingual = isDeaf && arabic && english

  return (
    <div className={`chat-message ${isDeaf ? 'deaf' : 'hearing'}`}>
      <div className="msg-meta">
        <span className="sender-name">{isDeaf ? 'Deaf' : 'Hearing'}</span>
        <span className="timestamp">{timestamp}</span>
      </div>

      <div className="bubble">
        {isBilingual ? (
          <>
            <span className="bubble-arabic" dir="rtl" lang="ar">{arabic}</span>
            <span className="bubble-divider" />
            <span className="bubble-english">{english}</span>
          </>
        ) : (
          text
        )}
        {viaSigning && <span className="signed-chip">✋ signed</span>}
      </div>
    </div>
  )
}
