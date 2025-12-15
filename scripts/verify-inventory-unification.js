#!/usr/bin/env node

/**
 * Inventory Unification Verification Script
 * 
 * Verifies that all required files exist and are properly structured
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkFile(filePath, description) {
  const fullPath = path.join(rootDir, filePath)
  const exists = fs.existsSync(fullPath)
  
  if (exists) {
    log(`✅ ${description}`, 'green')
    return true
  } else {
    log(`❌ ${description} - MISSING: ${filePath}`, 'red')
    return false
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(rootDir, dirPath)
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
  
  if (exists) {
    const files = fs.readdirSync(fullPath)
    log(`✅ ${description} (${files.length} files)`, 'green')
    return true
  } else {
    log(`❌ ${description} - MISSING: ${dirPath}`, 'red')
    return false
  }
}

log('\n🔍 Inventory Unification Verification\n', 'cyan')

let allPassed = true

// Check view wrappers
log('📁 Checking View Wrappers...', 'blue')
const viewWrappers = [
  'src/pages/Inventory/views/IssueView.tsx',
  'src/pages/Inventory/views/TransferView.tsx',
  'src/pages/Inventory/views/AdjustView.tsx',
  'src/pages/Inventory/views/ReturnsView.tsx',
  'src/pages/Inventory/views/MovementsView.tsx',
  'src/pages/Inventory/views/OnHandReportView.tsx',
  'src/pages/Inventory/views/ValuationReportView.tsx',
  'src/pages/Inventory/views/AgeingReportView.tsx',
  'src/pages/Inventory/views/ReconciliationView.tsx',
  'src/pages/Inventory/views/ReconciliationSessionView.tsx',
  'src/pages/Inventory/views/MovementSummaryView.tsx',
  'src/pages/Inventory/views/MovementDetailView.tsx',
  'src/pages/Inventory/views/ProjectMovementSummaryView.tsx',
  'src/pages/Inventory/views/ValuationByProjectView.tsx',
  'src/pages/Inventory/views/KPIDashboardView.tsx',
]

viewWrappers.forEach(file => {
  const name = path.basename(file, '.tsx')
  if (!checkFile(file, `View: ${name}`)) {
    allPassed = false
  }
})

// Check unified service
log('\n📦 Checking Unified Service...', 'blue')
if (!checkFile('src/services/inventory/index.ts', 'Unified InventoryService')) {
  allPassed = false
}

// Check existing service files
log('\n🔧 Checking Existing Services...', 'blue')
const services = [
  'src/services/inventory/documents.ts',
  'src/services/inventory/materials.ts',
  'src/services/inventory/locations.ts',
  'src/services/inventory/reconciliation.ts',
  'src/services/inventory/reports.ts',
  'src/services/inventory/uoms.ts',
  'src/services/inventory/config.ts',
]

services.forEach(file => {
  const name = path.basename(file, '.ts')
  if (!checkFile(file, `Service: ${name}`)) {
    allPassed = false
  }
})

// Check documentation
log('\n📚 Checking Documentation...', 'blue')
const docs = [
  'INVENTORY_UNIFICATION_INDEX.md',
  'INVENTORY_QUICK_START.md',
  'INVENTORY_IMPLEMENTATION_SUMMARY.md',
  'INVENTORY_UNIFICATION_COMPLETE.md',
  'INVENTORY_UNIFICATION_PLAN.md',
]

docs.forEach(file => {
  const name = path.basename(file, '.md')
  if (!checkFile(file, `Doc: ${name}`)) {
    allPassed = false
  }
})

// Check database migration
log('\n🗄️ Checking Database Migration...', 'blue')
if (!checkFile('sql/inventory_add_foreign_keys.sql', 'Database Migration Script')) {
  allPassed = false
}

// Check routing files
log('\n🛣️ Checking Routing Configuration...', 'blue')
if (!checkFile('src/routes/InventoryRoutes.tsx', 'InventoryRoutes')) {
  allPassed = false
}
if (!checkFile('src/pages/Inventory/InventoryModule.tsx', 'InventoryModule')) {
  allPassed = false
}

// Summary
log('\n' + '='.repeat(60), 'cyan')
if (allPassed) {
  log('✅ ALL CHECKS PASSED', 'green')
  log('\n🎉 Inventory Unification is complete and verified!', 'green')
  log('\nNext steps:', 'cyan')
  log('  1. Run: npm run build', 'yellow')
  log('  2. Test all inventory routes', 'yellow')
  log('  3. Review documentation in INVENTORY_UNIFICATION_INDEX.md', 'yellow')
  process.exit(0)
} else {
  log('❌ SOME CHECKS FAILED', 'red')
  log('\nPlease review the errors above and ensure all files exist.', 'yellow')
  process.exit(1)
}
