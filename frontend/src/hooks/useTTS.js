import { useState, useCallback } from 'react'

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const speak = useCallback((text, language = 'en') => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'ar' ? 'ar-AE' : 'en-US'
    utterance.rate = language === 'ar' ? 0.90 : 0.95

    const voices = window.speechSynthesis.getVoices()
    const match = voices.find(v => v.lang.startsWith(language === 'ar' ? 'ar' : 'en'))
    if (match) utterance.voice = match

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend   = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return { speak, stop, isSpeaking }
}
