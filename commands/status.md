---
description: Show active and recent Kilo jobs for this workspace
argument-hint: '[job-id] [--all] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" status $ARGUMENTS`

If the user did not pass a job ID:
- Render the command output as a single Markdown table for the recent jobs.
- Keep it compact. Do not include extra prose outside the table.
- Preserve the actionable fields: job ID, kind, status, started, duration, summary.

If the user did pass a job ID:
- Present the full command output to the user.
- Do not summarize or condense it.
