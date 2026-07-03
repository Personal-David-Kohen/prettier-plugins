"use strict";

const assert = require("node:assert/strict");
const prettier = require("prettier");
const plugin = require("../dist");

async function main() {
  const result = await prettier.format(
    `interface Props { longestProperty: string; id: number; name?: string; }`,
    {
      parser: "typescript",
      plugins: [plugin],
    },
  );
  assert.equal(
    result,
    `interface Props {\n  id: number;\n  name?: string;\n  longestProperty: string;\n}\n`,
  );
  console.log("interface-key integration test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
