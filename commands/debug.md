---
description: Delegate a debugging task to Kilo Code
argument-hint: '[--background|--wait] [--model <model>] [what to debug]'
allowed-tools: Bash(node:*), AskUserQuestion
---

Delegate a debugging task to Kilo through the companion script.

Raw slash-command arguments:
`$ARGUMENTS`

Execution mode rules:
- If the raw arguments include `--background`, run in a Claude background task.
- If the raw arguments include `--wait`, run in the foreground.
- Otherwise, estimate complexity:
  - For short, clearly bounded debug requests, recommend foreground.
  - For open-ended investigations, recommend background.
- Use `AskUserQuestion` exactly once with two options when not explicitly set.

If the user did not supply a description, ask what they want to debug.

Foreground flow:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" debug $ARGUMENTS
```
Return stdout verbatim. Do not paraphrase or add commentary.

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" debug $ARGUMENTS`,
  description: "Kilo debug task",
  run_in_background: true
})
```
After launching: "Kilo debugging started in the background. Check `/kilo:status` for progress."

If the companion script reports that Kilo is missing or not configured, stop and tell the user to run `/kilo:setup`.
