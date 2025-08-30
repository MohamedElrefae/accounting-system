import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";

interface DebugStatus {
  debug_enabled: boolean;
  description: string;
}

export const DebugToggle: React.FC = () => {
  const [debugStatus, setDebugStatus] = useState<DebugStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check debug status on component mount
  useEffect(() => {
    checkDebugStatus();
  }, []);

  const checkDebugStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_debug_status');
      
      if (error) {
        console.error('Error checking debug status:', error);
        setError(error.message);
        return;
      }

      if (data && data.length > 0) {
        setDebugStatus(data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to check debug status:', err);
      setError('Failed to check debug status');
    } finally {
      setLoading(false);
    }
  };

  const toggleDebugMode = async () => {
    try {
      setLoading(true);
      const isCurrentlyEnabled = debugStatus?.debug_enabled || false;
      const rpcFunction = isCurrentlyEnabled ? 'disable_debug_mode' : 'enable_debug_mode';
      
      const { error } = await supabase.rpc(rpcFunction);
      
      if (error) {
        console.error(`Error ${isCurrentlyEnabled ? 'disabling' : 'enabling'} debug mode:`, error);
        setError(error.message);
        return;
      }

      // Refresh status after toggle
      await checkDebugStatus();
      setError(null);
      
      // Show success message
      const action = isCurrentlyEnabled ? 'disabled' : 'enabled';
      alert(`Debug mode ${action} successfully! Page will reload to apply changes.`);
      
      // Reload page to clear any cached auth states
      window.location.reload();
    } catch (err) {
      console.error('Failed to toggle debug mode:', err);
      setError('Failed to toggle debug mode');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!debugStatus) return 'bg-gray-500';
    return debugStatus.debug_enabled ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    if (!debugStatus) return 'Unknown';
    return debugStatus.debug_enabled ? 'ENABLED' : 'DISABLED';
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Debug Mode</h3>
        <div className={`px-2 py-1 rounded text-xs font-bold text-white ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
      
      {debugStatus && (
        <p className="text-xs text-gray-600 mb-3">
          {debugStatus.description}
        </p>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs mb-2">
          {error}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={toggleDebugMode}
          disabled={loading}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : debugStatus?.debug_enabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? 'Working...' : debugStatus?.debug_enabled ? 'Disable' : 'Enable'}
        </button>
        
        <button
          onClick={checkDebugStatus}
          disabled={loading}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500"
        >
          Refresh
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Enabled: Bypass all auth checks</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span>Disabled: Normal auth required</span>
        </div>
      </div>
    </div>
  );
};
