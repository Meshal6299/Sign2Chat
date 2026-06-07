import { CONFIDENCE_CONFIRMED, CONFIDENCE_UNCERTAIN } from '../utils/constants'

export default function PredictionOverlay({ predictions }) {
  if (!predictions?.length) return null

  const top = predictions[0]
  if (top.prob < CONFIDENCE_UNCERTAIN) return null

  const badge = top.prob >= CONFIDENCE_CONFIRMED
    ? <span className="badge confirmed">✓ Confirmed</span>
    : <span className="badge uncertain">Uncertain</span>

  return (
    <div className="prediction-overlay">
      <div className="prediction-top">
        <span className="pred-word">{top.name}</span>
        <span className="pred-pct">{Math.round(top.prob * 100)}%</span>
        {badge}
      </div>
      <div className="prediction-alts">
        {predictions.map((p, i) => (
          <span key={i} className="alt-pill">
            {p.name} · {Math.round(p.prob * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
}
