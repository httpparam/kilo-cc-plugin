---
description: Run Kilo PR review on a GitHub pull request
argument-hint: '<pr-number> [--background|--wait]'
allowed-tools: Bash(node:*), AskUserQuestion
---

Run a Kilo PR review through the companion script.

Raw slash-command arguments:
`$ARGUMENTS`

If no PR number is provided, ask for one.

Execution mode rules:
- If `--background` is present, run in a Claude background task.
- If `--wait` is present, run in the foreground.
- Otherwise, recommend background since PR reviews can take time.
- Use `AskUserQuestion` exactly once with two options when not explicitly set.

Foreground flow:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" pr $ARGUMENTS
```
Return stdout verbatim.

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" pr $ARGUMENTS`,
  description: "Kilo PR review",
  run_in_background: true
})
```
After launching: "Kilo PR review started in the background. Check `/kilo:status` for progress."
