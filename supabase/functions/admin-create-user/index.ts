// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.1";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase service configuration" }),
        { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      email,
      password,
      profile = {},
      role_id = null,
      require_password_change = true,
    }: {
      email: string;
      password: string;
      profile?: Record<string, any>;
      role_id?: number | null;
      require_password_change?: boolean;
    } = body || {};

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "email and password are required" }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // Create auth user (confirmed) with metadata
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        require_password_change: !!require_password_change,
      },
    });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create user" }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    const userId = created.user.id;

    // Create user profile row
    const profileRow = {
      id: userId,
      email,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
      full_name_ar: profile.full_name_ar ?? null,
      department: profile.department ?? null,
      job_title: profile.job_title ?? null,
      phone: profile.phone ?? null,
      is_active: profile.is_active ?? true,
      created_at: new Date().toISOString(),
    };

    const { error: profErr } = await supabaseAdmin.from("user_profiles").insert(profileRow);
    if (profErr) {
      // Attempt cleanup: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(
        JSON.stringify({ error: `Failed to insert profile: ${profErr.message}` }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } }
      );
    }

    // Assign role if provided
    if (role_id) {
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role_id,
        is_active: true,
        assigned_by: userId, // can be replaced by the caller's id via JWT in future
      });
      if (roleErr) {
        // Don't fail entirely; return warning
        return new Response(
          JSON.stringify({ user: created.user, warning: `Profile saved but failed to assign role: ${roleErr.message}` }),
          { status: 207, headers: { "content-type": "application/json", ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ user: created.user }),
      { status: 200, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }
});

