n# Implementation Plan: Excel Data Migration to Supabase

## Document Revision

**Version 2.0** - Updated based on pre-implementation analysis (2026-02-13)

## Overview

This implementation plan implements the Excel to Supabase migration in phases, starting with **Phase 0: Pre-Implementation Discovery** which is MANDATORY before any coding begins.

Key changes from Version 1.0:
- Added Phase 0 with 7 discovery tasks (0.1-0.7)
- Updated account code mapping strategy based on confirmed legacy_code mapping
- Added transaction grouping component (Excel has lines only, must create headers)
- Added unbalanced transaction handling (34 found in current data)
- Updated column mapping with confirmed Arabic headers

## Phase 0: Pre-Implementation Discovery (MANDATORY - DO FIRST)

### Purpose
Validate feasibility, gather actual schema, confirm mappings, identify data quality issues BEFORE writing any migration code.

---

- [x] 0.1 Supabase Schema Inspection
  - Connect to Supabase using provided credentials
  - Retrieve complete schema for tables: accounts, transactions, transaction_lines, projects, classifications, work_analysis, sub_tree
  - Export schema to JSON: reports/supabase_schema.json
  - Generate human-readable schema document: reports/supabase_schema.md
  - Validate required tables exist with expected columns
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 0.2 Excel Structure Validation
  - Verify "transactions " sheet exists (note: trailing space)
  - Verify all 18 expected columns present with Arabic headers
  - Check for data quality issues (missing values, wrong types)
  - Generate Excel structure report: reports/excel_structure.json
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 0.3 Column Mapping Matrix Creation
  - Create CSV with columns: Excel_Column, English_Name, Supabase_Table, Supabase_Column, Data_Type
  - Present to user for review and approval
  - Save approved mapping: config/column_mapping.csv
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 0.4 Account Code Verification
  - Extract 21 unique account codes from Excel
  - Query Supabase for ALL accounts with legacy_code
  - Generate mapping report: reports/account_mapping.csv
  - Identify unmapped codes (if any)
  - IF unmapped codes exist: Present to user for manual selection, update mapping table, re-verify until 100% mapped
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 0.5 Transaction Balance Audit
  - Group Excel rows by entry_no
  - Calculate total_debit and total_credit per group
  - Identify unbalanced transactions (expected: ~34)
  - Generate unbalanced transactions report: reports/unbalanced_transactions.csv
  - Present to user: Option A: Fix in Excel and re-upload, Option B: Approve override (document risk)
  - REQUIRE user decision before proceeding
  - _Requirements: 5.2, 6.5_

- [x] 0.6 Data Profiling Report
  - Record count: 14,224 lines, 2,164 transactions
  - Date range: 2022-05-17 to 2025-12-31
  - Account distribution (count per account code)
  - Project distribution (count per project code)
  - Missing value analysis
  - Generate: reports/data_profile.json
  - _Requirements: 2.3, 2.4_

- [x] 0.7 Migration Feasibility Report
  - Summarize findings from 0.1-0.6
  - List all blocking issues (if any)
  - List all warnings
  - Provide go/no-go recommendation
  - Generate: reports/feasibility_report.md
  - REQUIRE user approval before Phase 1
  - _Requirements: All_

## CHECKPOINT: Phase 0 Complete

**Before proceeding to Phase 1, verify:**
- All Phase 0 tasks (0.1 - 0.7) completed
- All reports generated and reviewed
- No blocking issues remain
- User has provided explicit approval

---

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create Python project directory structure (src/, tests/, config/, docs/, reports/)
  - Create requirements.txt with dependencies: supabase-py, openpyxl, pandas, python-dotenv, pydantic, pytest, hypothesis, tqdm (progress bars)
  - Create .env.example file with required environment variables (SUPABASE_URL, SUPABASE_KEY)
  - Set up logging configuration with multiple levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Create README.md with setup instructions and Phase 0 summary
  - Copy Phase 0 reports to docs/ for reference
  - _Requirements: 1.1, 2.1, References Phase 0 outputs_

- [ ] 2. Implement Supabase connection and schema analysis
  - [x] 2.1 Create SupabaseConnectionManager class (enhanced from Phase 0)
    - Implement connection initialization with URL and key
    - Implement connection testing method
    - Implement error handling for connection failures with retry logic
    - Add schema caching for performance
    - Add query builders for common operations
    - Add transaction management for batch operations
    - _Requirements: 1.1, Uses Phase 0.1 outputs_
  
  - [x] 2.2 Create SchemaManager class
    - Load schema from reports/supabase_schema.json (Phase 0 output)
    - Provide lookup methods: get_table(), get_column(), get_foreign_keys()
    - Validate data against schema before insert
    - _Requirements: 1.2, 1.3, 1.4, 1.5, Uses Phase 0.1 outputs_
  
  - [ ]* 2.3 Write property test for schema analysis
    - **Property 1: Schema Completeness**
    - **Validates: Requirements 1.2, 1.4**
  
  - [ ]* 2.4 Write unit tests for connection manager
    - Test successful connection
    - Test connection failure handling
    - Test retry logic
    - _Requirements: 1.1_

