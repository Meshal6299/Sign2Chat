import { useState, useCallback } from 'react'

export function useChat() {
  const [messages, setMessages] = useState([])

  const addSignMessage = useCallback((word) => {
    setMessages(prev => [...prev, {
      id:         Date.now(),
      sender:     'deaf',
      text:       word,
      timestamp:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      viaSigning: true,
    }])
  }, [])

  const addTypedMessage = useCallback((text) => {
    setMessages(prev => [...prev, {
      id:         Date.now(),
      sender:     'hearing',
      text,
      timestamp:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      viaSigning: false,
    }])
  }, [])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg])
  }, [])

  return { messages, addSignMessage, addTypedMessage, addMessage }
}
