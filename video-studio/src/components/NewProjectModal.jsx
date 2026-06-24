import { useState } from 'react'
import { createProject } from '../lib/projects.js'

// Modal "Nový projekt" — jen pole Název. Po vytvoření zavolá onCreated(project).
export default function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Název je povinný')
      return
    }
    setLoading(true)
    try {
      const project = await createProject(name.trim())
      onCreated(project)
    } catch (err) {
      setError(err.message || 'Vytvoření selhalo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#222222] bg-[#111111] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-100">Nový projekt</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200"
            aria-label="Zavřít"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Název projektu"
            autoFocus
            className="w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-neutral-100 placeholder-neutral-500 outline-none focus:border-blue-500"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg bg-blue-500 px-4 py-2.5 font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Vytvářím…' : 'Vytvořit'}
          </button>
        </form>
      </div>
    </div>
  )
}
