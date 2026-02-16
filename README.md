# Excel Data Migration to Supabase

This project implements a data migration system to transfer accounting data from an Excel file to a Supabase production database.

## Overview

This migration tool:
- Analyzes Excel file structure and content
- Compares Excel and Supabase schemas
- Maps legacy account codes to new Supabase codes
- Validates data quality before migration
- Safely migrates transactions and transaction lines
- Verifies migration success

## Phase 0: Pre-Implementation Discovery (COMPLETED)

All Phase 0 tasks have been completed:
- ✅ Supabase Schema Inspection (Task 0.1)
- ✅ Excel Structure Validation (Task 0.2)
- ✅ Column Mapping Matrix Creation (Task 0.3)
- ✅ Account Code Verification (Task 0.4)
- ✅ Transaction Balance Audit (Task 0.5)
- ✅ Data Profiling Report (Task 0.6)
- ✅ Migration Feasibility Report (Task 0.7)

Phase 0 reports are available in the `docs/` directory:
- `docs/supabase_schema.json` - Supabase database schema (JSON)
- `docs/supabase_schema.md` - Supabase schema documentation
- `docs/feasibility_report.json` - Feasibility report (JSON)
- `docs/feasibility_report.md` - Feasibility report (Markdown)

Additional Phase 0 configuration files are in `config/`:
- `config/column_mapping_APPROVED.csv` - Approved column mappings
- `config/column_mapping.csv` - Original column mappings
- `config/column_mapping.md` - Column mapping documentation

## Project Structure

```
.
├── src/                    # Source code
│   ├── migrations/        # Migration scripts
│   ├── analyzer/          # Schema and structure analyzers
│   ├── validator/         # Data validation logic
│   ├── executor/          # Migration executor
│   └── utils/             # Utility functions
│       └── logger.py      # Logging configuration (DEBUG, INFO, WARNING, ERROR, CRITICAL)
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── property/         # Property-based tests
├── config/                # Configuration files (Phase 0 outputs)
├── docs/                  # Documentation (Phase 0 reports)
├── reports/               # Generated reports (Phase 0 outputs)
├── logs/                  # Log files (created during execution)
├── scripts/               # Phase 0 analysis scripts
├── requirements.txt       # Python dependencies (supabase-py, openpyxl, pandas, etc.)
├── .env.example          # Environment variable template (SUPABASE_URL, SUPABASE_KEY)
└── README.md             # This file
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials and Excel file path.

### 3. Run Analysis

```bash
# Analyze Supabase schema
python -m src.analyzer.supabase_schema

# Analyze Excel structure
python -m src.analyzer.excel_structure

# Generate comparison report
python -m src.analyzer.comparison
```

### 4. Execute Migration

```bash
# Dry run (no database writes)
python -m src.executor.migration --mode dry-run

# Execute migration
python -m src.executor.migration --mode execute
```

## Logging

The system uses multiple log levels:
- **DEBUG**: Detailed debugging information
- **INFO**: General information about migration progress
- **WARNING**: Non-critical issues
- **ERROR**: Errors that don't stop the migration
- **CRITICAL**: Critical errors that stop the migration

Log files are stored in the `logs/` directory with timestamps.

## Requirements

See `requirements.md` for detailed requirements documentation.

## Design

See `design.md` for technical design documentation.

## Tasks

See `tasks.md` for the implementation task list.

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

## Support

For issues or questions, refer to the documentation in the `docs/` directory.
