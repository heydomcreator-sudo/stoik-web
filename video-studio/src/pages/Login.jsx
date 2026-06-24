import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth.js'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Přihlášení selhalo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-full flex-col bg-ink bg-cover bg-center"
      style={{
        // Fotka jako pozadí + tmavý přechod dolů kvůli čitelnosti formuláře.
        backgroundImage:
          "linear-gradient(to bottom, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.45) 50%, rgba(10,10,10,0.96) 100%), url('/login-bg.jpeg')",
      }}
    >
      {/* Horní/střední část: logo */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <img
          src="/logo.svg"
          alt="webstudio"
          className="h-20 w-auto drop-shadow-lg"
        />
      </div>

      {/* Spodní část: pole pro heslo + tlačítko */}
      <div className="px-4 pb-10">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-lg border border-neutral-700 bg-black/50 px-4 py-3 text-neutral-100 placeholder-neutral-400 outline-none backdrop-blur focus:border-neutral-400"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-neutral-100 px-4 py-3 font-medium text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Ověřuji…' : 'Vstoupit'}
          </button>

          <a
            href="https://dkapex.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="block pt-1 text-center text-xs text-neutral-400 hover:text-neutral-200"
          >
            Pokud hledáte AI služby nebo tvorbu obsahu, pokračujte na dkapex.cz
          </a>
        </form>
      </div>
    </div>
  )
}
