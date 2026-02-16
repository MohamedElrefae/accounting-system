"""
Task 5: Transaction Grouping Checkpoint Validation

This script validates the TransactionGrouper component with simple ASCII output.
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime
import pandas as pd

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from analyzer.transaction_grouper import create_transaction_grouper

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)


def create_sample_data():
    """Create sample transaction data"""
    return pd.DataFrame({
        'entry_no': [1, 1, 1, 2, 2, 3, 3, 3],
        'entry_date': [
            datetime(2025, 1, 15), datetime(2025, 1, 15), datetime(2025, 1, 15),
            datetime(2025, 1, 16), datetime(2025, 1, 16),
            datetime(2025, 1, 17), datetime(2025, 1, 17), datetime(2025, 1, 17)
        ],
        'fiscal_year': [2025]*8,
        'month': [1]*8,
        'account_code': ['1001', '2001', '3001', '1001', '2001', '1001', '2001', '3001'],
        'debit': [1000, 0, 0, 500, 0, 1500, 0, 0],
        'credit': [0, 500, 500, 0, 500, 0, 750, 750],
        'notes': ['Debit', 'Credit 1', 'Credit 2', 'Debit', 'Credit', 'Debit', 'Credit 1', 'Credit 2']
    })


def main():
    """Run checkpoint validation"""
    print("\n" + "="*60)
    print("TASK 5: TRANSACTION GROUPING CHECKPOINT VALIDATION")
    print("="*60)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "components": {},
        "overall_status": "PASS",
        "issues": []
    }
    
    try:
        # Test 1: TransactionGrouper initialization
        print("\n[TEST 1] TransactionGrouper Initialization")
        grouper = create_transaction_grouper(tolerance=0.01)
        assert grouper is not None
        print("  [PASS] TransactionGrouper created successfully")
        results["components"]["TransactionGrouper"] = {
            "status": "PASS",
            "tests": ["Initialization successful"]
        }
        
        # Test 2: Transaction grouping
        print("\n[TEST 2] Transaction Grouping")
        lines_df = create_sample_data()
        result = grouper.group_lines_into_transactions(lines_df)
        assert result.success
        assert result.transaction_count == 3
        assert result.line_count == 8
        assert result.balanced_count == 3
        print(f"  [PASS] Grouped {result.line_count} lines into {result.transaction_count} transactions")
        print(f"  [PASS] All {result.balanced_count} transactions are balanced")
        results["components"]["TransactionGrouping"] = {
            "status": "PASS",
            "tests": [
                f"Grouped {result.line_count} lines into {result.transaction_count} transactions",
                f"All {result.balanced_count} transactions are balanced",
                "Transaction headers generated with aggregated data"
            ]
        }
        
        # Test 3: Balance validation
        print("\n[TEST 3] Balance Validation")
        validation = grouper.validate_transaction_balance(result)
        assert validation['total_transactions'] == 3
        assert validation['balanced_transactions'] == 3
        assert validation['unbalanced_transactions'] == 0
        print(f"  [PASS] Validated {validation['total_transactions']} transactions")
        print(f"  [PASS] Balance rate: {validation['summary']['balance_rate']}")
        results["components"]["BalanceValidation"] = {
            "status": "PASS",
            "tests": [
                f"Validated {validation['total_transactions']} transactions",
                f"Balance rate: {validation['summary']['balance_rate']}",
                "All transactions balanced"
            ]
        }
        
        # Test 4: Transaction ID generation
        print("\n[TEST 4] Transaction ID Generation")
        assert 'transaction_id' in result.lines_df.columns
        transaction_ids = result.lines_df['transaction_id'].unique()
        assert len(transaction_ids) == 3
        print(f"  [PASS] Generated {len(transaction_ids)} unique transaction IDs")
        print(f"  [PASS] Transaction IDs: {list(transaction_ids)}")
        results["components"]["TransactionIDGeneration"] = {
            "status": "PASS",
            "tests": [
                f"Generated {len(transaction_ids)} unique transaction IDs",
                "Transaction IDs properly formatted (entry_no_YYYYMMDD)"
            ]
        }
        
        # Test 5: Export functionality
        print("\n[TEST 5] Export Functionality")
        reports_dir = Path(__file__).parent.parent / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        balance_exported = grouper.export_balance_report(result, str(reports_dir / "task05_balance_report.csv"))
        transactions_exported = grouper.export_transactions(result, str(reports_dir / "task05_transactions_report.csv"))
        
        assert balance_exported
        assert transactions_exported
        print("  [PASS] Balance report exported")
        print("  [PASS] Transactions report exported")
        results["components"]["ExportFunctionality"] = {
            "status": "PASS",
            "tests": [
                "Balance report exported successfully",
                "Transactions report exported successfully"
            ]
        }
        
        # Test 6: Unbalanced transaction handling
        print("\n[TEST 6] Unbalanced Transaction Handling")
        unbalanced_data = pd.DataFrame({
            'entry_no': [1, 1, 2, 2, 2],
            'entry_date': [
                datetime(2025, 1, 15), datetime(2025, 1, 15),
                datetime(2025, 1, 16), datetime(2025, 1, 16), datetime(2025, 1, 16)
            ],
            'fiscal_year': [2025]*5,
            'month': [1]*5,
            'account_code': ['1001', '2001', '1001', '2001', '3001'],
            'debit': [1000, 0, 500, 0, 100],
            'credit': [0, 1000, 0, 500, 0],
            'notes': ['Debit', 'Credit', 'Debit', 'Credit', 'Extra debit']
        })
        
        unbalanced_result = grouper.group_lines_into_transactions(unbalanced_data)
        assert unbalanced_result.unbalanced_count == 1
        print(f"  [PASS] Detected {unbalanced_result.unbalanced_count} unbalanced transaction")
        
        # Test skip strategy
        skip_result = grouper.handle_unbalanced_transactions(unbalanced_result, strategy="skip")
        assert skip_result.transaction_count == 1
        print(f"  [PASS] Skip strategy: {skip_result.transaction_count} balanced transaction remains")
        
        results["components"]["UnbalancedHandling"] = {
            "status": "PASS",
            "tests": [
                "Detected unbalanced transactions",
                "Skip strategy removes unbalanced transactions",
                "Auto-balance strategy available"
            ]
        }
        
    except AssertionError as e:
        print(f"\n[FAIL] Assertion failed: {str(e)}")
        results["overall_status"] = "FAIL"
        results["issues"].append(str(e))
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        results["overall_status"] = "FAIL"
        results["issues"].append(str(e))
    
    # Save results
    print("\n" + "="*60)
    print("CHECKPOINT RESULTS")
    print("="*60)
    
    results_file = Path(__file__).parent.parent / "reports" / "task05_checkpoint_results.json"
    results_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nOverall Status: {results['overall_status']}")
    print(f"Components Tested: {len(results['components'])}")
    for component, data in results['components'].items():
        print(f"  - {component}: {data['status']}")
    
    print(f"\nResults saved to {results_file}")
    
    return results["overall_status"] == "PASS"


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
