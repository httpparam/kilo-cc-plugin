---
description: Cancel an active background Kilo job in this workspace
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" cancel $ARGUMENTS`
