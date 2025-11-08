/**
 * CORS and Supabase connection checker
 */

export const checkSupabaseCORS = async () => {
  console.log('🔍 Checking Supabase CORS configuration...');
  
  const currentOrigin = window.location.origin;
  console.log('📍 Current origin:', currentOrigin);
  
  // Check if we can reach Supabase health endpoint
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL not found in environment');
    return false;
  }
  
  console.log('🏠 Supabase URL:', supabaseUrl);
  
  try {
    // Try a simple health check
    const healthUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(healthUrl, {
      method: 'HEAD',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      }
    });
    
    console.log('✅ Supabase health check:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('🚫 This is likely a CORS issue!');
      console.error('📝 To fix:');
      console.error('   1. Go to your Supabase Dashboard');
      console.error('   2. Navigate to Authentication → Settings');
      console.error('   3. Add your current origin to Site URL:', currentOrigin);
      console.error('   4. Add to Additional URLs:', currentOrigin);
    }
    
    return false;
  }
};

// Auto-run in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  setTimeout(() => {
    checkSupabaseCORS();
  }, 1000);
}