export const AUTH_KEY = "stoik_user";
export const MSG_COUNT_KEY = "stoik_msg_count";
export const FREE_MSG_LIMIT = 5;

export function getUser(): { name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(name: string, email: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email }));
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(MSG_COUNT_KEY);
}

export function getMsgCount(): number {
  const raw = localStorage.getItem(MSG_COUNT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementMsgCount(): number {
  const next = getMsgCount() + 1;
  localStorage.setItem(MSG_COUNT_KEY, String(next));
  return next;
}
