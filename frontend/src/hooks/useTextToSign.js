import { useState, useCallback, useRef } from 'react'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM_PROMPT =
  "You convert a sentence into UAE Sign Language (UAESL) gloss so it can be played " +
  "back as a sequence of sign videos. You may ONLY use words from the ALLOWED list — " +
  "match them exactly as written (case-insensitive). Sign language drops articles, the " +
  "verb 'to be', and inflections, and uses topic-first order. Pick the closest allowed " +
  "words that convey the meaning, in natural signing order, and never invent words that " +
  "are not in the list. If nothing in the list fits, return an empty array. " +
  "Respond with a JSON array of strings."

// Maps typed chat text → an ordered list of reference-vocabulary signs to play.
export function useTextToSign() {
  const vocabRef = useRef(null)   // { entries, byLabel } — loaded once
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)

  const loadVocab = useCallback(async () => {
    if (vocabRef.current) return vocabRef.current
    const res = await fetch('/reference_index.json')
    if (!res.ok) throw new Error(`Couldn't load vocabulary (HTTP ${res.status})`)
    const entries = await res.json()
    const byLabel = new Map(entries.map(e => [e.label.toLowerCase(), e]))
    vocabRef.current = { entries, byLabel }
    return vocabRef.current
  }, [])

  // Returns an ordered array of manifest entries ({ word, label, category, video }).
  const translate = useCallback(async (text) => {
    const clean = (text || '').trim()
    if (!clean) return []

    setIsLoading(true)
    setError(null)
    try {
      const { entries, byLabel } = await loadVocab()
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{
            text: `Allowed words: ${entries.map(e => e.label).join(', ')}\n\nSentence: "${clean}"`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
          temperature: 0.2,
          maxOutputTokens: 256,
          thinkingConfig: { thinkingBudget: 0 },
        },
      })

      const TRANSIENT = new Set([429, 500, 502, 503])
      let response
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        if (response.ok || !TRANSIENT.has(response.status)) break
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      }
      if (!response.ok) throw new Error(`Gemini API error ${response.status}`)

      const data = await response.json()
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]'

      let labels
      try { labels = JSON.parse(raw) } catch { labels = [] }
      if (!Array.isArray(labels)) labels = []

      // Map the model's chosen labels back to real manifest entries, dropping
      // any it hallucinated that aren't actually in the vocabulary.
      return labels
        .map(l => byLabel.get(String(l).trim().toLowerCase()))
        .filter(Boolean)

    } catch (err) {
      setError(err.message || 'Text-to-sign failed')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [loadVocab])

  return { translate, isLoading, error }
}
