import React from 'react';
import { supabase } from './supabase';

export interface ConnectionHealth {
  isOnline: boolean;
  latency: number | null;
  lastCheck: Date;
  error: string | null;
}

class ConnectionMonitor {
  private health: ConnectionHealth = {
    isOnline: navigator.onLine,
    latency: null,
    lastCheck: new Date(),
    error: null
  };

  private listeners: Set<(health: ConnectionHealth) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  private handleOnline = () => {
    this.updateHealth({ isOnline: true, error: null });
    this.checkConnection(); // Immediate check when coming online
  };

  private handleOffline = () => {
    this.updateHealth({ isOnline: false, error: 'Network offline' });
  };

  private startPeriodicChecks() {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      if (!this.isChecking && this.health.isOnline) {
        this.checkConnection();
      }
    }, 30000);
  }

  private async checkConnection(): Promise<void> {
    if (this.isChecking) return;
    
    this.isChecking = true;
    const startTime = performance.now();
    
    try {
      // Simple ping to Supabase with manual timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      const { error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      const latency = performance.now() - startTime;
      
      if (error) {
        throw error;
      }
      
      this.updateHealth({
        isOnline: true,
        latency: Math.round(latency),
        error: null
      });
      
    } catch (error: any) {
      console.warn('[ConnectionMonitor] Health check failed:', error);
      this.updateHealth({
        isOnline: false,
        latency: null,
        error: error?.message || 'Connection failed'
      });
    } finally {
      this.isChecking = false;
    }
  }

  private updateHealth(updates: Partial<ConnectionHealth>) {
    this.health = {
      ...this.health,
      ...updates,
      lastCheck: new Date()
    };
    
    // Notify all listeners
    this.listeners.forEach(listener => listener({ ...this.health }));
  }

  public subscribe(listener: (health: ConnectionHealth) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current health
    listener({ ...this.health });
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  public async forceCheck(): Promise<ConnectionHealth> {
    await this.checkConnection();
    return this.getHealth();
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Singleton instance
let connectionMonitor: ConnectionMonitor | null = null;

export const getConnectionMonitor = (): ConnectionMonitor => {
  if (!connectionMonitor) {
    connectionMonitor = new ConnectionMonitor();
  }
  return connectionMonitor;
};

export const destroyConnectionMonitor = (): void => {
  if (connectionMonitor) {
    connectionMonitor.destroy();
    connectionMonitor = null;
  }
};

// Hook for React components
export const useConnectionHealth = () => {
  const [health, setHealth] = React.useState<ConnectionHealth>(() => 
    getConnectionMonitor().getHealth()
  );

  React.useEffect(() => {
    const monitor = getConnectionMonitor();
    const unsubscribe = monitor.subscribe(setHealth);
    
    return () => {
      unsubscribe();
    };
  }, []);

  return health;
};
