<link rel="stylesheet" href="./print-handout.css" />
<div class="handout-wrap">
  <div class="handout-header">
    <!-- Optional: replace src with your org logo URL; or remove img to use text-only header -->
    <img class="logo" src="" alt="Logo" />
    <div>
      <div class="title">Inventory KPIs — One‑Pager</div>
      <div class="company">{{COMPANY_NAME_FROM_ORG_SETTINGS}}</div>
    </div>
  </div>

# Inventory KPIs — One‑Pager

Last updated: 2025-10-06

1) Purpose
This one-pager summarizes key Inventory KPIs, how they’re calculated, where the data comes from, and a short demo flow for stakeholders.

2) KPIs and definitions
- Total Valuation
  - What: Sum of inventory value across filtered scope
  - How: SUM(total_value) from v_inv_valuation_by_project (or valuation view after filters)
  - Notes: unit_cost_basis currently from materials.standard_cost (extensible to moving average later)

- Total On-Hand Qty
  - What: Sum of on-hand quantities across filtered scope
  - How: SUM(total_quantity) from v_inv_valuation_by_project

- Ageing > 90 Days (Qty)
  - What: Total on-hand quantity where last inbound > 90 days ago
  - How: SUM(on_hand_qty) from v_inv_stock_ageing WHERE days_since_inbound > 90

- Last Month Movements (In/Out)
  - What: Sum of movements in previous month
  - How: SUM(qty_in), SUM(qty_out) from v_inv_movement_summary_project_month for last calendar month

- Low Stock Items (Count)
  - What: Number of items below minimum_stock_level
  - How: COUNT(*) where on-hand < minimum_stock_level (on-hand from valuation/on-hand view; threshold from materials.minimum_stock_level)

3) Data sources (public views)
- v_inv_stock_valuation (label-enriched)
- v_inv_stock_ageing (label-enriched)
- v_inv_movement_summary (label-enriched) and grouped:
  - v_inv_movement_summary_project_month
  - v_inv_movement_summary_project_material_month
- Grouped valuation:
  - v_inv_valuation_by_project
  - v_inv_valuation_by_location
  - v_inv_valuation_by_material

4) Filters (applied to all KPIs/charts)
- Material, Location, Project
- Date range (month From/To)
- Apply button triggers server-side filtered queries

5) Drill-through
- Click valuation trend month → opens Valuation prefiltered (then Apply)
- Click movement trend month → opens Movement Detail prefiltered (material/location/project + from/to for that month)

6) Demo flow (6–8 minutes)
- KPIs dashboard
  - Show cards, change filters, Apply
  - Click a trend point (Movement Detail or Valuation)
- Valuation
  - Group by Project; Export Totals CSV
  - Drill-down to Movement Detail
- Movement Summary
  - Totals, Group by Project/Material, Compare to Previous Period
  - Export Totals CSV
- Reconciliation (optional)
  - Open session, auto-resolve, post, void

7) Export to PDF
- From your Markdown viewer: choose Export to PDF if available
- Or open the Markdown in your browser:
  - Use a Markdown preview or a static site viewer
  - File > Print > Save as PDF
- For best results:
  - Landscape orientation
  - Margins: default or small
  - Disable headers/footers if offered

<div class="handout-footer">
  <div>Prepared by: {{COMPANY_NAME_FROM_ORG_SETTINGS}}</div>
  <div>Printed on: {{PRINT_DATE}}</div>
</div>
</div>
