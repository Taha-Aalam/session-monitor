import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { SessionRow, SessionStatus } from '../types'
import { readSessions } from './registry'

const PANE = 'sessions'
const rows = atom({ plugin: 'session-monitor', key: 'rows' } as const, [] as SessionRow[])

const setting = async ($: any, key: string): Promise<unknown> => {
  const config = await $.config.list()
  return config.find(r => r.key === key)?.value
}

const refresh = async ($: any, home: string) => {
  const now = await $.clock.now()
  const staleMs = Number((await setting($, 'session-monitor.staleSeconds')) ?? 20) * 1000
  const list = await readSessions(home, now, staleMs, p => $.fs.list(p), p => $.fs.read(p))
  await update($, rows, () => list)
}

const describe = (status: SessionStatus | 'unknown'): string => {
  switch (status) {
    case 'busy': return 'working'
    case 'waiting': return 'WAITING ON YOU'
    case 'idle': return 'idle'
    case 'shell': return 'at a shell'
    default: return 'unknown'
  }
}

const shorten = (cwd: string): string => {
  const parts = cwd.split(/[\\/]/).filter(p => p !== '')
  return parts.slice(-2).join('/')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sessions', description: 'Show every running session.' })
    const home = await $.env.get('HOME')
    if (home !== undefined) await refresh($, home)
    return next(e)
  })

  on('command.run', { command: 'sessions' }, async $ => {
    const result = await $.ui.open({ id: PANE, title: 'Sessions' })
    return { text: result.isPlaced ? 'Sessions pane opened.' : `Sessions pane is waiting: ${result.reason}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, rows)
    const { Box, Text } = $.ui.resolve(e)
    if (list.length === 0) {
      return <Box><Text dimColor>No sessions found.</Text></Box>
    }
    return (
      <Box flexDirection="column">
        {list.map(r => (
          <Box key={r.sessionId}>
            <Text bold={r.status === 'waiting'}>
              {r.isLive ? '' : '(gone) '}{r.name} — {describe(r.status)}
              {r.waitingFor === '' ? '' : `: ${r.waitingFor}`}
            </Text>
            <Text dimColor>{shorten(r.cwd)}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}