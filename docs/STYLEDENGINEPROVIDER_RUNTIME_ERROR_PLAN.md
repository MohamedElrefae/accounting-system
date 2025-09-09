# StyledEngineProvider runtime error (lI is not a function)

Status: Open
Last updated: 2025-09-06
Owner: Eng

---

## TL;DR
- Production still throws at MUI’s StyledEngineProvider module: "Uncaught TypeError: lI is not a function" at module init line (StyledEngineProvider.js:13), which is where it calls Emotion’s createCache().
- We added hardening shims for both StyledEngineProvider and @emotion/cache, plus fixed Vercel to run a fresh Vite production build. Despite this, the node_modules StyledEngineProvider is still being executed in the final bundle.
- Strong hypothesis: a bundling path (relative or pre-resolved) is bypassing our simple alias. Because StyledEngineProvider executes createCache at module scope, any inclusion of the raw module causes the crash if interop isn’t normalized on that exact import path.

---

## What’s deployed (links)
- Latest Production URL: (see Vercel Deployments for the newest ‘accounting-system-phase1-*’ URL)
- Example Inspect links (recent):
  - https://vercel.com/mohamedelrefaes-projects/accounting-system-phase1/Arywz2F4hb9i84fYYNHq24hWU3uG
  - https://vercel.com/mohamedelrefaes-projects/accounting-system-phase1/7HJdLdgeqT5ebNU7mkfiSxSKrYQp

---

## Current code hardening (already in repo)
- Top-level Emotion CacheProvider
  - file: src/main.tsx
  - createCache({ key: 'css', prepend: true }) and wraps <App />
- StyledEngineProvider shim
  - file: src/shims/StyledEngineProvider.tsx
  - Normalizes createCache import and logs probe ‘SHIM_SEP’
- Global Emotion cache shim (forces callable default)
  - file: src/shims/emotion-cache-default.ts
  - Vite alias: '@emotion/cache$' -> this shim
  - Logs probe ‘EMOTION_CACHE_SHIM’
- Aggressive alias coverage for StyledEngineProvider
  - vite.config.ts aliases include:
    - '@mui/styled-engine$' -> src/shims/styled-engine-index.ts
    - '@mui/styled-engine/…/StyledEngineProvider' (modern/legacy/node) -> shim
    - '@mui/system/StyledEngineProvider' and '@mui/material/*/StyledEngineProvider' -> shim
- Dedupe: react, react-dom, @emotion/react, @emotion/styled
- Vercel build fixed to run a real static build (npm ci && vite build) and serve dist as SPA (vercel.json)

---

## Observed behavior
- Production console: StyledEngineProvider.js:13 Uncaught TypeError: lI is not a function
- This line is the module-scope createCache(...) call in @mui/styled-engine/StyledEngineProvider/StyledEngineProvider.js.
- Conclusion: the raw module is still being included and executed, and its createCache import is not our normalized shim on the exact path that module resolved.

---

## Root-cause hypothesis (ranked)
1) Relative/fully-resolved import path bypasses alias
   - Within @mui/styled-engine, the file imports './StyledEngineProvider' (relative), which can evade alias rules matching '@mui/styled-engine/...'.
   - Result: the actual resolved id is a file path under node_modules, not the package specifier we alias.
2) @emotion/cache import inside node_modules is resolved to a path that bypasses '@emotion/cache$' alias
   - For example, bundler inlines/resolves to a dist file path that our alias doesn’t match.
3) Tree-shaking includes StyledEngineProvider as a side-effect module
   - Even if we don’t use it at runtime, the module is pulled in and executed.

---

## Next steps checklist (do in order)

1) Verify shim probes in production
   - Open browser console and evaluate:
     - window.EMOTION_CACHE_SHIM
     - window.SHIM_SEP
     - window.TOP_CACHE
   - Expected: all should be 'active'. If any are undefined, alias/shim isn’t being used on that path.

2) Add a targeted Rollup/Vite resolve plugin for hard redirection
   - Intercept resolved ids by absolute file path and redirect to our shim regardless of how they are imported.
   - Pseudocode plugin to add into vite.config.ts plugins array:

