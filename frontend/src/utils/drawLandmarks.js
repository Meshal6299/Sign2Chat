const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
]

const FACE_REF_INDICES = [152, 10, 234, 454]

export function drawLandmarks(ctx, result, width, height) {
  ctx.clearRect(0, 0, width, height)
  if (!result) return

  if (result.poseLandmarks?.length) {
    drawConnections(ctx, result.poseLandmarks, POSE_CONNECTIONS, width, height, 'rgba(100,200,255,0.6)', 2)
    drawPoints(ctx, result.poseLandmarks, width, height, 'rgba(100,200,255,0.9)', 3)
  }
  if (result.leftHandLandmarks?.length) {
    drawConnections(ctx, result.leftHandLandmarks, HAND_CONNECTIONS, width, height, 'rgba(80,220,130,0.8)', 2)
    drawPoints(ctx, result.leftHandLandmarks, width, height, 'rgba(80,220,130,1)', 3)
  }
  if (result.rightHandLandmarks?.length) {
    drawConnections(ctx, result.rightHandLandmarks, HAND_CONNECTIONS, width, height, 'rgba(180,130,255,0.8)', 2)
    drawPoints(ctx, result.rightHandLandmarks, width, height, 'rgba(180,130,255,1)', 3)
  }
  if (result.faceLandmarks?.length) {
    FACE_REF_INDICES.forEach(i => {
      const lm = result.faceLandmarks[i]
      if (!lm) return
      ctx.beginPath()
      ctx.arc(lm.x * width, lm.y * height, 2, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,220,100,0.7)'
      ctx.fill()
    })
  }
}

function drawPoints(ctx, landmarks, w, h, color, r) {
  ctx.fillStyle = color
  landmarks.forEach(lm => {
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, r, 0, 2 * Math.PI)
    ctx.fill()
  })
}

function drawConnections(ctx, landmarks, connections, w, h, color, lw) {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  connections.forEach(([a, b]) => {
    const p1 = landmarks[a], p2 = landmarks[b]
    if (!p1 || !p2) return
    ctx.beginPath()
    ctx.moveTo(p1.x * w, p1.y * h)
    ctx.lineTo(p2.x * w, p2.y * h)
    ctx.stroke()
  })
}
