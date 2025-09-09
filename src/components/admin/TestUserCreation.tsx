import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';

interface TestUserCreationProps {
  onUserCreated?: () => void;
}

export const TestUserCreation: React.FC<TestUserCreationProps> = ({ onUserCreated }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  console.log('TestUserCreation component rendered!');

  const testCreateUser = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const testEmail = `test${Date.now()}@example.com`;
      const payload = {
        email: testEmail,
        password: 'TempPass123',
        profile: {
          first_name: 'Test',
          last_name: 'User',
          full_name_ar: 'مستخدم تجريبي',
          department: 'accounting',
          job_title: 'accountant',
          is_active: true
        },
        role_id: 4, // User role (adjust based on your roles)
        require_password_change: true
      };

      console.log('Creating user with payload:', payload);

      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: payload
      });

      if (error) {
        throw error;
      }

      setResult(`✅ User created successfully!\nEmail: ${testEmail}\nPassword: TempPass123\n\nTry logging in with these credentials to test the password change flow.`);
      onUserCreated?.();
    } catch (error: any) {
      console.error('Test user creation error:', error);
      setResult(`❌ Error: ${error.message || 'Unknown error'}\n\nCheck the browser console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '2px dashed #ccc', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🧪 Test Direct User Creation</h3>
      <p>This will test the new admin-create-user Edge Function</p>
      
      <button 
        onClick={testCreateUser} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Creating Test User...' : 'Create Test User'}
      </button>

      {result && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: result.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          whiteSpace: 'pre-line',
          fontFamily: 'monospace'
        }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default TestUserCreation;
