// ── Frontend auth helper — statické heslo + session ────────────────────────
//
// Bezpečnostní model:
//   • Samotný JWT token žije POUZE v httpOnly cookie — JS k němu nemá přístup
//     (ochrana proti XSS). Posílá se automaticky s každým /api/* requestem.
//   • Tady v localStorage držíme jen NEcitlivý příznak "jsem přihlášen",
//     aby SPA věděla, jestli má vykreslit dashboard, nebo redirect na login.
//     Skutečnou autoritou je vždy server (ověří cookie).

const FLAG = 'ws_authed'

// Přihlášení: pošle heslo na serverless endpoint. Při úspěchu server nastaví
// httpOnly cookie s JWT; my si jen poznačíme příznak.
export async function login(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Přihlášení selhalo')
  }

  localStorage.setItem(FLAG, '1')
  return true
}

// Odhlášení: smaže lokální příznak. (Vyčištění cookie řeší server-side logout,
// případně expirace tokenu po 30 dnech.)
export function logout() {
  localStorage.removeItem(FLAG)
}

// Lokální (optimistický) test přihlášení pro routing guard.
export function isAuthenticated() {
  return localStorage.getItem(FLAG) === '1'
}

// Změna hesla (po přihlášení). Server ověří současné heslo a uloží nové do
// Supabase. Posílá se s cookie (credentials), endpoint je chráněný requireAuth.
export async function changePassword(currentPassword, newPassword) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Změna hesla selhala')
  }
  return true
}
