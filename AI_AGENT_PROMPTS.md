
# GOOGLE ANTIGRAVITY / GEMINI 3 AGENT INSTRUCTIONS
## For Automated Data Migration Execution

---

## PROMPT 1: Initial Setup & Schema Creation

```
Role: You are a senior database engineer executing an accounting system migration.

Task: Set up the database schema for a new accounting application in Supabase.

Context:
- We are migrating from Excel-based accounting to Supabase + React
- The company is a construction contractor (Elrefae Company)
- We have 3.5 years of historical transactions to migrate
- The system uses multi-dimensional accounting (projects, cost centers, work items)

Files provided:
1. supabase_schema.sql - Complete database schema
2. Account.txt - Chart of accounts structure
3. account_mapping.csv - Old to new account mappings

Instructions:
1. Connect to Supabase using environment variables (SUPABASE_URL, SUPABASE_KEY)
2. Execute supabase_schema.sql to create all tables
3. Verify all tables created successfully with correct indexes and constraints
4. Enable Row Level Security on all tables
5. Create a test query to confirm schema is ready
6. Report any errors or warnings

Expected Output:
- Confirmation of 7 tables created (accounts, projects, work_items, cost_centers, transaction_classifications, journal_entries, journal_entry_lines)
- List of indexes created
- Any errors encountered
- Status: READY or BLOCKED (with reason)
```

---

## PROMPT 2: Master Data Migration

```
Role: You are executing the master data migration phase.

Task: Import all master data (chart of accounts, projects, work items, cost centers, transaction classifications) into Supabase.

Context:
- Schema is already created and ready
- Master data must be loaded before transactions
- All master data has dependencies that must be respected

Files provided:
1. Account.txt - 56 accounts to migrate
2. hadyek-v2.xlsx - Source of dimensional data

Instructions:
STEP 1 - Migrate Chart of Accounts:
- Read Account.txt (CSV format)
- Parse hierarchy (parent-child relationships)
- Insert accounts in hierarchical order (parents before children)
- Map account codes for later use
- Verify: 56 accounts inserted

STEP 2 - Extract and Migrate Projects:
- Read hadyek-v2.xlsx, sheet 'اليومية'
- Extract unique projects from columns: projects_code, projects_name
- Expected: 4 unique projects
- Insert into projects table with company_id
- Store project_code to UUID mapping

STEP 3 - Extract and Migrate Work Items:
- Extract unique work items from: analysis_work_items_code, analysis_work_items_name
- Expected: 49 unique work items
- Insert into work_items table
- Store mapping

STEP 4 - Extract and Migrate Cost Centers:
- Extract unique cost centers from: sub_tree_code, sub_tree_description
- Expected: 235 unique cost centers
- Insert into cost_centers table
- Store mapping

STEP 5 - Extract and Migrate Transaction Classifications:
- Extract from: transaction_classification_code, transaction_classification
- Expected: 9 classifications
- Insert into transaction_classifications table
- Store mapping

Error Handling:
- If duplicate key error, skip and continue
- Log all errors but don't stop execution
- Provide summary at end

Expected Output:
- Count of records inserted for each entity
- All mappings saved (old code → new UUID)
- Error log if any
- Status: COMPLETE or FAILED (with details)
```

---

## PROMPT 3: Transaction Data Migration (Critical)

