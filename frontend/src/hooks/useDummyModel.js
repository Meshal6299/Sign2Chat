import { useState, useRef, useCallback } from 'react'

export function useDummyModel(onWordDetected) {
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentWord, setCurrentWord] = useState(null)
  const [confidence, setConfidence]   = useState(0)
  const [top3, setTop3]               = useState([])
  const timeoutsRef                   = useRef([])

  const play = useCallback((session) => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    setIsPlaying(true)

    let elapsed = 0
    const WORD_DELAY_MS = 1200
    session.signer_words.forEach((word, index) => {
      elapsed += WORD_DELAY_MS
      const t = setTimeout(() => {
        const fakeConf = 0.75 + Math.random() * 0.20
        const fakeTop3 = [
          { name: word,        prob: fakeConf },
          { name: 'Unknown1',  prob: (1 - fakeConf) * 0.6 },
          { name: 'Unknown2',  prob: (1 - fakeConf) * 0.4 },
        ]
        setCurrentWord(word)
        setConfidence(fakeConf)
        setTop3(fakeTop3)
        onWordDetected({ word })

        if (index === session.signer_words.length - 1) {
          setTimeout(() => setIsPlaying(false), 1000)
        }
      }, elapsed)
      timeoutsRef.current.push(t)
    })
  }, [onWordDetected])

  const stop = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    setIsPlaying(false)
    setCurrentWord(null)
    setConfidence(0)
    setTop3([])
  }, [])

  return { isPlaying, currentWord, confidence, top3, play, stop }
}
