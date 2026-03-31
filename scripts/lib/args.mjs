#!/usr/bin/env node
// Argument parsing utilities for kilo-companion

/**
 * Split a raw argument string into tokens, respecting quoted strings.
 */
export function splitRawArgumentString(raw) {
  const tokens = [];
  let current = "";
  let inQuote = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

/**
 * Parse an argv-style array into { options, positional, rest }.
 *
 * config.valueOptions   — flags that consume the next token (e.g. ["base", "model"])
 * config.booleanOptions — flags that are boolean (e.g. ["json", "wait", "background"])
 * config.aliasMap       — short-flag aliases (e.g. { C: "cwd" })
 */
export function parseArgs(argv, config = {}) {
  const valueOptions = new Set(config.valueOptions ?? []);
  const booleanOptions = new Set(config.booleanOptions ?? []);
  const aliasMap = config.aliasMap ?? {};

  const options = {};
  const positional = [];
  let i = 0;

  while (i < argv.length) {
    const token = argv[i];

    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const key = token.slice(2);
      if (valueOptions.has(key)) {
        options[key] = argv[++i] ?? "";
      } else {
        options[key] = true;
      }
    } else if (token.startsWith("-") && token.length === 2) {
      const short = token[1];
      const long = aliasMap[short] ?? short;
      if (valueOptions.has(long)) {
        options[long] = argv[++i] ?? "";
      } else {
        options[long] = true;
      }
    } else {
      positional.push(token);
    }
    i++;
  }

  return { options, positional };
}
