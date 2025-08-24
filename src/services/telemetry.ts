import { supabase } from '../utils/supabase'

export interface ClientErrorLogInput {
  context: string
  message: string
  extra?: any
}

export async function logClientError(input: ClientErrorLogInput) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id ?? null
    await supabase.from('client_error_logs').insert({
      user_id,
      context: input.context,
      message: input.message,
      extra: input.extra ?? null,
    })
  } catch {
    // swallow logging errors
  }
}

