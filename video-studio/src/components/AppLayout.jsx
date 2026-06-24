import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth.js'
import ChangePassword from './ChangePassword.jsx'

// Layout aplikace: horní lišta (logo + účet) a tělo se sidebarem.
// Sidebar je na desktopu fixní (w-64), na mobilu skrytý a otevírá se přes ☰.
export default function AppLayout({ sidebar, children }) {
  const navigate = useNavigate()
  const [showChangePw, setShowChangePw] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col bg-ink">
      {/* Horní lišta */}
      <header className="flex items-center justify-between border-b border-[#222222] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-panel hover:text-neutral-100 md:hidden"
            aria-label="Projekty"
          >
            ☰
          </button>
          <img src="/logo.svg" alt="webstudio" className="h-8 w-auto" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChangePw(true)}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-panel hover:text-neutral-100"
          >
            Změnit heslo
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium text-neutral-100">
            A
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-panel hover:text-neutral-100"
          >
            Odhlásit
          </button>
        </div>
      </header>

      {/* Tělo: sidebar + hlavní obsah */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-[#222222] p-4 md:block">
          {sidebar}
        </aside>

        {/* Mobile sidebar (slide-over) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="relative w-64 max-w-[80%] border-r border-[#222222] bg-ink p-4"
              onClick={() => setSidebarOpen(false)}
            >
              {sidebar}
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {showChangePw && <ChangePassword onClose={() => setShowChangePw(false)} />}
    </div>
  )
}
