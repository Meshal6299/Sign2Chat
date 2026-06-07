const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24]
const FACE_INDICES = [152, 10, 234, 454]

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

  const lh   = toArr(result.leftHandLandmarks,  null,         21)
  const rh   = toArr(result.rightHandLandmarks, null,         21)
  const pose = toArr(result.poseLandmarks,       POSE_INDICES, 33)
  const face = toArr(result.faceLandmarks,       FACE_INDICES, 468)

  // Normalize relative to shoulder midpoint (pose indices 1=L_shoulder, 2=R_shoulder)
  const ox = (pose[3]  + pose[6])  / 2
  const oy = (pose[4]  + pose[7])  / 2
  const oz = (pose[5]  + pose[8])  / 2

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
