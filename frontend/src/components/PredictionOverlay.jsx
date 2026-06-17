export default function PredictionOverlay({ predictions }) {
  if (!predictions?.length) return null

  const top = predictions[0]

  return (
    <div className="prediction-overlay">
      <div className="prediction-top">
        <span className="pred-word">{top.name}</span>
      </div>
    </div>
  )
}
