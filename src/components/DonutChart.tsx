import { useRef, useEffect, useCallback, useState } from 'react'
import type { AxeKey, DayData, StateColors } from '../types'
import {
  getJoursFeriesFrance,
  isJourFerie,
  isWeekend,
  getTodayIdxFrance,
  getCurrentMonthYearKey,
} from '../hooks/useAxisData'

const SIZE = 440
const R1 = 220
const R2 = 145

interface DonutChartProps {
  days: DayData[]
  axeKey: AxeKey
  monthKey: string
  colors: StateColors
  onDayClick: (dayIndex: number) => void
  onCenterClick?: () => void
}

export function DonutChart({
  days,
  axeKey,
  monthKey,
  colors,
  onDayClick,
  onCenterClick,
}: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [animProgress, setAnimProgress] = useState(0)

  useEffect(() => {
    setAnimProgress(0)
    const start = performance.now()
    const duration = 600
    let frame: number
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setAnimProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [days, monthKey])

  const getDayFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (clientX - rect.left) * scaleX - SIZE / 2
      const y = (clientY - rect.top) * scaleY - SIZE / 2
      const dist = Math.sqrt(x * x + y * y)
      if (dist < R2 - 10 || dist > R1 + 10) return null
      let angle = Math.atan2(y, x) + Math.PI / 2
      if (angle < 0) angle += 2 * Math.PI
      const idx = Math.floor((angle / (2 * Math.PI)) * days.length)
      return idx >= 0 && idx < days.length ? idx : null
    },
    [days.length],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, SIZE, SIZE)
    const cx = SIZE / 2
    const cy = SIZE / 2
    const dayCount = days.length
    const angleStep = (2 * Math.PI) / dayCount
    const [yearStr, monthStr] = monthKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10) - 1
    const joursFeries = getJoursFeriesFrance(year)
    const isCurrentMonth = monthKey === getCurrentMonthYearKey()
    const todayIdx = getTodayIdxFrance()

    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(year, month, i + 1)
      let bg = '#f0f0f0'
      if (isJourFerie(currentDate, joursFeries)) bg = '#bbb'
      else if (isWeekend(currentDate)) bg = '#d0d0d0'

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, (R1 + R2) / 2, i * angleStep - Math.PI / 2, (i + 1) * angleStep - Math.PI / 2)
      ctx.lineWidth = R1 - R2 - 2
      ctx.strokeStyle = bg
      ctx.stroke()
      ctx.restore()
    }

    for (let i = 0; i < dayCount; i++) {
      const etat = days[i]?.etat ?? 'gris'
      if (etat === 'gris') continue
      const color = colors[etat] ?? colors.gris
      const progress = animProgress

      ctx.save()
      ctx.beginPath()
      const endAngle = i * angleStep - Math.PI / 2 + angleStep * progress
      ctx.arc(cx, cy, (R1 + R2) / 2, i * angleStep - Math.PI / 2, endAngle)
      ctx.lineWidth = R1 - R2 - 6
      ctx.strokeStyle = color
      ctx.globalAlpha = hoveredDay === i ? 1 : 0.85
      ctx.stroke()
      ctx.restore()
    }

    if (isCurrentMonth && todayIdx >= 0 && todayIdx < dayCount) {
      const s = todayIdx * angleStep - Math.PI / 2
      const e = (todayIdx + 1) * angleStep - Math.PI / 2
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R1 + 5, s, e)
      ctx.arc(cx, cy, R2 - 5, e, s, true)
      ctx.closePath()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#3A55A4'
      ctx.shadowColor = '#3A55A4'
      ctx.shadowBlur = 8
      ctx.globalAlpha = 0.9
      ctx.stroke()
      ctx.restore()
    }

    for (let i = 0; i < dayCount; i++) {
      const comments = days[i]?.commentaires ?? []
      if (comments.length === 0) continue
      const angle = (i + 0.5) * angleStep - Math.PI / 2
      const r = R1 - 8
      ctx.save()
      ctx.beginPath()
      ctx.arc(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        5,
        0,
        2 * Math.PI,
      )
      ctx.fillStyle = '#3A55A4'
      ctx.fill()
      ctx.restore()
    }

    for (let i = 0; i < dayCount; i++) {
      const angle = (i + 0.5) * angleStep - Math.PI / 2
      const r = (R1 + R2) / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      const currentDate = new Date(year, month, i + 1)
      const isWE = isWeekend(currentDate)
      const isF = isJourFerie(currentDate, joursFeries)

      ctx.save()
      ctx.font = 'bold 11px Segoe UI, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isF ? '#666' : isWE ? '#888' : '#333'
      if (hoveredDay === i) {
        ctx.font = 'bold 13px Segoe UI, sans-serif'
        ctx.fillStyle = '#3A55A4'
      }
      ctx.fillText(String(i + 1), x, y)
      ctx.restore()
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R2 - 2, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(58,85,164,0.15)'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.font = 'bold 72px Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#3A55A4'
    ctx.fillText(axeKey, cx, cy)
    ctx.restore()
  }, [days, monthKey, colors, hoveredDay, animProgress, axeKey])

  useEffect(() => {
    draw()
  }, [draw])

  const handlePointer = (clientX: number, clientY: number) => {
    const day = getDayFromPoint(clientX, clientY)
    setHoveredDay(day)
    if (canvasRef.current) {
      canvasRef.current.style.cursor = day !== null ? 'pointer' : 'default'
    }
    return day
  }

  const handleClickEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX - SIZE / 2
    const y = (clientY - rect.top) * scaleY - SIZE / 2
    const dist = Math.sqrt(x * x + y * y)
    if (dist < R2 - 10) {
      onCenterClick?.()
      return
    }
    const day = getDayFromPoint(clientX, clientY)
    if (day !== null) onDayClick(day)
  }

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="mx-auto w-full max-w-[340px] drop-shadow-lg transition-transform hover:scale-[1.02] touch-none"
      onClick={(e) => handleClickEvent(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointer(e.clientX, e.clientY)}
      onMouseLeave={() => setHoveredDay(null)}
      onTouchStart={(e) => {
        const t = e.touches[0]
        if (t) handlePointer(t.clientX, t.clientY)
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0]
        if (t) handleClickEvent(t.clientX, t.clientY)
      }}
    />
  )
}
