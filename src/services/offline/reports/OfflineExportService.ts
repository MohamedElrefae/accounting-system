import { getOfflineDB } from '../core/OfflineSchema';
import type { UniversalTableData, UniversalTableColumn } from '../../../utils/UniversalExportManager';
import { createStandardColumns } from '../../../hooks/useUniversalExport';

/**
 * Service to generate regulatory-standard reports from the local offline store.
 * Standardizes datasets for consumption by the UniversalExportManager (Req 16.2).
 */
export class OfflineExportService {
  /**
   * Generates a Journal Export dataset from local un-synced and synced transactions.
   */
  public static async getJournalDataset(startDate?: string, endDate?: string): Promise<UniversalTableData> {
    const db = getOfflineDB();
    let query = db.transactions.orderBy('date');

    // Filter by date range if provided
    const transactions = await query.filter(tx => {
      const date = tx.date;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    }).toArray();

    const columns = createStandardColumns([
      { key: 'date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'الوصف', type: 'text' },
      { key: 'reference', header: 'المرجع', type: 'text' },
      { key: 'amount', header: 'المبلغ', type: 'currency' },
      { key: 'syncStatus', header: 'الحالة', type: 'text' }
    ]);

    return {
      columns,
      rows: transactions.map(tx => ({
        ...tx,
        syncStatus: tx.syncStatus === 'synced' ? 'تمت المزامنة' : 'مسودة محلية'
      })),
      metadata: {
        source: 'النظام المحاسبي - قاعدة البيانات المحلية',
        generatedAt: new Date(),
        filters: { startDate, endDate }
      }
    };
  }

  /**
   * Generates a security audit log dataset.
   */
  public static async getAuditDataset(): Promise<UniversalTableData> {
    const db = getOfflineDB();
    const logs = await db.auditLog.reverse().toArray();

    const columns = createStandardColumns([
      { key: 'timestamp', header: 'الوقت', type: 'date' },
      { key: 'action', header: 'الإجراء', type: 'text' },
      { key: 'entityType', header: 'النوع', type: 'text' },
      { key: 'userId', header: 'المستخدم', type: 'text' },
      { key: 'status', header: 'الحالة', type: 'text' }
    ]);

    return {
      columns,
      rows: logs,
      metadata: {
        source: 'سجل التدقيق الأمني - محلي',
        generatedAt: new Date()
      }
    };
  }

  /**
   * Generates a dataset of data integrity security events.
   */
  public static async getSecurityEventsDataset(): Promise<UniversalTableData> {
    const db = getOfflineDB();
    const events = await db.securityEvents.reverse().toArray();

    const columns = createStandardColumns([
      { key: 'timestamp', header: 'التاريخ', type: 'date' },
      { key: 'type', header: 'النوع', type: 'text' },
      { key: 'severity', header: 'الخطورة', type: 'text' },
      { key: 'details', header: 'التفاصيل', type: 'text' }
    ]);

    return {
      columns,
      rows: events.map(ev => ({
        ...ev,
        details: JSON.stringify(ev.details)
      })),
      metadata: {
        source: 'سجل الأحداث الأمنية - محلي',
        generatedAt: new Date()
      }
    };
  }
}
