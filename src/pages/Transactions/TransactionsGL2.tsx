import React, { useEffect } from 'react';
import TransactionsLegacy from './Transactions';

// Render the existing Transactions page but force GL2 read mode at runtime
// This preserves all existing filters, actions, and layout without duplication.
const TransactionsGL2Page: React.FC = () => {
  useEffect(() => {
    try {
      (window as any).__READ_MODE_OVERRIDE = 'gl2_single_line';
    } catch {}
    return () => {
      try { delete (window as any).__READ_MODE_OVERRIDE; } catch {}
    };
  }, []);

  return <TransactionsLegacy />;
};

export default TransactionsGL2Page;
