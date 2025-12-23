
interface SummaryBarProps {
    debit: number
    credit: number
    balance: number
    count: number
}

export function SummaryBar({
    debit,
    credit,
    balance,
    count,
}: SummaryBarProps) {
    const formatNumber = (num: number) => {
        return num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    return (
        <div className="report-summary-bar">
            <div className="summary-item">
                <span className="summary-item-label">إجمالي المدين</span>
                <span className="summary-item-value">{formatNumber(debit)} EGP</span>
            </div>

            <div className="summary-item">
                <span className="summary-item-label">إجمالي الدائن</span>
                <span className="summary-item-value">{formatNumber(credit)} EGP</span>
            </div>

            <div className="summary-item">
                <span className="summary-item-label">الرصيد</span>
                <span className={`summary-item-value ${balance >= 0 ? 'summary-item-value--positive' : 'summary-item-value--negative'}`}>
                    {formatNumber(balance)} EGP
                </span>
            </div>

            <div className="summary-item summary-item--count">
                <span className="summary-item-label">عدد السطور</span>
                <span className="summary-item-value">{count}</span>
            </div>
        </div>
    )
}

export default SummaryBar
