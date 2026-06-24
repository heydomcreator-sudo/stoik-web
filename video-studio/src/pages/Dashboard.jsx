import { useCallback, useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'
import { listProjects } from '../lib/projects.js'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listProjects()
      setProjects(data || [])
    } catch (e) {
      setError(e.message || 'Načtení projektů selhalo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreated(project) {
    setProjects((prev) => [...prev, project])
    setSelectedId(project.id)
    setModalOpen(false)
  }

  function handleDeleted(id) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  // Sync sidebaru po změně v kartě (název).
  function handleUpdated(project) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, name: project.name, slug: project.slug }
          : p,
      ),
    )
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Projekty
      </h2>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {loading && <p className="text-sm text-neutral-600">Načítám…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && !error && projects.length === 0 && (
          <p className="text-sm text-neutral-600">Zatím žádné projekty.</p>
        )}
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              selectedId === p.id
                ? 'bg-[#1f1f1f] text-neutral-100'
                : 'text-neutral-300 hover:bg-panel'
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-600" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setModalOpen(true)}
        className="mt-3 rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
      >
        + Nový projekt
      </button>
    </div>
  )

  return (
    <AppLayout sidebar={sidebar}>
      {selectedId ? (
        <ProjectCard
          key={selectedId}
          id={selectedId}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-neutral-500">Vyberte nebo vytvořte projekt</p>
        </div>
      )}

      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </AppLayout>
  )
}
