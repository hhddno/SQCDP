import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Play,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { DonutChart } from '../components/DonutChart'
import { NotificationsPanel } from '../components/NotificationsPanel'
import { ActionDialog } from '../components/dialogs/ActionDialog'
import { BulkEntryDialog } from '../components/dialogs/BulkEntryDialog'
import { DayDialog } from '../components/dialogs/DayDialog'
import { Button } from '../components/ui/Button'
import { RouletteWheel } from '../components/RouletteWheel'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getOpenActions } from '../hooks/useAxisData'
import { getAxeFromNotification, useNotifications } from '../hooks/useNotifications'
import type { AppNotification } from '../lib/notifications'
import type { Axe, DayData, EtatKey } from '../types'
import { ROULETTE_ROLES } from '../lib/constants'
import {
  DAILY_CHECKLIST,
  buildDailyReportText,
  downloadDailyReport,
  getTodayDateStr,
} from '../lib/dailyReport'
import { logAudit } from '../lib/auditLog'
import { api } from '../lib/api'
import { getParisDateParts } from '../lib/utils'

const STEPS = ['Préparation', 'Rôles', 'Saisie', 'Revue', 'Actions', 'Clôture'] as const
const ROULETTE_KEY = 'sqcdp_roulette_participants'
const CHECKLIST_KEY = 'sqcdp_daily_checklist'

