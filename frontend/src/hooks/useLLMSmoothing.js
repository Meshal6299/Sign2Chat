import { useState, useCallback } from 'react'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const FORMAT_INSTRUCTION = `\n\nUse exactly this format:\n**الترجمة باللهجة الإماراتية (Emarati Dialect):**\n* [sentence in Emirati Arabic]\n\n**English Translation:**\n* [sentence in English]`

const SYSTEM_PROMPTS = {
  ar: "أنت خبير ومترجم محترف للغة الإشارة الإماراتية (UAESL). دورك هو استقبال سلسلة من الكلمات الفردية المعزولة التي يقدمها الأصم من قاموس محدد، وتحويلها ذكياً وسياقياً إلى جملة مترابطة ومفهومة تماماً باللهجة الإماراتية الدارجة (المحلية العفوية)، وتجنب الفصحى إلا للضرورة الأسماء أو المعالم. يجب عليك استنتاج الضمائر، حروف الجر، والأزمنة (الماضي/المضارع/المستقبل) بناءً على الكلمات المصاحبة والسياق الثقافي الإماراتي (مثل استخدام 'فيني/فيك' للأمراض، 'أبا/أبغي' للمراد، 'تسوّي/تطبخ' للطعام). بعد صياغة الجملة الإماراتية، قم بتقديم ترجمة إنجليزية دقيقة وسلسة موازية لها." + FORMAT_INSTRUCTION,

  en: "You are an expert Sign Language Translator specializing in UAE Sign Language (UAESL) and deeply familiar with Emirati culture, idioms, and daily speech patterns. Your task is to take an isolated sequence of individual words provided by a signer from a specific dictionary and contextually reconstruct them into a coherent, meaningful sentence.\n\nSince sign language typically lacks copulas, definite articles, tense inflections, and conjunctions, you must apply the following structural rules:\n1. Cultural & Contextual Inference: Deduce the missing pronouns, prepositions, and logical tenses based on the combination of words (e.g., family words mixed with locations imply group activity; symptoms mixed with booking imply seeking medical help).\n2. Primary Output (Spoken Emirati Dialect): Formulate the sentence in authentic, natural-sounding everyday Emirati Arabic (اللهجة الإماراتية). Avoid Modern Standard Arabic (الفصحى) entirely unless referencing a specific proper noun or landmark. Use local vernacular, verbs, and phrasing (e.g., 'فيني' for experiencing an illness, 'أبا' or 'أبغي' for wanting/desiring, 'تحرّت' or 'افترت' for thinking/seeking, 'تسوّي' for cooking/making).\n3. Secondary Output (English Translation): Translate the reconstructed Emirati sentence into natural, grammatically correct English that captures the exact intent and emotional tone of the signer." + FORMAT_INSTRUCTION,
}

// Extract Arabic and English lines from the structured LLM response
function parseResponse(raw) {
  const arabicMatch = raw.match(
    /\*\*.*?Emarati Dialect.*?\*\*[^*\n]*\n\*\s*(.+)/i
  ) || raw.match(
    /\*\*الترجمة.*?\*\*[^*\n]*\n\*\s*(.+)/
  )
  const englishMatch = raw.match(
    /\*\*English Translation.*?\*\*[^*\n]*\n\*\s*(.+)/i
  )

  return {
    arabic:  arabicMatch?.[1]?.trim()  || null,
    english: englishMatch?.[1]?.trim() || null,
  }
}

export function useLLMSmoothing() {
  const [isLoading, setIsLoading]       = useState(false)
  const [smoothedText, setSmoothedText] = useState('')
  const [error, setError]               = useState(null)

  // Returns { arabic, english, raw }
  const smooth = useCallback(async (words, lang = 'en') => {
    if (!words || words.length === 0) return { arabic: null, english: null, raw: '' }

    const rawInput = words
      .map(w => w.replace(/_\d+$/, '').replace(/_/g, ' '))
      .join(' · ')

    setIsLoading(true)
    setError(null)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en }],
          },
          contents: [{
            role: 'user',
            parts: [{ text: `Signed words: ${rawInput}` }],
          }],
          // thinkingBudget: 0 disables 2.5-flash's default reasoning so the whole
          // token budget goes to the answer (and lowers latency for real-time use).
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      })

      if (!response.ok) throw new Error(`Gemini API error ${response.status}`)

      const data  = await response.json()
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      const { arabic, english } = parseResponse(raw)

      setSmoothedText(raw)
      return { arabic, english, raw }

    } catch (err) {
      setError(err.message || 'LLM smoothing failed')
      const fallback = words
        .map(w => w.replace(/_\d+$/, '').replace(/_/g, ' '))
        .join(' ')
      setSmoothedText(fallback)
      return { arabic: null, english: null, raw: fallback }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setSmoothedText('')
    setError(null)
  }, [])

  return { smooth, smoothedText, isLoading, error, reset }
}
