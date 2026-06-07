import { useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import { MAX_FRAMES, FEATURE_DIM, MIN_FRAMES_FOR_INFERENCE } from '../utils/constants'

export function useModel() {
  const modelRef    = useRef(null)
  const classMapRef = useRef(null)
  const bufferRef   = useRef([])
  const [loaded, setLoaded]         = useState(false)
  const [topPredictions, setTopPredictions] = useState(null)

  const load = useCallback(async () => {
    const [model, classMapRaw] = await Promise.all([
      tf.loadLayersModel('/model/model.json'),
      fetch('/class_map.json').then(r => r.json()),
    ])
    modelRef.current = model

    const sortedEntries = Object.values(classMapRaw).sort((a, b) => a.label_id - b.label_id)
    classMapRef.current = sortedEntries.map(e => e.clean_name)
    setLoaded(true)
  }, [])

  const pushFrame = useCallback((vec) => {
    bufferRef.current.push(vec)
    if (bufferRef.current.length > MAX_FRAMES) bufferRef.current.shift()
  }, [])

  const runInference = useCallback(() => {
    const model    = modelRef.current
    const indexMap = classMapRef.current
    const frames   = bufferRef.current
    if (!model || !indexMap || frames.length < MIN_FRAMES_FOR_INFERENCE) return

    const seq    = new Float32Array(MAX_FRAMES * FEATURE_DIM)
    const recent = frames.slice(-MAX_FRAMES)
    const offset = MAX_FRAMES - recent.length
    recent.forEach((frame, i) => seq.set(frame, (offset + i) * FEATURE_DIM))

    const inputTensor = tf.tensor3d(seq, [1, MAX_FRAMES, FEATURE_DIM])
    const output      = model.predict(inputTensor)
    const probs       = output.dataSync()
    inputTensor.dispose()
    output.dispose()

    const indexed = Array.from(probs).map((p, i) => ({ classId: i, prob: p, name: indexMap[i] }))
    indexed.sort((a, b) => b.prob - a.prob)
    const top3 = indexed.slice(0, 3)
    setTopPredictions(top3)
    return top3
  }, [])

  const clearBuffer = useCallback(() => {
    bufferRef.current = []
    setTopPredictions(null)
  }, [])

  const bufferLength = () => bufferRef.current.length

  return { load, loaded, pushFrame, runInference, clearBuffer, topPredictions, bufferLength }
}
