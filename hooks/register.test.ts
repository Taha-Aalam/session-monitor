import { expect, test } from 'claude-code/testing'

import { register } from './register'
import { parseRow } from './registry'

const NOW = 1791623954000
const STALE = 20000

const row = (over: Record<string, unknown> = {}) => JSON.stringify({
  pid: 25688, sessionId: 'fedf59b3-c436-488f-90ac-7e50e23fd9a3',
  cwd: 'C:\\Users\\tahaa\\projects\\claude-mods',
  startedAt: 1791623392679, name: 'claude-mods-67', status: 'busy',
  updatedAt: NOW, ...over,
})

const drawPane = ($: any) => $.ui.render({ component: 'Pane', requestId: 'sessions', surface: 'terminal', props: {} as any })

test('a busy session parses', async () => {
  const p = parseRow(row(), NOW, STALE)
  expect(p?.status).toBe('busy')
  expect(p?.isLive).toBe(true)
})

test('a waiting session carries what it waits on', async () => {
  expect(parseRow(row({ status: 'waiting', waitingFor: 'input needed' }), NOW, STALE)?.waitingFor).toBe('input needed')
})

test('the four known statuses are accepted', async () => {
  for (const s of ['busy', 'shell', 'idle', 'waiting']) {
    expect(parseRow(row({ status: s }), NOW, STALE)?.status).toBe(s)
  }
})

test('an unknown status becomes unknown, never busy', async () => {
  expect(parseRow(row({ status: 'wat' }), NOW, STALE)?.status).toBe('unknown')
})

test('a stale session is not live', async () => {
  expect(parseRow(row({ updatedAt: NOW - 60000 }), NOW, STALE)?.isLive).toBe(false)
})

test('half-written json yields null rather than throwing', async () => {
  expect(parseRow('{"pid":25688,"sessionI', NOW, STALE)).toBe(null)
  expect(parseRow('', NOW, STALE)).toBe(null)
})

test('the registry is read, key files skipped, dead sessions marked', async ($, on) => {
  on('command.register', () => ({ value: { command: 'sessions' } }))
  on('session.start', () => ({ cwd: 'C:\\tmp' }))
  on('env.get', () => ({ value: '/home/tester' }))
  on('fs.list', () => ({ value: [
    { name: '25688.json', kind: 'file' },
    { name: '25688.fb41.key', kind: 'file' },
    { name: '99999.json', kind: 'file' },
  ] }))
  on('fs.read', ($, e) => {
    if (e.path.endsWith('25688.json')) return { value: row() }
    if (e.path.endsWith('99999.json')) return { value: row({ pid: 99999, name: 'dead-one', updatedAt: NOW - 60000 }) }
    return { deny: 'never read' }
  })
  on('config.list', () => ({ value: [] as any }))
  on('clock.now', () => ({ value: NOW }))
  on('ui.render', () => ({ type: 'Box', children: [] }))

  await $.session.start({ cwd: 'C:\\tmp' })
  const tree = JSON.stringify(await drawPane($, on))
  expect(tree).toContain('claude-mods-67')
  expect(tree).toContain('working')
  expect(tree).toContain('dead-one')
  expect(tree).toContain('(gone)')
})