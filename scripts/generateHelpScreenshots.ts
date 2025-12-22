import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'

const ROOT = process.cwd()
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForHttpOk(url: string, timeoutMs: number) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' as any })
      if (res.status >= 200 && res.status < 400) return
    } catch {
      // ignore
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function run(command: string, args: string[], opts: { env?: Record<string, string> } = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...opts.env,
      },
      // On Windows, spawning .cmd without a shell can throw EINVAL.
      shell: process.platform === 'win32',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function launchChromiumWithFallback() {
  try {
    return await chromium.launch()
  } catch {
    console.warn('[help:screenshots] Playwright Chromium not available, trying system Edge (msedge) channel...')
    try {
      return await chromium.launch({ channel: 'msedge' })
    } catch {
      console.warn('[help:screenshots] System Edge channel failed, trying system Chrome channel...')
      return await chromium.launch({ channel: 'chrome' })
    }
  }
}

type CaptureSpec = {
  name: string
  route: string
  selector: string
  actions?: (
    | { type: 'click'; selector: string; force?: boolean }
    | { type: 'wait'; ms: number }
    | { type: 'press'; key: string }
  )[]
}

const CAPTURES: CaptureSpec[] = [
  {
    name: 'org-scope-chip',
    route: '/help',
    selector: '[data-tour="topbar-scope-chip"]',
  },
  {
    name: 'org-selector',
    route: '/help',
    selector: '[data-tour="topbar-org-selector"]',
    actions: [{ type: 'click', selector: '[data-tour="topbar-scope-chip"]' }],
  },
  {
    name: 'accounts-org-select',
    route: '/main-data/accounts-tree',
    selector: '[data-tour="accounts-tree-org-select"]',
  },
  {
    name: 'accounts-add',
    route: '/main-data/accounts-tree',
    selector: '[data-tour="accounts-tree-add-top"]',
  },
  {
    name: 'accounts-edit-selected',
    route: '/main-data/accounts-tree',
    selector: '[data-tour="accounts-tree-edit-selected"]',
  },
  {
    name: 'accounts-save',
    route: '/main-data/accounts-tree',
    selector: '[data-tour="accounts-tree-save"]',
    actions: [
      { type: 'press', key: 'Escape' },
      { type: 'click', selector: '[data-tour="accounts-tree-add-top"]', force: true },
      { type: 'wait', ms: 400 },
    ],
  },
]

async function captureLanguage(params: {
  browser: Browser
  baseUrl: string
  outDirRoot: string
  language: 'ar' | 'en'
}) {
  const { browser, baseUrl, outDirRoot, language } = params

  const outDirLang = path.join(outDirRoot, language)
  await fs.mkdir(outDirLang, { recursive: true })

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  // Force Zustand persisted language before app scripts run.
  await context.addInitScript({
    content:
      `try {\n` +
      `  const key = 'accounting-app-store';\n` +
      `  const raw = localStorage.getItem(key);\n` +
      `  const parsed = raw ? JSON.parse(raw) : {};\n` +
      `  const next = { ...parsed, state: { ...(parsed.state || {}), language: '${language}' }, version: parsed.version ?? 0 };\n` +
      `  localStorage.setItem(key, JSON.stringify(next));\n` +
      `} catch {}\n`,
  })

  const page = await context.newPage()
  page.on('pageerror', (err) => {
    console.warn('[help:screenshots] pageerror:', err)
  })

  // Warm up + apply language
  await page.goto(`${baseUrl}/help`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(300)

  for (const c of CAPTURES) {
    try {
      const url = `${baseUrl}${c.route}`
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      if (c.actions?.length) {
        for (const a of c.actions) {
          if (a.type === 'click') {
            await page.locator(a.selector).click({ timeout: 15_000, force: a.force })
          }
          if (a.type === 'wait') {
            await page.waitForTimeout(a.ms)
          }
          if (a.type === 'press') {
            await page.keyboard.press(a.key)
          }
        }
      }

      const loc = page.locator(c.selector)
      await loc.waitFor({ state: 'visible', timeout: 20_000 })
      await loc.scrollIntoViewIfNeeded()
      await page.waitForTimeout(250)

      const outPath = path.join(outDirLang, `${c.name}.png`)
      await loc.screenshot({ path: outPath })
      console.log(`[help:screenshots] wrote ${outPath}`)

      // Keep legacy root images updated from Arabic run for older hrefs.
      if (language === 'ar') {
        const legacy = path.join(outDirRoot, `${c.name}.png`)
        await fs.copyFile(outPath, legacy)
      }
    } catch (err) {
      console.warn(`[help:screenshots] WARN: failed capture ${language}:${c.name} (${c.route} / ${c.selector})`, err)

      // Keep English set complete even if one capture can't be reproduced in EN.
      if (language === 'en') {
        try {
          const arPath = path.join(outDirRoot, 'ar', `${c.name}.png`)
          const enPath = path.join(outDirRoot, 'en', `${c.name}.png`)
          await fs.copyFile(arPath, enPath)
          console.log(`[help:screenshots] copied fallback ${arPath} -> ${enPath}`)
        } catch {
          // ignore
        }
      }
    }
  }

  await context.close()
}

async function main() {
  const port = Number(process.env.HELP_SCREENSHOT_PORT || 4175)
  const baseUrl = `http://localhost:${port}`
  const outDir = path.join(ROOT, 'public', 'help', 'images', 'tours')

  await fs.mkdir(outDir, { recursive: true })

  // 1) Build with auth bypass enabled for screenshot mode
  await run(npmCmd(), ['run', 'build'], {
    env: {
      VITE_HELP_SCREENSHOTS: 'true',
    },
  })

  // 2) Start preview server
  const preview = spawn('node', [VITE_BIN, 'preview', '.', '--host', '--port', String(port), '--strictPort'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_HELP_SCREENSHOTS: 'true',
    },
  })

  try {
    await waitForHttpOk(`${baseUrl}/help`, 30_000)

    const browser = await launchChromiumWithFallback()
    try {
      await captureLanguage({ browser, baseUrl, outDirRoot: outDir, language: 'ar' })
      await captureLanguage({ browser, baseUrl, outDirRoot: outDir, language: 'en' })
    } finally {
      await browser.close()
    }
  } finally {
    preview.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
