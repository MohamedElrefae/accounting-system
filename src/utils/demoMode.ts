const DEMO_MODE_KEY = 'app:demoMode'

export function getDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function setDemoMode(enabled: boolean) {
  try {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}
