#!/usr/bin/env node
/**
 * Session lifecycle hook for the Kilo plugin.
 * Handles SessionStart and SessionEnd events for state cleanup.
 */

import { cleanOldJobs } from "./lib/state.mjs";
import { getRepoRoot } from "./lib/git.mjs";

const event = process.argv[2];

try {
  const workspace = getRepoRoot(process.cwd());

  switch (event) {
    case "SessionStart":
      // Clean up stale jobs on session start
      cleanOldJobs(workspace, 20);
      break;

    case "SessionEnd":
      // Nothing to do on session end for now
      break;

    default:
      // Unknown event, ignore
      break;
  }
} catch {
  // Hooks must never fail loudly
}
