import type { SessionRow, SessionStatus } from '../types'

const KNOWN: readonly SessionStatus[] = ['busy', 'shell', 'idle', 'waiting']

export const parseRow = (text: string, now: number, staleMs: number): SessionRow | null => {
  let value: unknown
  try { value = JSON.parse(text) } catch { return null }
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const pid = typeof v.pid === 'number' ? v.pid : null
  const sessionId = typeof v.sessionId === 'string' ? v.sessionId : ''
  if (pid === null || sessionId === '') return null
  const status = typeof v.status === 'string' && KNOWN.includes(v.status as SessionStatus)
    ? (v.status as SessionStatus) : 'unknown'
  const updatedAt = typeof v.updatedAt === 'number' ? v.updatedAt : 0
  const startedAt = typeof v.startedAt === 'number' ? v.startedAt : 0
  return {
    pid, sessionId,
    name: typeof v.name === 'string' ? v.name : `pid-${pid}`,
    cwd: typeof v.cwd === 'string' ? v.cwd : '',
    status,
    waitingFor: typeof v.waitingFor === 'string' ? v.waitingFor : '',
    startedAt, updatedAt,
    isLive: now - updatedAt < staleMs,
  }
}

export const readSessions = async (
  home: string, now: number, staleMs: number,
  list: (path: string) => Promise<any[]>,
  read: (path: string) => Promise<string>,
): Promise<SessionRow[]> => {
  const dir = `${home}/.claude/sessions`
  let entries: Array<{ name: string; kind: string }>
  try { entries = await list(dir) } catch { return [] }
  const rows: SessionRow[] = []
  for (const entry of entries) {
    if (entry.kind !== 'file') continue
    if (!entry.name.endsWith('.json')) continue
    let text: string
    try { text = await read(`${dir}/${entry.name}`) } catch { continue }
    const parsed = parseRow(text, now, staleMs)
    if (parsed !== null) rows.push(parsed)
  }
  rows.sort((a, b) => b.updatedAt - a.updatedAt)
  return rows
}