```ts path=null start=null
import path from 'node:path'

function forceStyledEngineProviderShim() {
  return {
    name: 'force-sep-shim',
    enforce: 'pre',
    resolveId(id) {
      // Normalize both package specifiers and absolute paths
      if (
        id.includes('@mui/styled-engine/StyledEngineProvider') ||
        id.endsWith('/@mui/styled-engine/StyledEngineProvider/index.js') ||
        id.endsWith('/@mui/styled-engine/StyledEngineProvider/StyledEngineProvider.js')
      ) {
        return path.resolve(__dirname, 'src/shims/StyledEngineProvider.tsx')
      }
      // Also guard against relative resolution inside the package
      if (
        id.includes('node_modules/@mui/styled-engine/StyledEngineProvider')
      ) {
        return path.resolve(__dirname, 'src/shims/StyledEngineProvider.tsx')
      }
      return null
    }
  }
}

function forceEmotionCacheShim() {
  return {
    name: 'force-emotion-cache-shim',
    enforce: 'pre',
    resolveId(id) {
      if (
        id === '@emotion/cache' ||
        id.includes('/@emotion/cache') ||
        id.includes('node_modules/@emotion/cache')
      ) {
        return path.resolve(__dirname, 'src/shims/emotion-cache-default.ts')
      }
      return null
    }
  }
}

// Then include both in plugins: [forceStyledEngineProviderShim(), forceEmotionCacheShim(), …]
```

3) Prevent bundling the raw StyledEngineProvider module entirely (belt-and-suspenders)
   - Add an alias so any reference to the raw module resolves to our shim or a no-op wrapper that defers createCache to render time.
   - Ensure no app code imports from '@mui/styled-engine/StyledEngineProvider' directly.

4) Rebuild locally, inspect and map
   - Build locally: `npm run build`
   - Search dist for ‘StyledEngineProvider’ occurrence and verify our shim’s code is included instead of node_modules file.
   - If minified, use source maps to confirm mapping.

5) Cacheless redeploy & verify
   - Push changes and redeploy with cache ignored.
   - Verify production console (incognito) shows no ‘lI is not a function’ and that probes are present.

6) If still failing: last-resort blocklist
   - Add a simple plugin that marks the node_modules StyledEngineProvider module as external/no-op and forces only our shim into the graph.

---

## Optional mitigations (if we need to ship around it)
- No-op provider: Replace StyledEngineProvider everywhere with a pass-through component that just renders children (we already manage CacheProvider at the app root). This avoids module-scope createCache entirely.
- Migrate away from @mui/styled-engine dependency in app code (do not import it directly). Rely solely on top-level CacheProvider.

---

## Verification steps
1) Console probes
   - Expect logs:
     - "[shim] emotion-cache default normalized"
     - "[shim] StyledEngineProvider active"
     - "[app] CacheProvider active"
   - Globals:
     - window.EMOTION_CACHE_SHIM === 'active'
     - window.SHIM_SEP === 'active'
     - window.TOP_CACHE === 'active'

2) No runtime errors
   - No ‘lI is not a function’ or MUI/Emotion context errors on first load.

3) UI sanity
   - Basic navigation, forms, transitions okay; no hydration/style flicker.

---

## Rollback plan
- If the enforced plugin redirections cause unexpected behavior, remove plugins and revert to previously working commit while we iterate in a separate branch.

---

## Progress update (2025-09-06)

Changes implemented
- Added and wired a robust @emotion/cache shim that imports the concrete ESM browser build and guarantees a callable default export
  - File: src/shims/emotion-cache-default.ts
  - Alias: '@emotion/cache$' -> src/shims/emotion-cache-default.ts (in vite.config.ts)
  - Probe: window.EMOTION_CACHE_SHIM = 'active'
- Confirmed StyledEngineProvider no-op shim remains enforced through aliases and pre-resolve plugins already present
  - Files: src/shims/StyledEngineProvider.tsx, src/shims/styled-engine-index.ts
  - Plugins: blockStyledEngineProvider(), forceStyledEngineProviderShim() (vite.config.ts)

Current behavior
- The browser still reports: "StyledEngineProvider.js:13 Uncaught TypeError: lI is not a function"
- This indicates a code path is still executing the node_modules @mui/styled-engine/StyledEngineProvider module (module-scope createCache call) rather than our shim.

