import { supabase } from '../utils/supabase';

export async function downloadZip(paths: string[], fileName = 'documents') {
  const url = `${(supabase as any).supabaseUrl}/functions/v1/documents-zip`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}` },
    body: JSON.stringify({ paths, fileName })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ZIP function failed: ${res.status} ${t}`);
  }
  const blob = await res.blob();
  const dl = document.createElement('a');
  dl.href = URL.createObjectURL(blob);
  dl.download = `${fileName}.zip`;
  document.body.appendChild(dl);
  dl.click();
  setTimeout(() => { URL.revokeObjectURL(dl.href); dl.remove(); }, 1000);
}