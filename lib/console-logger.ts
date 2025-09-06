/**
 * Console Override Logger for Minisend
 * Intercepts all console.log/error/warn calls and stores them in Supabase
 * Provides zero-console production environment while maintaining dev experience
 */

import { supabaseAdmin } from '@/lib/supabase/config';
import { redactPhoneNumber, redactWalletAddress, redactTxHash } from '@/lib/security/dataRedaction';

interface LogEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  data?: unknown[];
  timestamp: string;
  environment: string;
  user_agent?: string;
  url?: string;
  stack_trace?: string;
}

class ConsoleLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';
  private enableDatabaseLogging = process.env.NEXT_PUBLIC_SUPABASE_URL ? true : false;
  
  // Store original console methods
  private originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };

  // Queue for batch processing logs
  private logQueue: LogEntry[] = [];
  private isProcessingQueue = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 2000; // 2 seconds

  constructor() {
    this.initializeOverrides();
  }

  /**
   * Automatically redact sensitive data from any log content
   */
  private redactSensitiveData(data: unknown): unknown {
    if (typeof data === 'string') {
      let redacted = data;
      
      // Redact phone numbers (international format)
      redacted = redacted.replace(/(\+?\d{1,4}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{4,6}/g, 
        (match) => redactPhoneNumber(match)
      );
      
      // Redact wallet addresses
      redacted = redacted.replace(/0x[a-fA-F0-9]{40}/g, 
        (match) => redactWalletAddress(match)
      );
      
      // Redact transaction hashes
      redacted = redacted.replace(/0x[a-fA-F0-9]{64}/g, 
        (match) => redactTxHash(match)
      );
      
      // Redact API keys (common patterns)
      redacted = redacted.replace(/['"](sk_|pk_|api_key_)[a-zA-Z0-9]{20,}['"]?/g, '"[API_KEY_REDACTED]"');
      
      // Redact private keys
      redacted = redacted.replace(/['"](0x)?[a-fA-F0-9]{64}['"]?/g, '"[PRIVATE_KEY_REDACTED]"');
      
      return redacted;
    }
    
    if (typeof data === 'object' && data !== null) {
      try {
        if (Array.isArray(data)) {
          const redacted: unknown[] = [];
          for (let i = 0; i < data.length; i++) {
            redacted[i] = this.redactSensitiveData(data[i]);
          }
          return redacted;
        } else {
          const redacted: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            
            // Redact sensitive field values by key name
            if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
              redacted[key] = typeof value === 'string' ? redactPhoneNumber(value) : value;
            } else if (lowerKey.includes('address') || lowerKey.includes('wallet')) {
              redacted[key] = typeof value === 'string' ? redactWalletAddress(value) : value;
            } else if (lowerKey.includes('hash') || lowerKey.includes('transaction')) {
              redacted[key] = typeof value === 'string' ? redactTxHash(value) : value;
            } else if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token')) {
              redacted[key] = '[REDACTED]';
            } else {
              redacted[key] = this.redactSensitiveData(value);
            }
          }
          return redacted;
        }
      } catch {
        // If object processing fails, return safe fallback
        return '[OBJECT_REDACTION_ERROR]';
      }
    }
    
    return data;
  }

  /**
   * Format log arguments into a structured entry
   */
  private formatLogEntry(level: LogEntry['level'], args: unknown[]): LogEntry {
    const timestamp = new Date().toISOString();
    
    // Extract message and additional data
    const message = args.length > 0 ? String(args[0]) : '';
    const additionalData = args.length > 1 ? args.slice(1) : undefined;
    
    // Redact sensitive data
    const redactedMessage = this.redactSensitiveData(message) as string;
    const redactedData = additionalData ? additionalData.map(item => this.redactSensitiveData(item)) : undefined;
    
    // Capture stack trace for errors
    let stackTrace: string | undefined;
    if (level === 'error') {
      const errorForStack = new Error();
      stackTrace = errorForStack.stack;
    }
    
    return {
      level,
      message: redactedMessage,
      data: redactedData,
      timestamp,
      environment: this.isDevelopment ? 'development' : 'production',
      user_agent: this.isClient ? navigator?.userAgent : undefined,
      url: this.isClient ? window?.location?.href : undefined,
      stack_trace: stackTrace
    };
  }

  /**
   * Add log to queue for batch processing
   */
  private queueLog(logEntry: LogEntry) {
    if (!this.enableDatabaseLogging) return;
    
    this.logQueue.push(logEntry);
    
    // Process immediately if queue is full
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.processLogQueue();
    } else {
      // Set timeout for batch processing
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processLogQueue();
      }, this.BATCH_TIMEOUT);
    }
  }

  /**
   * Process queued logs in batches
   */
  private async processLogQueue() {
    if (this.isProcessingQueue || this.logQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      const logsToProcess = this.logQueue.splice(0, this.BATCH_SIZE);
      
      // Insert logs into Supabase
      const { error } = await supabaseAdmin
        .from('system_logs')
        .insert(logsToProcess);
      
      if (error) {
        // Fallback to original console for critical database errors
        this.originalConsole.error('Failed to store logs in database:', error);
        
        // In development, also show the failed logs
        if (this.isDevelopment) {
          this.originalConsole.warn('Failed logs:', logsToProcess);
        }
      }
    } catch (error) {
      // Critical error - use original console
      this.originalConsole.error('Critical error in log processing:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // Clear timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      
      // Process remaining logs if any
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processLogQueue(), 100);
      }
    }
  }

  /**
   * Override console methods
   */
  private createConsoleOverride(level: LogEntry['level']) {
    return (...args: unknown[]) => {
      // Always log to database (async)
      const logEntry = this.formatLogEntry(level, args);
      this.queueLog(logEntry);
      
      // Console behavior based on environment
      if (this.isDevelopment) {
        // Development: Show in console + database
        this.originalConsole[level === 'log' ? 'log' : level](...args);
      } else {
        // Production: Only database (silent console)
        // Optionally log only critical errors to console in production
        if (level === 'error') {
          // You can uncomment this if you want critical errors in prod console
          // this.originalConsole.error(...args);
        }
      }
    };
  }

  /**
   * Initialize console overrides
   */
  private initializeOverrides() {
    console.log = this.createConsoleOverride('log');
    console.error = this.createConsoleOverride('error');
    console.warn = this.createConsoleOverride('warn');
    console.info = this.createConsoleOverride('info');
    console.debug = this.createConsoleOverride('debug');
  }

  /**
   * Restore original console methods (for testing or debugging)
   */
  public restoreOriginalConsole() {
    Object.assign(console, this.originalConsole);
  }

  /**
   * Force flush all queued logs (useful for app shutdown)
   */
  public async flushLogs(): Promise<void> {
    if (this.logQueue.length > 0) {
      await this.processLogQueue();
    }
  }

  /**
   * Get logging statistics
   */
  public getStats() {
    return {
      queueLength: this.logQueue.length,
      isProcessing: this.isProcessingQueue,
      environment: this.isDevelopment ? 'development' : 'production',
      databaseLogging: this.enableDatabaseLogging
    };
  }
}

// Initialize the console logger
let consoleLogger: ConsoleLogger | null = null;

/**
 * Initialize console logging system
 * Call this once in your app startup
 */
export function initializeConsoleLogger(): ConsoleLogger {
  if (!consoleLogger) {
    consoleLogger = new ConsoleLogger();
  }
  return consoleLogger;
}

/**
 * Get the console logger instance
 */
export function getConsoleLogger(): ConsoleLogger | null {
  return consoleLogger;
}

// Auto-initialize if we're in a browser environment
if (typeof window !== 'undefined') {
  // Delay initialization to ensure environment is ready
  setTimeout(() => {
    initializeConsoleLogger();
  }, 100);
}