---
trigger: always_on
---

Windsurf Rules for This Project
1. Database schema discovery
Never rely on any local SQL or cached schema when reasoning about the database.

When schema knowledge is required, always get the latest schema from Supabase:

Ask the user to run a Supabase CLI command like supabase db pull or supabase db dump and share the result, or

Provide an exact SQL script that the user can run in the Supabase SQL editor to extract tables, columns, and constraints, then continue only after the user pastes the output.​

All code and migrations must be based on the latest schema the user provides, not on assumptions.

2. Using the latest schema in code
Before creating or modifying any logic that touches the database, confirm table names, columns, types, and relationships from the latest schema.

If anything is unclear (missing table/column definitions, unknown constraints), ask the user to run the provided SQL to reveal that information and wait for the result.

After schema updates, adjust any earlier assumptions in the plan and generated code so the app always matches the real database.

3. UI and design standards (React + MUI)
The application uses React with MUI as the primary component library (not Tailwind, not shadcn/ui).​

Layout and spacing must be built with MUI primitives:

Use ThemeProvider, CssBaseline, Box, Stack, Grid, Container, and the MUI system props (sx, margin, padding, gap, display, etc.) for structure.

Prefer theme-based spacing and typography (e.g. theme.spacing, variant props) for consistency.

Always design for a full-page layout suitable for dashboards:

Use a top-level layout (e.g. AppLayout) that provides app bar, navigation (sidebar or drawer), and main content region.

Keep design tokens unified using a single MUI theme (colors, typography, shape, breakpoints).

Use simple icon services (for example @mui/icons-material or another chosen icon set) consistently across the application for icons, and avoid mixing many unrelated icon libraries.

4. RTL and Arabic support
The UI must fully support RTL and Arabic:

Set the document or root container dir="rtl" when the language is Arabic.​

Configure MUI’s RTL support using the recommended approach (theme direction set to "rtl" and proper styling engine setup).​

Ensure all components render correctly in RTL:

Navigation, sidebars, and drawers should open from the right where appropriate.

Spacing and alignment should look natural in RTL (e.g. use justifyContent="flex-end" or textAlign="right" when needed, respecting the theme direction).

5. Supabase usage and environment variables (React)
Supabase client must be created using environment variables, not hard-coded values.

In this React setup (Vite-style or similar), use environment variables such as:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

The Supabase client file should follow the pattern:

Read URL and key from import.meta.env (or the project’s equivalent env system).

Export a singleton Supabase client created with createClient.

When code that talks to Supabase is generated or changed, always assume these environment variables are available and show the correct imports and initialization pattern.​

6. Supabase migrations and SQL
When the database needs changes (tables, columns, indexes, RLS rules, functions, etc.):

Prefer a Supabase CLI migration (the user will run it).

If CLI is not applicable, generate a standalone SQL file that the user can paste into the Supabase SQL editor.

For each requested change, always produce:

A migration SQL script in one code block, suitable as a single file, with a suggested filename comment (e.g. -- 2025-12-07_add_invoice_tables.sql).

A verification SQL script in a separate code block that confirms the migration worked (e.g. queries information_schema to check columns or runs a SELECT from the new table).

Make migrations as safe and re-runnable as practical (using IF NOT EXISTS when appropriate).

7. Planning and execution behavior
For any non-trivial request, first create or update a concise end-to-end plan that covers:

Schema discovery (or confirmation).

Database migrations (if needed).

Backend/data-access code.

React + MUI UI changes (including RTL/Arabic considerations).

Basic validation or testing steps.

After presenting the plan, proceed to implement it fully:

Do not stop midway only to report progress.

Only pause when user input is absolutely required (for example, to run a CLI command, provide schema output, or choose a business rule).

When choices are possible, pick the solution that best fits this project’s requirements:

React + MUI UI.

Supabase backend.

RTL- and Arabic-friendly layout.

8. General coding style
Use modern React (functional components, hooks) and TypeScript if the project uses it.

Keep components focused and reusable; factor out reusable layout and form components where it improves clarity.

Add short, meaningful comments to explain non-obvious logic, but avoid noisy or redundant comments.

