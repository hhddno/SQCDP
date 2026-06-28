import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { api } from '../lib/api'
import type { DailyReportRecord } from '../types'

interface Props {
  equipe?: string
}

export function DailyReportsHistory({ equipe }: Props) {
  const [reports, setReports] = useState<DailyReportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.loadDailyReports(15).then((r) => {
      setReports(r)
      setLoading(false)
    })
  }, [equipe])

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="flex items-center gap-2 font-semibold text-primary mb-4">
        <CalendarDays size={18} />
        Historique des dailys
      </h2>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-400">Aucun compte-rendu enregistré</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {reports.map((r) => {
            const key = r.id ?? `${r.date}-${r.equipe}`
            return (
              <div key={key} className="rounded-xl border border-slate-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === key ? null : key)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50"
                >
                  <span className="font-medium">{r.date}</span>
                  <span className="text-sm text-slate-500">
                    {r.equipe} · {Math.floor(r.timer_sec / 60)} min
                  </span>
                </button>
                {expanded === key && (
                  <pre className="text-xs bg-slate-50 p-3 whitespace-pre-wrap border-t border-slate-100 max-h-40 overflow-auto">
                    {r.summary_text}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
