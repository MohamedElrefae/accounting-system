// Common shared types for better type safety

export type Id = string;
export type UUID = string;
export type Json = unknown;
export type Nullable<T> = T | null;

export type ApiError = {
  message: string;
  code?: string;
  field?: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

// Event types
export type ChangeEvent<T = HTMLInputElement> = React.ChangeEvent<T>;
export type FormEvent<T = HTMLFormElement> = React.FormEvent<T>;
export type ClickEvent<T = HTMLButtonElement> = React.MouseEvent<T>;

// Generic data record
export type DataRecord = Record<string, unknown>;

// Common component props
export type WithChildren<T = {}> = T & {
  children?: React.ReactNode;
};

export type WithClassName<T = {}> = T & {
  className?: string;
};

// Database entities base
export type BaseEntity = {
  id: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

// Supabase result types
export type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
  status?: number;
  statusText?: string;
};

export type SupabaseListResult<T> = SupabaseResult<T[]>;

// User related types
export type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  is_active?: boolean;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};
