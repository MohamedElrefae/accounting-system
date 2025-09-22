import { supabase } from '../utils/supabase';
import { jsPDF } from 'jspdf';

export interface DocumentTemplate {
  id: string;
  org_id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  content: any; // JSON
  version: number;
  created_by: string;
  created_at: string;
}

export async function listTemplates(orgId: string) {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('name');
  if (error) throw error;
  return (data || []) as DocumentTemplate[];
}

export async function getTemplate(id: string) {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as DocumentTemplate;
}

export async function createTemplate(payload: Partial<DocumentTemplate>) {
  // Ensure created_by is populated with the current authenticated user
  let created_by: string | undefined = payload.created_by as any;
  try {
    if (!created_by) {
      const { data: userData } = await supabase.auth.getUser();
      created_by = userData?.user?.id || undefined;
    }
  } catch {
    // ignore; fall back to payload value
  }

  const insertPayload = {
    version: 1,
    ...payload,
    ...(created_by ? { created_by } : {}),
  } as any;

  const { data, error } = await supabase
    .from('document_templates')
    .insert(insertPayload)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentTemplate;
}

export async function updateTemplate(id: string, patch: Partial<DocumentTemplate>) {
  const { data, error } = await supabase
    .from('document_templates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Very simple PDF generator using jsPDF. Produces a summary PDF of provided data.
export async function generatePdfFromTemplate(template: DocumentTemplate, data: Record<string, any>) {
  const doc = new jsPDF();
  const title = template.name || 'Document';
  doc.setFontSize(16);
  doc.text(title, 20, 20);
  doc.setFontSize(10);
  const json = JSON.stringify(data, null, 2);
  const lines = doc.splitTextToSize(json, 170);
  doc.text(lines, 20, 30);
  const blob = doc.output('blob');
  return blob as Blob;
}