import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
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
