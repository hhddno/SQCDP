import { useEffect, useMemo, useState } from 'react'
import type { Axe, DayData } from '../types'
import { useApp } from '../context/AppContext'
import { buildMonthDays } from './useAxisData'
import { computeNotifications } from '../lib/notifications'

export function useNotifications() {
  const { axes, actions, commentaires, monthKey, dataVersion } = useApp()
  const [daysByAxe, setDaysByAxe] = useState<Map<number, DayData[]>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map = new Map<number, DayData[]>()
      for (const axe of axes) {
        map.set(axe.id, await buildMonthDays(axe, monthKey, actions, commentaires))
      }
      if (!cancelled) setDaysByAxe(map)
    }
    if (axes.length) load()
    return () => { cancelled = true }
  }, [axes, monthKey, actions, commentaires, dataVersion])

  const notifications = useMemo(
    () => computeNotifications(axes, actions, daysByAxe, monthKey),
    [axes, actions, daysByAxe, monthKey],
  )

  return { notifications, daysByAxe }
}

export function getAxeFromNotification(
  axes: Axe[],
  notif: { axeId?: number; axeKey?: string },
): Axe | undefined {
  if (notif.axeId) return axes.find((a) => a.id === notif.axeId)
  if (notif.axeKey) return axes.find((a) => a.key === notif.axeKey)
  return undefined
}