export function DailyPage() {
  const { axes, actions, monthKey, colors, labels, equipe, bumpData } = useApp()
  const toast = useToast()
  const { notifications, daysByAxe } = useNotifications()

  const [step, setStep] = useState(0)
  const [timerSec, setTimerSec] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [uniqueWinners, setUniqueWinners] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [spinTrigger, setSpinTrigger] = useState(0)
  const [roleTargets, setRoleTargets] = useState<Record<string, string>>({})
  const [rouletteResults, setRouletteResults] = useState<Record<string, string>>({})
  const completedRef = useRef(0)

  const [checklist, setChecklist] = useState(() =>
    DAILY_CHECKLIST.map((c) => ({ ...c, done: false })),
  )
  const [showNotifs, setShowNotifs] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [dayDialog, setDayDialog] = useState<{ axe: Axe; dayIndex: number; days: DayData[] } | null>(null)
  const [actionDialog, setActionDialog] = useState<{ axe: Axe; actionId?: number; defaultDate?: string } | null>(null)

  const { day: todayDay } = getParisDateParts()
  const todayIdx = todayDay - 1

  const todayStates = useMemo(
    () =>
      axes.map((axe) => ({
        axe,
        etat: (daysByAxe.get(axe.id)?.[todayIdx]?.etat ?? 'gris') as EtatKey,
      })),
    [axes, daysByAxe, todayIdx],
  )

  const openActions = getOpenActions(actions)

  useEffect(() => {
    const saved = localStorage.getItem(ROULETTE_KEY)
    if (saved) setParticipants(JSON.parse(saved))
    const cl = localStorage.getItem(CHECKLIST_KEY)
    if (cl) {
      try {
        const parsed = JSON.parse(cl) as { id: string; done: boolean }[]
        setChecklist(
          DAILY_CHECKLIST.map((c) => ({
            ...c,
            done: parsed.find((p) => p.id === c.id)?.done ?? false,
          })),
        )
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ROULETTE_KEY, JSON.stringify(participants))
  }, [participants])

  useEffect(() => {
    if (!timerRunning) return
    const t = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [timerRunning])

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const addParticipant = () => {
    const name = newName.trim()
    if (!name || participants.includes(name)) return
    setParticipants([...participants, name])
    setNewName('')
  }

  const spinRoles = () => {
    if (participants.length === 0) {
      toast.warning('Ajoutez au moins un participant.')
      return
    }
    if (uniqueWinners && participants.length < ROULETTE_ROLES.length) {
      toast.warning(`Ajoutez au moins ${ROULETTE_ROLES.length} participants pour des rôles uniques.`)
      return
    }
    setSpinning(true)
    setRouletteResults({})
    completedRef.current = 0

    let targets: Record<string, string> = {}
    if (uniqueWinners) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5)
      ROULETTE_ROLES.forEach((role, i) => {
        targets[role.id] = shuffled[i]
      })
    }
    setRoleTargets(targets)
    setSpinTrigger((t) => t + 1)
  }

  const handleWheelResult = (roleId: string, winner: string) => {
    setRouletteResults((prev) => ({ ...prev, [roleId]: winner }))
    completedRef.current += 1
    if (completedRef.current >= ROULETTE_ROLES.length) {
      setTimeout(() => {
        setSpinning(false)
        logAudit('Daily roulette', JSON.stringify(rouletteResults), 'Daily', '')
      }, 400)
    }
  }

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next.map((c) => ({ id: c.id, done: c.done }))))
      return next
    })
  }

  const handleNotifClick = useCallback(
    (n: AppNotification) => {
      setShowNotifs(false)
      if (n.actionId) {
        const axe = getAxeFromNotification(axes, n)
        if (axe) setActionDialog({ axe, actionId: n.actionId })
        return
      }
      if (n.axeId != null) {
        const axe = axes.find((a) => a.id === n.axeId)
        const days = daysByAxe.get(n.axeId) ?? []
        if (axe) {
          const dayIndex = n.dayIndex ?? todayIdx
          setDayDialog({ axe, dayIndex, days })
        }
      }
    },
    [axes, daysByAxe, todayIdx],
  )

  const finishDaily = async () => {
    const reportData = {
      date: getTodayDateStr(),
      equipe,
      timerSec,
      rouletteResults,
      todayStates,
      openActions,
      notifications,
      checklist,
    }
    const summaryText = buildDailyReportText(reportData)

    try {
      await api.saveDailyReport({
        date: reportData.date,
        equipe,
        timer_sec: timerSec,
        roulette: rouletteResults,
        checklist,
        today_states: todayStates.map(({ axe, etat }) => ({ axe_key: axe.key, etat })),
        summary_text: summaryText,
      })
    } catch {
      /* fallback local via api layer */
    }

    downloadDailyReport(reportData)
    localStorage.removeItem(CHECKLIST_KEY)
    setChecklist(DAILY_CHECKLIST.map((c) => ({ ...c, done: false })))
    logAudit('Daily clôturée', `Durée ${formatTimer(timerSec)}`, 'Daily', '')
    toast.success('Compte-rendu enregistré et téléchargé')
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <AppLayout
      notifCount={notifications.length}
      onNotifClick={() => setShowNotifs(true)}
    >
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Mode Daily</h1>
          <p className="mt-1 text-slate-500">Réunion quotidienne SQCDP guidée</p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                i === step
                  ? 'bg-primary text-white shadow-md'
                  : i < step
                    ? 'bg-primary/15 text-primary'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white p-4 shadow-lg">
          <div className="flex items-center gap-2 text-primary">
            <Timer size={22} />
            <span className="text-3xl font-mono font-bold">{formatTimer(timerSec)}</span>
          </div>
          <Button variant="secondary" onClick={() => setTimerRunning(!timerRunning)}>
            <Play size={16} />
            {timerRunning ? 'Pause' : 'Démarrer'}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-2xl bg-white p-6 shadow-lg min-h-[400px]"
          >
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-primary">Ordre du jour</h2>
                <p className="text-slate-600">Cochez les points au fur et à mesure de la réunion.</p>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        item.done ? 'border-primary/30 bg-primary/5' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklist(item.id)}
                        className="h-5 w-5 rounded border-slate-300 text-primary"
                      />
                      <span className={item.done ? 'line-through text-slate-500' : 'font-medium'}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <Target size={22} />
                  Attribution des rôles
                </h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                    placeholder="Participant"
                    className="rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <Button onClick={addParticipant}>Ajouter</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <span key={p} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {p}
                    </span>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uniqueWinners}
                    onChange={(e) => setUniqueWinners(e.target.checked)}
                    className="rounded"
                  />
                  Rôles distincts (sans doublon)
                </label>
                <Button onClick={spinRoles} disabled={spinning || participants.length === 0}>
                  <Sparkles size={16} className={spinning ? 'animate-spin' : ''} />
                  {spinning ? 'Tirage…' : 'Lancer les roulettes'}
                </Button>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ROULETTE_ROLES.map((role) => (
                    <div key={role.id} className="rounded-xl border border-slate-100 p-4 text-center">
                      <div className="font-semibold mb-2">{role.label}</div>
                      <RouletteWheel
                        participants={participants}
                        spinTrigger={spinTrigger}
                        targetWinner={uniqueWinners ? roleTargets[role.id] : undefined}
                        onResult={(w) => handleWheelResult(role.id, w)}
                      />
                      <div className="mt-2 font-bold text-primary">
                        {rouletteResults[role.id] ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-center">
                <h2 className="text-xl font-bold text-primary">Saisie du jour</h2>
                <p className="text-slate-600">Définissez l'état de chaque axe pour aujourd'hui (jour {todayDay}).</p>
                <Button onClick={() => setShowBulk(true)}>
                  <ClipboardList size={16} />
                  Ouvrir la saisie rapide
                </Button>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-6">
                  {todayStates.map(({ axe, etat }) => (
                    <div key={axe.id} className="rounded-xl border p-4">
                      <div className="font-bold text-primary">{axe.key}</div>
                      <div
                        className="mt-2 h-4 w-4 mx-auto rounded-full"
                        style={{ backgroundColor: colors[etat] }}
                      />
                      <div className="text-xs mt-1 text-slate-500">{labels[etat]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-primary">Revue & alertes</h2>
                {notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.slice(0, 6).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotifClick(n)}
                        className="w-full rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
                      >
                        <span className="font-medium">{n.title}</span>
                        <p className="text-sm text-slate-500">{n.message}</p>
                      </button>
                    ))}
                    {notifications.length > 6 && (
                      <Button variant="ghost" onClick={() => setShowNotifs(true)}>
                        Voir toutes les alertes ({notifications.length})
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">Aucune alerte active</p>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {axes.map((axe) => {
                    const days = daysByAxe.get(axe.id) ?? []
                    return (
                      <div key={axe.id} className="rounded-xl border p-3">
                        <DonutChart
                          days={days}
                          axeKey={axe.key}
                          monthKey={monthKey}
                          colors={colors}
                          onDayClick={(dayIndex) => setDayDialog({ axe, dayIndex, days })}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-primary">Actions ouvertes ({openActions.length})</h2>
                {openActions.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Aucune action ouverte</p>
                ) : (
                  openActions.map((a) => {
                    const axe = axes.find((x) => x.id === a.axe_id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => axe && setActionDialog({ axe, actionId: a.id })}
                        className="w-full rounded-xl border p-4 text-left hover:border-primary/30"
                      >
                        <div className="font-medium">{a.probleme}</div>
                        <div className="text-sm text-slate-500">{a.porteur} · {axe?.key}</div>
                      </button>
                    )
                  })
                )}
                <Button
                  variant="action"
                  onClick={() => axes[0] && setActionDialog({ axe: axes[0] })}
                >
                  Nouvelle action
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 text-center">
                <CheckCircle2 size={48} className="mx-auto text-state-ok" />
                <h2 className="text-xl font-bold text-primary">Clôture de la daily</h2>
                <p className="text-slate-600">
                  Durée : {formatTimer(timerSec)} · {notifications.length} alerte(s) · {openActions.length} action(s) ouverte(s)
                </p>
                <pre className="text-left text-xs bg-slate-50 rounded-xl p-4 max-h-48 overflow-auto whitespace-pre-wrap">
                  {buildDailyReportText({
                    date: getTodayDateStr(),
                    equipe,
                    timerSec,
                    rouletteResults,
                    todayStates,
                    openActions,
                    notifications,
                    checklist,
                  })}
                </pre>
                <Button onClick={finishDaily}>
                  <Download size={16} />
                  Télécharger le compte-rendu
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={prevStep} disabled={step === 0}>
            <ChevronLeft size={16} />
            Précédent
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep}>
              Suivant
              <ChevronRight size={16} />
            </Button>
          ) : null}
        </div>
      </main>

      <NotificationsPanel
        open={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        onNotificationClick={handleNotifClick}
      />
      <BulkEntryDialog open={showBulk} onClose={() => setShowBulk(false)} onSaved={() => bumpData()} />
      <DayDialog
        open={!!dayDialog}
        onClose={() => setDayDialog(null)}
        axe={dayDialog?.axe ?? null}
        dayIndex={dayDialog?.dayIndex ?? null}
        days={dayDialog?.days ?? []}
        monthKey={monthKey}
        onAddAction={(dateStr) => {
          if (dayDialog) {
            setActionDialog({ axe: dayDialog.axe, defaultDate: dateStr })
            setDayDialog(null)
          }
        }}
        onEditAction={(id) => {
          if (dayDialog) setActionDialog({ axe: dayDialog.axe, actionId: id })
        }}
        onRefresh={() => bumpData()}
      />
      <ActionDialog
        open={!!actionDialog}
        onClose={() => setActionDialog(null)}
        axe={actionDialog?.axe ?? null}
        actionId={actionDialog?.actionId}
        defaultDate={actionDialog?.defaultDate}
        onSaved={() => bumpData()}
      />
    </AppLayout>
  )
}
