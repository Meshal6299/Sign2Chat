const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24]
const FACE_INDICES = [152, 10, 234, 454]

// Last valid shoulder-midpoint origin, carried forward across frames where pose
// momentarily drops so those frames aren't left un-normalized (origin 0).
let lastOrigin = null

export function hasBothHands(result) {
  return !!(result?.leftHandLandmarks?.length && result?.rightHandLandmarks?.length)
}

export function hasAnyHand(result) {
  return !!(result?.leftHandLandmarks?.length || result?.rightHandLandmarks?.length)
}

export function extractFrameFeatures(result) {
  const toArr = (lmList, indices = null, n = 21) => {
    if (!lmList || lmList.length === 0) {
      const k = indices ? indices.length : n
      return new Float32Array(k * 3)
    }
    const arr = indices ? indices.map(i => lmList[i]) : lmList
    return new Float32Array(arr.flatMap(lm => [
      2 * (lm.x - 0.5),
      2 * (lm.y - 0.5),
      lm.z,
    ]))
  }

  const lh   = toArr(result.leftHandLandmarks?.[0],  null,         21)
  const rh   = toArr(result.rightHandLandmarks?.[0], null,         21)
  const pose = toArr(result.poseLandmarks?.[0],       POSE_INDICES, 33)
  const face = toArr(result.faceLandmarks?.[0],       FACE_INDICES, 468)

  // Normalize relative to shoulder midpoint (pose indices 1=L_shoulder, 2=R_shoulder).
  // If pose dropped this frame, reuse the last known origin so the frame isn't
  // injected as a spatial jump (un-normalized = origin 0).
  const posePresent = !!(result.poseLandmarks?.[0])
  let ox = (pose[3]  + pose[6])  / 2
  let oy = (pose[4]  + pose[7])  / 2
  let oz = (pose[5]  + pose[8])  / 2
  if (posePresent) {
    lastOrigin = [ox, oy, oz]
  } else if (lastOrigin) {
    ox = lastOrigin[0]; oy = lastOrigin[1]; oz = lastOrigin[2]
  }

  const normalize = (arr) => {
    const out = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 3) {
      out[i]   = arr[i]   - ox
      out[i+1] = arr[i+1] - oy
      out[i+2] = arr[i+2] - oz
    }
    return out
  }

  const vec = new Float32Array(165)
  vec.set(normalize(lh),   0)
  vec.set(normalize(rh),  63)
  vec.set(normalize(pose),126)
  vec.set(normalize(face),153)
  return vec
}
