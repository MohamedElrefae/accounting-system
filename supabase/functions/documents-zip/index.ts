// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import JSClient from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { ZipWriter } from "https://deno.land/x/zipjs@v2.7.34/index.js";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    // Require JWT from the caller (Authorization: Bearer ...)
    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return new Response('Unauthorized', { status: 401 });

    const { paths, fileName } = await req.json();
    if (!Array.isArray(paths) || paths.length === 0) {
      return new Response(JSON.stringify({ error: 'paths array required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // user-scoped client (RLS enforced)
    const userClient = JSClient.createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    // service client (for storage download after authorization)
    const serviceClient = JSClient.createClient(SUPABASE_URL, SERVICE_ROLE);

    // Create ZIP in memory (note: for very large sets, consider a streaming implementation)
    const chunks: Uint8Array[] = [];
    const writer = new ZipWriter({
      async writeUint8Array(data: Uint8Array) { chunks.push(data); },
      async close() {}
    } as any);

    // Authorize each path by checking a SELECT on document_versions via user client (RLS + policies)
    const included: string[] = [];
    const skipped: string[] = [];
    for (const p of paths) {
      // Check visibility: if user cannot see the version row, skip
      const { data: ver, error: vErr } = await userClient
        .from('document_versions')
        .select('id, document_id, storage_path')
        .eq('storage_path', p)
        .single();
      if (vErr || !ver) { skipped.push(p); continue; }

      // Authorized — download using service client
      const { data, error } = await serviceClient.storage.from('documents').download(p);
      if (error) { skipped.push(p); continue; }
      const blob = data as Blob;
      const buf = new Uint8Array(await blob.arrayBuffer());
      const name = (p as string).replace(/^.*documents\//, '');
      await writer.add(name, new Blob([buf]));
      included.push(p);
    }

    // Add a simple manifest.txt
    const manifest = `Included: ${included.length}\nSkipped: ${skipped.length}\n\nIncluded paths:\n${included.join('\n')}\n\nSkipped paths:\n${skipped.join('\n')}\n`;
    await writer.add('manifest.txt', new Blob([new TextEncoder().encode(manifest)]));

    await writer.close();
    const zipBlob = new Blob(chunks, { type: 'application/zip' });
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName || 'documents'}.zip"`
    });
    return new Response(zipBlob, { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
