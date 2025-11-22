export type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  phone?: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  is_active?: boolean;
  last_login?: string | null;
  is_super_admin?: boolean;
};
