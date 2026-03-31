#!/usr/bin/env node
// Process management utilities

import { spawnSync, spawn } from "node:child_process";

/**
 * Check if a binary is available on the system PATH.
 * Returns { available: boolean, version?: string, path?: string }.
 */
export function binaryAvailable(name, versionArgs = ["--version"], options = {}) {
  try {
    const result = spawnSync(name, versionArgs, {
      cwd: options.cwd ?? process.cwd(),
      timeout: 10000,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(options.env ?? {}) },
    });
    if (result.status === 0 || result.stdout?.length) {
      const version = (result.stdout ?? result.stderr ?? "")
        .toString()
        .trim()
        .split("\n")[0];
      return { available: true, version, path: name };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

/**
 * Run a command synchronously and capture output.
 * Returns { status, stdout, stderr }.
 */
export function runSync(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    timeout: options.timeout ?? 300000,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
  });

  return {
    status: result.status ?? -1,
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
    signal: result.signal ?? null,
  };
}

/**
 * Spawn a command asynchronously and return a promise with { status, stdout, stderr }.
 */
export function runAsync(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(options.env ?? {}) },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      if (options.onStdout) options.onStdout(data.toString());
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      if (options.onStderr) options.onStderr(data.toString());
    });

    const timeout = options.timeout ?? 600000;
    const timer = setTimeout(() => {
      terminateProcessTree(child.pid);
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ status: code ?? -1, stdout, stderr, signal });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    if (options.onChild) options.onChild(child);
  });
}

/**
 * Terminate a process tree by PID.
 */
export function terminateProcessTree(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process already dead
    }
  }
}
