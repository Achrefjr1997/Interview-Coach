import { LineChart, Line } from 'recharts'

export default function Sparkline({ data, height = 32, width = 80 }) {
  if (!data || data.length === 0) return null

  const lastValue = data[data.length - 1]
  const color = lastValue >= 0.65 ? 'var(--green)' : lastValue >= 0.45 ? 'var(--amber)' : '#F0997B'

  const chartData = data.map((v, i) => ({ x: i, y: v }))

  return (
    <LineChart width={width} height={height} data={chartData}>
      <Line
        type="monotone"
        dataKey="y"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  )
}
