import { useState } from 'react'
import { changePassword } from '../lib/auth.js'

// Modal pro změnu hesla po přihlášení.
export default function ChangePassword({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 6) {
      setError('Nové heslo musí mít aspoň 6 znaků')
      return
    }
    if (next !== confirm) {
      setError('Hesla se neshodují')
      return
    }
    setLoading(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Změna hesla selhala')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-ink px-3 py-2 text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-100">Změnit heslo</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-green-400">Heslo bylo úspěšně změněno.</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 font-medium text-neutral-900 hover:bg-white"
            >
              Hotovo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Současné heslo"
              autoComplete="current-password"
              className={inputCls}
            />
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Nové heslo (min. 6 znaků)"
              autoComplete="new-password"
              className={inputCls}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nové heslo znovu"
              autoComplete="new-password"
              className={inputCls}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !current || !next || !confirm}
              className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 font-medium text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Ukládám…' : 'Změnit heslo'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
