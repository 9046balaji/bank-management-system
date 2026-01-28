/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are unavailable
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation - requests flow through
  OPEN = 'OPEN',         // Circuit tripped - requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing - allow limited requests
}

export interface CircuitBreakerOptions {
  name: string;                    // Service name for logging
  failureThreshold: number;        // Failures before opening circuit
  successThreshold: number;        // Successes in half-open to close
  timeout: number;                 // Request timeout in ms
  resetTimeout: number;            // Time in ms before trying again
  monitorInterval?: number;        // Health check interval in ms
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt: number = 0;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(private options: CircuitBreakerOptions) {
    console.log(`[CircuitBreaker] Initialized for ${options.name}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        console.log(`[CircuitBreaker] ${this.options.name}: Circuit OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new CircuitBreakerError(
          `Service ${this.options.name} is unavailable`,
          this.options.name
        );
      }
      // Time to try again
      this.state = CircuitState.HALF_OPEN;
      console.log(`[CircuitBreaker] ${this.options.name}: Entering HALF_OPEN state`);
    }

    try {
      // Execute with timeout
      const result = await this.withTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        console.log(`[CircuitBreaker] ${this.options.name}: Using fallback after failure`);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Wrap a function with a timeout
   */
  private async withTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        console.log(`[CircuitBreaker] ${this.options.name}: Circuit CLOSED`);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failures++;
    this.successes = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
    } else if (this.failures >= this.options.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    console.log(
      `[CircuitBreaker] ${this.options.name}: Circuit OPEN, will retry at ${new Date(this.nextAttempt).toISOString()}`
    );
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    console.log(`[CircuitBreaker] ${this.options.name}: Manually reset`);
  }

  /**
   * Get the current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.HALF_OPEN) return true;
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) return true;
    return false;
  }
}

/**
 * Custom error for circuit breaker failures
 */
export class CircuitBreakerError extends Error {
  public serviceName: string;
  public isCircuitBreakerError = true;

  constructor(message: string, serviceName: string) {
    super(message);
    this.serviceName = serviceName;
    this.name = 'CircuitBreakerError';
  }
}

// ==========================================
// PRE-CONFIGURED CIRCUIT BREAKERS
// ==========================================

/**
 * ML Service Circuit Breaker
 * For fraud detection, loan prediction, and expense categorization
 */
export const mlServiceCircuitBreaker = new CircuitBreaker({
  name: 'ML-Service',
  failureThreshold: 3,        // Open after 3 failures
  successThreshold: 2,        // Close after 2 successes in half-open
  timeout: 5000,              // 5 second timeout
  resetTimeout: 30000,        // Try again after 30 seconds
});

/**
 * Helper function to call ML service with circuit breaker
 */
export async function callMLService<T>(
  endpoint: string,
  data: Record<string, any>,
  fallback: () => T
): Promise<T> {
  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';
  
  return mlServiceCircuitBreaker.execute<T>(
    async () => {
      const response = await fetch(`${ML_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }
      
      return await response.json() as T;
    },
    fallback
  );
}

/**
 * Registry for all circuit breakers (for monitoring)
 */
export const circuitBreakerRegistry = new Map<string, CircuitBreaker>();
circuitBreakerRegistry.set('ml-service', mlServiceCircuitBreaker);

/**
 * Get stats for all circuit breakers
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  circuitBreakerRegistry.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  return stats;
}

export default {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitState,
  mlServiceCircuitBreaker,
  callMLService,
  getAllCircuitBreakerStats,
};
