import { useEffect, useState } from 'react'
import { WHEEL_COLORS } from '../lib/constants'

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const R = SIZE / 2 - 4

interface WheelProps {
  participants: string[]
  spinTrigger: number
  onResult: (winner: string) => void
  targetWinner?: string
}

function polarToCartesian(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
}

function slicePath(index: number, total: number): string {
  const angle = 360 / total
  const start = index * angle
  const end = (index + 1) * angle
  const p1 = polarToCartesian(start)
  const p2 = polarToCartesian(end)
  const large = angle > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`
}

function labelPosition(index: number, total: number) {
  const angle = ((index + 0.5) / total) * 360
  const rad = ((angle - 90) * Math.PI) / 180
  const dist = R * 0.62
  return { x: CX + dist * Math.cos(rad), y: CY + dist * Math.sin(rad), rotate: angle }
}

export function RouletteWheel({ participants, spinTrigger, onResult, targetWinner }: WheelProps) {
  const [rotation, setRotation] = useState(0)
  const [transition, setTransition] = useState(false)

  useEffect(() => {
    if (spinTrigger === 0 || participants.length === 0) return

    const sectionAngle = 360 / participants.length
    const spins = 5 + Math.random() * 5
    let finalAngle: number

    if (targetWinner && participants.includes(targetWinner)) {
      const winnerIndex = participants.indexOf(targetWinner)
      const centerAngle = winnerIndex * sectionAngle + sectionAngle / 2
      finalAngle = (360 - centerAngle) % 360
    } else {
      finalAngle = Math.random() * 360
    }

    const totalRotation = rotation + spins * 360 + finalAngle

    setTransition(true)
    setRotation(totalRotation)

    const timer = setTimeout(() => {
      const adjusted = (360 - (finalAngle % 360)) % 360
      const winnerIndex = Math.floor(adjusted / sectionAngle) % participants.length
      const winner = targetWinner && participants.includes(targetWinner)
        ? targetWinner
        : participants[winnerIndex]
      onResult(winner)
      setTransition(false)
    }, 4000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger])

  if (participants.length === 0) {
    return (
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full border-4 border-white bg-slate-100 text-center text-sm text-slate-500 shadow-lg">
        Ajoutez des participants
      </div>
    )
  }

  const n = participants.length

  return (
    <div className="relative h-[200px] w-[200px]">
      <div
        className="h-full w-full rounded-full border-4 border-white shadow-lg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: transition ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          {participants.map((name, index) => {
            const color = WHEEL_COLORS[index % WHEEL_COLORS.length]
            const lbl = labelPosition(index, n)
            return (
              <g key={`${name}-${index}`}>
                <path d={slicePath(index, n)} fill={color} stroke="#fff" strokeWidth="1.5" />
                <text
                  x={lbl.x}
                  y={lbl.y}
                  fill="#fff"
                  fontSize={n > 8 ? 8 : n > 5 ? 9 : 11}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${lbl.rotate}, ${lbl.x}, ${lbl.y})`}
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {name.length > 10 ? `${name.slice(0, 9)}…` : name}
                </text>
              </g>
            )
          })}
          <circle cx={CX} cy={CY} r={14} fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}
