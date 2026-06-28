import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { getWeekDays } from '../lib/analytics'
import { buildMonthDays } from '../hooks/useAxisData'
import type { DayData, EtatKey } from '../types'

export function WeekPage() {
  const { axes, actions, commentaires, colors, labels } = useApp()
  const [weekOffset, setWeekOffset] = useState(0)
  const [grid, setGrid] = useState<Map<string, DayData>>(new Map())
  const weekDays = getWeekDays(weekOffset)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map = new Map<string, DayData>()
      for (const axe of axes) {
        const mk = weekDays[0].date.slice(0, 7)
        const days = await buildMonthDays(axe, mk, actions, commentaires)
        weekDays.forEach((wd) => {
          const dayNum = parseInt(wd.date.split('-')[2], 10)
          const dayData = days[dayNum - 1]
          if (dayData) map.set(`${axe.id}-${wd.date}`, dayData)
        })
      }
      if (!cancelled) setGrid(map)
    }
    if (axes.length) load()
    return () => { cancelled = true }
  }, [axes, actions, commentaires, weekOffset, weekDays])

  const etatColor = (e: EtatKey) => colors[e]

  return (
    <AppLayout>
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4">
            <Button variant="secondary" className="!p-2" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold text-primary">
              Semaine du {weekDays[0].label} au {weekDays[6].label}
            </h1>
            <Button variant="secondary" className="!p-2" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight size={20} />
            </Button>
          </div>
          <p className="mt-2 text-sm text-slate-500">Semaine courante (défilement ±1 semaine)</p>
        </div>

        <motion.div
          className="overflow-x-auto rounded-2xl bg-white shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3 text-left font-semibold text-primary">Axe</th>
                {weekDays.map((d) => (
                  <th key={d.date} className="p-3 text-center font-medium text-slate-600 capitalize">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axes.map((axe) => (
                <tr key={axe.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mr-2">
                      {axe.key}
                    </span>
                    {axe.label}
                  </td>
                  {weekDays.map((d) => {
                    const data = grid.get(`${axe.id}-${d.date}`)
                    const etat = data?.etat ?? 'gris'
                    return (
                      <td key={d.date} className="p-2 text-center">
                        <div
                          className="mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-xs font-bold"
                          style={{ backgroundColor: `${etatColor(etat)}33`, color: '#333' }}
                          title={labels[etat]}
                        >
                          <span
                            className="h-3 w-3 rounded-full mb-0.5"
                            style={{ backgroundColor: etatColor(etat) }}
                          />
                          {(data?.actions.length ?? 0) > 0 && (
                            <span className="text-[9px]">{data!.actions.length}A</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </main>
    </AppLayout>
  )
}
