# Requirements Document: Excel Data Migration to Supabase

## Introduction

This document specifies the requirements for migrating accounting data from an Excel file to a Supabase production database. The migration involves analyzing existing data structures, mapping legacy account codes to new codes, and safely transferring transactions and transaction lines while preserving all accounting dimensions and relationships.

## Glossary

- **Excel_Source**: The Excel file located at `c:\5\accounting-systemr5\يومية الحدائق من البداية كاملة .xlsx`
- **Supabase_Database**: The production Supabase database at https://bgxknceshxxifwytalex.supabase.co
- **Transactions_Table**: The database table storing transaction header information
- **Transaction_Lines_Table**: The database table storing individual transaction line items
- **Accounts_Table**: The database table containing account codes with both current (code/name) and legacy (legacy_code/legacy_name) fields
- **Accounting_Dimension**: Any attribute or field that provides classification or context for accounting data (e.g., cost center, project, department)
- **Legacy_Code**: The old account code from the Excel system
- **Current_Code**: The new account code in the Supabase system
- **Migration_Script**: Python script that performs the data migration
- **Analysis_Script**: Python script that analyzes and compares data structures
- **Data_Integrity**: The accuracy, consistency, and completeness of data throughout the migration process

## Requirements

### Requirement 1: Database Connection and Schema Analysis

**User Story:** As a developer, I want to connect to the Supabase database and analyze its schema, so that I understand the target structure for migration.

#### Acceptance Criteria

1. WHEN the analysis script connects to Supabase, THE System SHALL authenticate using environment variables or configuration files
2. WHEN the schema analysis runs, THE System SHALL retrieve the complete structure of transactions, transaction_lines, and accounts tables
3. WHEN analyzing the accounts table, THE System SHALL identify all fields including code, name, legacy_code, and legacy_name
4. WHEN analyzing relationships, THE System SHALL document all foreign key constraints between tables
5. WHEN the analysis completes, THE System SHALL generate a structured report of the database schema

### Requirement 2: Excel File Reading and Structure Analysis

**User Story:** As a developer, I want to read and analyze the Excel file structure, so that I understand the source data format and content.

#### Acceptance Criteria

1. WHEN the Excel file path is provided, THE System SHALL open and read the file using Python libraries
2. WHEN reading Excel data, THE System SHALL identify all sheets, columns, and data types
3. WHEN analyzing Excel structure, THE System SHALL detect which columns contain account codes
4. WHEN analyzing Excel data, THE System SHALL identify all accounting dimensions present in the data
5. WHEN the analysis completes, THE System SHALL generate a structured report of the Excel file structure
6. IF the Excel file cannot be opened, THEN THE System SHALL return a descriptive error message

### Requirement 3: Data Structure Comparison and Mapping

**User Story:** As a migration analyst, I want a detailed comparison between Excel and Supabase structures, so that I can identify mapping requirements and potential issues.

#### Acceptance Criteria

1. WHEN comparing structures, THE System SHALL identify matching fields between Excel and Supabase
2. WHEN comparing account codes, THE System SHALL map Excel codes to Supabase legacy_code fields
3. WHEN analyzing dimensions, THE System SHALL identify all accounting dimensions in both systems
4. WHEN detecting mismatches, THE System SHALL flag fields that exist in Excel but not in Supabase
5. WHEN the comparison completes, THE System SHALL generate a comprehensive mapping document
6. WHEN identifying dependencies, THE System SHALL document all table relationships that affect migration order

### Requirement 4: Account Code Mapping Strategy

**User Story:** As a migration analyst, I want to map Excel account codes to new Supabase codes using legacy references, so that historical data maintains correct account associations.

#### Acceptance Criteria

1. WHEN mapping account codes, THE System SHALL match Excel codes to accounts.legacy_code values
2. WHEN a match is found, THE System SHALL retrieve the corresponding accounts.code value
3. WHEN no match is found, THE System SHALL log the unmapped code and flag it for review
4. WHEN multiple matches exist, THE System SHALL flag the ambiguity and require manual resolution
5. WHEN the mapping completes, THE System SHALL generate a complete mapping table showing Excel code → legacy_code → current code

