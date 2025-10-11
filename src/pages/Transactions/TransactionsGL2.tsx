import React, { useState } from 'react';
import TransactionsLegacy from './Transactions';
import Gl2DetailsDrawer from './Gl2DetailsDrawer';

// Render the existing Transactions page but force GL2 read mode at runtime
// This preserves all existing filters, actions, and layout without duplication.
const TransactionsGL2Page: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    try {
      (window as any).__READ_MODE_OVERRIDE = 'gl2_single_line';
    } catch {}
    return () => {
      try { delete (window as any).__READ_MODE_OVERRIDE; } catch {}
    };
  }, []);

  // Render legacy page and mount a details drawer placeholder (you can wire row click with a small event bus later)
  return (
    <>
      <TransactionsLegacy />
      <Gl2DetailsDrawer open={drawerOpen} journalId={selected} onClose={()=>setDrawerOpen(false)} onChanged={()=>setDrawerOpen(false)} />
    </>
  );
};

export default TransactionsGL2Page;