- [-] 3. Implement Excel reading and structure analysis
  - [x] 3.1 Create ExcelReader class (enhanced from Phase 0)
    - Load column mapping from config/column_mapping_APPROVED.csv
    - Read "transactions " sheet with proper header handling (skip row 0)
    - Apply English column names automatically
    - Return DataFrame with standardized column names
    - _Requirements: 2.1, 2.2, Uses Phase 0.2, 0.3 outputs_
  
  - [x] 3.2 Create ExcelProcessor class (NEW)
    - Clean and normalize data (trim strings, standardize nulls)
    - Convert data types according to mapping
    - Handle Arabic text encoding properly
    - Validate required fields present
    - _Requirements: 2.2, 2.3, 2.4, 2.5, Uses Phase 0 configuration_
  
  - [ ]* 3.3 Write property test for Excel structure detection
    - **Property 2: Excel Structure Detection Completeness**
    - **Validates: Requirements 2.2, 2.4**
  
  - [ ]* 3.4 Write unit tests for Excel reader
    - Test reading with approved mapping
    - Test handling of null values
    - Test data type conversions
    - _Requirements: 2.1, 2.6, Validates Phase 0.2, 0.3 outputs_

- [x] 4. Checkpoint - Ensure analysis tools work correctly
  - Ensure all tests pass, ask the user if questions arise.
  - **STATUS: COMPLETE** ✓ All 5 tests passed (SupabaseConnectionManager, SchemaManager, ExcelReader, ExcelProcessor, Integration)

- [x] 5. Implement transaction grouping logic (NEW COMPONENT)
  - [x] 5.1 Create TransactionGrouper class
    - Group Excel lines by (entry_no, entry_date)
    - Generate transaction headers with: reference_number, transaction_date, fiscal_year, month, total_debit, total_credit, line_count
    - Return tuple: (transactions_df, lines_df)
    - _Requirements: 6.2, 7.1, 7.2_
  
  - [x] 5.2 Implement balance validation
    - Check total_debit == total_credit per transaction
    - Load unbalanced handling strategy from config/unbalanced_handling.json
    - If auto-balance: generate balancing entries to suspense account
    - If skip: filter out unbalanced transactions
    - Log all balance adjustments
    - _Requirements: 5.2, 6.5, Uses Phase 0.5 outputs_
  
  - [ ]* 5.3 Write property tests for transaction grouping
    - **Property 16: Transaction Balance Integrity**
    - **Property: Transaction Completeness** - All Excel lines appear in exactly one transaction group
    - **Validates: Requirements 5.2, 6.5, 7.4**

- [x] 6. Implement data comparison and mapping
  - [x] 6.1 Create DataComparator class
    - Implement method to compare Excel and Supabase structures
    - Implement method to identify matching fields
    - Implement method to detect mismatches and missing fields
    - Implement method to identify table dependencies
    - Generate comparison report as JSON
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 6.2 Create AccountCodeMapper class (enhanced from Phase 0)
    - Load account mappings from reports/account_mapping.csv (Phase 0 output)
    - Load manual mappings from config/manual_account_mappings.json (if exists)
    - Provide fast lookup: excel_code → account_id (UUID)
    - Raise error if unmapped code encountered (should not happen after Phase 0)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, Uses Phase 0.4 outputs_
  
  - [x] 6.3 Create DimensionMapper class (NEW)
    - Map project codes to project_id (query Supabase projects table)
    - Map classification codes to classification_id
    - Map work_analysis codes to work_analysis_id
    - Map sub_tree codes to sub_tree_id
    - Cache all dimension mappings in memory
    - Handle null values gracefully (some dimensions optional)
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 6.4 Write property test for account code mapping consistency
    - **Property 3: Account Code Mapping Consistency**
    - **Property 17: Account Code Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [ ]* 6.5 Write property test for unmapped code detection
    - **Property 4: Unmapped Code Detection**
    - **Validates: Requirements 4.3**
  
  - [ ]* 6.6 Write unit tests for data comparator
    - Test field matching logic
    - Test mismatch detection
    - Test dependency identification
    - _Requirements: 3.1, 3.4, 3.6_

