import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Adjust these origins for your environments
const ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:3000",
  // add production origins here, e.g. "https://accounting.yourdomain.com"
]);

function buildCorsHeaders(originHeader: string | null): HeadersInit {
  const origin = originHeader ?? "*";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Edge Functions expect Authorization: Bearer <JWT> for authenticated calls
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing/invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON parse error", e);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email: string | undefined = body.email;
    const token: string | undefined = body.token;

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "email and token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000";
    const FROM_EMAIL = Deno.env.get("INVITE_FROM_EMAIL") || "onboarding@resend.dev";

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Server missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = `${APP_BASE_URL}/register?token=${encodeURIComponent(token)}`;

    const payload = {
      from: FROM_EMAIL,
      to: email,
      subject: "Invitation to join",
      html: `
        <p>You have been invited to join the system.</p>
        <p><a href="${link}">Click here to complete registration</a></p>
        <p>If you didn’t expect this, you can ignore this email.</p>
      `,
    } as const;

    let resendResp: Response;
    try {
      resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr) {
      console.error("Resend fetch failed", fetchErr);
      return new Response(JSON.stringify({ error: "Network error calling Resend", details: String(fetchErr) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendResp.ok) {
      const text = await resendResp.text().catch(() => "");
      console.error("Resend returned error", resendResp.status, text);
      return new Response(
        JSON.stringify({ error: "Resend failed", status: resendResp.status, details: text || resendResp.statusText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiResult = await resendResp.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: true, provider: apiResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

