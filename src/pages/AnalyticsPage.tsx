import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { FileText, TrendingUp } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { computeTrends, computeKPIs, saveTeamBenchmark, getTeamBenchmarks } from '../lib/analytics'
import { buildMonthDays, computeStats } from '../hooks/useAxisData'
import { api } from '../lib/api'
import { exportMonthlyPDF } from '../lib/pdfExport'
import { getCurrentEquipe } from '../lib/team'
import { getAuditLog } from '../lib/auditLog'
import { formatMonthLabel } from '../lib/utils'
import { DailyReportsHistory } from '../components/DailyReportsHistory'

export function AnalyticsPage() {
  const { axes, actions, commentaires, monthKey, colors, labels } = useApp()
  const toast = useToast()
  const [trends, setTrends] = useState<Awaited<ReturnType<typeof computeTrends>>>([])
  const [loading, setLoading] = useState(true)
  const kpis = computeKPIs(actions)
  const benchmarks = getTeamBenchmarks()

  useEffect(() => {
    setLoading(true)
    computeTrends(axes, actions, commentaires, 6).then((t) => {
      setTrends(t)
      setLoading(false)
    })
  }, [axes, actions, commentaires, monthKey])

  const handlePDF = async () => {
    const dayStates = await api.loadDayStates()
    const statsPerAxe = await Promise.all(
      axes.map(async (axe) => {
        const days = await buildMonthDays(axe, monthKey, actions, commentaires)
        const s = computeStats(days)
        return { axe, ...s.counts }
      }),
    )
    exportMonthlyPDF(monthKey, axes, dayStates, actions, commentaires, labels, statsPerAxe)
    toast.success('PDF exporté')
  }

  const handleSaveBenchmark = async () => {
    let vert = 0, total = 0
    for (const axe of axes) {
      const days = await buildMonthDays(axe, monthKey, actions, commentaires)
      const s = computeStats(days)
      vert += s.counts.vert
      total += days.length
    }
    const open = actions.filter((a) => a.statut === 'ouverte').length
    const now = new Date()
    const late = actions.filter((a) => {
      if (a.statut !== 'ouverte' || !a.echeance) return false
      return new Date(a.echeance) < now
    }).length
    saveTeamBenchmark({
      equipe: getCurrentEquipe(),
      pctOk: total ? Math.round((vert / (total * axes.length)) * 100) : 0,
      actionsOuvertes: open,
      actionsRetard: late,
    })
    toast.success(`Benchmark enregistré pour ${getCurrentEquipe()}`)
  }

  const audit = getAuditLog().slice(0, 10)

  return (
    <AppLayout
      actions={
        <Button variant="secondary" onClick={handlePDF}>
          <FileText size={14} />
          Export PDF
        </Button>
      }
    >
      <main className="mx-auto max-w-[1400px] px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <TrendingUp />
            Pilotage & Analytics
          </h1>
          <p className="text-slate-500 mt-1">{formatMonthLabel(monthKey)}</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Actions ouvertes', value: kpis.openActions, color: '#3A55A4' },
            { label: 'Actions en retard', value: kpis.lateActions, color: '#ec5353' },
            { label: 'Taux clôture', value: `${kpis.closureRate}%`, color: '#53c15e' },
            { label: 'Total actions', value: kpis.totalActions, color: '#666' },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-5 shadow-md">
              <div className="h-1 w-10 rounded mb-3" style={{ backgroundColor: k.color }} />
              <div className="text-3xl font-bold">{k.value}</div>
              <div className="text-sm text-slate-500">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="font-semibold text-primary mb-4">Tendance % OK (6 mois)</h2>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pctOk" stroke="#3A55A4" strokeWidth={3} dot={{ fill: '#3A55A4' }} name="% OK" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="font-semibold text-primary mb-4">Répartition états (6 mois)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="vert" stackId="a" fill={colors.vert} name={labels.vert} />
                <Bar dataKey="jaune" stackId="a" fill={colors.jaune} name={labels.jaune} />
                <Bar dataKey="rouge" stackId="a" fill={colors.rouge} name={labels.rouge} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-primary">Benchmark équipes</h2>
              <Button variant="secondary" className="!text-xs" onClick={handleSaveBenchmark}>
                Enregistrer {getCurrentEquipe()}
              </Button>
            </div>
            {benchmarks.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun benchmark — enregistrez l'équipe courante</p>
            ) : (
              <div className="space-y-2">
                {benchmarks.map((b) => (
                  <div key={b.equipe} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="font-medium">{b.equipe}</span>
                    <div className="flex gap-4 text-sm text-slate-600">
                      <span>{b.pctOk}% OK</span>
                      <span>{b.actionsOuvertes} ouvertes</span>
                      <span className="text-delete">{b.actionsRetard} retard</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DailyReportsHistory equipe={getCurrentEquipe()} />

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="font-semibold text-primary mb-4">Journal d'audit (local)</h2>
            {audit.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune entrée</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                {audit.map((e) => (
                  <div key={e.id} className="border-b border-slate-100 pb-2">
                    <div className="font-medium">{e.action}</div>
                    <div className="text-slate-500 text-xs">
                      {new Date(e.timestamp).toLocaleString('fr-FR')} — {e.user} — {e.equipe}
                    </div>
                    <div className="text-slate-600">{e.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
