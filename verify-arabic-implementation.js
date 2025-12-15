/**
 * Verification Script for Arabic Implementation
 * 
 * This script checks if the Arabic implementation is correctly set up
 * in the Materials page and supporting files.
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Arabic Implementation...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkFile(filePath, checks) {
  console.log(`\n📄 Checking: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log('   ❌ File not found!');
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  let allPassed = true;
  checks.forEach(check => {
    if (content.includes(check.text)) {
      console.log(`   ✅ ${check.description}`);
    } else {
      console.log(`   ❌ ${check.description}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Check 1: Materials.tsx
console.log('\n═══════════════════════════════════════════════════════');
console.log('CHECK 1: Materials.tsx Implementation');
console.log('═══════════════════════════════════════════════════════');

const materialsChecks = [
  { text: "import { useArabicLanguage }", description: "Imports useArabicLanguage hook" },
  { text: "import { INVENTORY_TEXTS }", description: "Imports INVENTORY_TEXTS" },
  { text: "import { getDisplayName }", description: "Imports getDisplayName helper" },
  { text: "const { t, isRTL } = useArabicLanguage()", description: "Uses Arabic language hook" },
  { text: "direction: isRTL ? 'rtl' : 'ltr'", description: "Implements RTL layout" },
  { text: "t(INVENTORY_TEXTS.materials)", description: "Translates page title" },
  { text: "getDisplayName(r)", description: "Uses display helper for data" },
  { text: "t(INVENTORY_TEXTS.materialCode)", description: "Translates table headers" },
];

if (checkFile('src/pages/Inventory/Materials.tsx', materialsChecks)) {
  checks.passed++;
  console.log('\n   ✅ Materials.tsx: PASSED');
} else {
  checks.failed++;
  console.log('\n   ❌ Materials.tsx: FAILED');
}

// Check 2: inventory.ts translations
console.log('\n═══════════════════════════════════════════════════════');
console.log('CHECK 2: Translation Keys (inventory.ts)');
console.log('═══════════════════════════════════════════════════════');

const translationChecks = [
  { text: "export const INVENTORY_TEXTS", description: "Exports INVENTORY_TEXTS" },
  { text: "materials: { en: 'Materials', ar: 'المواد' }", description: "Has materials translation" },
  { text: "materialCode: { en: 'Material Code', ar: 'رمز المادة' }", description: "Has materialCode translation" },
  { text: "materialName: { en: 'Material Name', ar: 'اسم المادة' }", description: "Has materialName translation" },
  { text: "active: { en: 'Active', ar: 'نشط' }", description: "Has active translation" },
  { text: "createDocument: { en: 'Create Document', ar: 'إنشاء مستند' }", description: "Has createDocument translation" },
];

if (checkFile('src/i18n/inventory.ts', translationChecks)) {
  checks.passed++;
  console.log('\n   ✅ inventory.ts: PASSED');
} else {
  checks.failed++;
  console.log('\n   ❌ inventory.ts: FAILED');
}

// Check 3: inventoryDisplay.ts helpers
console.log('\n═══════════════════════════════════════════════════════');
console.log('CHECK 3: Display Helpers (inventoryDisplay.ts)');
console.log('═══════════════════════════════════════════════════════');

const displayChecks = [
  { text: "export const getDisplayName", description: "Exports getDisplayName function" },
  { text: "export const getDisplayDescription", description: "Exports getDisplayDescription function" },
  { text: "export const getDisplayStatus", description: "Exports getDisplayStatus function" },
  { text: "ArabicLanguageService.getCurrentLanguage()", description: "Uses ArabicLanguageService" },
  { text: "material_name_ar", description: "Checks for Arabic name field" },
  { text: "location_name_ar", description: "Checks for Arabic location field" },
];

if (checkFile('src/utils/inventoryDisplay.ts', displayChecks)) {
  checks.passed++;
  console.log('\n   ✅ inventoryDisplay.ts: PASSED');
} else {
  checks.failed++;
  console.log('\n   ❌ inventoryDisplay.ts: FAILED');
}

// Check 4: ArabicLanguageService exists
console.log('\n═══════════════════════════════════════════════════════');
console.log('CHECK 4: Arabic Language Service');
console.log('═══════════════════════════════════════════════════════');

if (fs.existsSync('src/services/ArabicLanguageService.ts')) {
  console.log('   ✅ ArabicLanguageService.ts exists');
  checks.passed++;
} else {
  console.log('   ❌ ArabicLanguageService.ts not found');
  checks.failed++;
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All checks passed! Arabic implementation is correct.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Open test page: test-arabic-materials.html');
  console.log('   3. Navigate to Materials page');
  console.log('   4. Switch language to Arabic');
  console.log('   5. Verify UI displays in Arabic');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please review the implementation.');
  process.exit(1);
}
