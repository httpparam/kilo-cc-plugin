#!/usr/bin/env node
// Git context helpers

import { runSync } from "./process.mjs";

/**
 * Check if the current directory is inside a git repository.
 */
export function isGitRepository(cwd) {
  const result = runSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd, timeout: 5000 });
  return result.status === 0 && result.stdout.trim() === "true";
}

/**
 * Ensure the cwd is a git repository, throw if not.
 */
export function ensureGitRepository(cwd) {
  if (!isGitRepository(cwd)) {
    throw new Error("Not a git repository. Run this command from inside a git project.");
  }
}

/**
 * Get the root of the git repository.
 */
export function getRepoRoot(cwd) {
  const result = runSync("git", ["rev-parse", "--show-toplevel"], { cwd, timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : cwd;
}

/**
 * Get the current branch name.
 */
export function getCurrentBranch(cwd) {
  const result = runSync("git", ["branch", "--show-current"], { cwd, timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

/**
 * Get a short diff stat summary.
 */
export function getDiffShortStat(cwd, base) {
  const args = base
    ? ["diff", "--shortstat", `${base}...HEAD`]
    : ["diff", "--shortstat"];
  const result = runSync("git", args, { cwd, timeout: 10000 });
  return result.stdout.trim();
}

/**
 * Get git status (short format).
 */
export function getGitStatus(cwd) {
  const result = runSync("git", ["status", "--short", "--untracked-files=all"], { cwd, timeout: 10000 });
  return result.stdout.trim();
}

/**
 * Get the full diff for review context.
 */
export function getDiff(cwd, options = {}) {
  const args = ["diff"];
  if (options.cached) args.push("--cached");
  if (options.base) args.push(`${options.base}...HEAD`);
  const result = runSync("git", args, { cwd, timeout: 30000 });
  return result.stdout;
}

/**
 * Collect review context — file list, diff stats, and branch info.
 */
export function collectReviewContext(cwd, options = {}) {
  const repoRoot = getRepoRoot(cwd);
  const branch = getCurrentBranch(cwd);
  const status = getGitStatus(cwd);

  let diffStat;
  let diff;
  if (options.base) {
    diffStat = getDiffShortStat(cwd, options.base);
    diff = getDiff(cwd, { base: options.base });
  } else {
    // Working tree changes
    const stagedStat = getDiffShortStat(cwd);
    const cachedStat = runSync("git", ["diff", "--shortstat", "--cached"], { cwd, timeout: 10000 }).stdout.trim();
    diffStat = [stagedStat, cachedStat].filter(Boolean).join("\n");
    const workingDiff = getDiff(cwd);
    const cachedDiff = getDiff(cwd, { cached: true });
    diff = [cachedDiff, workingDiff].filter(Boolean).join("\n");
  }

  return {
    repoRoot,
    branch,
    status,
    diffStat,
    diff,
    hasChanges: Boolean(status || diffStat),
  };
}
