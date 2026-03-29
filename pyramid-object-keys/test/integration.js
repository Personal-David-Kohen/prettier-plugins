"use strict";

const prettier = require("prettier");
const plugin = require("../dist/index");

const input = `const config = {
  api: {
    endpoints: {
      veryLongEndpointName: "/x",
      a: "/a",
    },
    timeout: 5000,
  },
  z: true,
  a: false,
};
`;

async function main() {
  const result = await prettier.format(input, {
    parser: "typescript",
    plugins: [plugin],
    printWidth: 120,
    semi: true,
    singleQuote: false,
  });

  console.log("=== PRETTIER OUTPUT ===");
  console.log(result);
  console.log(
    "✓ Integration test passed — prettier ran with plugin successfully",
  );
}

main().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
