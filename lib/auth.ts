export const MSG_COUNT_KEY = "stoik_msg_count";
export const FREE_MSG_LIMIT = 5;

export function getMsgCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(MSG_COUNT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementMsgCount(): number {
  const next = getMsgCount() + 1;
  localStorage.setItem(MSG_COUNT_KEY, String(next));
  return next;
}
