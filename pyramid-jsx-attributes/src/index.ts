import type { Parser, ParserOptions, Plugin } from "prettier";
import { sortJsxAttributes } from "./sort-jsx-attributes";

function wrap(parser: Parser, parserName: string): Parser {
  let wrapped: Parser;
  wrapped = {
    ...parser,
    preprocess(text: string, options: ParserOptions) {
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
        ? prepared.then(sortJsxAttributes)
        : sortJsxAttributes(prepared);
    },
  };
  return wrapped;
}

const typescript = require("prettier/plugins/typescript") as {
  parsers: Record<string, Parser>;
};
const babel = require("prettier/plugins/babel") as {
  parsers: Record<string, Parser>;
};

const plugin: Plugin = {
  parsers: {
    babel: wrap(babel.parsers.babel, "babel"),
    "babel-ts": wrap(babel.parsers["babel-ts"], "babel-ts"),
    typescript: wrap(typescript.parsers.typescript, "typescript"),
  },
};

export default plugin;
module.exports = plugin;
