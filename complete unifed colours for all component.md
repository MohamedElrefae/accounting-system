<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# give me complete unifed colours for all component for both light and dark themes  please full itemes and pages and all component for all types of data im md file with clear instruction to warp ai to follow  to keep consistent experience in my app (whole component of all pages)

Below is a complete, unified color palette for **all components** and page types in both **light and dark themes**, formatted for direct use in a Markdown (.md) file. Clear instructions for Warp AI and token usage are included to enforce consistency across your entire application.[^1]

***

# Unified Color System for Accounting App

## Global Instructions (for Warp AI and Developers)

- Reference and apply these color tokens for ALL form fields, buttons, tables, dropdowns, modal dialogs, sidebars, topbars, alerts, and backgrounds.
- Use the theme switcher to toggle between light and dark tokens.
- **Never override these tokens in individual components.** Always use token references.
- For elevated surfaces (modals, popups), use `surface` and accent borders.
- For selected/focused or active states, use the defined `accent` colors.
- Only use `error` colors for validation, alerts, and critical messaging.

***

## Color Tokens for Light and Dark Themes

| Token Name | Light Mode | Dark Mode | Usage |
| :-- | :-- | :-- | :-- |
| background | \#F5F6FA | \#181A20 | Main app background, forms, tables |
| surface | \#FFFFFF | \#23272F | Cards, modals, popup, sidebar, dropdown |
| border | \#E2E6ED | \#393C43 | Input borders, divider lines, tables |
| accent | \#2076FF | \#2076FF | Buttons, links, focused field borders |
| text | \#181C23 | \#EDEDED | Main body and label text |
| muted_text | \#70778A | \#8D94A2 | Placeholder, auxiliary info |
| heading | \#14213D | \#FAFAFA | Headings, app bar text |
| error | \#DE3F3F | \#DE3F3F | Errors, validation, alerts |
| success | \#21C197 | \#21C197 | Success, confirmation, finished state |
| warning | \#FFC048 | \#FFC048 | Caution, warning, field highlights |
| field_bg | \#F1F3F7 | \#23272F | Inputs, selects, filters, tables cells |
| selected_bg | \#E4EAFE | \#343940 | Selected row, active dropdown item |
| sidebar_bg | \#FFFFFF | \#22262A | Sidebar background |
| topbar_bg | \#F5F6FA | \#23272F | Topbar, nav bar |
| button_bg | \#2076FF | \#2076FF | Main action buttons |
| button_text | \#FFFFFF | \#FFFFFF | Button label text |
| table_header_bg | \#F1F3F7 | \#22262A | Table headers |
| table_row_bg | \#FFFFFF | \#23272F | Table rows |
| modal_bg | \#FFFFFF | \#23272F | Modal dialogs |
| active_tab_bg | \#E4EAFE | \#343940 | Active tab |


***

## Implementation Instructions for Warp AI

1. Copy these tokens into your global theme configuration (token theme, design system file, or CSS/JS objects).
2. Reference token names in all component style configurations (forms, fields, filters, dropdowns, tables, buttons, alerts, navigation bars, modals, sidebars, etc.).
3. For each theme (light/dark), toggle the color values using your app’s theme context provider, ensuring no exceptions or local overrides.
4. For contrast, always use `accent` for focus/selected states and `error`, `success`, `warning` strictly for their respective feedback.
5. Apply the sidebar, topbar, button, modal, and table color tokens according to their context as outlined above.
6. Maintain accessibility (WCAG) levels for contrast in all text and state changes.

***

## Sample Usage

```js
// Example (React/JSX component style)
const styles = {
  background: 'var(--background)',
  color: 'var(--text)',
  borderColor: 'var(--border)',
  accentColor: 'var(--accent)',
};
```

- Warp AI should generate form, button, dropdown, and table components referencing only these global tokens.

***

## Pages to Apply

- **Dashboard:** background, surface, sidebar_bg, topbar_bg, table_row_bg, table_header_bg
- **Form (Create/Edit):** field_bg, border, accent, error, success, warning, text, muted_text
- **Tables (List, Filter):** table_row_bg, table_header_bg, selected_bg, surface, border
- **Details/View Page:** surface, background, heading, accent, muted_text
- **Sidebar/Topbar:** sidebar_bg, topbar_bg, heading, accent
- **Modal Dialogs:** modal_bg, border, accent, error
- **Alerts/Toasts:** error, success, warning, surface, text
- **Filters/Dropdowns:** field_bg, selected_bg, accent, text, muted_text

***

## Final Note

- Ensure **full coverage**: any new component, feature, or page should follow this token system for color use.
- Use **Figma/Storybook** to preview theme switches and enforce color consistency visually.

***

Following this system will deliver a professional unified user experience and allow effortless expansion or adjustment in the future.[^1]

<div style="text-align: center">⁂</div>

[^1]: 100.jpg

