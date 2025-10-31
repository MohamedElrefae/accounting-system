// Minimal test component to diagnose white screen issue
import React from 'react'

const TransactionTest: React.FC = () => {
  console.log('✅ TransactionTest component rendered successfully!')
  
  return (
    <div dir="rtl" style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>🎉 صفحة اختبار المعاملات</h1>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: '#28a745' }}>✅ النجاح! الصفحة تعمل</h2>
        <p>إذا كنت ترى هذه الرسالة، فإن React والتوجيه يعملان بشكل صحيح.</p>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>📋 معلومات الاختبار:</h3>
        <ul>
          <li>✅ React تعمل</li>
          <li>✅ التوجيه (React Router) يعمل</li>
          <li>✅ الاتجاه من اليمين لليسار (RTL) يعمل</li>
          <li>✅ التنسيقات الأساسية تعمل</li>
        </ul>
      </div>

      <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h3>⚠️ الخطوات التالية:</h3>
        <p>إذا رأيت هذه الصفحة، المشكلة تكمن في مكون TransactionsPage الأصلي.</p>
        <p>افتح وحدة تحكم المتصفح (F12) للحصول على مزيد من التفاصيل.</p>
        <br />
        <p><strong>للعودة إلى الصفحة الأصلية:</strong></p>
        <p>قم بتعديل App.tsx وأعد التوجيه /transactions/my إلى TransactionsPage بدلاً من TransactionTest</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    </div>
  )
}

export default TransactionTest

