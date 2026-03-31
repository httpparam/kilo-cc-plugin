---
description: Delegate a coding task to Kilo Code in autonomous mode
argument-hint: '[--background|--wait] [--model <model>] [--continue] [task description]'
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Delegate a task to Kilo through the companion script or the `kilo:kilo-delegate` subagent.

Raw slash-command arguments:
`$ARGUMENTS`

Execution mode rules:
- If `--continue` is present, resume the last Kilo session. Do not ask.
- If `--background` is present, run in a Claude background task.
- If `--wait` is present, run in the foreground.
- Otherwise, estimate complexity:
  - For short, clearly bounded tasks, default to foreground.
  - For complex, multi-step, or open-ended tasks, recommend background.
- Use `AskUserQuestion` exactly once with two options when not explicitly set.

If no task description is provided and `--continue` is not set, ask what Kilo should work on.

`--model <model>` is optional. If provided, it overrides the default model for this task.

Foreground flow:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" task $ARGUMENTS
```
Return stdout verbatim. Do not paraphrase, summarize, or add commentary.

Background flow:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" task $ARGUMENTS`,
  description: "Kilo task",
  run_in_background: true
})
```
After launching: "Kilo task started in the background. Check `/kilo:status` for progress."

If the companion script reports that Kilo is missing or not configured, stop and tell the user to run `/kilo:setup`.
