import { useHasPermission } from './useHasPermission'

// Helper: returns a boolean you can use in logic
export function useCan(perm?: string, anyOf?: string[]) {
  const hasPerm = useHasPermission()
  return perm ? hasPerm(perm) : (anyOf ? anyOf.some(p => hasPerm(p)) : true)
}