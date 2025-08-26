import React, { useState, useEffect } from 'react'
import { getCompanyConfig } from '../../services/company-config'

interface CurrencyFormatterProps {
  amount: number | null | undefined
  className?: string
  fallback?: string
}

/**
 * CurrencyFormatter component that displays currency according to company preferences
 * Handles the 'none' option to show numbers only without currency symbols
 */
const CurrencyFormatter: React.FC<CurrencyFormatterProps> = ({ 
  amount, 
  className = '',
  fallback = '—'
}) => {
  const [formattedAmount, setFormattedAmount] = useState<string>(fallback)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      setFormattedAmount(fallback)
      setIsLoading(false)
      return
    }

    const formatAmount = async () => {
      try {
        const config = await getCompanyConfig()
        const currencySymbol = config.currency_symbol || 'ر.س'
        const numberFormat = config.number_format || 'ar-SA'

        // Format the number with proper locale
        const formatter = new Intl.NumberFormat(numberFormat, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })

        const formattedNumber = formatter.format(Math.abs(amount))
        
        let result: string
        if (currencySymbol === 'none') {
          // No currency symbol, just the number
          result = formattedNumber
        } else {
          // Include currency symbol
          result = `${formattedNumber} ${currencySymbol}`
        }

        // Handle negative numbers
        if (amount < 0) {
          result = `-${result}`
        }

        setFormattedAmount(result)
      } catch (error) {
        console.error('Error formatting currency:', error)
        // Fallback formatting
        const fallbackFormatted = amount.toLocaleString('ar-EG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        setFormattedAmount(fallbackFormatted)
      } finally {
        setIsLoading(false)
      }
    }

    formatAmount()
  }, [amount, fallback])

  if (isLoading) {
    return (
      <span className={`currency-formatter loading ${className}`}>
        —
      </span>
    )
  }

  return (
    <span 
      className={`currency-formatter ${className}`}
      title={`Amount: ${amount}`}
    >
      {formattedAmount}
    </span>
  )
}

export default CurrencyFormatter
