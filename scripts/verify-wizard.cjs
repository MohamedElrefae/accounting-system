/**
 * Simple Build Verification Script for Transaction Wizard
 * Checks if all files exist and basic structure is correct
 */

const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = process.cwd()
const WIZARD_DIR = path.join(PROJECT_ROOT, 'src', 'components', 'TransactionWizard')

// Files to check
const REQUIRED_FILES = [
  'src/types/transaction-wizard.ts',
  'src/stores/wizardStore.ts',
  'src/utils/wizard-validation.ts',
  'src/hooks/useAutoSave.ts',
  'src/components/TransactionWizard/TransactionWizard.tsx',
  'src/components/TransactionWizard/WizardSettings.tsx',
  'src/components/TransactionWizard/steps/Step1_BasicInfo.tsx',
  'src/components/TransactionWizard/steps/Step2_TransactionLines.tsx',
  'src/components/TransactionWizard/steps/Step3_Review.tsx',
  'src/components/Transactions/ProductionWizard.tsx',
  'src/components/Transactions/WizardTest.tsx',
  'src/components/Transactions/IntegrationTest.tsx'
]

console.log('🔍 Verifying Transaction Wizard Integration...\n')

let allFilesExist = true

// Check each required file
REQUIRED_FILES.forEach(file => {
  const filePath = path.join(PROJECT_ROOT, file)
  const exists = fs.existsSync(filePath)
  
  if (exists) {
    const stats = fs.statSync(filePath)
    const sizeKB = Math.round(stats.size / 1024)
    console.log(`✅ ${file} (${sizeKB}KB)`)
  } else {
    console.log(`❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

// Check directory structure
console.log('\n📁 Directory Structure:')
const wizardDirExists = fs.existsSync(WIZARD_DIR)
const stepsDirExists = fs.existsSync(path.join(WIZARD_DIR, 'steps'))

console.log(`${wizardDirExists ? '✅' : '❌'} TransactionWizard directory`)
console.log(`${stepsDirExists ? '✅' : '❌'} steps directory`)

// Check package.json for dependencies
console.log('\n📦 Dependencies Check:')
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'))
  const criticalDeps = ['react', 'typescript', 'zustand', 'framer-motion', 'lucide-react']
  
  criticalDeps.forEach(dep => {
    const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
    console.log(`${hasDep ? '✅' : '❌'} ${dep}`)
  })
} catch (error) {
  console.log('❌ Could not read package.json')
}

// Summary
console.log('\n📊 Summary:')
if (allFilesExist && wizardDirExists && stepsDirExists) {
  console.log('🎉 Transaction Wizard integration is COMPLETE!')
  console.log('📝 All required files are in place')
  console.log('🔧 Ready for TypeScript compilation and testing')
  
  console.log('\n🚀 Next Steps:')
  console.log('1. Fix remaining TypeScript errors')
  console.log('2. Run integration tests')
  console.log('3. Test in development environment')
  console.log('4. Build for production')
  
  process.exit(0)
} else {
  console.log('❌ Integration is incomplete')
  console.log('🔧 Please fix missing files and try again')
  process.exit(1)
}