```
Role: You are executing the transaction migration with financial data validation.

Task: Migrate 14,161 transaction lines from Excel to Supabase journal entries.

Context:
- This is the most critical phase
- Financial integrity MUST be maintained
- Every transaction must balance (debit = credit)
- Account codes must be mapped from old to new system

Files provided:
1. hadyek-v2.xlsx - Transaction data
2. account_mapping.csv - Account code mappings

Pre-conditions:
- Master data already loaded
- You have all UUID mappings from Phase 2

Instructions:

STEP 1 - Load and Validate Source Data:
- Read hadyek-v2.xlsx, sheet 'اليومية', skip first row
- Total lines expected: 14,224
- Valid transaction lines: 14,161 (skip 63 with null account_code)
- Verify balance: SUM(debit) must equal SUM(credit) = 905,925,674.84

STEP 2 - Account Code Mapping:
- Load account_mapping.csv
- For each transaction line, map old account_code to new account_code
- Special handling required for account 1354 "المدينون والدائنون":
  - If balance > 0: map to 1210 (العملاء)
  - If balance < 0: map to 2110 (الموردين)

STEP 3 - Process Transactions in Batches:
Batch size: 100 transaction references at a time

For each transaction reference number:
  a. Group all lines with same transaction_ref_number
  b. Get transaction metadata from first line:
     - entry_date
     - description
     - classification_id (lookup from mapping)
     - project_id (lookup from mapping)
  c. Insert journal_entries record, get entry_id
  d. For each line in transaction:
     - Map old account code to new UUID
     - Determine debit_amount (from 'debit' column, default 0)
     - Determine credit_amount (from 'credit' column, default 0)
     - Get dimension UUIDs (project_id, work_item_id, cost_center_id)
     - Insert journal_entry_lines record
  e. Verify transaction balance:
     - Sum debit_amount for this entry
     - Sum credit_amount for this entry
     - Difference must be < 0.01
     - If imbalanced: ROLLBACK this transaction, log error, continue
  f. Commit batch every 100 transactions
  g. Log progress every 100 transactions

STEP 4 - Post-Migration Validation:
After all transactions processed:
- Query: SELECT SUM(debit_amount), SUM(credit_amount) FROM journal_entry_lines
- Verify: Both sums equal 905,925,674.84
- Generate balance report by account
- Check for any unbalanced journal entries

Error Handling:
- Skip transaction lines with null account_code (expected: 63 lines)
- If account mapping not found: Log error, skip line
- If transaction imbalanced: Rollback, log, continue
- If batch fails: Rollback batch, log, continue with next batch

Progress Reporting:
- Every 100 transactions: log count and running totals
- Every 500 transactions: verify cumulative balance
- At end: comprehensive summary

Expected Output:
- Total journal_entries created: ~2,164
- Total journal_entry_lines created: 14,161
- Total debits: 905,925,674.84
- Total credits: 905,925,674.84
- Balance: 0.00
- Errors encountered: list with details
- Processing time
- Status: COMPLETE or PARTIAL (with error details)

CRITICAL: Do not proceed if post-validation fails. Report immediately.
```

---

## PROMPT 4: Data Verification & Testing

```
Role: You are a QA engineer validating the migration results.

Task: Execute comprehensive validation tests on migrated data.

Context:
- Migration is complete
- Need to verify data integrity and accuracy
- Compare results with source system

Files provided:
1. hadyek-v2.xlsx - Source data for comparison
2. MIGRATION_PLAN.md - Contains all validation SQL queries

Instructions:

Execute the following validation tests and report results:

TEST 1: Record Count Validation
- Query account count, journal entry count, line count
- Compare with expected values
- Pass criteria: Exact match

TEST 2: Financial Balance Check
- Calculate SUM(debit_amount) and SUM(credit_amount)
- Expected: Both equal 905,925,674.84
- Pass criteria: Difference < 1.00 (allowing for rounding)

TEST 3: Account Balance Verification
- For each account, calculate net balance
- Generate trial balance report
- Export to CSV for manual comparison
- Pass criteria: Visual inspection confirms accuracy

TEST 4: Transaction Integrity
- Find any unbalanced journal entries
- Expected: 0 unbalanced entries
- Pass criteria: All entries balanced

TEST 5: Dimension Integrity
- Verify no orphaned foreign keys
- Check project_id, work_item_id, cost_center_id references
- Expected: 0 orphaned references
- Pass criteria: All references valid

TEST 6: Trial Balance Generation
- Generate complete trial balance report
- Format as CSV with columns: account_code, account_name, debit, credit, balance
- Pass criteria: Report generated successfully

TEST 7: Project Financial Summary
- Calculate totals by project
- Compare with source data grouping
- Pass criteria: Totals match within 1.00

TEST 8: Spot Check Transactions
- Select 10 random transaction numbers
- Export full details (all lines)
- Pass criteria: Ready for manual verification

TEST 9: Date Range Validation
- Verify earliest transaction date: 2022-05-17
- Verify latest transaction date: 2025-12-31
- Pass criteria: Date range matches source

TEST 10: Data Quality Metrics
- Count accounts with zero balance
- Count projects with transactions
- Identify most active accounts (top 10 by transaction count)
- Pass criteria: Metrics generated

Report Format:
For each test, provide:
- Test name
- Status: PASS / FAIL / WARNING
- Expected result
- Actual result
- Details if failed
- SQL query used (if applicable)

Summary:
- Total tests: 10
- Passed: X
- Failed: Y
- Warnings: Z
- Overall Status: PASS / FAIL
- Recommendation: APPROVE GO-LIVE / REQUIRE FIXES

Critical: If any test fails, provide specific remediation steps.
```

