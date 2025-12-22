import { useCallback, useState } from 'react';

// Rate limiting implementation for API protection
// Prevents abuse and DDoS attacks

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  }
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes default
    private maxRequests: number = 100 // 100 requests per window default
  ) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  // Check if request is allowed
  isAllowed(identifier: string, customMax?: number): boolean {
    const now = Date.now();
    const max = customMax || this.maxRequests;

    // Get or create entry for this identifier
    let entry = this.store[identifier];
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.store[identifier] = entry;
    }

    // Check if limit exceeded
    if (entry.count >= max) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  // Get remaining requests for identifier
  getRemainingRequests(identifier: string, customMax?: number): number {
    const max = customMax || this.maxRequests;
    const entry = this.store[identifier];
    
    if (!entry || entry.resetTime < Date.now()) {
      return max;
    }

    return Math.max(0, max - entry.count);
  }

  // Get reset time for identifier
  getResetTime(identifier: string): number {
    const entry = this.store[identifier];
    return entry ? entry.resetTime : Date.now() + this.windowMs;
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  // Destroy rate limiter
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Different rate limiters for different use cases
export const apiLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const authLimiter = new RateLimiter(15 * 60 * 1000, 20); // 20 auth requests per 15 minutes
export const strictLimiter = new RateLimiter(60 * 1000, 10); // 10 requests per minute for sensitive operations

// Rate limiting hook for React components
export const useRateLimit = (limiter: RateLimiter, identifier: string) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remaining, setRemaining] = useState(limiter.getRemainingRequests(identifier));

  const checkLimit = useCallback(() => {
    const allowed = limiter.isAllowed(identifier);
    setIsBlocked(!allowed);
    setRemaining(limiter.getRemainingRequests(identifier));
    return allowed;
  }, [limiter, identifier]);

  return {
    isBlocked,
    remaining,
    checkLimit,
    resetTime: limiter.getResetTime(identifier)
  };
};

// Rate limiting middleware for API calls
export const withRateLimit = async (
  apiCall: () => Promise<any>,
  limiter: RateLimiter,
  identifier: string
): Promise<any> => {
  if (!limiter.isAllowed(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const waitTime = Math.ceil((resetTime - Date.now()) / 1000);
    
    throw new Error(
      `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`
    );
  }

  return apiCall();
};

// Export rate limiting utilities
export { RateLimiter };
