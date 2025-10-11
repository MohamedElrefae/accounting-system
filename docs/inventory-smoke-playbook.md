# Inventory Module Smoke Playbook

Last updated: 2025-10-05

Purpose: Quick, repeatable steps to validate the five inventory editor flows end-to-end after changes. These checks rely on the UI and existing services; no SQL is required.

Preconditions
- You are logged in and have a valid org selected (org_id present)
- Feature flag for Inventory is enabled (VITE_FEATURE_INVENTORY)
- You have at least one Material, UOM, and Location available

General Notes
- All forms use React Hook Form with Zod validation and inline error messages
- Materials and Locations are searchable via async autocompletes (type to filter)
- You can add multiple lines before posting; posting approves and posts the created document

1) Receive Materials
- Navigate: Inventory → Receive
- Select: Location (to), Material, UOM
- Enter: Quantity (> 0), Unit Cost (>= 0), Price Source (Manual/Last/Moving Avg)
- Optional: Notes
- Click: "Create, Approve & Post"
- Expect:
  - Success toast
  - Pending lines cleared
  - On-hand at target location increased accordingly

2) Issue to Project
- Navigate: Inventory → Issue
- Select: Location (from), Material, UOM
- Enter: Quantity (> 0)
- Optional: Project, Cost Center, Analysis Work Item, Work Item, Notes
- Click: "Create, Approve & Post"
- Expect:
  - Success toast
  - On-hand at source location decreased accordingly

3) Transfer
- Navigate: Inventory → Transfer
- Select: From Location, To Location (must be different), Material, UOM
- Enter: Quantity (> 0), Price Source, Manual Unit Cost if applicable
- Optional: Notes
- Click: "Create, Approve & Post"
- Expect:
  - Success toast
  - On-hand moves from From → To location; net org on-hand unchanged

4) Adjust (Increase/Decrease)
- Navigate: Inventory → Adjust
- Select: Location, Material, UOM
- Select: Adjust Type (Increase / Decrease)
- Enter: Quantity (> 0) — UI always uses positive quantities; the Adjust Type determines direction
- Price Source: Manual requires Unit Cost
- Optional: Notes
- Click: "Create, Approve & Post"
- Expect:
  - Success toast
  - On-hand at selected location changes by entered quantity and type (increase/decrease)
  - GL posted per mapping (adjust_increase/adjust_decrease)

5) Returns
- Navigate: Inventory → Returns
- Select: Location, Material, UOM
- Select: Return Type (Return From Project / Return To Vendor)
- Enter: Quantity (> 0) — UI always uses positive quantities; the Return Type determines direction
- Optional: Project, Cost Center, Analysis Work Item, Work Item, Notes
- Click: "Create, Approve & Post"
- Expect:
  - Success toast
  - On-hand adjusts by quantity: From Project → increase; To Vendor → decrease
  - GL posted per mapping (return_from_project / return_to_vendor)

6) Void (Quick check)
- Use the QuickVoidForm component (see src/components/Inventory/QuickVoidForm.tsx) with a posted Inventory Document ID
- Expect (when eligible): document becomes void, movements reversed, on-hand restored; GL reversals per server logic

Validation/Error Checks (All Pages)
- Required fields show inline helperText errors when missing
- Quantity = 0 is rejected (helperText shown)
- Transfer From/To cannot be identical (error on To field)
- Manual price source requires non-negative Unit Cost
- Adjust/Return: quantity must be positive; direction chosen by Type selector

Troubleshooting Tips
- If dropdowns are empty, ensure you have Materials, UOMs, and Locations set up and org_id is selected
- If posting fails, check that the user context is available and services are reachable
- If validation does not show, confirm the form fields are bound (look for inline helperText)

Related docs
- Inventory Implementation Plan: docs/inventory-implementation-plan.md