- [-] 7. Implement data validation
  - [x] 7.1 Create DataValidator class with validation rules
    - Implement required field validation
    - Implement data type validation
    - Implement numeric range validation
    - Implement date format and reasonableness validation
    - Implement account code existence validation
    - Implement referential integrity validation
    - Validate business rules: Transaction balanced, At least one line per transaction, Debit XOR Credit per line
    - Generate validation report with row numbers and error details
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ]* 7.2 Write property test for validation error reporting
    - **Property 5: Validation Error Reporting Completeness**
    - **Validates: Requirements 5.6**
  
  - [ ]* 7.3 Write property test for referential integrity validation
    - **Property 6: Referential Integrity Validation**
    - **Validates: Requirements 5.2, 5.7**
  
  - [ ]* 7.4 Write property test for required field validation
    - **Property 7: Required Field Validation**
    - **Validates: Requirements 5.1**
  
  - [ ]* 7.5 Write unit tests for each validation rule
    - Test required field validation with missing fields
    - Test data type validation with invalid types
    - Test range validation with out-of-range values
    - Test date validation with invalid dates
    - Test account code validation with invalid codes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Checkpoint - Ensure validation works correctly
  - Ensure all tests pass
  - Review reports/validation_errors.csv
  - Confirm ERROR-level issues = 0 OR user approved overrides
  - Ask the user if questions arise

- [ ] 9. Implement migration executor
  - [x] 9.1 Create backup functionality
    - Export current Supabase transactions and transaction_lines to JSON
    - Store in: backups/pre_migration_{timestamp}.json
    - Record metadata: timestamp, table_names, record_counts
    - Verify backup readable
    - _Requirements: 6.1_
  
  - [x] 9.2 Create MigrationExecutor class
    - Implement --dry-run mode (simulate without database writes)
    - Implement batch insert (batch_size = 100, configurable)
    - Process in order: 1) Create transaction headers in transactions table, 2) Create transaction lines in transaction_lines table (FK to transactions)
    - Track progress with tqdm progress bar
    - Log each batch: records_attempted, records_succeeded, records_failed
    - Continue on errors (log and skip failed records)
    - Generate migration summary report
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  
  - [x] 9.3 Create rollback functionality
    - Read backup from backups/ directory
    - Delete all records created during migration
    - Restore from backup JSON
    - Verify restoration successful
    - _Requirements: 6.6_
  
  - [x] 9.4 Create CLI interface
    - Command: python migrate.py --mode {dry-run|execute} --batch-size 100
    - Display migration plan before execution
    - Require user confirmation for execute mode
    - Show real-time progress during migration
    - _Requirements: 6.2, 6.5_
    - **STATUS: COMPLETE** ✓ CLI created with validate, backup, rollback, and migrate commands
  
  - [ ]* 9.5 Write property test for backup and restore round-trip
    - **Property 8: Backup and Restore Round-Trip**
    - **Validates: Requirements 6.1, 6.6**
  
  - [ ]* 9.6 Write property test for error resilience
    - **Property 10: Error Resilience**
    - **Validates: Requirements 6.4**
  
  - [ ]* 9.7 Write property test for batch processing efficiency
    - **Property 14: Batch Processing Efficiency**
    - **Validates: Requirements 6.3**
  
  - [ ]* 9.8 Write unit tests for migration executor
    - Test batch insert with valid data
    - Test error handling with invalid records
    - Test progress tracking
    - Test dry-run mode never writes to database
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 9. Implement dimension preservation and verification
  - [x] 9.1 Add dimension handling to migration executor
    - Implement method to extract dimensions from Excel data
    - Implement method to map dimensions to Supabase fields
    - Implement method to detect missing dimensions in Supabase
    - Ensure all dimension values are preserved during migration
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 9.2 Create VerificationEngine class
    - Implement record count comparison
    - Implement referential integrity verification
    - Implement sample data comparison (random sample of records)
    - Implement account mapping verification
    - Implement dimension integrity verification
    - Generate verification report with pass/fail for each check
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 7.5_
  
  - [ ]* 9.3 Write property test for dimension preservation
    - **Property 11: Dimension Preservation**
    - **Validates: Requirements 7.4**
  
  - [ ]* 9.4 Write property test for record count consistency
    - **Property 12: Record Count Consistency**
    - **Validates: Requirements 6.5, 10.1**
  
  - [ ]* 9.5 Write property test for verification report completeness
    - **Property 15: Verification Report Completeness**
    - **Validates: Requirements 10.5**
  
  - [ ]* 9.6 Write unit tests for verification engine
    - Test record count comparison
    - Test referential integrity checks
    - Test sample data comparison
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 10. Checkpoint - Ensure migration and verification work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create command-line interface and orchestration
  - [x] 11.1 Create CLI script for running analysis
    - Implement command to run Supabase schema analysis
    - Implement command to run Excel structure analysis
    - Implement command to run comparison and generate reports
    - Add command-line arguments for file paths and options
    - _Requirements: 1.5, 2.5, 3.5_
  
  - [x] 11.2 Create CLI script for running migration
    - Implement command to validate Excel data
    - Implement command to build account code mappings
    - Implement command to execute migration with backup
    - Implement command to run verification
    - Implement command to rollback if needed
    - Add command-line arguments for batch size, dry-run mode, etc.
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 10.5_
  
  - [x] 11.3 Create orchestration script for full migration workflow
    - Implement Phase 1: Analysis and Preparation
    - Implement Phase 2: Validation
    - Implement Phase 3: Migration Execution
    - Implement Phase 4: Verification
    - Implement Phase 5: Documentation Generation
    - Add checkpoints between phases for user approval
    - _Requirements: All_

