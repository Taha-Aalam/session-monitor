# Session Monitor

Shows every running Claude Code session and what it is doing right now.

A [Claude Code plugin](https://docs.claude.com/en/docs/claude-code/plugins).

## Install

At the prompt of a Claude Code session, run:

```
/plugin install session-monitor --marketplace Taha-Aalam/session-monitor
```

Answer `y` to add the marketplace, then choose the user scope.

## Use

  1. `/sessions` opens the pane.
  2. It lists every running session: waiting on you, working, or done.

## How it works

`.claude-plugin/plugin.json` declares the plugin and points at its hooks module.
`hooks/hooks.json` names `register.tsx`, which exports `register` — a set of hooks that run
alongside Claude Code's own. A hook that returns without calling `next` answers for itself;
one that returns `next(e)` lets the engine carry on.

Anything the mod keeps between events lives in `$.state`, and every key it uses is declared in
`types/index.d.ts` so `claude plugin validate` can check them.

## Limits worth knowing

- It reads `~/.claude/sessions/*.json`. Sessions older than 90 seconds with no update are treated as stale and hidden.
- It never reads `*.key` files, which hold peer tokens.

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

The tests run through the plugin engine's own test harness: they load this module, stand in for the
events it hooks, and assert on what it drew and returned. That proves the module loads, that its
hooks fire, and that its trees and answers are shaped correctly. It is not the same as a live
session — anything that reaches the model, the network or the filesystem has to be tried in one.
