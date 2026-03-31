#!/usr/bin/env node
// Kilo CLI detection and invocation utilities

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { binaryAvailable, runSync, runAsync } from "./process.mjs";

const KILO_CONFIG_DIR = path.join(os.homedir(), ".config", "kilo");
const KILO_BIN = "kilo";

/**
 * Check if the Kilo CLI binary is available.
 * Returns { available, version, path }.
 */
export function getKiloAvailability(cwd) {
  return binaryAvailable(KILO_BIN, ["--version"], { cwd });
}

/**
 * Check Kilo auth/provider status by looking for config files.
 * Returns { configured, configPath, providers }.
 */
export function getKiloAuthStatus(cwd) {
  const result = {
    configured: false,
    configPath: null,
    providers: [],
  };

  // Check global config
  const globalConfigs = ["kilo.jsonc", "opencode.json", "opencode.jsonc"];
  for (const fname of globalConfigs) {
    const fpath = path.join(KILO_CONFIG_DIR, fname);
    if (fs.existsSync(fpath)) {
      result.configPath = fpath;
      try {
        const raw = fs.readFileSync(fpath, "utf-8");
        // Strip JSONC comments for parsing
        const clean = raw
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "");
        const parsed = JSON.parse(clean);
        if (parsed.provider) {
          result.providers = Object.keys(parsed.provider);
          result.configured = result.providers.length > 0;
        }
      } catch {
        // Config exists but is unparseable or has different structure
        result.configured = true;
      }
      break;
    }
  }

  // Also check if kilo auth has credentials
  if (!result.configured) {
    const authDir = path.join(KILO_CONFIG_DIR, "auth");
    if (fs.existsSync(authDir)) {
      try {
        const entries = fs.readdirSync(authDir);
        if (entries.length > 0) {
          result.configured = true;
        }
      } catch {
        // ignore
      }
    }
  }

  // Check for project-level config too
  const projectConfigs = ["opencode.json", "opencode.jsonc", ".opencode"];
  for (const fname of projectConfigs) {
    const fpath = path.join(cwd, fname);
    if (fs.existsSync(fpath)) {
      result.projectConfig = fpath;
      break;
    }
  }

  return result;
}

/**
 * Run a kilo CLI command synchronously.
 */
export function runKiloSync(args, options = {}) {
  return runSync(KILO_BIN, args, options);
}

/**
 * Run a kilo CLI command asynchronously.
 */
export function runKiloAsync(args, options = {}) {
  return runAsync(KILO_BIN, args, options);
}

/**
 * Get the list of available models.
 */
export function getKiloModels(provider, cwd) {
  const args = ["models"];
  if (provider) args.push(provider);
  return runSync(KILO_BIN, args, { cwd, timeout: 30000 });
}

/**
 * Run a task in Kilo autonomous mode.
 * kilo run --auto "prompt"
 */
export function runKiloTask(prompt, options = {}) {
  const args = ["run", "--auto"];

  if (options.model) {
    // Set model via environment variable
    options.env = {
      ...options.env,
      KILO_MODEL: options.model,
    };
  }

  args.push(prompt);

  return runAsync(KILO_BIN, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 600000,
    env: options.env,
    onStdout: options.onStdout,
    onStderr: options.onStderr,
    onChild: options.onChild,
  });
}

/**
 * Run kilo debug command.
 */
export function runKiloDebug(options = {}) {
  const args = ["debug"];
  return runAsync(KILO_BIN, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 300000,
    onStdout: options.onStdout,
    onStderr: options.onStderr,
    onChild: options.onChild,
  });
}

/**
 * Run kilo PR review.
 */
export function runKiloPR(prNumber, options = {}) {
  const args = ["pr", String(prNumber)];
  return runAsync(KILO_BIN, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 300000,
    onStdout: options.onStdout,
    onStderr: options.onStderr,
    onChild: options.onChild,
  });
}

/**
 * Get session list from kilo.
 */
export function getKiloSessions(cwd) {
  return runSync(KILO_BIN, ["session"], { cwd, timeout: 15000 });
}

/**
 * Export a kilo session.
 */
export function exportKiloSession(sessionId, cwd) {
  const args = ["export"];
  if (sessionId) args.push(sessionId);
  return runSync(KILO_BIN, args, { cwd, timeout: 15000 });
}
