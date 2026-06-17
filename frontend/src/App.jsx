import { useState, useCallback } from 'react'
import CameraPanel from './components/CameraPanel'
import ChatPanel from './components/ChatPanel'
import SignReference from './components/SignReference'
import SignSequencePlayer from './components/SignSequencePlayer'
import { useChat } from './hooks/useChat'
import { useLLMSmoothing } from './hooks/useLLMSmoothing'
import { useTextToSign } from './hooks/useTextToSign'
import { useTTS } from './hooks/useTTS'
import './App.css'

export default function App() {
  const { messages, addMessage } = useChat()
  const [lang]                  = useState('en')
  const [isSigning, setIsSigning] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [signCache, setSignCache] = useState({})   // hearing msg id → translated sign clips
  const [loadingSignId, setLoadingSignId] = useState(null)
  const [signSeq, setSignSeq] = useState(null)     // { items, text } being played

  const { smooth, error: llmError } = useLLMSmoothing()
  const { translate } = useTextToSign()
  const { speak } = useTTS()

  // Hearing user sends text → just show it. No auto sign playback.
  const handleTypedMessage = useCallback((text) => {
    addMessage({
      id:         Date.now(),
      sender:     'hearing',
      text,
      viaSigning: false,
      timestamp:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
  }, [addMessage])

  // The "Play in sign language" button translates on demand (cached per message)
  // then opens the sequence player.
  const requestSign = useCallback(async (id, text) => {
    const cached = signCache[id]
    if (cached) { setSignSeq({ items: cached, text }); return }

    setLoadingSignId(id)
    const items = await translate(text)
    setLoadingSignId(null)
    if (items.length) {
      setSignCache(prev => ({ ...prev, [id]: items }))
      setSignSeq({ items, text })
    }
  }, [signCache, translate])

  const handleSendToChat = useCallback(async (words) => {
    if (!words?.length) return

    const { arabic, english, raw } = await smooth(words, lang)

    addMessage({
      id:         Date.now(),
      sender:     'deaf',
      text:       raw,
      arabic,
      english,
      rawWords:   words,
      viaSigning: true,
      timestamp:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })

    speak(lang === 'ar' ? (arabic || raw) : (english || raw), lang)
    // Note: don't clear llmError here — it self-clears on the next smooth() call.
    // Clearing it immediately hid transient API failures (banner flashed away).
  }, [lang, smooth, addMessage, speak])

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-name">Sign2Chat</span>
        <div className="header-right">
          <button className="ref-open-btn" onClick={() => setShowReference(true)}>
            📖 Sign reference
          </button>
        </div>
      </header>

      {llmError && (
        <div className="llm-error-banner">
          ⚠ LLM smoothing failed: {llmError}
        </div>
      )}

      <main className="app-body">
        <div className="camera-col">
          <CameraPanel
            onSendToChat={handleSendToChat}
            onSigningChange={setIsSigning}
          />
        </div>

        <div className="divider" />

        <ChatPanel
          messages={messages}
          onTypedMessage={handleTypedMessage}
          isSigning={isSigning}
          lang={lang}
          onRequestSign={requestSign}
          loadingSignId={loadingSignId}
        />
      </main>

      {showReference && <SignReference onClose={() => setShowReference(false)} />}

      {signSeq && (
        <SignSequencePlayer
          items={signSeq.items}
          text={signSeq.text}
          onClose={() => setSignSeq(null)}
        />
      )}
    </div>
  )
}
