"use strict";

const { sortImports } = require("../dist/sort-imports");

const input = `import { Component, createSignal, onMount, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { isAxiosError } from "axios";
import { useScopedI18n } from "../../i18n";
import enBusiness from "./i18n/en";
import heBusiness from "./i18n/he";

const scopedDicts = { en: enBusiness, he: heBusiness };
import styles from "./EditBusinessPage.module.css";
import { businessService } from "../../services/business/business.service";
import { categoriesService } from "../../services/categories/categories.service";
import { showAlert } from "../../store/alert.store";
import { PhoneType } from "../../interfaces/business.interface";

import BusinessDetailsSection from "../../components/business/BusinessDetailsSection";
import ContactListSection from "../../components/business/ContactListSection";
import CategorySelectionSection from "../../components/business/CategorySelectionSection";
import AreaSelectionSection from "../../components/business/AreaSelectionSection";

import ContactModal from "./register/components/ContactModal";
import SearchModal, { SearchItem } from "./register/components/SearchModal";
import NestedSearchModal, {
  NestedItem,
} from "./register/components/NestedSearchModal";
import PendingBanner from "../../components/business/PendingBanner";
import { BusinessStatus } from "../../interfaces/business.interface";
import Icon from "../../components/common/Icon/Icon";`;

const expected = `import NestedSearchModal, {
  NestedItem,
} from "./register/components/NestedSearchModal";

import enBusiness from "./i18n/en";
import heBusiness from "./i18n/he";
import { isAxiosError } from "axios";
import { useScopedI18n } from "../../i18n";
import styles from "./EditBusinessPage.module.css";
import { showAlert } from "../../store/alert.store";
import Icon from "../../components/common/Icon/Icon";
import { useParams, useNavigate } from "@solidjs/router";
import ContactModal from "./register/components/ContactModal";
import { PhoneType } from "../../interfaces/business.interface";
import { Component, createSignal, onMount, Show } from "solid-js";
import PendingBanner from "../../components/business/PendingBanner";
import { BusinessStatus } from "../../interfaces/business.interface";
import { businessService } from "../../services/business/business.service";
import SearchModal, { SearchItem } from "./register/components/SearchModal";
import ContactListSection from "../../components/business/ContactListSection";
import { categoriesService } from "../../services/categories/categories.service";
import AreaSelectionSection from "../../components/business/AreaSelectionSection";
import BusinessDetailsSection from "../../components/business/BusinessDetailsSection";
import CategorySelectionSection from "../../components/business/CategorySelectionSection";

const scopedDicts = { en: enBusiness, he: heBusiness };`;

const result = sortImports(input);

console.log("=== RESULT ===");
console.log(result);
console.log("=== EXPECTED ===");
console.log(expected);

// Compare line by line
const resultLines = result.trimEnd().split("\n");
const expectedLines = expected.split("\n");

let pass = true;
const maxLen = Math.max(resultLines.length, expectedLines.length);
for (let i = 0; i < maxLen; i++) {
  const r = resultLines[i] ?? "<missing>";
  const e = expectedLines[i] ?? "<missing>";
  if (r !== e) {
    console.log(`\nMISMATCH at line ${i + 1}:`);
    console.log(`  got:      ${JSON.stringify(r)}`);
    console.log(`  expected: ${JSON.stringify(e)}`);
    pass = false;
  }
}

if (pass) {
  console.log("\n✓ PASS — output matches expected");
} else {
  console.log("\n✗ FAIL — see mismatches above");
  process.exit(1);
}
