// Lightweight performance monitor service placeholder
export type PerfEvent = { name: string; value: number; at: number }

export class ApplicationPerformanceMonitor {
  private static events: PerfEvent[] = []
  static record(name: string, value: number) {
    this.events.push({ name, value, at: Date.now() })
  }
  static list() { return this.events }
}