---

## PROMPT 5: React Frontend Generation

```
Role: You are a full-stack developer building the React frontend.

Task: Create a React application with Supabase integration for the accounting system.

Context:
- Database is fully migrated and tested
- Need user-friendly interface for accountants
- Arabic language support required
- Multi-dimensional reporting needed

Technology Stack:
- React 18+ with TypeScript
- Supabase client library
- TailwindCSS for styling
- React Router for navigation
- React Query for data fetching
- Recharts for visualizations

Instructions:

PHASE 1 - Project Setup:
1. Create React app with TypeScript template
2. Install dependencies:
   - @supabase/supabase-js
   - react-router-dom
   - @tanstack/react-query
   - recharts
   - tailwindcss
   - date-fns (for date formatting)
3. Configure Supabase client with environment variables
4. Set up project structure:
   - /src/components
   - /src/pages
   - /src/hooks
   - /src/lib
   - /src/types

PHASE 2 - Core Components:

Component 1: Chart of Accounts Tree
- Display hierarchical account structure
- Show account balances
- Click to drill down to transactions
- Filter by account type (Asset, Liability, etc.)

Component 2: Transaction Browser
- Paginated list of journal entries
- Filter by:
  - Date range
  - Project
  - Account
  - Transaction classification
- Sort by date, amount, entry number
- Click entry to view all lines

Component 3: Transaction Detail View
- Show journal entry header
- List all debit and credit lines
- Display dimensions (project, work item, cost center)
- Show running balance
- Option to edit (if user has permission)

Component 4: Trial Balance Report
- Generate current trial balance
- Group by account type
- Show debit, credit, net balance
- Export to Excel
- Date range filter

Component 5: Project Dashboard
- List all projects
- Show financial summary per project
- Revenue, costs, margin
- Drill down to project transactions

Component 6: New Transaction Entry Form
- Multi-line journal entry form
- Auto-balance validation
- Dimension selection dropdowns
- Save as draft or post
- Duplicate entry feature

PHASE 3 - Data Hooks:

Create custom React hooks:
- useAccounts() - Fetch chart of accounts
- useTransactions(filters) - Fetch journal entries with filters
- useProjects() - Fetch project list
- useTrialBalance(date) - Generate trial balance
- useAccountBalance(accountId) - Get single account balance
- useCreateTransaction() - Create new journal entry

PHASE 4 - Styling:
- Use TailwindCSS for responsive design
- Support both LTR and RTL layouts (Arabic support)
- Dark mode support
- Print-friendly views for reports

PHASE 5 - Testing:
- Create sample test for each component
- Test Supabase integration
- Verify RLS policies work correctly

Deliverables:
1. Complete React application source code
2. README with setup instructions
3. Environment variable template (.env.example)
4. Component documentation
5. Deployment guide

Technical Requirements:
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Responsive design (mobile-friendly)
- Loading states for all async operations
- Error handling with user-friendly messages
- Optimistic updates where appropriate

Output:
- Full application code
- File structure overview
- Setup instructions
- Demo credentials (if needed)
- Status: READY FOR TESTING / ISSUES FOUND
```

---

## PROMPT 6: Integration Testing & Deployment

