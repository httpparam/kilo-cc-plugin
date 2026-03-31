#!/usr/bin/env node
// Output rendering utilities

/**
 * Render the setup report as human-readable markdown.
 */
export function renderSetupReport(report) {
  const lines = [];
  lines.push("## Kilo CLI Setup Status\n");

  // Overall status
  if (report.ready) {
    lines.push("✅ **Kilo CLI is ready to use.**\n");
  } else {
    lines.push("⚠️ **Kilo CLI is not fully configured.**\n");
  }

  // Node.js
  lines.push(`- **Node.js**: ${report.node.available ? `✅ ${report.node.version}` : "❌ Not found"}`);

  // npm
  lines.push(`- **npm**: ${report.npm.available ? `✅ ${report.npm.version}` : "❌ Not found"}`);

  // Kilo CLI
  lines.push(`- **Kilo CLI**: ${report.kilo.available ? `✅ ${report.kilo.version}` : "❌ Not installed"}`);

  // Auth
  if (report.auth.configured) {
    const providerList = report.auth.providers?.length
      ? report.auth.providers.join(", ")
      : "configured";
    lines.push(`- **Providers**: ✅ ${providerList}`);
  } else {
    lines.push(`- **Providers**: ❌ No providers configured`);
  }

  if (report.auth.configPath) {
    lines.push(`- **Config**: \`${report.auth.configPath}\``);
  }

  if (report.auth.projectConfig) {
    lines.push(`- **Project Config**: \`${report.auth.projectConfig}\``);
  }

  // Actions taken
  if (report.actionsTaken?.length) {
    lines.push("\n### Actions Taken\n");
    for (const action of report.actionsTaken) {
      lines.push(`- ${action}`);
    }
  }

  // Next steps
  if (report.nextSteps?.length) {
    lines.push("\n### Next Steps\n");
    for (const step of report.nextSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Render job status as a markdown table.
 */
export function renderStatusReport(jobs) {
  if (!jobs || jobs.length === 0) {
    return "No Kilo jobs found for this workspace.\n";
  }

  const lines = [];
  lines.push("## Kilo Jobs\n");
  lines.push("| ID | Kind | Status | Started | Duration | Summary |");
  lines.push("|---|---|---|---|---|---|");

  for (const job of jobs) {
    const duration = formatDuration(job.startedAt, job.completedAt);
    const summary = shorten(job.summary || job.prompt, 60);
    lines.push(`| \`${job.id}\` | ${job.kind} | ${statusEmoji(job.status)} ${job.status} | ${formatTime(job.startedAt)} | ${duration} | ${summary} |`);
  }

  lines.push("\n**Follow-up commands**: `/kilo:result <id>`, `/kilo:cancel <id>`");
  return lines.join("\n") + "\n";
}

/**
 * Render a single job result.
 */
export function renderJobResult(job) {
  if (!job) {
    return "No matching job found.\n";
  }

  const lines = [];
  lines.push(`## Kilo Job Result: \`${job.id}\`\n`);
  lines.push(`- **Kind**: ${job.kind}`);
  lines.push(`- **Status**: ${statusEmoji(job.status)} ${job.status}`);
  lines.push(`- **Started**: ${formatTime(job.startedAt)}`);

  if (job.completedAt) {
    lines.push(`- **Completed**: ${formatTime(job.completedAt)}`);
    lines.push(`- **Duration**: ${formatDuration(job.startedAt, job.completedAt)}`);
  }

  if (job.exitCode !== null && job.exitCode !== undefined) {
    lines.push(`- **Exit Code**: ${job.exitCode}`);
  }

  if (job.prompt) {
    lines.push(`\n### Prompt\n\n${job.prompt}`);
  }

  if (job.stdout) {
    lines.push(`\n### Output\n\n${job.stdout}`);
  }

  if (job.stderr) {
    lines.push(`\n### Errors\n\n\`\`\`\n${job.stderr}\n\`\`\``);
  }

  return lines.join("\n") + "\n";
}

/**
 * Render a cancel report.
 */
export function renderCancelReport(job) {
  if (!job) {
    return "No active job found to cancel.\n";
  }
  return `Cancelled job \`${job.id}\` (${job.kind}: ${shorten(job.prompt, 60)}).\n`;
}

/**
 * Render models list output.
 */
export function renderModelsOutput(stdout, stderr) {
  if (stderr && !stdout) {
    return `Error listing models:\n\`\`\`\n${stderr}\n\`\`\`\n`;
  }
  return `## Available Models\n\n${stdout}\n`;
}

/**
 * Render review result.
 */
export function renderReviewResult(result) {
  const lines = [];
  lines.push("## Kilo Code Review\n");

  if (result.status === 0) {
    lines.push(result.stdout || "Review completed with no output.");
  } else {
    lines.push("⚠️ Review completed with errors.\n");
    if (result.stdout) lines.push(result.stdout);
    if (result.stderr) lines.push(`\n\`\`\`\n${result.stderr}\n\`\`\``);
  }

  return lines.join("\n") + "\n";
}

// --- Helpers ---

function statusEmoji(status) {
  switch (status) {
    case "running": return "🔄";
    case "completed": return "✅";
    case "failed": return "❌";
    case "cancelled": return "🚫";
    default: return "❓";
  }
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDuration(startIso, endIso) {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = end - start;

  if (ms < 1000) return "<1s";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function shorten(text, limit = 60) {
  const normalized = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "—";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}
