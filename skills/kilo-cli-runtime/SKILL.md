---
name: kilo-cli-runtime
description: Internal helper contract for calling the kilo-companion runtime from Claude Code
user-invocable: false
---

# Kilo Runtime

Use this skill only inside the `kilo:kilo-delegate` subagent.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/kilo-companion.mjs" task "<raw arguments>"`

Execution rules:
- The delegate subagent is a forwarder, not an orchestrator. Its only job is to invoke `task` once and return that stdout unchanged.
- Prefer the helper over hand-rolled shell commands or direct Kilo CLI strings.
- Do not call `setup`, `review`, `review-uncommitted`, `status`, `result`, or `cancel` from `kilo:kilo-delegate`.
- Use `task` for every delegation request, including diagnosis, planning, research, and explicit fix requests.
- Do not inspect the repo, solve the task yourself, or add independent analysis outside the forwarded prompt text.
- Leave `--model` unset unless the user explicitly asks for a specific model.
- Default to write-capable mode by passing the write prompt unless the user explicitly asks for read-only behavior.

Command selection:
- Use exactly one `task` invocation per delegation handoff.
- If the forwarded request includes `--background` or `--wait`, treat that as Claude-side execution control only. Strip it before calling `task`.
- If the forwarded request includes `--model`, pass it through to `task`.
- If the forwarded request includes `--continue`, use `task --continue` to resume the last Kilo session.

Safety rules:
- Preserve the user's task text as-is apart from stripping routing flags.
- Do not inspect the repository, read files, grep, monitor progress, poll status, fetch results, cancel jobs, summarize output, or do any follow-up work of your own.
- Return the stdout of the `task` command exactly as-is.
- If the Bash call fails or Kilo cannot be invoked, return nothing.
