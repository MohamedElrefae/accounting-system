import React from 'react';

export interface ConnectionHealth {
  isOnline: boolean;
  latency: number | null;
  lastCheck: Date;
  error: string | null;
}

let monitorInstanceCount = 0;

class ConnectionMonitor {
  private health: ConnectionHealth = {
    isOnline: false, // Default to false until verified by first check
    latency: null,
    lastCheck: new Date(),
    error: null
  };
  
  private monitorId = ++monitorInstanceCount;

  private listeners: Set<(health: ConnectionHealth) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor() {
    if (import.meta.env.DEV) console.log(`[ConnectionMonitor#${this.monitorId}] Initializing...`);
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic health checks
    this.startPeriodicChecks();
    
    // Perform initial check immediately if potentially online
    if (navigator.onLine) {
      this.checkConnection();
    } else {
      this.updateHealth({ isOnline: false, error: 'Network offline (initial)' });
    }
  }

  private handleOnline = () => {
    // DO NOT update health yet. Wait for checkConnection to verify.
    if (import.meta.env.DEV) console.log('[ConnectionMonitor] Online event detected, verifying...');
    this.checkConnection(); 
  };

  private handleOffline = () => {
    this.updateHealth({ isOnline: false, error: 'Network offline' });
  };

  private startPeriodicChecks() {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      if (!this.isChecking) {
        this.checkConnection();
      }
    }, 30000);
  }

  private async checkConnection(): Promise<void> {
    if (this.isChecking) return;
    
    // Check navigator.onLine first to avoid ERR_INTERNET_DISCONNECTED in console
    if (!navigator.onLine) {
      if (this.health.isOnline) {
        this.updateHealth({ isOnline: false, error: 'Network offline (navigator)' });
      }
      this.isChecking = false; // MUST reset flag if exiting early
      return;
    }

    this.isChecking = true;
    const startTime = performance.now();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (!supabaseUrl) {
         if (import.meta.env.DEV) console.warn('[ConnectionMonitor] SUPABASE_URL is missing!');
         throw new Error('Supabase URL missing');
      }

      // Lightweight health-check endpoint (unauthenticated)
      const pingUrl = `${supabaseUrl}/auth/v1/health`;
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
      );
      
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const queryPromise = fetch(pingUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            ...(anonKey ? { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } : {})
        },
        cache: 'no-store'
      });
      
      const response = await Promise.race([queryPromise, timeoutPromise]) as Response;
      const latency = performance.now() - startTime;
      
      // If we got a status (even if not 200/OK), we are connected to the server.
      // Status 0 usually indicates CORS error or complete network failure.
      if (response.status === 0) {
          throw new Error('Network error (CORS or server unreachable)');
      }
      
      this.updateHealth({
        isOnline: true,
        latency: Math.round(latency),
        error: null
      });
      
    } catch (error: any) {
      if (import.meta.env.DEV) {
          console.warn(`[ConnectionMonitor] Verification failed: ${error?.message || 'Unknown error'}`);
      }
      
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
    const wasOnline = this.health.isOnline;
    this.health = {
      ...this.health,
      ...updates,
      lastCheck: new Date()
    };
    
    if (import.meta.env.DEV && wasOnline !== this.health.isOnline) {
      console.log(`🌐 [ConnectionMonitor#${this.monitorId}] Health state transition: ${wasOnline ? 'ONLINE' : 'OFFLINE'} -> ${this.health.isOnline ? 'ONLINE' : 'OFFLINE'} (Latency: ${this.health.latency}ms)`);
    }
    
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

  const forceCheck = React.useCallback(() => {
    getConnectionMonitor().forceCheck();
  }, []);

  return { ...health, forceCheck };
};
