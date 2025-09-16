# Project Rules for Accounting System

## Continuous Execution Rule
When executing multi-step plans, continue automatically through all steps without asking for confirmation unless there are:
- Errors that require human intervention
- Genuine ambiguities that need clarification
- Destructive operations that could cause data loss (database drops, file deletions, etc.)

**Behavior:**
- Provide progress updates as work continues
- Execute complete plans end-to-end
- Only stop for genuine blockers, not routine progress checks
- When user says "go on" or similar, immediately continue execution without further confirmation

## Integration Requirements
- Ensure full integration between database, service, UI, and dataflow for all new components
- Follow unified token theme for all new pages/services/components (full page, no inline styles)
- Provide separate SQL blocks with copy buttons for database operations
- Include verification SQL to ensure successful execution