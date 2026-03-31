---
description: Show the stored final output for a finished Kilo job in this workspace
argument-hint: '[job-id] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" result $ARGUMENTS`

Present the full command output to the user. Do not summarize or condense it. Preserve all details including:
- Job ID and status
- The complete result payload including output text
- File paths and line numbers exactly as reported
- Any error messages
- Follow-up commands such as `/kilo:status <id>`
