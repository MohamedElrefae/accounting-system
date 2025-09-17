// React shim to ensure Children property is always available
import * as React from 'react'

console.log('🔧 [shim] React Children fix active')

// Ensure React has Children property by creating a custom children handler
const customChildren = {
  map: (children: any, fn: (child: any, index: number) => any) => {
    if (!children) return []
    if (Array.isArray(children)) return children.map(fn)
    return [fn(children, 0)]
  },
  forEach: (children: any, fn: (child: any, index: number) => void) => {
    if (!children) return
    if (Array.isArray(children)) {
      children.forEach(fn)
    } else {
      fn(children, 0)
    }
  },
  count: (children: any) => {
    if (!children) return 0
    if (Array.isArray(children)) return children.length
    return 1
  },
  only: (children: any) => {
    if (Array.isArray(children) && children.length === 1) return children[0]
    if (!Array.isArray(children)) return children
    throw new Error('React.Children.only expected to receive a single React element child.')
  },
  toArray: (children: any) => {
    if (!children) return []
    if (Array.isArray(children)) return children
    return [children]
  }
}

// Try to enhance React with Children if missing
if (React && !React.Children) {
  try {
    Object.defineProperty(React, 'Children', {
      value: customChildren,
      writable: false,
      enumerable: true,
      configurable: false
    })
  } catch {
    console.warn('Could not assign React.Children, using fallback')
  }
}

export default React
export const Children = React.Children
export const Component = React.Component
export const Fragment = React.Fragment
export const StrictMode = React.StrictMode
export const Suspense = React.Suspense
export const createElement = React.createElement
export const createContext = React.createContext
export const useState = React.useState
export const useEffect = React.useEffect
export const useLayoutEffect = React.useLayoutEffect
export const useMemo = React.useMemo
export const useCallback = React.useCallback
export const useRef = React.useRef
export const useReducer = React.useReducer
export const useContext = React.useContext
