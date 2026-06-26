const AMBER = '#C4933A'

/**
 * Pure-SVG continuity sparkline. No external chart library, no axes, labels,
 * or grid — just the amber line and a dot at each check. The final dot is drawn
 * a touch larger to mark the most recent score.
 *
 * The vertical scale fits the data's own min/max so small swings stay visible;
 * a flat run (all scores equal) is centred. Returns null when there's nothing
 * to plot.
 */
export function SparklineChart({
  scores,
  width = 120,
  height = 32,
}: {
  scores: number[]
  width?: number
  height?: number
}) {
  if (scores.length === 0) return null

  // Leave room for the largest dot (4px) plus its stroke so nothing clips.
  const pad = 5

  // Single check: just a centred dot, no line.
  if (scores.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <circle cx={width / 2} cy={height / 2} r={4} fill={AMBER} />
      </svg>
    )
  }

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min

  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = scores.map((score, i) => {
    const x = pad + (i / (scores.length - 1)) * innerW
    // Flat run → centre vertically; otherwise higher score sits higher.
    const y =
      range === 0
        ? height / 2
        : pad + innerH * (1 - (score - min) / range)
    return { x, y }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={AMBER}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 3}
          fill={AMBER}
        />
      ))}
    </svg>
  )
}
