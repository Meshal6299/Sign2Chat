import { useRef, useState, useCallback } from 'react'
import { HolisticLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export function useMediaPipe() {
  const landmarkerRef = useRef(null)
  const [ready, setReady] = useState(false)

  const init = useCallback(async () => {
    if (landmarkerRef.current) return
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/wasm'
    )
    landmarkerRef.current = await HolisticLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/holistic_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      minFaceDetectionConfidence: 0.5,
      minPoseDetectionConfidence: 0.5,
      minHandLandmarksConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputSegmentationMasks: false,
    })
    setReady(true)
  }, [])

  const detect = useCallback((videoElement) => {
    if (!landmarkerRef.current || !videoElement) return null
    return landmarkerRef.current.detectForVideo(videoElement, performance.now())
  }, [])

  return { init, detect, ready }
}
