import { sortImports } from "./sort-imports";
import type { Parser, ParserOptions, Plugin } from "prettier";

type NullableParsers = Record<string, Parser | null>;

const parsers: NullableParsers = {
  babel: null,
  "babel-ts": null,
  typescript: null,
};

function wrapParser(parser: Parser): Parser {
  return {
    ...parser,

    preprocess(text: string, options: ParserOptions): string | Promise<string> {
      const sorted = sortImports(text);

      if (typeof parser.preprocess === "function") {
        return parser.preprocess(sorted, options);
      }

      return sorted;
    },
  };
}

function buildParsers(): void {
  if (parsers["babel"] !== null) return;
  try {
    const babelPlugin = require("prettier/plugins/babel") as {
      parsers: Record<string, Parser>;
    };

    parsers["babel"] = wrapParser(babelPlugin.parsers["babel"]);
    parsers["babel-ts"] = wrapParser(babelPlugin.parsers["babel-ts"]);
  } catch (err) {
    console.warn(err);
  }
  try {
    const tsPlugin = require("prettier/plugins/typescript") as {
      parsers: Record<string, Parser>;
    };

    parsers["typescript"] = wrapParser(tsPlugin.parsers["typescript"]);
  } catch (err) {
    console.log(err);
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
