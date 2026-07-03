"use strict";

const assert = require("node:assert/strict");
const { sortJsxAttributes } = require("../dist/sort-jsx-attributes");

const unordered = `<input
  placeholder={t("PHONE_NUMBER_PLACEHOLDER")}
  class={clsx(
    styles.input,
    styles.inputLtr,
  )}
  value={props.primaryPhone}
  type="tel"
  disabled={props.readOnly}
  aria-invalid={showPhoneError()}
  title={t("PHONE_NUMBER_VALIDATION_HINT")}
  pattern={FIELD_VALIDATION_PATTERNS.PHONE}
/>`;
const ordered = `<input
  type="tel"
  disabled={props.readOnly}
  value={props.primaryPhone}
  aria-invalid={showPhoneError()}
  title={t("PHONE_NUMBER_VALIDATION_HINT")}
  pattern={FIELD_VALIDATION_PATTERNS.PHONE}
  placeholder={t("PHONE_NUMBER_PLACEHOLDER")}
  class={clsx(
    styles.input,
    styles.inputLtr,
  )}
/>`;

assert.equal(sortJsxAttributes(unordered), ordered);
assert.equal(sortJsxAttributes(ordered), ordered);
assert.equal(
  sortJsxAttributes(`<Box {...rest} veryLongName={value} id="x" />`),
  `<Box {...rest} id="x" veryLongName={value} />`,
);
assert.equal(
  sortJsxAttributes(`<Box veryLongName={value} {...rest} id="x" />`),
  `<Box id="x" veryLongName={value} {...rest} />`,
);
console.log("JSX-attribute unit tests passed");