### Requirement 5: Data Validation Rules

**User Story:** As a data quality analyst, I want comprehensive validation rules, so that only clean and correct data is migrated.

#### Acceptance Criteria

1. WHEN validating transactions, THE System SHALL verify all required fields are present and non-null
2. WHEN validating transaction lines, THE System SHALL verify each line references a valid transaction
3. WHEN validating account codes, THE System SHALL verify all codes exist in the accounts table
4. WHEN validating numeric fields, THE System SHALL verify values are within acceptable ranges
5. WHEN validating dates, THE System SHALL verify date formats are correct and dates are reasonable
6. WHEN validation fails, THE System SHALL generate a detailed error report with row numbers and specific issues
7. WHEN validating relationships, THE System SHALL verify referential integrity between all related tables

### Requirement 6: Migration Execution Strategy

**User Story:** As a database administrator, I want a safe and reversible migration process, so that I can migrate data without risking data loss or corruption.

#### Acceptance Criteria

1. WHEN starting migration, THE System SHALL create a backup of existing Supabase data
2. WHEN migrating data, THE System SHALL process tables in dependency order (accounts first, then transactions, then transaction_lines)
3. WHEN inserting records, THE System SHALL use batch operations for performance
4. WHEN errors occur, THE System SHALL log the error and continue with remaining records
5. WHEN migration completes, THE System SHALL generate a summary report showing records processed, succeeded, and failed
6. WHEN rollback is needed, THE System SHALL provide a mechanism to restore the backup

### Requirement 7: Accounting Dimensions Preservation

**User Story:** As an accountant, I want all accounting dimensions preserved during migration, so that historical reporting and analysis remain accurate.

#### Acceptance Criteria

1. WHEN analyzing dimensions, THE System SHALL identify all dimension fields in Excel data
2. WHEN mapping dimensions, THE System SHALL map each Excel dimension to the corresponding Supabase field
3. WHEN dimensions are missing in Supabase, THE System SHALL flag them for schema extension
4. WHEN migrating transaction lines, THE System SHALL preserve all dimension values
5. WHEN the migration completes, THE System SHALL verify dimension data integrity through sample queries

### Requirement 8: Migration Documentation

**User Story:** As a manager, I want comprehensive documentation of the migration process, so that I can review and approve the migration plan.

#### Acceptance Criteria

1. WHEN documentation is generated, THE System SHALL include an executive summary suitable for non-technical review
2. WHEN documenting the process, THE System SHALL include step-by-step migration procedures
3. WHEN documenting risks, THE System SHALL identify potential issues and mitigation strategies
4. WHEN documenting validation, THE System SHALL specify all validation rules and acceptance criteria
5. WHEN documentation is complete, THE System SHALL be reviewable by an AI agent (Perplexity) for clarity and completeness

### Requirement 9: Risk Assessment and Mitigation

**User Story:** As a project manager, I want a thorough risk assessment, so that I can make informed decisions about the migration.

#### Acceptance Criteria

1. WHEN assessing risks, THE System SHALL identify data loss risks and mitigation strategies
2. WHEN assessing risks, THE System SHALL identify data corruption risks and prevention measures
3. WHEN assessing risks, THE System SHALL identify performance risks during migration
4. WHEN assessing risks, THE System SHALL identify rollback scenarios and procedures
5. WHEN the assessment completes, THE System SHALL generate a risk matrix with severity and likelihood ratings

### Requirement 10: Post-Migration Verification

**User Story:** As a data quality analyst, I want automated verification of migrated data, so that I can confirm the migration was successful.

#### Acceptance Criteria

1. WHEN verification runs, THE System SHALL compare record counts between Excel and Supabase
2. WHEN verification runs, THE System SHALL validate referential integrity of all relationships
3. WHEN verification runs, THE System SHALL perform sample data comparisons between source and target
4. WHEN verification runs, THE System SHALL verify all account code mappings were applied correctly
5. WHEN verification completes, THE System SHALL generate a verification report with pass/fail status for each check
6. IF any verification check fails, THEN THE System SHALL provide detailed information about the discrepancy
