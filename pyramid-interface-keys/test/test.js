"use strict";

const assert = require("node:assert/strict");
const { sortInterfaceKeys } = require("../dist/sort-interface-keys");

const input = `interface ICategorySelectionSectionProps {
  selectedSubcategories: INestedItem[];
  onRemove: (id: string | number) => void;
  readOnly?: boolean;
  onPlaceholderClick: () => void;
  maxChips?: number;
}`;
const expected = `interface ICategorySelectionSectionProps {
  maxChips?: number;
  readOnly?: boolean;
  onPlaceholderClick: () => void;
  selectedSubcategories: INestedItem[];
  onRemove: (id: string | number) => void;
}`;

assert.equal(sortInterfaceKeys(input), expected);
assert.equal(sortInterfaceKeys(expected), expected);
assert.equal(
  sortInterfaceKeys(
    `interface Props extends Record<string, { value: string }> {
  longestProperty: string;
  id: number;
}`,
  ),
  `interface Props extends Record<string, { value: string }> {
  id: number;
  longestProperty: string;
}`,
);
assert.equal(
  sortInterfaceKeys(
    `interface Props extends Record<string, { value: string }> {
  longestProperty: string;
  id: number;
}`,
  ),
  `interface Props extends Record<string, { value: string }> {
  id: number;
  longestProperty: string;
}`,
);
assert.equal(
  sortInterfaceKeys("const value = { longest: 1, a: 2 };"),
  "const value = { longest: 1, a: 2 };",
);
assert.equal(
  sortInterfaceKeys(
    'const documentation = "interface Fake { longest: string; id: number; }";',
  ),
  'const documentation = "interface Fake { longest: string; id: number; }";',
);
console.log("interface-key unit tests passed");
