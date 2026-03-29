"use strict";

const prettier = require("prettier");
const plugin = require("../dist/index");

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
import Icon from "../../components/common/Icon/Icon";
`;

async function main() {
  const result = await prettier.format(input, {
    parser: "typescript",
    plugins: [plugin],
    // Keep prettier from changing line lengths (so our test stays stable)
    printWidth: 120,
    semi: true,
    singleQuote: false,
  });

  console.log("=== PRETTIER OUTPUT ===");
  console.log(result);
  console.log("✓ Integration test passed — prettier ran with plugin successfully");
}

main().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
