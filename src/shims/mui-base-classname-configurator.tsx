// Minimal safe shim for MUI Base ClassNameConfigurator without runtime React dependency
// Provides a pass-through provider and identity utility-class override.
import type { ReactNode } from 'react'

export type ClassNameConfiguratorProps = {
  disableDefaultClasses?: boolean
  children?: ReactNode
}

// Pass-through provider: just render children; no React context used
export default function ClassNameConfigurator(props: ClassNameConfiguratorProps) {
  return (props?.children as any) ?? null
}

// No-op hook: return identity generator so default classes are used
export function useClassNamesOverride<T extends (slot: string) => string>(
  generateUtilityClass: T
): T {
  return generateUtilityClass
}

// Optional compatibility export
export function useClassNameConfigurator() {
  return { disableDefaultClasses: false } as any
}

