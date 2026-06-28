import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, RotateCcw, Sparkles, Maximize2, Minimize2, Timer, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROULETTE_ROLES } from '../lib/constants'
import { Button } from '../components/ui/Button'
import { RouletteWheel } from '../components/RouletteWheel'
import { AppLayout } from '../components/AppLayout'
import { useToast } from '../context/ToastContext'

const STORAGE_KEY = 'sqcdp_roulette_participants'
const HISTORY_KEY = 'sqcdp_roulette_history'

interface SpinHistory {
  date: string
  results: Record<string, string>
}

export function RoulettePage() {
  const toast = useToast()
  const [participants, setParticipants] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [spinTrigger, setSpinTrigger] = useState(0)
  const [results, setResults] = useState<Record<string, string>>({})
  const completedRef = useRef(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [timerSec, setTimerSec] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [history, setHistory] = useState<SpinHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [uniqueWinners, setUniqueWinners] = useState(true)
  const [roleTargets, setRoleTargets] = useState<Record<string, string>>({})

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setParticipants(JSON.parse(saved))
    const hist = localStorage.getItem(HISTORY_KEY)
    if (hist) setHistory(JSON.parse(hist))
  }, [])

  useEffect(() => {
    if (!timerRunning) return
    const t = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [timerRunning])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants))
  }, [participants])

  const addParticipant = () => {
    const name = newName.trim()
    if (!name || participants.includes(name)) return
    setParticipants([...participants, name])
    setNewName('')
  }

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter((p) => p !== name))
  }

  const spinAll = () => {
    if (participants.length === 0) {
      toast.warning('Ajoutez au moins un participant.')
      return
    }
    if (uniqueWinners && participants.length < ROULETTE_ROLES.length) {
      toast.warning(`Ajoutez au moins ${ROULETTE_ROLES.length} participants pour des rôles distincts.`)
      return
    }
    if (spinning) return

    let targets: Record<string, string> = {}
    if (uniqueWinners) {
      const shuffled = [...participants].sort(() => Math.random() - 0.5)
      ROULETTE_ROLES.forEach((role, i) => {
        targets[role.id] = shuffled[i]
      })
    }
    setRoleTargets(targets)
    setSpinning(true)
    setResults({})
    completedRef.current = 0
    setSpinTrigger((t) => t + 1)
  }

  const handleWheelResult = (roleId: string, winner: string) => {
    setResults((prev) => ({ ...prev, [roleId]: winner }))
    completedRef.current += 1
    if (completedRef.current >= ROULETTE_ROLES.length) {
      setTimeout(() => {
        setSpinning(false)
        setResults((prev) => {
          if (Object.keys(prev).length === ROULETTE_ROLES.length) {
            const entry: SpinHistory = { date: new Date().toISOString(), results: prev }
            const next = [entry, ...history].slice(0, 20)
            setHistory(next)
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
          }
          return prev
        })
      }, 500)
    }
  }

  const resetAll = () => {
    setParticipants([])
    setResults({})
    setSpinTrigger(0)
    setSpinning(false)
    completedRef.current = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const content = (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''} min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] px-4 py-8`}>
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {!fullscreen && (
            <Link to="/">
              <Button variant="secondary" className="!border-white/30 !bg-white/20 !text-white backdrop-blur-sm hover:!bg-white/30">
                <ArrowLeft size={16} />
                Retour
              </Button>
            </Link>
          )}
          <motion.h1 className="text-3xl font-bold text-white drop-shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            🎯 Roulette SQCDP
          </motion.h1>
          <div className="flex gap-2">
            <Button variant="secondary" className="!bg-white/20 !text-white" onClick={() => setShowHistory(!showHistory)}>
              <History size={16} />
            </Button>
            <Button variant="secondary" className="!bg-white/20 !text-white" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white/20 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-white">
            <Timer size={20} />
            <span className="text-2xl font-mono font-bold">{formatTimer(timerSec)}</span>
          </div>
          <Button className="!bg-white/30 !text-white" onClick={() => setTimerRunning(!timerRunning)}>
            {timerRunning ? 'Pause' : 'Démarrer'}
          </Button>
          <Button variant="ghost" className="!text-white" onClick={() => { setTimerSec(0); setTimerRunning(false) }}>
            Reset
          </Button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="mb-8 rounded-2xl bg-white/95 p-4 max-h-48 overflow-y-auto">
            <h3 className="font-bold text-slate-700 mb-2">Historique des tirages</h3>
            {history.map((h, i) => (
              <div key={i} className="text-sm border-b border-slate-100 py-2">
                <span className="text-slate-500">{new Date(h.date).toLocaleString('fr-FR')}</span>
                <span className="ml-2">{ROULETTE_ROLES.map((r) => `${r.label}: ${h.results[r.id] ?? '?'}`).join(' · ')}</span>
              </div>
            ))}
          </div>
        )}

        <motion.div
          className="mb-10 rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Nom du participant"
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 outline-none focus:border-[#667eea]"
              />
              <Button onClick={addParticipant} className="!bg-[#4ecdc4] hover:!bg-[#45b7b8]">
                <Plus size={16} />
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {participants.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-1.5 text-sm font-medium text-white"
                >
                  {p}
                  <button
                    onClick={() => removeParticipant(p)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs hover:bg-white/50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          {participants.length > 0 && (
            <label className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={uniqueWinners}
                onChange={(e) => setUniqueWinners(e.target.checked)}
                className="rounded"
              />
              Rôles distincts (5 personnes différentes)
            </label>
          )}
          {participants.length > 0 && participants.length < ROULETTE_ROLES.length && !uniqueWinners && (
            <p className="mt-4 text-center text-sm text-slate-500">
              {participants.length} participant(s) — les rôles peuvent être attribués plusieurs fois.
            </p>
          )}
        </motion.div>

        <div className="mb-10 flex justify-center">
          <motion.button
            onClick={spinAll}
            disabled={spinning || participants.length === 0}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] px-10 py-4 text-xl font-bold text-white shadow-2xl shadow-[#ff6b6b]/40 transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className={spinning ? 'animate-spin' : ''} />
            {spinning ? 'Tirage en cours...' : 'Lancer toutes les roulettes'}
          </motion.button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ROULETTE_ROLES.map((role, idx) => (
            <motion.div
              key={role.id}
              className="flex flex-col items-center rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <h3 className="mb-1 text-lg font-bold text-[#2d3436]">
                {role.emoji} {role.label}
              </h3>

              <div className="relative my-4">
                <div
                  className="absolute -top-1 left-1/2 z-20 -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '18px solid #ff6b6b',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
                  }}
                />
                <RouletteWheel
                  participants={participants}
                  spinTrigger={spinTrigger}
                  targetWinner={uniqueWinners ? roleTargets[role.id] : undefined}
                  onResult={(winner) => handleWheelResult(role.id, winner)}
                />
              </div>

              <div
                className={`w-full rounded-xl p-4 text-center transition-all ${
                  results[role.id]
                    ? 'bg-gradient-to-r from-[#ffeaa7] to-[#fab1a0] scale-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wider opacity-60">
                  {spinning && !results[role.id] ? '...' : 'Sélectionné'}
                </div>
                <div className="text-xl font-bold text-[#2d3436]">
                  {results[role.id] ?? '?'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {Object.keys(results).length === ROULETTE_ROLES.length && (
          <motion.div
            className="mx-auto mt-10 max-w-lg rounded-2xl bg-white/95 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="mb-4 text-center text-xl font-bold text-[#2d3436]">Attribution des rôles</h3>
            <div className="space-y-2">
              {ROULETTE_ROLES.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <span className="font-medium">{role.emoji} {role.label}</span>
                  <span className="font-bold text-primary">{results[role.id]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            onClick={resetAll}
            className="!bg-[#6c5ce7] !text-white hover:!bg-[#5f3dc4]"
          >
            <RotateCcw size={16} />
            Réinitialiser
          </Button>
        </div>
      </div>
    </div>
  )

  return fullscreen ? content : <AppLayout>{content}</AppLayout>
}