Working hypothesis (refined)
- Relative imports inside @mui/styled-engine (e.g., './StyledEngineProvider') can bypass our current alias checks because resolveId sees a relative id and our handler doesn’t look at the importer path.
- Similarly, internal references to @emotion/cache might resolve to a file path that bypasses the '@emotion/cache$' alias (e.g., direct dist file paths).

Next steps (queued)
1) Harden resolver for path-level interception
   - Update forceStyledEngineProviderShim to inspect both id and importer:
     - If id is relative and importer is inside node_modules/@mui/styled-engine/…, redirect to src/shims/StyledEngineProvider.tsx
     - If id resolves to any absolute path ending with '/StyledEngineProvider.js' under @mui/styled-engine, redirect as well
   - Add forceEmotionCacheShim to intercept any absolute/relative path resolving to @emotion/cache (including dist paths) and redirect to src/shims/emotion-cache-default.ts

2) Verify build output and mapping
   - After local build, search dist for 'StyledEngineProvider' to confirm only shim code is present and the node_modules file is not
   - Use source maps if minified to confirm mapping to shim

3) Clean deploy and sanity check
   - Rebuild locally and redeploy without cache; verify probes in console and ensure no runtime StyledEngineProvider errors

Pseudocode for resolver hardening (to implement next)
```ts path=null start=null
import path from 'node:path'

function forceStyledEngineProviderShim() {
  return {
    name: 'force-sep-shim',
    enforce: 'pre' as const,
    resolveId(id: string, importer?: string) {
      const lower = id.replace(/\\\\/g, '/').toLowerCase()
      const imp = importer ? importer.replace(/\\\\/g, '/').toLowerCase() : ''

      // 1) Relative import from within @mui/styled-engine
      if ((lower === './styledengineprovider' || lower.endsWith('/styledengineprovider')) &&
          imp.includes('/node_modules/@mui/styled-engine/')) {
        return path.resolve(__dirname, 'src/shims/StyledEngineProvider.tsx')
      }

      // 2) Any absolute path that lands on StyledEngineProvider.js
      if (lower.endsWith('/styledengineprovider.js')) {
        return path.resolve(__dirname, 'src/shims/StyledEngineProvider.tsx')
      }

      // 3) Package specifier variants
      if (
        lower.includes('@mui/styled-engine/styledengineprovider') ||
        lower.includes('@mui/system/styledengineprovider') ||
        lower.includes('@mui/material/styles/styledengineprovider') ||
        lower.includes('@mui/material/styledengineprovider')
      ) {
        return path.resolve(__dirname, 'src/shims/StyledEngineProvider.tsx')
      }

      return null
    }
  }
}

function forceEmotionCacheShim() {
  return {
    name: 'force-emotion-cache-shim',
    enforce: 'pre' as const,
    resolveId(id: string, importer?: string) {
      const lower = id.replace(/\\\\/g, '/').toLowerCase()
      const imp = importer ? importer.replace(/\\\\/g, '/').toLowerCase() : ''

      // Package specifier or deep path to @emotion/cache
      if (
        lower === '@emotion/cache' ||
        lower.includes('/@emotion/cache') ||
        imp.includes('/node_modules/@emotion/cache')
      ) {
        return path.resolve(__dirname, 'src/shims/emotion-cache-default.ts')
      }
      return null
    }
  }
}

// usage in vite config plugins: [forceStyledEngineProviderShim(), forceEmotionCacheShim(), …]
```

Tracking
- Keep this section updated with which resolver rules are added and their impact on the bundle graph.

---

## Useful commands

- Local clean build
```bash path=null start=null
rm -rf node_modules dist package-lock.json
npm ci
npm run build
```

- Cacheless deploy (requires Vercel CLI logged in)
```bash path=null start=null
git add -A && git commit -m "fix: enforce shim for StyledEngineProvider and emotion cache via resolve plugin"
git push
vercel deploy --prod --yes --force --build-env VERCEL_FORCE_NO_BUILD_CACHE=1
```

---

## Notes for future work
- If database changes come up, provide SQL blocks with verification queries separately (per team rules).
- Maintain unified theme tokens and avoid inline styles for any upcoming UI changes.

