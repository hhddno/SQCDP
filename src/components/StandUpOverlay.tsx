import { motion, AnimatePresence } from 'framer-motion'
import { X, ListTodo, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Action, Axe, DayData, StateColors, StateLabels } from '../types'
import { DonutChart } from './DonutChart'
import { Button } from './ui/Button'
import { getOpenActions } from '../hooks/useAxisData'

interface Props {
  open: boolean
  onClose: () => void
  axes: Axe[]
  monthKey: string
  colors: StateColors
  labels: StateLabels
  daysByAxe: Map<number, DayData[]>
  actions: Action[]
  onDayClick: (axe: Axe, dayIndex: number, days: DayData[]) => void
  onActionClick: (action: Action) => void
}

export function StandUpOverlay({
  open,
  onClose,
  axes,
  monthKey,
  colors,
  labels,
  daysByAxe,
  actions,
  onDayClick,
  onActionClick,
}: Props) {
  const openActions = getOpenActions(actions).slice(0, 8)

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] bg-slate-900 text-white overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h1 className="text-2xl font-bold">Mode Stand-up — {monthKey}</h1>
          <div className="flex gap-2">
            <Link to="/daily">
              <Button variant="secondary" className="!text-xs !py-2">
                <ExternalLink size={14} />
                Mode Daily
              </Button>
            </Link>
            <Button variant="ghost" onClick={onClose} className="!text-white hover:!bg-white/10">
              <X size={20} />
              Quitter
            </Button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 p-6">
          <div className="grid flex-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {axes.map((axe) => {
              const days = daysByAxe.get(axe.id) ?? []
              const counts = days.reduce(
                (a, d) => { a[d.etat]++; return a },
                { vert: 0, jaune: 0, rouge: 0, gris: 0 },
              )
              return (
                <div key={axe.id} className="rounded-2xl bg-white/5 p-4 backdrop-blur">
                  <h2 className="text-xl font-bold text-center mb-2 text-primary">
                    {axe.key} — {axe.label}
                  </h2>
                  <DonutChart
                    days={days}
                    axeKey={axe.key}
                    monthKey={monthKey}
                    colors={colors}
                    onDayClick={(dayIndex) => onDayClick(axe, dayIndex, days)}
                  />
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                    {(['vert', 'jaune', 'rouge', 'gris'] as const).map((k) => (
                      <div key={k}>
                        <div className="font-bold text-lg">{counts[k]}</div>
                        <div className="text-xs opacity-70">{labels[k]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {openActions.length > 0 && (
            <aside className="w-full xl:w-80 shrink-0 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <h3 className="flex items-center gap-2 font-bold mb-3">
                <ListTodo size={18} />
                Actions ouvertes ({getOpenActions(actions).length})
              </h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {openActions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onActionClick(a)}
                    className="w-full rounded-xl bg-white/10 p-3 text-left text-sm hover:bg-white/20 transition"
                  >
                    <div className="font-medium">{a.probleme}</div>
                    <div className="text-xs opacity-70 mt-1">{a.porteur}</div>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
