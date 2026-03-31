---
description: List available models from all configured Kilo providers
argument-hint: '[provider]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" models $ARGUMENTS`

Present the output to the user. If a provider name was given, show only models for that provider. Otherwise show all available models.

If Kilo reports an error, suggest running `/kilo:setup` to check configuration.
