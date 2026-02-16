"""
Transaction Grouper for Excel Data Migration

This module provides transaction grouping capabilities:
- Group Excel lines by (entry_no, entry_date) to identify unique transactions
- Generate transaction headers with aggregated data
- Validate transaction balance (debit == credit)
- Handle unbalanced transactions with configurable strategies
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class TransactionHeader:
    """Transaction header data"""
    reference_number: str
    transaction_date: datetime
    fiscal_year: int
    month: int
    total_debit: float
    total_credit: float
    line_count: int
    is_balanced: bool
    balance_difference: float
    notes: Optional[str] = None


@dataclass
class BalanceValidationError:
    """Balance validation error details"""
    entry_no: str
    entry_date: datetime
    total_debit: float
    total_credit: float
    difference: float
    line_count: int


@dataclass
class GroupingResult:
    """Result of transaction grouping operation"""
    success: bool
    transactions_df: Optional[pd.DataFrame] = None
    lines_df: Optional[pd.DataFrame] = None
    transaction_count: int = 0
    line_count: int = 0
    balanced_count: int = 0
    unbalanced_count: int = 0
    balance_errors: List[BalanceValidationError] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


class TransactionGrouper:
    """
    Groups transaction lines by entry_no to create transaction headers.
    
    This class:
    1. Groups Excel rows by (entry_no, entry_date)
    2. Generates transaction headers with aggregated data
    3. Validates transaction balance (debit == credit)
    4. Handles unbalanced transactions
    """
    
    def __init__(self, tolerance: float = 0.01):
        """
        Initialize transaction grouper.
        
        Args:
            tolerance: Balance tolerance in currency units (default: 0.01)
        """
        self.tolerance = tolerance
        logger.info(f"Initialized TransactionGrouper with tolerance={tolerance}")
    
    def group_lines_into_transactions(self, lines_df: pd.DataFrame) -> GroupingResult:
        """
        Groups Excel rows by (entry_no, entry_date) to create transaction headers.
        
        Args:
            lines_df: DataFrame with transaction lines (must have entry_no, entry_date, debit, credit columns)
            
        Returns:
            GroupingResult with transactions_df and lines_df
        """
        result = GroupingResult(success=False)
        
        try:
            if lines_df.empty:
                result.errors.append("Input data is empty")
                return result
            
            # Validate required columns
            required_columns = ['entry_no', 'entry_date', 'debit', 'credit']
            missing_columns = [col for col in required_columns if col not in lines_df.columns]
            if missing_columns:
                result.errors.append(f"Missing required columns: {', '.join(missing_columns)}")
                return result
            
            logger.info(f"Grouping {len(lines_df)} transaction lines")
            
            # Create a copy to avoid modifying original
            lines_copy = lines_df.copy()
            
            # Ensure numeric types for debit and credit
            lines_copy['debit'] = pd.to_numeric(lines_copy['debit'], errors='coerce').fillna(0)
            lines_copy['credit'] = pd.to_numeric(lines_copy['credit'], errors='coerce').fillna(0)
            
            # Ensure entry_date is datetime
            lines_copy['entry_date'] = pd.to_datetime(lines_copy['entry_date'], errors='coerce')
            
            # Group by entry_no and entry_date
            grouped = lines_copy.groupby(['entry_no', 'entry_date'], as_index=False)
            
            # Create transaction headers
            transactions_data = []
            balance_errors = []
            
            for (entry_no, entry_date), group in grouped:
                # Calculate aggregates
                total_debit = group['debit'].sum()
                total_credit = group['credit'].sum()
                line_count = len(group)
                
                # Calculate balance difference
                balance_diff = abs(total_debit - total_credit)
                is_balanced = balance_diff <= self.tolerance
                
                # Get fiscal year and month from first line
                fiscal_year = group['fiscal_year'].iloc[0] if 'fiscal_year' in group.columns else None
                month = group['month'].iloc[0] if 'month' in group.columns else None
                
                # Aggregate notes
                notes = None
                if 'notes' in group.columns:
                    notes_list = group['notes'].dropna().unique().tolist()
                    if notes_list:
                        notes = '; '.join(str(n) for n in notes_list)
                
                # Create transaction header
                transaction = {
                    'reference_number': str(entry_no),
                    'transaction_date': entry_date,
                    'fiscal_year': fiscal_year,
                    'month': month,
                    'total_debit': total_debit,
                    'total_credit': total_credit,
                    'line_count': line_count,
                    'is_balanced': is_balanced,
                    'balance_difference': balance_diff,
                    'notes': notes
                }
                
                transactions_data.append(transaction)
                
                # Track unbalanced transactions
                if not is_balanced:
                    balance_errors.append(BalanceValidationError(
                        entry_no=str(entry_no),
                        entry_date=entry_date,
                        total_debit=total_debit,
                        total_credit=total_credit,
                        difference=balance_diff,
                        line_count=line_count
                    ))
            
            # Create transactions DataFrame
            transactions_df = pd.DataFrame(transactions_data)
            
            # Add transaction_id to lines (for FK reference)
            # Create a mapping of (entry_no, entry_date) to transaction_id
            lines_copy['transaction_id'] = lines_copy.apply(
                lambda row: f"{row['entry_no']}_{row['entry_date'].strftime('%Y%m%d')}" 
                if pd.notna(row['entry_date']) else None,
                axis=1
            )
            
            # Update result
            result.success = True
            result.transactions_df = transactions_df
            result.lines_df = lines_copy
            result.transaction_count = len(transactions_df)
            result.line_count = len(lines_copy)
            result.balanced_count = len(transactions_df[transactions_df['is_balanced']])
            result.unbalanced_count = len(balance_errors)
            result.balance_errors = balance_errors
            
            # Log summary
            logger.info(f"Grouped {len(lines_copy)} lines into {len(transactions_df)} transactions")
            logger.info(f"Balanced: {result.balanced_count}, Unbalanced: {result.unbalanced_count}")
            
            if result.unbalanced_count > 0:
                result.warnings.append(
                    f"Found {result.unbalanced_count} unbalanced transactions (tolerance={self.tolerance})"
                )
            
        except Exception as e:
            logger.error(f"Failed to group transactions: {str(e)}")
            result.errors.append(f"Grouping error: {str(e)}")
        
        return result
    
    def validate_transaction_balance(self, grouped_result: GroupingResult) -> Dict[str, Any]:
        """
        Validate transaction balance for all transactions.
        
        Args:
            grouped_result: GroupingResult from group_lines_into_transactions
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "total_transactions": 0,
            "balanced_transactions": 0,
            "unbalanced_transactions": 0,
            "balance_errors": [],
            "summary": {}
        }
        
        try:
            if grouped_result.transactions_df is None or grouped_result.transactions_df.empty:
                validation_result["summary"]["status"] = "NO_DATA"
                return validation_result
            
            transactions_df = grouped_result.transactions_df
            
            validation_result["total_transactions"] = len(transactions_df)
            validation_result["balanced_transactions"] = transactions_df['is_balanced'].sum()
            validation_result["unbalanced_transactions"] = (~transactions_df['is_balanced']).sum()
            
            # Extract unbalanced transactions
            unbalanced = transactions_df[~transactions_df['is_balanced']]
            for _, row in unbalanced.iterrows():
                validation_result["balance_errors"].append({
                    "reference_number": row['reference_number'],
                    "transaction_date": row['transaction_date'].isoformat() if pd.notna(row['transaction_date']) else None,
                    "total_debit": float(row['total_debit']),
                    "total_credit": float(row['total_credit']),
                    "difference": float(row['balance_difference']),
                    "line_count": int(row['line_count'])
                })
            
            # Summary
            balance_rate = (validation_result["balanced_transactions"] / validation_result["total_transactions"] * 100) if validation_result["total_transactions"] > 0 else 0
            validation_result["summary"] = {
                "status": "BALANCED" if validation_result["unbalanced_transactions"] == 0 else "UNBALANCED",
                "balance_rate": f"{balance_rate:.1f}%",
                "tolerance": self.tolerance
            }
            
            logger.info(f"Balance validation: {validation_result['balanced_transactions']}/{validation_result['total_transactions']} balanced")
            
        except Exception as e:
            logger.error(f"Failed to validate balance: {str(e)}")
            validation_result["summary"]["error"] = str(e)
        
        return validation_result
    
    def handle_unbalanced_transactions(self, 
                                      grouped_result: GroupingResult,
                                      strategy: str = "skip",
                                      suspense_account_id: Optional[str] = None) -> GroupingResult:
        """
        Handle unbalanced transactions based on strategy.
        
        Args:
            grouped_result: GroupingResult from group_lines_into_transactions
            strategy: "skip" (remove unbalanced) or "auto_balance" (add balancing entry)
            suspense_account_id: Account ID for balancing entries (required if strategy="auto_balance")
            
        Returns:
            Updated GroupingResult
        """
        try:
            if grouped_result.unbalanced_count == 0:
                logger.info("No unbalanced transactions to handle")
                return grouped_result
            
            if strategy == "skip":
                logger.info(f"Removing {grouped_result.unbalanced_count} unbalanced transactions")
                
                # Filter out unbalanced transactions
                balanced_mask = grouped_result.transactions_df['is_balanced']
                grouped_result.transactions_df = grouped_result.transactions_df[balanced_mask].reset_index(drop=True)
                
                # Filter out lines from unbalanced transactions
                balanced_transaction_ids = grouped_result.transactions_df['reference_number'].tolist()
                grouped_result.lines_df = grouped_result.lines_df[
                    grouped_result.lines_df['entry_no'].astype(str).isin(balanced_transaction_ids)
                ].reset_index(drop=True)
                
                grouped_result.transaction_count = len(grouped_result.transactions_df)
                grouped_result.line_count = len(grouped_result.lines_df)
                grouped_result.unbalanced_count = 0
                
                logger.info(f"After filtering: {grouped_result.transaction_count} transactions, {grouped_result.line_count} lines")
                
            elif strategy == "auto_balance":
                if suspense_account_id is None:
                    raise ValueError("suspense_account_id required for auto_balance strategy")
                
                logger.info(f"Auto-balancing {grouped_result.unbalanced_count} transactions")
                
                # Add balancing entries for unbalanced transactions
                balancing_lines = []
                
                for error in grouped_result.balance_errors:
                    if error.difference > self.tolerance:
                        # Create balancing line with all required columns
                        if error.total_debit > error.total_credit:
                            # Add credit to balance
                            balancing_line = {
                                'entry_no': error.entry_no,
                                'entry_date': error.entry_date,
                                'fiscal_year': None,  # Will be filled from existing lines
                                'month': None,  # Will be filled from existing lines
                                'account_code': 'SUSPENSE',
                                'account_id': suspense_account_id,
                                'debit': 0.0,
                                'credit': error.difference,
                                'notes': f'Auto-balancing entry for transaction {error.entry_no}'
                            }
                        else:
                            # Add debit to balance
                            balancing_line = {
                                'entry_no': error.entry_no,
                                'entry_date': error.entry_date,
                                'fiscal_year': None,  # Will be filled from existing lines
                                'month': None,  # Will be filled from existing lines
                                'account_code': 'SUSPENSE',
                                'account_id': suspense_account_id,
                                'debit': error.difference,
                                'credit': 0.0,
                                'notes': f'Auto-balancing entry for transaction {error.entry_no}'
                            }
                        
                        balancing_lines.append(balancing_line)
                
                # Add balancing lines to lines_df
                if balancing_lines:
                    balancing_df = pd.DataFrame(balancing_lines)
                    
                    # Fill in fiscal_year and month from existing lines
                    for idx, row in balancing_df.iterrows():
                        entry_no = row['entry_no']
                        matching_lines = grouped_result.lines_df[grouped_result.lines_df['entry_no'] == entry_no]
                        if not matching_lines.empty:
                            if 'fiscal_year' in matching_lines.columns:
                                balancing_df.at[idx, 'fiscal_year'] = matching_lines.iloc[0]['fiscal_year']
                            if 'month' in matching_lines.columns:
                                balancing_df.at[idx, 'month'] = matching_lines.iloc[0]['month']
                    
                    # Ensure all columns from lines_df exist in balancing_df
                    for col in grouped_result.lines_df.columns:
                        if col not in balancing_df.columns:
                            balancing_df[col] = None
                    
                    # Reorder columns to match lines_df
                    balancing_df = balancing_df[grouped_result.lines_df.columns]
                    
                    grouped_result.lines_df = pd.concat(
                        [grouped_result.lines_df, balancing_df],
                        ignore_index=True
                    )
                
                # Re-group to update transactions with balanced amounts
                regrouped = self.group_lines_into_transactions(grouped_result.lines_df)
                grouped_result.transactions_df = regrouped.transactions_df
                grouped_result.lines_df = regrouped.lines_df
                grouped_result.unbalanced_count = regrouped.unbalanced_count
                grouped_result.balance_errors = regrouped.balance_errors
                
                logger.info(f"After auto-balancing: {regrouped.unbalanced_count} unbalanced transactions remain")
            
            else:
                raise ValueError(f"Unknown strategy: {strategy}")
            
        except Exception as e:
            logger.error(f"Failed to handle unbalanced transactions: {str(e)}")
            grouped_result.errors.append(f"Unbalanced transaction handling error: {str(e)}")
        
        return grouped_result
    
    def export_balance_report(self, grouped_result: GroupingResult, output_path: str) -> bool:
        """
        Export balance validation report to CSV.
        
        Args:
            grouped_result: GroupingResult from group_lines_into_transactions
            output_path: Path to output CSV file
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            from pathlib import Path
            
            if not grouped_result.balance_errors:
                logger.info("No balance errors to export")
                return True
            
            # Convert balance errors to DataFrame
            errors_data = []
            for error in grouped_result.balance_errors:
                errors_data.append({
                    'entry_no': error.entry_no,
                    'entry_date': error.entry_date.isoformat() if pd.notna(error.entry_date) else None,
                    'total_debit': error.total_debit,
                    'total_credit': error.total_credit,
                    'difference': error.difference,
                    'line_count': error.line_count
                })
            
            errors_df = pd.DataFrame(errors_data)
            
            # Create output directory if needed
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            # Export to CSV
            errors_df.to_csv(output_path_obj, index=False, encoding='utf-8')
            
            logger.info(f"Balance report exported to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export balance report: {str(e)}")
            return False
    
    def export_transactions(self, grouped_result: GroupingResult, output_path: str) -> bool:
        """
        Export transaction headers to CSV.
        
        Args:
            grouped_result: GroupingResult from group_lines_into_transactions
            output_path: Path to output CSV file
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            from pathlib import Path
            
            if grouped_result.transactions_df is None or grouped_result.transactions_df.empty:
                logger.info("No transactions to export")
                return True
            
            # Create output directory if needed
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            # Export to CSV
            grouped_result.transactions_df.to_csv(output_path_obj, index=False, encoding='utf-8')
            
            logger.info(f"Transactions exported to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export transactions: {str(e)}")
            return False


# Factory function for easy creation
def create_transaction_grouper(tolerance: float = 0.01) -> TransactionGrouper:
    """
    Factory function to create transaction grouper.
    
    Args:
        tolerance: Balance tolerance in currency units
        
    Returns:
        TransactionGrouper instance
    """
    return TransactionGrouper(tolerance)
