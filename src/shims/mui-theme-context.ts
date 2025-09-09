// React-free ThemeContext shim to avoid createContext undefined errors
console.log('🎨 [shim] ThemeContext NO-OP active')

export type MuiTheme = unknown

// Minimal context-like object that satisfies MUI's expectations
const ThemeContext = {
  Provider: ({ children }: { children?: any }) => children ?? null,
  Consumer: ({ children }: { children?: (theme: any) => any }) => 
    children ? children(null) : null,
  displayName: 'ThemeContext',
  _currentValue: null,
  _currentValue2: null,
  _threadCount: 0,
}

export default ThemeContext
export { ThemeContext }

