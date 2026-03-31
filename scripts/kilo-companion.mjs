#!/usr/bin/env node
/**
 * kilo-companion.mjs — Main entry point for the Kilo Cloud Code plugin.
 *
 * Usage:
 *   node scripts/kilo-companion.mjs setup [--json]
 *   node scripts/kilo-companion.mjs review [--wait|--background] [--base <ref>]
 *   node scripts/kilo-companion.mjs review-uncommitted [--wait|--background]
 *   node scripts/kilo-companion.mjs debug [--background] [prompt]
 *   node scripts/kilo-companion.mjs task [--background] [--model <model>] [--continue] [prompt]
 *   node scripts/kilo-companion.mjs status [job-id] [--all] [--json]
 *   node scripts/kilo-companion.mjs result [job-id] [--json]
 *   node scripts/kilo-companion.mjs cancel [job-id] [--json]
 *   node scripts/kilo-companion.mjs models [provider]
 *   node scripts/kilo-companion.mjs pr <number>
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs, splitRawArgumentString } from "./lib/args.mjs";
import {
  getKiloAvailability,
  getKiloAuthStatus,
  getKiloModels,
  runKiloTask,
  runKiloPR,
} from "./lib/kilo.mjs";
import { binaryAvailable, runSync, terminateProcessTree } from "./lib/process.mjs";
import { collectReviewContext, ensureGitRepository, getRepoRoot } from "./lib/git.mjs";
import {
  createJob,
  completeJob,
  cancelJob,
  listJobs,
  readJob,
  findRunningJob,
  findLatestCompletedJob,
  cleanOldJobs,
} from "./lib/state.mjs";
import {
  renderSetupReport,
  renderStatusReport,
  renderJobResult,
  renderCancelReport,
  renderModelsOutput,
  renderReviewResult,
} from "./lib/render.mjs";

// ─── Helpers ──────────────────────────────────────────────────────────

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/kilo-companion.mjs setup [--json]",
      "  node scripts/kilo-companion.mjs review [--wait|--background] [--base <ref>]",
      "  node scripts/kilo-companion.mjs review-uncommitted [--wait|--background]",
      "  node scripts/kilo-companion.mjs debug [--background] [prompt]",
      "  node scripts/kilo-companion.mjs task [--background] [--model <model>] [--continue] [prompt]",
      "  node scripts/kilo-companion.mjs status [job-id] [--all] [--json]",
      "  node scripts/kilo-companion.mjs result [job-id] [--json]",
      "  node scripts/kilo-companion.mjs cancel [job-id] [--json]",
      "  node scripts/kilo-companion.mjs models [provider]",
      "  node scripts/kilo-companion.mjs pr <number>",
    ].join("\n")
  );
}

function outputResult(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(String(value));
  }
}

function normalizeArgv(argv) {
  if (argv.length === 1) {
    const [raw] = argv;
    if (!raw || !raw.trim()) return [];
    return splitRawArgumentString(raw);
  }
  return argv;
}

function parseCommandInput(argv, config = {}) {
  return parseArgs(normalizeArgv(argv), config);
}

function resolveWorkspace() {
  return getRepoRoot(process.cwd());
}

function ensureKiloReady(cwd) {
  const status = getKiloAvailability(cwd);
  if (!status.available) {
    throw new Error(
      "Kilo CLI is not installed. Install it with `npm install -g @kilocode/cli`, then rerun `/kilo:setup`."
    );
  }
}

// ─── Command Handlers ─────────────────────────────────────────────────

function handleSetup(argv) {
  const { options } = parseCommandInput(argv, {
    booleanOptions: ["json"],
  });

  const cwd = process.cwd();
  const nodeStatus = binaryAvailable("node", ["--version"], { cwd });
  const npmStatus = binaryAvailable("npm", ["--version"], { cwd });
  const kiloStatus = getKiloAvailability(cwd);
  const authStatus = getKiloAuthStatus(cwd);

  const nextSteps = [];
  if (!kiloStatus.available) {
    nextSteps.push("Install Kilo CLI with `npm install -g @kilocode/cli`.");
  }
  if (kiloStatus.available && !authStatus.configured) {
    nextSteps.push("Configure a provider: run `!kilo auth` or start Kilo and use `/connect`.");
  }

  const report = {
    ready: kiloStatus.available && authStatus.configured,
    node: nodeStatus,
    npm: npmStatus,
    kilo: kiloStatus,
    auth: authStatus,
    actionsTaken: [],
    nextSteps,
  };

  outputResult(options.json ? report : renderSetupReport(report), options.json);
}

async function handleReview(argv) {
  const { options, positional } = parseCommandInput(argv, {
    valueOptions: ["base"],
    booleanOptions: ["wait", "background", "json"],
  });

  const cwd = process.cwd();
  ensureKiloReady(cwd);
  ensureGitRepository(cwd);

  const reviewContext = collectReviewContext(cwd, { base: options.base });
  if (!reviewContext.hasChanges) {
    console.log("No changes found to review.");
    return;
  }

  // Build review prompt
  const target = options.base ? `branch compared to ${options.base}` : "committed changes";
  const prompt = `Review the code changes in this repository. Focus on:
1. Code quality and best practices
2. Potential bugs and edge cases
3. Security concerns
4. Performance issues
5. Test coverage gaps

Review target: ${target}
Branch: ${reviewContext.branch}
Changes summary: ${reviewContext.diffStat}

Provide a thorough code review with actionable feedback.`;

  const workspace = resolveWorkspace();

  // Run the review as a tracked job
  const job = createJob(workspace, {
    kind: "review",
    prompt: `Code review (${target})`,
    summary: `Reviewing ${target}`,
  });

  try {
    const result = await runKiloTask(prompt, {
      cwd,
      timeout: 600000,
      onChild: (child) => {
        // Store PID for cancellation
        job.pid = child.pid;
      },
    });

    const completed = completeJob(workspace, job.id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: `Review completed (${target})`,
    });

    outputResult(
      options.json ? completed : renderReviewResult(result),
      options.json
    );
  } catch (err) {
    completeJob(workspace, job.id, {
      status: 1,
      stdout: "",
      stderr: err.message,
      summary: `Review failed: ${err.message}`,
    });
    throw err;
  }
}

async function handleReviewUncommitted(argv) {
  const { options } = parseCommandInput(argv, {
    booleanOptions: ["wait", "background", "json"],
  });

  const cwd = process.cwd();
  ensureKiloReady(cwd);
  ensureGitRepository(cwd);

  const reviewContext = collectReviewContext(cwd);
  if (!reviewContext.hasChanges) {
    console.log("No uncommitted changes found to review.");
    return;
  }

  const prompt = `Review the uncommitted code changes in this repository. Focus on:
1. Code quality and best practices
2. Potential bugs and edge cases
3. Security concerns
4. Performance issues
5. Test coverage gaps

Review target: uncommitted working tree changes (staged and unstaged)
Branch: ${reviewContext.branch}
Changes summary: ${reviewContext.diffStat}
File status:
${reviewContext.status}

Provide a thorough code review with actionable feedback.`;

  const workspace = resolveWorkspace();
  const job = createJob(workspace, {
    kind: "review",
    prompt: "Code review (uncommitted changes)",
    summary: "Reviewing uncommitted changes",
  });

  try {
    const result = await runKiloTask(prompt, { cwd, timeout: 600000 });
    const completed = completeJob(workspace, job.id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: "Review completed (uncommitted changes)",
    });

    outputResult(
      options.json ? completed : renderReviewResult(result),
      options.json
    );
  } catch (err) {
    completeJob(workspace, job.id, {
      status: 1,
      stderr: err.message,
      summary: `Review failed: ${err.message}`,
    });
    throw err;
  }
}

async function handleDebug(argv) {
  const { options, positional } = parseCommandInput(argv, {
    valueOptions: ["model"],
    booleanOptions: ["background", "wait", "json"],
  });

  const cwd = process.cwd();
  ensureKiloReady(cwd);

  const userPrompt = positional.join(" ").trim();
  if (!userPrompt) {
    console.error("Please provide a description of what to debug.");
    console.error('Example: node scripts/kilo-companion.mjs debug "why are the tests failing"');
    process.exit(1);
  }

  const prompt = `Debug the following issue. Investigate the root cause, provide a diagnosis, and suggest or apply fixes:

${userPrompt}

Use all available debugging tools — read files, run tests, check logs, inspect stack traces. Be thorough.`;

  const workspace = resolveWorkspace();
  const job = createJob(workspace, {
    kind: "debug",
    prompt: userPrompt,
    summary: `Debugging: ${userPrompt.slice(0, 80)}`,
  });

  try {
    const result = await runKiloTask(prompt, {
      cwd,
      model: options.model,
      timeout: 600000,
    });

    const completed = completeJob(workspace, job.id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: `Debug completed: ${userPrompt.slice(0, 60)}`,
    });

    outputResult(options.json ? completed : result.stdout || result.stderr, options.json);
  } catch (err) {
    completeJob(workspace, job.id, {
      status: 1,
      stderr: err.message,
      summary: `Debug failed: ${err.message}`,
    });
    throw err;
  }
}

async function handleTask(argv) {
  const { options, positional } = parseCommandInput(argv, {
    valueOptions: ["model"],
    booleanOptions: ["background", "wait", "continue", "json"],
  });

  const cwd = process.cwd();
  ensureKiloReady(cwd);

  // Handle --continue: resume last session
  if (options.continue) {
    const result = runSync("kilo", ["--continue"], { cwd, timeout: 600000 });
    outputResult(options.json ? { status: result.status, stdout: result.stdout, stderr: result.stderr } : result.stdout || result.stderr, options.json);
    return;
  }

  const userPrompt = positional.join(" ").trim();
  if (!userPrompt) {
    console.error("Please provide a task description.");
    console.error('Example: node scripts/kilo-companion.mjs task "implement the caching layer"');
    process.exit(1);
  }

  const workspace = resolveWorkspace();
  const job = createJob(workspace, {
    kind: "task",
    prompt: userPrompt,
    summary: `Task: ${userPrompt.slice(0, 80)}`,
  });

  try {
    const result = await runKiloTask(userPrompt, {
      cwd,
      model: options.model,
      timeout: 600000,
    });

    const completed = completeJob(workspace, job.id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: `Task completed: ${userPrompt.slice(0, 60)}`,
    });

    outputResult(options.json ? completed : result.stdout || result.stderr, options.json);
  } catch (err) {
    completeJob(workspace, job.id, {
      status: 1,
      stderr: err.message,
      summary: `Task failed: ${err.message}`,
    });
    throw err;
  }
}

function handleStatus(argv) {
  const { options, positional } = parseCommandInput(argv, {
    booleanOptions: ["all", "json"],
  });

  const workspace = resolveWorkspace();
  const jobId = positional[0];

  if (jobId) {
    const job = readJob(workspace, jobId);
    if (!job) {
      console.log(`No job found with ID: ${jobId}`);
      return;
    }
    outputResult(options.json ? job : renderJobResult(job), options.json);
    return;
  }

  let jobs = listJobs(workspace);
  if (!options.all) {
    jobs = jobs.slice(0, 10); // Show only 10 most recent
  }

  outputResult(options.json ? jobs : renderStatusReport(jobs), options.json);
}

function handleResult(argv) {
  const { options, positional } = parseCommandInput(argv, {
    booleanOptions: ["json"],
  });

  const workspace = resolveWorkspace();
  const jobId = positional[0];
  const job = findLatestCompletedJob(workspace, jobId);

  if (!job) {
    console.log(jobId ? `No completed job found with ID: ${jobId}` : "No completed jobs found.");
    return;
  }

  outputResult(options.json ? job : renderJobResult(job), options.json);
}

function handleCancel(argv) {
  const { options, positional } = parseCommandInput(argv, {
    booleanOptions: ["json"],
  });

  const workspace = resolveWorkspace();
  const jobId = positional[0];
  const runningJob = findRunningJob(workspace, jobId);

  if (!runningJob) {
    console.log(jobId ? `No running job found with ID: ${jobId}` : "No running jobs found to cancel.");
    return;
  }

  // Try to kill the process
  if (runningJob.pid) {
    terminateProcessTree(runningJob.pid);
  }

  const cancelled = cancelJob(workspace, runningJob.id);
  outputResult(options.json ? cancelled : renderCancelReport(cancelled), options.json);
}

function handleModels(argv) {
  const { positional } = parseCommandInput(argv, {});

  const cwd = process.cwd();
  ensureKiloReady(cwd);

  const provider = positional[0] || null;
  const result = getKiloModels(provider, cwd);

  outputResult(renderModelsOutput(result.stdout, result.stderr), false);
}

async function handlePR(argv) {
  const { options, positional } = parseCommandInput(argv, {
    booleanOptions: ["background", "wait", "json"],
  });

  const cwd = process.cwd();
  ensureKiloReady(cwd);

  const prNumber = positional[0];
  if (!prNumber) {
    console.error("Please provide a PR number.");
    console.error("Example: node scripts/kilo-companion.mjs pr 42");
    process.exit(1);
  }

  const workspace = resolveWorkspace();
  const job = createJob(workspace, {
    kind: "pr-review",
    prompt: `PR #${prNumber}`,
    summary: `PR review: #${prNumber}`,
  });

  try {
    const result = await runKiloPR(prNumber, { cwd, timeout: 600000 });
    const completed = completeJob(workspace, job.id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: `PR #${prNumber} review completed`,
    });

    outputResult(options.json ? completed : result.stdout || result.stderr, options.json);
  } catch (err) {
    completeJob(workspace, job.id, {
      status: 1,
      stderr: err.message,
      summary: `PR review failed: ${err.message}`,
    });
    throw err;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = rawArgs[0];
  const commandArgs = rawArgs.slice(1);

  try {
    switch (command) {
      case "setup":
        handleSetup(commandArgs);
        break;
      case "review":
        await handleReview(commandArgs);
        break;
      case "review-uncommitted":
        await handleReviewUncommitted(commandArgs);
        break;
      case "debug":
        await handleDebug(commandArgs);
        break;
      case "task":
        await handleTask(commandArgs);
        break;
      case "status":
        handleStatus(commandArgs);
        break;
      case "result":
        handleResult(commandArgs);
        break;
      case "cancel":
        handleCancel(commandArgs);
        break;
      case "models":
        handleModels(commandArgs);
        break;
      case "pr":
        await handlePR(commandArgs);
        break;
      case "--help":
      case "-h":
        printUsage();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  // Cleanup old jobs periodically
  try {
    cleanOldJobs(resolveWorkspace());
  } catch {
    // ignore cleanup errors
  }
}

main();
