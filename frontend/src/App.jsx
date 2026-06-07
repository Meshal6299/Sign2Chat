import { useState, useCallback, useEffect, useRef } from 'react'
import CameraPanel from './components/CameraPanel'
import ChatPanel from './components/ChatPanel'
import { DummyControls } from './components/DummyControls'
import { useChat } from './hooks/useChat'
import { useDummyModel } from './hooks/useDummyModel'
import { useLLMSmoothing } from './hooks/useLLMSmoothing'
import './App.css'

export default function App() {
  const { messages, addTypedMessage, addMessage } = useChat()
  const [signedWords, setSignedWords] = useState([])
  const [lang, setLang]               = useState('en')

  const { smooth, isLoading: isSmoothing, error: llmError, reset: resetSmoothing } = useLLMSmoothing()

  const handleWordDetected = useCallback((sign) => {
    setSignedWords(prev => [...prev, sign.word])
  }, [])

  const dummyModel = useDummyModel(handleWordDetected)

  const handleSendToChat = useCallback(async () => {
    if (signedWords.length === 0) return

    const { arabic, english, raw } = await smooth(signedWords, lang)

    addMessage({
      id:         Date.now(),
      sender:     'deaf',
      text:       raw,
      arabic,
      english,
      rawWords:   signedWords,
      viaSigning: true,
      timestamp:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })

    setSignedWords([])
    resetSmoothing()
  }, [signedWords, lang, smooth, addMessage, resetSmoothing])

  // Use a ref so the effect below always calls the latest version (avoids stale closure)
  const sendRef = useRef(handleSendToChat)
  useEffect(() => { sendRef.current = handleSendToChat }, [handleSendToChat])

  // Auto-send to chat when the dummy session finishes playing
  const wasPlayingRef = useRef(false)
  useEffect(() => {
    if (wasPlayingRef.current && !dummyModel.isPlaying) {
      sendRef.current()
    }
    wasPlayingRef.current = dummyModel.isPlaying
  }, [dummyModel.isPlaying])

  const handleStopSession = useCallback(() => {
    dummyModel.stop()
    setSignedWords([])
  }, [dummyModel])

  const dummyPredictions = dummyModel.top3.length > 0 ? dummyModel.top3 : null

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
            onSignSent={addMessage}
            overridePredictions={dummyPredictions}
            onSendToChat={handleSendToChat}
            canSendOverride={signedWords.length > 0 || undefined}
          />
          <DummyControls
            onSessionPlay={dummyModel.play}
            onStop={handleStopSession}
            isPlaying={dummyModel.isPlaying}
            isSmoothing={isSmoothing}
            signedWords={signedWords}
            lang={lang}
          />
        </div>

        <div className="divider" />

        <ChatPanel
          messages={messages}
          onTypedMessage={addTypedMessage}
          isSigning={dummyModel.isPlaying}
          lang={lang}
        />
      </main>
    </div>
  )
}
