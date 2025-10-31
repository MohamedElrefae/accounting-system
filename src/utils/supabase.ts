import { createClient } from '@supabase/supabase-js'

// Proper environment variable access for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
console.log('🔍 Supabase Key:', supabaseAnonKey ? 'SET' : 'MISSING')

// Check if environment variables are properly loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are missing!')
  console.error('Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.error('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')))
  
  // Show a user-friendly error instead of white screen
  document.addEventListener('DOMContentLoaded', () => {
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
      background: #f8d7da; color: #721c24; padding: 40px; 
      font-family: system-ui; z-index: 9999; overflow: auto;
    `
    errorDiv.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #dc3545; margin-top: 0;">⚠️ Configuration Error</h1>
        <h2>Missing Supabase Environment Variables</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          The application cannot start because Supabase credentials are not configured properly.
        </p>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <strong>Debugging Info:</strong><br>
          VITE_SUPABASE_URL: <code>${supabaseUrl || 'MISSING'}</code><br>
          VITE_SUPABASE_ANON_KEY: <code>${supabaseAnonKey ? 'PRESENT' : 'MISSING'}</code><br>
          <br>
          <strong>Available VITE_ variables:</strong><br>
          <code>${Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')).join(', ') || 'NONE'}</code>
        </div>
        <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0;">
          <strong>Quick Fix:</strong>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Check your <code>.env.local</code> file in the project root</li>
            <li>Ensure it contains:<br>
              <pre style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; overflow-x: auto;"><code>VITE_SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGtuY2VzaHh4aWZ3eXRhbGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTM1MjEsImV4cCI6MjA3MTI2OTUyMX0.Kmt0yuef-hlRDgRfXD2emkW5NKhMUVqr_pBVWkr8Vy0</code></pre>
            </li>
            <li>Restart the dev server: <code>npm run dev</code></li>
          </ol>
        </div>
      </div>
    `
    document.body.appendChild(errorDiv)
  })
  
  // Don't throw error immediately, let the error message show
  setTimeout(() => {
    throw new Error('Missing Supabase environment variables')
  }, 100)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you can customize these based on your actual database schema)
export interface Account {
  id: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  account_id: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  reference: string
  created_at: string
  updated_at: string
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  debit_amount: number
  credit_amount: number
  created_at: string
  updated_at: string
}
