export type SessionStatus = 'busy' | 'shell' | 'idle' | 'waiting'

export type SessionRow = {
  pid: number
  sessionId: string
  name: string
  cwd: string
  status: SessionStatus | 'unknown'
  waitingFor: string
  startedAt: number
  updatedAt: number
  isLive: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'session-monitor': {
      rows: SessionRow[]
    }
  }
}