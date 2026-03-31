---
description: Run a Kilo local code review on uncommitted working tree changes
argument-hint: '[--wait|--background]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Kilo code review on uncommitted changes (staged + unstaged) through the companion script.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return Kilo's output verbatim to the user.

Execution mode rules:
- If the raw arguments include `--wait`, do not ask. Run in the foreground.
- If the raw arguments include `--background`, do not ask. Run in a Claude background task.
- Otherwise, check `git status --short` to estimate review size.
  - Recommend waiting only when the review is clearly tiny (1-2 files).
  - In every other case, recommend background.
- Then use `AskUserQuestion` exactly once with two options, putting the recommended option first:
  - `Wait for results`
  - `Run in background`

Foreground flow:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" review-uncommitted $ARGUMENTS
```
Return stdout verbatim.

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" review-uncommitted $ARGUMENTS`,
  description: "Kilo uncommitted changes review",
  run_in_background: true
})
```
After launching: "Kilo review started in the background. Check `/kilo:status` for progress."
