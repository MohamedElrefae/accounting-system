# Enterprise Document Management System (EDMS) — Current Status and Next Steps

Last updated: 2025-09-23

## Overview
We implemented a full folder- and permissions-aware EDMS on top of your existing Supabase-based accounting system. Key capabilities now include:

- Hierarchical folders with explicit folder permissions (read/write/admin) and inheritance to documents
- Document categories (Financial, Technical, Contract, Drawings) seeded per org
- Folder-aware storage paths: `documents/{org_id}/folders/{folder_id}/{document_id}/{version}/{file}`
- Strict RLS across documents, versions, relationships, storage bucket objects
- Full upload/versioning/download flow under RLS
- UI for folders (tree, CRUD, permissions), document details, and per-card actions (download/move/permissions)
- Bulk actions (move/download/delete) and ZIP download via a hardened Edge Function

## Database / SQL Work Completed

1. Core folders and permissions (064)
- Created `public.document_folders` (org-scoped, hierarchical, audited)
- Created `public.folder_permissions` (user/role grantees; read/write/admin)
- Added `documents.folder_id` with FK and index
- Seeded `Unfiled` for each org and backfilled existing documents

2. RLS and Permission Helpers (065)
- `edms_has_folder_access(folder_id, action)` — checks folder (and ancestors) + grantees + creator fallback + org-manage/admin fallback
- Replaced/standardized `edms_has_document_access(document_id, action)` to first evaluate explicit document permissions then inherit from folder
- RLS policies for `document_folders` and `folder_permissions`

3. Categories seed (066)
- Ensured `document_categories` table and seeded default top-level categories per org

4. Support/diagnostics (067)
- Index confirmations
- Helpers: `edms_folder_ancestors`, `edms_folder_path_text`

5. ZIP helpers (068 optional)
- View: `v_documents_current_paths`
- Functions: `edms_list_current_paths(uuid[])`, `edms_list_paths_by_folder(uuid)` (optional references for client-side and admin diagnostics)

## Supabase Edge Function — documents-zip

- Location: `supabase/functions/documents-zip/index.ts`
- Purpose: Build a ZIP of selected document version files
- Security:
  - Requires Authorization: Bearer <JWT>
  - Uses user-scoped client to validate visibility of each `document_versions.storage_path` via RLS
  - Only files authorized to the caller are included
  - Includes `manifest.txt` listing included/skipped paths

## Services / Client Work Completed

- New: `src/services/document-folders.ts`
  - CRUD: createFolder, renameFolder, deleteFolder, moveFolder, reorderFolder
  - Permissions: getFolderPermissions, setFolderPermissions, deleteFolderPermission
  - listFolders, getUnfiledFolderId

- Updated: `src/services/documents.ts`
  - Document type with `folder_id`
  - Folder-aware storage paths for uploads and versions
  - `moveDocument(documentId, newFolderId)`
  - `getDocuments` supports `folderId` filter
  - `promoteDocumentVersion(versionId)`

- New: `src/services/zip.ts`
  - `downloadZip(paths, fileName)` calls the Edge Function

## UI Work Completed

- Page: `src/features/documents/pages/DocumentManagementPage.tsx`
  - Folder tree (nested, expand/collapse, simple DnD reordering and re-parenting)
  - Folder CRUD buttons (New/Rename/Delete)
  - Folder Permissions dialog integration
  - Category selection dialog for uploads
  - Bulk actions: Move Selected, Download Selected, Delete Selected, Download Selected as ZIP
  - Card actions wired (via layout props)

- Layout: `src/features/documents/components/DocumentManagementLayout.tsx`
  - Card grid view improvements
  - Per-card "…" menu (Download, Move to selected folder, Permissions…, Link to current project)
  - Selection checkboxes (for bulk move/download/delete)
  - Virtualized list view using `react-window` for large lists

- Details: `src/components/documents/DocumentDetailsPanel.tsx`
  - Shows folder path and category name
  - Editable selects for folder and category (with manage permission)
  - Versions list with Download and Promote buttons

- Dialogs:
  - Folder permissions: `src/components/documents/FolderPermissionsDialog.tsx`
  - Category select: `src/components/documents/CategorySelectDialog.tsx`

## Verification Checklist

- DB
  - `SELECT * FROM storage.buckets WHERE id='documents';`
  - `SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects';`
  - Ensure `document_folders`, `folder_permissions`, `document_categories` exist and have triggers `trg_*_actor`

- RLS
  - `SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('documents','document_versions','document_folders','folder_permissions');`

- Access helpers
  - `SELECT public.edms_has_document_access('<doc_id>'::uuid, 'read');`
  - `SELECT public.edms_has_folder_access('<folder_id>'::uuid, 'write');`

- ZIP
  - Deploy `documents-zip` function and set env vars
  - As user with mixed access, test "Download Selected as ZIP"; check `manifest.txt` inside the ZIP

## Deployment Checklist

1. Run SQL migrations/blocks (064–067, optional 068 helpers) on your target project
2. Deploy Edge Function `documents-zip` and set function env vars:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. `npm install` (adds `react-window`)
4. `npm run build`
5. Manual sanity test of folders, uploads, permissions, and ZIP

## Proposed Next Work

1. Grid virtualized rendering
   - Virtualize the grid view for thousands of items (windowed cards)

2. Linked counts and unlink actions
   - On cards and details: show counts for linked transactions/projects and provide quick unlink

3. Advanced DnD UX
   - Visual drop zones and drag previews; improved cost of re-render with memoization

4. Bulk ZIP enhancements
   - Add progress indicators and streaming ZIP (Edge function optimization)

5. Admin/Diagnostics Console
   - Small internal page to inspect `edms_has_*` decisions, folder tree integrity, and storage/DB mismatches

6. Tests
   - Add integration tests for RLS flows and storage uploads (harness running against a test project)

## Risks & Mitigations

- Path/DB mismatches: Storage policies require `storage.objects.name = document_versions.storage_path`; ensure the UI always inserts versions first, then uploads to the exact path
- Folder moves and legacy versions: We intentionally did not rewrite historical storage paths; if needed, add a controlled process (068-repath) with a dry-run manifest and selective updates
- Large ZIPs: The Edge Function builds ZIP in memory; for very large sets, a streaming approach or chunking strategy is recommended

## Quick Commands & Snippets

- Confirm current version storage paths:
```sql
SELECT * FROM public.v_documents_current_paths LIMIT 20;
```

- List paths for selected docs:
```sql
SELECT *
FROM public.edms_list_current_paths(ARRAY['<doc_id_1>'::uuid,'<doc_id_2>'::uuid]);
```

- Verify a user’s read access to a doc:
```sql
SELECT public.edms_has_document_access('<doc_id>'::uuid, 'read');
```

---

If you want, I can continue with the next implementation items (virtualized grid view, linked counts, advanced DnD visuals, admin diagnostics, tests).