- [x] 12. Generate documentation and reports
  - [x] 12.1 Create report generation utilities
    - Implement function to generate schema analysis report (JSON and Markdown)
    - Implement function to generate Excel structure report (JSON and Markdown)
    - Implement function to generate comparison report (JSON and Markdown)
    - Implement function to generate account mapping table (CSV and Markdown)
    - Implement function to generate validation report (JSON and Markdown)
    - Implement function to generate migration report (JSON and Markdown)
    - Implement function to generate verification report (JSON and Markdown)
    - _Requirements: 1.5, 2.5, 3.5, 4.5, 5.6, 6.5, 10.5_
  
  - [x] 12.2 Create executive summary generator
    - Implement function to generate high-level migration summary
    - Include key metrics (records migrated, success rate, issues found)
    - Include risk assessment summary
    - Include recommendations
    - Format for non-technical review
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 12.3 Create risk assessment document generator
    - Implement function to identify and document data loss risks
    - Implement function to identify and document data corruption risks
    - Implement function to identify and document performance risks
    - Implement function to document rollback procedures
    - Generate risk matrix with severity and likelihood
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [-] 13. Integration testing and end-to-end validation
  - [ ] 13.1 Write integration test for full analysis workflow
    - Test Supabase connection → schema analysis → report generation
    - Test Excel reading → structure analysis → report generation
    - Test comparison → mapping → report generation
    - _Requirements: 1.1, 1.5, 2.1, 2.5, 3.5_
  
  - [ ]* 13.2 Write integration test for full migration workflow
    - Test validation → backup → migration → verification
    - Test with small sample dataset
    - Verify all reports are generated
    - _Requirements: 5.6, 6.1, 6.5, 10.5_
  
  - [ ]* 13.3 Write integration test for rollback scenario
    - Test migration → error → rollback → verification
    - Verify data is restored correctly
    - _Requirements: 6.6_

- [x] 14. Create user documentation
  - Create setup guide with installation instructions
  - Create usage guide with examples for each CLI command
  - Create troubleshooting guide for common issues
  - Create migration checklist for operators
  - Document all configuration options
  - _Requirements: 8.2_

- [x] 15. Final checkpoint - Complete system validation
  - Run all unit tests and property tests
  - Run all integration tests
  - Test with actual Excel file (if available) in dry-run mode
  - Review all generated documentation
  - Ensure all requirements are met
  - Ask the user if questions arise or if ready for production use

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The implementation uses Python with supabase-py, pandas, openpyxl, and tqdm libraries
- All scripts should include comprehensive error handling and logging
- All reports should be generated in both JSON (machine-readable) and Markdown (human-readable) formats
- **Phase 0 is mandatory** - Do not skip, do not proceed to Phase 1 without completion
- **User approval required at multiple checkpoints** - Always wait for explicit approval
- **Dry-run before execute** - Always run migration in dry-run mode first
- **Production-only environment** - Extra caution required, no room for error

## Execution Order Summary

**Phase 0** (Pre-Implementation Discovery): Tasks 0.1 → 0.7 [MANDATORY FIRST]
↓ **User Approval Required**
**Phase 1** (Project Setup): Task 1
**Phase 2** (Core Components): Tasks 2-3
**Phase 3** (Transaction Grouping): Task 5
**Phase 4** (Mapping): Task 6
**Phase 5** (Validation): Tasks 7-8
↓ **User Approval Required**
**Phase 6** (Migration): Task 9 (DRY-RUN FIRST)
↓ **User Approval Required after Dry-Run**
**Phase 7** (Migration): Task 9 (EXECUTE MODE)
**Phase 8** (Verification): Tasks 10
↓ **User Sign-off Required**
**Phase 9** (Documentation): Tasks 11-15

## Risk Mitigation Checklist

Before executing migration:
- [ ] Phase 0 completed and approved
- [ ] All 21 account codes mapped (100%)
- [ ] Unbalanced transactions strategy decided
- [ ] Column mappings approved by user
- [ ] Backup created and verified
- [ ] Dry-run executed successfully
- [ ] Dry-run results reviewed and approved
- [ ] All validation tests passing
- [ ] Migration plan reviewed by user
- [ ] Rollback procedure tested and ready
- [ ] User has provided final go-ahead