```
Role: You are a DevOps engineer preparing the application for production.

Task: Final integration testing and deployment preparation.

Context:
- Backend (Supabase) is fully migrated
- Frontend (React) is developed
- Need to ensure end-to-end functionality

Instructions:

PHASE 1 - Integration Testing:

Test Scenario 1: User Authentication
- Test login flow
- Verify RLS policies enforced
- Test logout and session management

Test Scenario 2: Data Reading
- Load chart of accounts
- Browse transactions
- Generate trial balance
- View project dashboard

Test Scenario 3: Data Writing
- Create new journal entry
- Edit draft entry
- Post entry
- Verify balance maintained

Test Scenario 4: Reporting
- Generate trial balance for date range
- Export to Excel
- Generate project financial report
- Verify calculations accurate

Test Scenario 5: Performance
- Load 1000 transactions
- Measure page load time
- Test with multiple concurrent users
- Check database query performance

PHASE 2 - Deployment Preparation:

1. Environment Configuration:
   - Set up production Supabase project
   - Configure production environment variables
   - Set up authentication providers

2. Build Optimization:
   - Optimize React build
   - Enable code splitting
   - Configure CDN for assets

3. Security Checklist:
   - Verify RLS policies active
   - Check API key security
   - Enable rate limiting
   - Set up backup schedule

4. Monitoring:
   - Set up error tracking (e.g., Sentry)
   - Configure performance monitoring
   - Set up database query logging
   - Create alerting rules

PHASE 3 - Deployment:

1. Deploy Frontend:
   - Build production bundle
   - Deploy to Vercel/Netlify
   - Verify deployment successful
   - Test production URL

2. Final Checks:
   - Smoke test all features
   - Verify data integrity
   - Test user flows
   - Check mobile responsiveness

3. Documentation:
   - User manual for accountants
   - Admin guide for system management
   - Troubleshooting guide
   - Support contact information

Deliverables:
- Integration test report
- Deployment checklist (completed)
- Production URLs
- User documentation
- Monitoring dashboard URLs
- Status: READY FOR GO-LIVE / ISSUES TO RESOLVE

Final Go-Live Approval Criteria:
- All integration tests passed
- Performance benchmarks met
- Security audit completed
- User training completed
- Support team briefed
- Rollback plan documented
```

---

## EXECUTION SEQUENCE FOR GOOGLE ANTIGRAVITY

When using Google Antigravity (Gemini 3 Agent mode), execute prompts in this order:

1. **Setup Phase:** Execute PROMPT 1
   - Wait for confirmation: "Status: READY"

2. **Master Data Phase:** Execute PROMPT 2
   - Wait for confirmation: "Status: COMPLETE"
   - Verify counts match expected

3. **Transaction Migration:** Execute PROMPT 3
   - This is the longest running task (may take 10-30 minutes)
   - Monitor progress logs
   - Wait for: "Status: COMPLETE"
   - CRITICAL: Do not proceed if status is not COMPLETE

4. **Validation Phase:** Execute PROMPT 4
   - Wait for test results
   - Review all 10 test results
   - Approve only if: "Overall Status: PASS"

5. **Frontend Build:** Execute PROMPT 5
   - This will generate full React application
   - Wait for: "Status: READY FOR TESTING"

6. **Final Integration:** Execute PROMPT 6
   - Complete all integration tests
   - Deploy to production
   - Wait for: "Status: READY FOR GO-LIVE"

---

## TROUBLESHOOTING GUIDE

**If PROMPT 1 fails:**
- Check Supabase connection credentials
- Verify service role key has admin privileges
- Check SQL syntax compatibility with PostgreSQL 14+

**If PROMPT 2 fails:**
- Verify file paths are correct
- Check CSV encoding (should be UTF-8)
- Review foreign key violations

**If PROMPT 3 fails:**
- Most common: Account mapping issues
- Check account_mapping.csv completeness
- Verify all old account codes are mapped
- Check for data type mismatches

**If PROMPT 4 reports failures:**
- Review specific test failures
- Common issue: Unbalanced transactions (check source data)
- Check for orphaned foreign keys
- Verify date formats

**If PROMPT 5 has issues:**
- Check Node.js and npm versions
- Verify Supabase client library version compatibility
- Review TypeScript configuration

**If PROMPT 6 deployment fails:**
- Check build errors in console
- Verify environment variables set correctly
- Test database connection from production environment

---

## MONITORING & SUPPORT

After go-live, monitor these metrics:
1. Query performance (< 2 sec response time)
2. Error rate (< 0.1%)
3. User session duration
4. API call volume
5. Database storage usage

Set up alerts for:
- Database connection failures
- Unbalanced transaction attempts
- RLS policy violations
- Slow query warnings (> 5 sec)

Support escalation:
- Level 1: User training issues
- Level 2: Application bugs
- Level 3: Database integrity issues
- Level 4: Security incidents

---

END OF AI AGENT INSTRUCTIONS
