/**
 * Build Script for Transaction Wizard
 * Tests compilation and integration of the production wizard
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Configuration
// ============================================================================

const PROJECT_ROOT = process.cwd()
const BUILD_DIR = join(PROJECT_ROOT, 'dist', 'wizard-test')

interface BuildResult {
  success: boolean
  errors: string[]
  warnings: string[]
  duration: number
}

// ============================================================================
// Build Utilities
// ============================================================================

const log = (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
  const timestamp = new Date().toISOString()
  const prefixes = {
    info: '📋',
    error: '❌',
    warning: '⚠️',
    success: '✅'
  }
  
  console.log(`${prefixes[type]} [${timestamp}] ${message}`)
}

const runCommand = (command: string, cwd: string = PROJECT_ROOT): string => {
  try {
    log(`Running: ${command}`)
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    })
    return result
  } catch (error: any) {
    log(`Command failed: ${error.message}`, 'error')
    throw error
  }
}

const checkDependencies = (): BuildResult => {
  const result: BuildResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 0
  }
  
  const startTime = Date.now()
  
  try {
    log('Checking dependencies...')
    
    // Check package.json exists
    const packageJsonPath = join(PROJECT_ROOT, 'package.json')
    if (!existsSync(packageJsonPath)) {
      result.errors.push('package.json not found')
      result.success = false
      return result
    }
    
    // Check node_modules exists
    const nodeModulesPath = join(PROJECT_ROOT, 'node_modules')
    if (!existsSync(nodeModulesPath)) {
      result.warnings.push('node_modules not found, running npm install...')
      runCommand('npm install')
    }
    
    // Check critical dependencies
    const criticalDeps = [
      'react',
      'typescript',
      'zustand',
      'framer-motion',
      'lucide-react',
      'date-fns',
      '@mui/material'
    ]
    
    const packageJson = require(join(PROJECT_ROOT, 'package.json'))
    const missingDeps = criticalDeps.filter(dep => !packageJson.dependencies?.[dep])
    
    if (missingDeps.length > 0) {
      result.errors.push(`Missing dependencies: ${missingDeps.join(', ')}`)
      result.success = false
    }
    
    log(`Dependencies check completed`)
    
  } catch (error) {
    result.errors.push(`Dependency check failed: ${error}`)
    result.success = false
  }
  
  result.duration = Date.now() - startTime
  return result
}

const checkTypeScript = (): BuildResult => {
  const result: BuildResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 0
  }
  
  const startTime = Date.now()
  
  try {
    log('Checking TypeScript compilation...')
    
    // Check TypeScript configuration
    const tsConfigPath = join(PROJECT_ROOT, 'tsconfig.json')
    if (!existsSync(tsConfigPath)) {
      result.warnings.push('tsconfig.json not found, using default configuration')
    }
    
    // Run TypeScript compiler in check mode
    try {
      runCommand('npx tsc --noEmit --skipLibCheck')
      log('TypeScript compilation successful')
    } catch (error: any) {
      result.errors.push(`TypeScript compilation failed: ${error.stdout || error.message}`)
      result.success = false
    }
    
  } catch (error) {
    result.errors.push(`TypeScript check failed: ${error}`)
    result.success = false
  }
  
  result.duration = Date.now() - startTime
  return result
}

const checkFiles = (): BuildResult => {
  const result: BuildResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 0
  }
  
  const startTime = Date.now()
  
  try {
    log('Checking wizard files...')
    
    const requiredFiles = [
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
      'src/components/Transactions/WizardTest.tsx'
    ]
    
    const missingFiles = requiredFiles.filter(file => !existsSync(join(PROJECT_ROOT, file)))
    
    if (missingFiles.length > 0) {
      result.errors.push(`Missing files: ${missingFiles.join(', ')}`)
      result.success = false
    } else {
      log('All required files found')
    }
    
    // Check file sizes
    const largeFiles: string[] = []
    requiredFiles.forEach(file => {
      const filePath = join(PROJECT_ROOT, file)
      if (existsSync(filePath)) {
        const stats = require('fs').statSync(filePath)
        const sizeKB = Math.round(stats.size / 1024)
        if (sizeKB > 100) {
          largeFiles.push(`${file} (${sizeKB}KB)`)
        }
      }
    })
    
    if (largeFiles.length > 0) {
      result.warnings.push(`Large files detected: ${largeFiles.join(', ')}`)
    }
    
  } catch (error) {
    result.errors.push(`File check failed: ${error}`)
    result.success = false
  }
  
  result.duration = Date.now() - startTime
  return result
}

const checkImports = (): BuildResult => {
  const result: BuildResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 0
  }
  
  const startTime = Date.now()
  
  try {
    log('Checking imports and exports...')
    
    // Test if we can require the main files
    const testFiles = [
      'src/types/transaction-wizard.ts',
      'src/stores/wizardStore.ts',
      'src/utils/wizard-validation.ts'
    ]
    
    testFiles.forEach(file => {
      try {
        // This will throw if there are syntax errors
        require(join(PROJECT_ROOT, file))
        log(`✓ ${file} imports correctly`)
      } catch (error) {
        result.errors.push(`Import error in ${file}: ${error}`)
        result.success = false
      }
    })
    
  } catch (error) {
    result.errors.push(`Import check failed: ${error}`)
    result.success = false
  }
  
  result.duration = Date.now() - startTime
  return result
}

const runBuild = (): BuildResult => {
  const result: BuildResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 0
  }
  
  const startTime = Date.now()
  
  try {
    log('Running production build...')
    
    // Create build directory
    if (!existsSync(BUILD_DIR)) {
      mkdirSync(BUILD_DIR, { recursive: true })
    }
    
    // Run Vite build
    try {
      const buildOutput = runCommand('npm run build', PROJECT_ROOT)
      log('Production build successful')
      
      // Check if build output exists
      const distPath = join(PROJECT_ROOT, 'dist')
      if (existsSync(distPath)) {
        log('Build output created successfully')
      } else {
        result.warnings.push('Build output directory not found')
      }
      
    } catch (error: any) {
      result.errors.push(`Build failed: ${error.stdout || error.message}`)
      result.success = false
    }
    
  } catch (error) {
    result.errors.push(`Build process failed: ${error}`)
    result.success = false
  }
  
  result.duration = Date.now() - startTime
  return result
}

const generateReport = (results: Record<string, BuildResult>) => {
  const reportPath = join(BUILD_DIR, 'build-report.json')
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: Object.keys(results).length,
      successfulChecks: Object.values(results).filter(r => r.success).length,
      totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0),
      totalDuration: Object.values(results).reduce((sum, r) => sum + r.duration, 0)
    },
    results
  }
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  log(`Build report generated: ${reportPath}`, 'success')
  
  return report
}

// ============================================================================
// Main Build Process
// ============================================================================

const main = async () => {
  const startTime = Date.now()
  
  log('🚀 Starting Transaction Wizard Build Process')
  log(`Project root: ${PROJECT_ROOT}`)
  log(`Build directory: ${BUILD_DIR}`)
  
  // Create build directory
  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true })
  }
  
  // Run build steps
  const results: Record<string, BuildResult> = {}
  
  results.dependencies = checkDependencies()
  results.files = checkFiles()
  results.imports = checkImports()
  results.typescript = checkTypeScript()
  results.build = runBuild()
  
  // Generate report
  const report = generateReport(results)
  
  // Print summary
  log('\n📊 Build Summary', 'info')
  log(`Total checks: ${report.summary.totalChecks}`)
  log(`Successful: ${report.summary.successfulChecks}`)
  log(`Errors: ${report.summary.totalErrors}`)
  log(`Warnings: ${report.summary.totalWarnings}`)
  log(`Duration: ${report.summary.totalDuration}ms`)
  
  // Print errors if any
  if (report.summary.totalErrors > 0) {
    log('\n❌ Errors:', 'error')
    Object.entries(results).forEach(([step, result]) => {
      if (result.errors.length > 0) {
        log(`${step}:`, 'error')
        result.errors.forEach(error => log(`  - ${error}`, 'error'))
      }
    })
  }
  
  // Print warnings if any
  if (report.summary.totalWarnings > 0) {
    log('\n⚠️ Warnings:', 'warning')
    Object.entries(results).forEach(([step, result]) => {
      if (result.warnings.length > 0) {
        log(`${step}:`, 'warning')
        result.warnings.forEach(warning => log(`  - ${warning}`, 'warning'))
      }
    })
  }
  
  // Final result
  const overallSuccess = report.summary.totalErrors === 0
  
  if (overallSuccess) {
    log('\n✅ Build completed successfully!', 'success')
    log('The Transaction Wizard is ready for integration.')
  } else {
    log('\n❌ Build failed with errors', 'error')
    log('Please fix the errors above before proceeding.')
  }
  
  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1)
}

// Run the build process
if (require.main === module) {
  main().catch(error => {
    log(`Build process crashed: ${error}`, 'error')
    process.exit(1)
  })
}

export { main as buildWizard }
export type { BuildResult }
