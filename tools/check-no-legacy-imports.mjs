#!/usr/bin/env node
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const PATTERN = /services\/expenses-categories(\/|\'|\"|$)/
let violations = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === 'out') continue
      walk(full)
    } else {
      const ext = extname(full)
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue
      const text = readFileSync(full, 'utf8')
      if (PATTERN.test(text)) violations.push(full)
    }
  }
}

try {
  walk(SRC)
} catch (e) {
  console.error('Error scanning files:', e)
  process.exit(2)
}

if (violations.length) {
  console.error('\nFound legacy imports from services/expenses-categories in:')
  for (const v of violations) console.error(' -', v)
  process.exit(1)
} else {
  console.log('OK: no legacy imports from services/expenses-categories')
}
