import React, { PropsWithChildren } from 'react'
import { useHasPermission } from '../../hooks/useHasPermission'

export interface WithPermissionProps {
  perm?: string
  anyOf?: string[]
}

// Render children only if user has the specified permission or any of provided permissions
export const WithPermission: React.FC<PropsWithChildren<WithPermissionProps>> = ({ perm, anyOf, children }) => {
  const hasPerm = useHasPermission()
  const allowed = perm ? hasPerm(perm) : (anyOf ? anyOf.some(p => hasPerm(p)) : true)
  if (!allowed) return null
  return <>{children}</>
}

// Helper: returns a boolean you can use in logic
export function useCan(perm?: string, anyOf?: string[]) {
  const hasPerm = useHasPermission()
  return perm ? hasPerm(perm) : (anyOf ? anyOf.some(p => hasPerm(p)) : true)
}

