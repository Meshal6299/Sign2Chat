import { useState, useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

export default function ChatPanel({ messages, onTypedMessage, isSigning, lang }) {
  const [draft, setDraft] = useState('')
  const bottomRef         = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    onTypedMessage(text)
    setDraft('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <span className="panel-label">Conversation</span>
        <span className="panel-status">{messages.length} messages</span>
      </div>

      <div className="message-list">
        {messages.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">💬</span>
            <span>No messages yet</span>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage key={msg.id} {...msg} lang={lang} />
        ))}

        {isSigning && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            Deaf user is signing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  )
}
