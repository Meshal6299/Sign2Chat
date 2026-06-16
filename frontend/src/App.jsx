import { useState, useCallback } from 'react'
import CameraPanel from './components/CameraPanel'
import ChatPanel from './components/ChatPanel'
import { useChat } from './hooks/useChat'
import { useLLMSmoothing } from './hooks/useLLMSmoothing'
import { useTTS } from './hooks/useTTS'
import './App.css'

export default function App() {
  const { messages, addTypedMessage, addMessage } = useChat()
  const [lang, setLang]         = useState('en')
  const [isSigning, setIsSigning] = useState(false)

  const { smooth, error: llmError } = useLLMSmoothing()
  const { speak } = useTTS()

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
          <span className="user-badge">
            <span className="user-dot deaf" />
            Deaf user
          </span>
          <span className="user-badge">
            <span className="user-dot hearing" />
            Hearing user
          </span>

          <div className="lang-toggle" role="group" aria-label="Output language">
            <button
              className={`lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn${lang === 'ar' ? ' active' : ''}`}
              onClick={() => setLang('ar')}
            >
              AR
            </button>
          </div>

          <span className="live-badge">
            <span className="live-dot" />
            Live
          </span>
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
          onTypedMessage={addTypedMessage}
          isSigning={isSigning}
          lang={lang}
        />
      </main>
    </div>
  )
}
