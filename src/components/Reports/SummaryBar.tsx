import { formatArabicCurrency } from '../../utils/ArabicTextEngine'

interface SummaryBarProps {
    debit: number
    credit: number
    balance: number
    count: number
    isAr?: boolean
}

export function SummaryBar({
    debit,
    credit,
    balance,
    count,
    isAr = false
}: SummaryBarProps) {
    const formatNumber = (num: number) => {
        return formatArabicCurrency(num, 'none', { useArabicNumerals: isAr })
    }

    const currencySuffix = isAr ? 'ج.م' : 'EGP'

    return (
        <div className="report-summary-bar">
            <div className="summary-item">
                <span className="summary-item-label">{isAr ? 'إجمالي المدين' : 'Total Debits'}</span>
                <span className="summary-item-value">{formatNumber(debit)} {currencySuffix}</span>
            </div>

            <div className="summary-item">
                <span className="summary-item-label">{isAr ? 'إجمالي الدائن' : 'Total Credits'}</span>
                <span className="summary-item-value">{formatNumber(credit)} {currencySuffix}</span>
            </div>

            <div className="summary-item">
                <span className="summary-item-label">{isAr ? 'الرصيد' : 'Balance'}</span>
                <span className={`summary-item-value ${balance >= 0 ? 'summary-item-value--positive' : 'summary-item-value--negative'}`}>
                    {formatNumber(balance)} {currencySuffix}
                </span>
            </div>

            <div className="summary-item summary-item--count">
                <span className="summary-item-label">{isAr ? 'عدد السطور' : 'Lines Count'}</span>
                <span className="summary-item-value">{formatArabicCurrency(count, 'none', { useArabicNumerals: isAr })}</span>
            </div>
        </div>
    )
}

export default SummaryBar
