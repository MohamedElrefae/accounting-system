# Setup Guide: Excel Data Migration to Supabase

## Overview

This guide walks you through installing and configuring the Excel to Supabase migration tool.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Supabase account with database access
- Excel file with accounting data

## Installation Steps

### 1. Clone or Download the Project

```bash
# If using git
git clone <repository-url>
cd excel-data-migration

# Or extract the project folder
cd excel-data-migration
```

### 2. Create a Python Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `supabase-py` - Supabase Python client
- `openpyxl` - Excel file reading
- `pandas` - Data manipulation
- `python-dotenv` - Environment variable management
- `pydantic` - Data validation
- `pytest` - Testing framework
- `hypothesis` - Property-based testing
- `tqdm` - Progress bars

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Excel File Path
EXCEL_FILE_PATH=path/to/your/excel/file.xlsx

# Optional: Logging Level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Optional: Batch Size for Migration
BATCH_SIZE=100
```

**Important**: Never commit `.env` to version control. It's already in `.gitignore`.

### 5. Verify Installation

Test the connection to Supabase:

```bash
python -c "from src.services.supabase_connection import SupabaseConnectionManager; cm = SupabaseConnectionManager(); print('✓ Connection successful' if cm.test_connection() else '✗ Connection failed')"
```

## Project Structure

```
excel-data-migration/
├── src/                          # Source code
│   ├── analyzer/                # Analysis components
│   │   ├── supabase_connection.py
│   │   ├── schema_manager.py
│   │   ├── excel_reader.py
│   │   ├── excel_processor.py
│   │   ├── data_comparator.py
│   │   ├── account_code_mapper.py
│   │   ├── transaction_grouper.py
│   │   └── data_validator.py
│   ├── executor/                # Migration execution
│   │   ├── migration_executor.py
│   │   └── verification_engine.py
│   ├── reports/                 # Report generation
│   │   ├── report_generator.py
│   │   ├── executive_summary_generator.py
│   │   └── risk_assessment_generator.py
│   └── utils/                   # Utilities
│       └── logger.py
├── tests/                        # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── property/                # Property-based tests
├── config/                       # Configuration files
│   ├── column_mapping_APPROVED.csv
│   └── column_mapping.md
├── docs/                         # Documentation
│   ├── SETUP_GUIDE.md           # This file
│   ├── USAGE_GUIDE.md
│   ├── TROUBLESHOOTING_GUIDE.md
│   ├── MIGRATION_CHECKLIST.md
│   ├── supabase_schema.md
│   └── feasibility_report.md
├── reports/                      # Generated reports
├── backups/                      # Migration backups
├── logs/                         # Log files
├── scripts/                      # Phase 0 analysis scripts
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment template
├── analyze.py                    # Analysis CLI
├── migrate.py                    # Migration CLI
└── README.md                     # Project overview
```

## Configuration Files

### Column Mapping

The file `config/column_mapping_APPROVED.csv` contains the mapping between Excel columns and Supabase fields:

```csv
Excel_Column,English_Name,Supabase_Table,Supabase_Column,Data_Type
العام المالى,fiscal_year,transactions,fiscal_year,integer
الشهر,month,transactions,month,integer
entry no,entry_no,transactions,reference_number,text
...
```

This file is used during migration to correctly map Excel data to Supabase columns.

### Account Mapping

The file `config/account_mapping.csv` (generated during analysis) contains the mapping of Excel account codes to Supabase account IDs:

```csv
excel_code,legacy_code,account_id,account_name,mapped
134,134,uuid-001,Customer Accounts,true
...
```

## Logging Configuration

Logs are stored in the `logs/` directory with timestamps. Log levels:

- **DEBUG**: Detailed debugging information (verbose)
- **INFO**: General information about progress
- **WARNING**: Non-critical issues
- **ERROR**: Errors that don't stop the migration
- **CRITICAL**: Critical errors that stop the migration

Change the log level in `.env`:

```env
LOG_LEVEL=DEBUG  # For detailed debugging
LOG_LEVEL=INFO   # For normal operation
```

## Next Steps

1. **Run Analysis**: See [USAGE_GUIDE.md](USAGE_GUIDE.md) for analysis commands
2. **Validate Data**: Run validation before migration
3. **Execute Migration**: Follow the migration checklist in [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md)
4. **Troubleshoot Issues**: See [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) for common problems

## Support

For issues or questions:
1. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
2. Review log files in `logs/` directory
3. Check generated reports in `reports/` directory
4. Refer to [USAGE_GUIDE.md](USAGE_GUIDE.md) for command examples

## Uninstalling

To remove the virtual environment:

```bash
# Deactivate virtual environment
deactivate

# Remove virtual environment folder
# On Windows:
rmdir /s venv

# On macOS/Linux:
rm -rf venv
```

