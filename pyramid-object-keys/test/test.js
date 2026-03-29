"use strict";

const { sortObjectKeys } = require("../dist/sort-objects");

let passed = 0;
let failed = 0;

function test(name, input, expected) {
  const result = sortObjectKeys(input);
  const resultTrimmed = result.trimEnd();
  const expectedTrimmed = expected.trimEnd();

  if (resultTrimmed === expectedTrimmed) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    const resultLines = resultTrimmed.split("\n");
    const expectedLines = expectedTrimmed.split("\n");
    const maxLen = Math.max(resultLines.length, expectedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const r = resultLines[i] ?? "<missing>";
      const e = expectedLines[i] ?? "<missing>";
      if (r !== e) {
        console.log(`    Line ${i + 1}:`);
        console.log(`      got:      ${JSON.stringify(r)}`);
        console.log(`      expected: ${JSON.stringify(e)}`);
      }
    }
    failed++;
  }
}

console.log("Object literal sorting:");

test(
  "basic object - pyramid order",
  `const config = {
  veryLongKeyName: "hello",
  a: false,
  medium: true,
  z: true,
};`,
  `const config = {
  z: true,
  a: false,
  medium: true,
  veryLongKeyName: "hello",
};`,
);

test(
  "sub-objects go last, sorted among themselves",
  `const config = {
  z: true,
  a: false,
  api: {
    timeout: 5000,
    endpoints: {
      veryLongEndpointName: "/x",
      a: "/a",
    },
  },
};`,
  `const config = {
  z: true,
  a: false,
  api: {
    timeout: 5000,
    endpoints: {
      a: "/a",
      veryLongEndpointName: "/x",
    },
  },
};`,
);

test(
  "full example from spec",
  `const config = {
  api: {
    endpoints: {
      veryLongEndpointName: "/x",
      a: "/a",
    },
    timeout: 5000,
  },
  z: true,
  a: false,
};`,
  `const config = {
  z: true,
  a: false,
  api: {
    timeout: 5000,
    endpoints: {
      a: "/a",
      veryLongEndpointName: "/x",
    },
  },
};`,
);

console.log("\nInterface sorting:");

test(
  "TypeScript interface",
  `interface User {
  veryLongPropertyName: string;
  id: number;
  name: string;
}`,
  `interface User {
  id: number;
  name: string;
  veryLongPropertyName: string;
}`,
);

console.log("\nPreserve unsortable properties:");

test(
  "spread operator preserved in place",
  `const obj = {
  longKeyName: true,
  ...defaults,
  a: 1,
  bb: 2,
};`,
  `const obj = {
  longKeyName: true,
  ...defaults,
  a: 1,
  bb: 2,
};`,
);

console.log("\nIdempotency:");

test(
  "already sorted stays the same",
  `const obj = {
  a: 1,
  bb: 2,
  ccc: 3,
};`,
  `const obj = {
  a: 1,
  bb: 2,
  ccc: 3,
};`,
);

console.log("\nComments:");

test(
  "comments stay attached to their keys",
  `const obj = {
  // Long key comment
  veryLongKey: true,
  // Short key comment
  a: 1,
};`,
  `const obj = {
  // Short key comment
  a: 1,
  // Long key comment
  veryLongKey: true,
};`,
);

console.log("\nDestructuring:");

test(
  "destructuring in const",
  `const {
  veryLongName,
  a,
  med,
} = obj;`,
  `const {
  a,
  med,
  veryLongName,
} = obj;`,
);

console.log("\nMulti-line values:");

test(
  "multi-line function call values preserved",
  `const obj = {
  ID: permit.id,
  COMPANION_PHONE: this.optionalField(
    this.validatePhoneNumber(phone) ? phone : ""
  ),
  A: 1,
};`,
  `const obj = {
  A: 1,
  ID: permit.id,
  COMPANION_PHONE: this.optionalField(
    this.validatePhoneNumber(phone) ? phone : ""
  ),
};`,
);

test(
  "multi-line template literal values preserved",
  `const obj = {
  REMARKS: \`\${a}_\${
    b || "default"
  }_\${c}\`,
  ID: 1,
};`,
  `const obj = {
  ID: 1,
  REMARKS: \`\${a}_\${
    b || "default"
  }_\${c}\`,
};`,
);

test(
  "multi-line continuation values preserved",
  `const obj = {
  confirmationNumber:
    parseInt(record.PERMIT_RED_ID) ||
    parseInt(record.CONFIRMATION_NUMBER) ||
    null,
  id: 1,
};`,
  `const obj = {
  id: 1,
  confirmationNumber:
    parseInt(record.PERMIT_RED_ID) ||
    parseInt(record.CONFIRMATION_NUMBER) ||
    null,
};`,
);

console.log("\n@disable-pyramid comment:");

test(
  "disable-pyramid skips the object",
  `//@disable-pyramid
const obj = {
  longKeyName: true,
  a: 1,
  bb: 2,
};`,
  `//@disable-pyramid
const obj = {
  longKeyName: true,
  a: 1,
  bb: 2,
};`,
);

test(
  "disable-pyramid with spaces in comment",
  `// @disable-pyramid
const obj = {
  longKeyName: true,
  a: 1,
};`,
  `// @disable-pyramid
const obj = {
  longKeyName: true,
  a: 1,
};`,
);

test(
  "disable-pyramid also skips nested objects",
  `// @disable-pyramid
const obj = {
  nested: {
    zzzz: 1,
    a: 2,
  },
  longKeyName: true,
  a: 1,
};`,
  `// @disable-pyramid
const obj = {
  nested: {
    zzzz: 1,
    a: 2,
  },
  longKeyName: true,
  a: 1,
};`,
);

test(
  "disable-pyramid only affects the next object",
  `// @disable-pyramid
const skip = {
  longKeyName: true,
  a: 1,
};

const sort = {
  longKeyName: true,
  a: 1,
};`,
  `// @disable-pyramid
const skip = {
  longKeyName: true,
  a: 1,
};

const sort = {
  a: 1,
  longKeyName: true,
};`,
);

test(
  "block comment style disable-pyramid",
  `/* @disable-pyramid */
const obj = {
  longKeyName: true,
  a: 1,
};`,
  `/* @disable-pyramid */
const obj = {
  longKeyName: true,
  a: 1,
};`,
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
