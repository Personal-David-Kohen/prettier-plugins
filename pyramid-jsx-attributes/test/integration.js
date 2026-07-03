"use strict";

const assert = require("node:assert/strict");
const prettier = require("prettier");
const plugin = require("../dist");
const importPlugin = require("../../pyramid-imports/dist");
const interfacePlugin = require("../../pyramid-interface-keys/dist");

async function main() {
  const result = await prettier.format(
    `const view = <Button veryLongProperty={value} id="save" disabled />;`,
    {
      parser: "typescript",
      plugins: [plugin],
      printWidth: 40,
    },
  );
  assert.equal(
    result,
    `const view = (\n  <Button\n    disabled\n    id="save"\n    veryLongProperty={value}\n  />\n);\n`,
  );

  const combined = await prettier.format(
    `import { longerName } from "./long-module";\nimport { x } from "x";\ninterface Props { longestProperty: string; id: number; }\nconst view = <Button veryLongProperty={value} id="save" disabled />;`,
    {
      parser: "typescript",
      plugins: [importPlugin, interfacePlugin, plugin],
      printWidth: 40,
    },
  );
  assert.match(combined, /^import \{ x \} from "x";\nimport \{ longerName \}/);
  assert.match(
    combined,
    /interface Props \{\n  id: number;\n  longestProperty/,
  );
  assert.match(
    combined,
    /<Button\n    disabled\n    id="save"\n    veryLongProperty/,
  );
  assert.equal(
    await prettier.format(combined, {
      parser: "typescript",
      plugins: [importPlugin, interfacePlugin, plugin],
      printWidth: 40,
    }),
    combined,
  );
  console.log("JSX-attribute integration test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
