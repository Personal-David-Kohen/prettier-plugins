import * as path from "path";
import { sortObjectKeys } from "./sort-objects";
import type { Parser, ParserOptions, Plugin } from "prettier";

type NullableParsers = Record<string, Parser | null>;

const parsers: NullableParsers = {
  babel: null,
  "babel-ts": null,
  typescript: null,
};

function wrapParser(parser: Parser, parserName: string): Parser {
  let wrapped: Parser;
  wrapped = {
    ...parser,

    preprocess(text: string, options: ParserOptions): string | Promise<string> {
      const plugins = (options.plugins ?? []) as Plugin[];
      const ownIndex = plugins.findIndex(
        (plugin) => plugin.parsers?.[parserName] === wrapped,
      );
      const previous = plugins
        .slice(0, ownIndex < 0 ? 0 : ownIndex)
        .reverse()
        .map((plugin) => plugin.parsers?.[parserName])
        .find((candidate) => typeof candidate?.preprocess === "function");
      const prepared = previous?.preprocess
        ? previous.preprocess(text, options)
        : parser.preprocess
          ? parser.preprocess(text, options)
          : text;
      return prepared instanceof Promise
        ? prepared.then(sortObjectKeys)
        : sortObjectKeys(prepared);
    },
  };
  return wrapped;
}

/**
 * Find the host project's prettier directory by scanning require.cache.
 * When Prettier loads our plugin, its own modules are already cached.
 * We find a prettier installation that is NOT our plugin's own prettier.
 */
function findHostPrettierDir(): string | null {
  const pluginRoot = path
    .resolve(__dirname, "..")
    .replace(/\\/g, "/")
    .toLowerCase();

  const candidates: string[] = [];

  for (const key of Object.keys(require.cache)) {
    const normalized = key.replace(/\\/g, "/").toLowerCase();

    if (
      normalized.includes("/node_modules/prettier/") &&
      !normalized.startsWith(pluginRoot)
    ) {
      const match = key
        .replace(/\\/g, "/")
        .match(/(.+\/node_modules\/prettier)\//);
      if (match && !candidates.includes(match[1])) {
        candidates.push(match[1]);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer candidates NOT inside .vscode/extensions/ or IDE directories
  const projectCandidate = candidates.find((c) => {
    const lower = c.toLowerCase();
    return (
      !lower.includes("/.vscode/") &&
      !lower.includes("\\.vscode\\") &&
      !lower.includes("/appdata/") &&
      !lower.includes("\\appdata\\")
    );
  });

  return projectCandidate || candidates[0];
}

/**
 * Try to require a parser plugin from the host's prettier first,
 * falling back to process.cwd() resolution, then local.
 */
function tryRequireParser(
  v2RelPath: string,
  v3RelPath: string,
): { parsers: Record<string, Parser> } | null {
  // Method 1: Load from host prettier directory (found via require.cache)
  const hostDir = findHostPrettierDir();
  if (hostDir) {
    // Try v2 path first (e.g., prettier/parser-typescript.js)
    try {
      return require(path.join(hostDir, v2RelPath));
    } catch {}
    // Try v3 path (e.g., prettier/plugins/typescript.js)
    try {
      return require(path.join(hostDir, v3RelPath));
    } catch {}
  }

  // Method 2: Try process.cwd() resolution
  for (const p of [`prettier/${v3RelPath}`, `prettier/${v2RelPath}`]) {
    try {
      const resolved = require.resolve(p, { paths: [process.cwd()] });
      return require(resolved);
    } catch {}
  }

  // Method 3: Local fallback (last resort)
  for (const p of [`prettier/${v3RelPath}`, `prettier/${v2RelPath}`]) {
    try {
      return require(p);
    } catch {}
  }

  return null;
}

function buildParsers(): void {
  if (parsers["babel"] !== null) return;

  // Load babel parsers (v2: parser-babel, v3: plugins/babel)
  const babelPlugin = tryRequireParser("parser-babel", "plugins/babel");

  if (babelPlugin) {
    try {
      if (babelPlugin.parsers?.["babel"]) {
        parsers["babel"] = wrapParser(babelPlugin.parsers["babel"], "babel");
      }
      if (babelPlugin.parsers?.["babel-ts"]) {
        parsers["babel-ts"] = wrapParser(
          babelPlugin.parsers["babel-ts"],
          "babel-ts",
        );
      }
    } catch (err) {
      console.warn("pyramid-object-keys: failed to wrap babel parsers:", err);
    }
  }

  // Load TypeScript parser (v2: parser-typescript, v3: plugins/typescript)
  const tsPlugin = tryRequireParser("parser-typescript", "plugins/typescript");

  if (tsPlugin) {
    try {
      if (tsPlugin.parsers?.["typescript"]) {
        parsers["typescript"] = wrapParser(
          tsPlugin.parsers["typescript"],
          "typescript",
        );
      }
    } catch (err) {
      console.warn(
        "pyramid-object-keys: failed to wrap typescript parser:",
        err,
      );
    }
  }
}

buildParsers();

const builtParsers: Record<string, Parser> = {};

for (const [key, value] of Object.entries(parsers)) {
  if (value !== null) builtParsers[key] = value;
}

const plugin: Plugin = { parsers: builtParsers };

export default plugin;
module.exports = plugin;
