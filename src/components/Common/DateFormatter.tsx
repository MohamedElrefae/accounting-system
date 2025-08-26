import React, { useState, useEffect } from 'react'
import { formatDateForDisplay } from '../../utils/dateHelpers'

interface DateFormatterProps {
  date: string | Date | null | undefined
  className?: string
  fallback?: string
}

/**
 * DateFormatter component that displays dates according to company preferences
 * Automatically formats dates based on the company's configured date format
 */
const DateFormatter: React.FC<DateFormatterProps> = ({ 
  date, 
  className = '',
  fallback = '—'
}) => {
  const [formattedDate, setFormattedDate] = useState<string>(fallback)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!date) {
      setFormattedDate(fallback)
      setIsLoading(false)
      return
    }

    const formatDate = async () => {
      try {
        const formatted = await formatDateForDisplay(date)
        setFormattedDate(formatted)
      } catch (error) {
        console.error('Error formatting date:', error)
        setFormattedDate('Invalid Date')
      } finally {
        setIsLoading(false)
      }
    }

    formatDate()
  }, [date, fallback])

  if (isLoading) {
    return (
      <span className={`date-formatter loading ${className}`}>
        —
      </span>
    )
  }

  return (
    <span 
      className={`date-formatter ${className}`}
      title={`Original: ${date}`}
    >
      {formattedDate}
    </span>
  )
}

export default DateFormatter
