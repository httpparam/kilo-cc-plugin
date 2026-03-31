#!/usr/bin/env node
// Job tracking and plugin state management

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const STATE_DIR = path.join(os.homedir(), ".config", "kilo-plugin");
const JOBS_DIR_NAME = "jobs";

/**
 * Get the workspace-specific state directory.
 */
function getWorkspaceStateDir(workspaceRoot) {
  const hash = crypto.createHash("sha256").update(workspaceRoot).digest("hex").slice(0, 12);
  const stateDir = path.join(STATE_DIR, hash);
  fs.mkdirSync(stateDir, { recursive: true });
  return stateDir;
}

/**
 * Get the jobs directory for a workspace.
 */
function getJobsDir(workspaceRoot) {
  const dir = path.join(getWorkspaceStateDir(workspaceRoot), JOBS_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Generate a unique job ID.
 */
export function generateJobId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `job-${ts}-${rand}`;
}

/**
 * Create a new job record.
 */
export function createJob(workspaceRoot, jobData) {
  const jobId = jobData.id ?? generateJobId();
  const job = {
    id: jobId,
    kind: jobData.kind ?? "task",
    status: "running",
    prompt: jobData.prompt ?? "",
    startedAt: new Date().toISOString(),
    completedAt: null,
    pid: jobData.pid ?? null,
    exitCode: null,
    stdout: "",
    stderr: "",
    summary: jobData.summary ?? "",
    ...jobData,
    id: jobId,
  };

  writeJob(workspaceRoot, job);
  return job;
}

/**
 * Write a job to disk.
 */
export function writeJob(workspaceRoot, job) {
  const jobsDir = getJobsDir(workspaceRoot);
  const filePath = path.join(jobsDir, `${job.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(job, null, 2), "utf-8");
}

/**
 * Read a single job by ID.
 */
export function readJob(workspaceRoot, jobId) {
  const filePath = path.join(getJobsDir(workspaceRoot), `${jobId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Update a job record.
 */
export function updateJob(workspaceRoot, jobId, updates) {
  const job = readJob(workspaceRoot, jobId);
  if (!job) return null;
  const updated = { ...job, ...updates };
  writeJob(workspaceRoot, updated);
  return updated;
}

/**
 * Complete a job.
 */
export function completeJob(workspaceRoot, jobId, result) {
  return updateJob(workspaceRoot, jobId, {
    status: result.status === 0 ? "completed" : "failed",
    completedAt: new Date().toISOString(),
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    summary: result.summary ?? "",
  });
}

/**
 * Cancel a job.
 */
export function cancelJob(workspaceRoot, jobId) {
  return updateJob(workspaceRoot, jobId, {
    status: "cancelled",
    completedAt: new Date().toISOString(),
  });
}

/**
 * List all jobs for a workspace, sorted newest first.
 */
export function listJobs(workspaceRoot) {
  const jobsDir = getJobsDir(workspaceRoot);
  try {
    const files = fs.readdirSync(jobsDir).filter((f) => f.endsWith(".json"));
    const jobs = files
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(jobsDir, f), "utf-8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return jobs.sort((a, b) => {
      const da = new Date(a.startedAt).getTime();
      const db = new Date(b.startedAt).getTime();
      return db - da;
    });
  } catch {
    return [];
  }
}

/**
 * Find a running job (any or by ID).
 */
export function findRunningJob(workspaceRoot, jobId) {
  if (jobId) {
    const job = readJob(workspaceRoot, jobId);
    return job?.status === "running" ? job : null;
  }
  const jobs = listJobs(workspaceRoot);
  return jobs.find((j) => j.status === "running") ?? null;
}

/**
 * Find the latest completed job.
 */
export function findLatestCompletedJob(workspaceRoot, jobId) {
  if (jobId) {
    const job = readJob(workspaceRoot, jobId);
    return job?.status === "completed" || job?.status === "failed" ? job : null;
  }
  const jobs = listJobs(workspaceRoot);
  return jobs.find((j) => j.status === "completed" || j.status === "failed") ?? null;
}

/**
 * Clean up old job files (keep only the N most recent).
 */
export function cleanOldJobs(workspaceRoot, keepCount = 20) {
  const jobs = listJobs(workspaceRoot);
  const toRemove = jobs.slice(keepCount);
  const jobsDir = getJobsDir(workspaceRoot);
  for (const job of toRemove) {
    const fpath = path.join(jobsDir, `${job.id}.json`);
    try {
      fs.unlinkSync(fpath);
    } catch {
      // ignore
    }
  }
}

/**
 * Get plugin configuration.
 */
export function getConfig(workspaceRoot) {
  const stateDir = getWorkspaceStateDir(workspaceRoot);
  const configPath = path.join(stateDir, "config.json");
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Set a plugin configuration value.
 */
export function setConfig(workspaceRoot, key, value) {
  const config = getConfig(workspaceRoot);
  config[key] = value;
  const stateDir = getWorkspaceStateDir(workspaceRoot);
  fs.writeFileSync(
    path.join(stateDir, "config.json"),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
}
