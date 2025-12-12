import React from 'react'
import DraggableResizablePanel from '../Common/DraggableResizablePanel'
import AttachDocumentsPanel from '../documents/AttachDocumentsPanel'
import { usePersistedPanelState } from '../../hooks/usePersistedPanelState'
import type { TransactionRecord } from '../../services/transactions'

interface TransactionsDocumentsPanelProps {
  open: boolean
  onClose: () => void
  transaction?: TransactionRecord | null
  transactionLine?: any | null
}

const TransactionsDocumentsPanel: React.FC<TransactionsDocumentsPanelProps> = ({
  open,
  onClose,
  transaction,
  transactionLine,
}) => {
  const panelState = usePersistedPanelState({
    storagePrefix: 'documentsPanel',
    defaultPosition: { x: 120, y: 120 },
    defaultSize: { width: 900, height: 700 },
    defaultDockPosition: 'right',
  })

  if (!open || (!transaction && !transactionLine)) {
    return null
  }

  const title = transactionLine
    ? 'مستندات القيد التفصيلي'
    : `مستندات المعاملة - ${transaction?.entry_number ?? ''}`

  return (
    <DraggableResizablePanel
      title={title}
      isOpen={open}
      onClose={onClose}
      position={panelState.position}
      size={panelState.size}
      onMove={panelState.setPosition}
      onResize={panelState.setSize}
      isMaximized={panelState.maximized}
      onMaximize={() => panelState.setMaximized(!panelState.maximized)}
      isDocked={panelState.docked}
      dockPosition={panelState.dockPosition}
      onDock={(pos) => {
        panelState.setDocked(true)
        panelState.setDockPosition(pos)
      }}
      onResetPosition={() => {
        panelState.resetLayout()
      }}
    >
      <div className="panel-actions">
        <button
          className="ultimate-btn ultimate-btn-success"
          title="حفظ تخطيط لوحة المستندات"
          onClick={() => {
            try {
              const pref = {
                position: panelState.position,
                size: panelState.size,
                maximized: panelState.maximized,
                docked: panelState.docked,
                dockPosition: panelState.dockPosition,
                savedTimestamp: Date.now(),
                userPreferred: true,
              }
              localStorage.setItem('documentsPanel:preferred', JSON.stringify(pref))
            } catch {
              // ignore
            }
          }}
          style={{ fontSize: '12px', padding: '6px 10px' }}
        >
          <div className="btn-content">
            <span className="btn-text">💾 حفظ التخطيط</span>
          </div>
        </button>
        <button
          className="ultimate-btn ultimate-btn-warning"
          title="إعادة تعيين تخطيط لوحة المستندات"
          onClick={() => {
            panelState.resetLayout()
            try {
              localStorage.removeItem('documentsPanel:preferred')
            } catch {
              // ignore
            }
          }}
          style={{ fontSize: '12px', padding: '6px 10px' }}
        >
          <div className="btn-content">
            <span className="btn-text">🔄 إعادة تعيين</span>
          </div>
        </button>
      </div>
      <AttachDocumentsPanel
        orgId={transaction?.org_id || ''}
        transactionId={transaction?.id}
        transactionLineId={transactionLine?.id}
        projectId={transaction?.project_id || undefined}
      />
    </DraggableResizablePanel>
  )
}

export default TransactionsDocumentsPanel
