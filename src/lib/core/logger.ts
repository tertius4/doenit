/**
 * Centralized logging service for the application
 * 
 * Benefits:
 * - Can be easily disabled in production
 * - Can send logs to remote service (Sentry, LogRocket, etc.)
 * - Provides consistent formatting
 * - Allows filtering by log level
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class LoggerService {
  private level: LogLevel = LogLevel.INFO;
  private enabled: boolean = true;

  constructor() {
    // Set log level based on environment
    if (import.meta.env.PROD) {
      this.level = LogLevel.WARN; // Only warnings and errors in production
    } else {
      this.level = LogLevel.DEBUG; // All logs in development
    }
  }

  /**
   * Set the minimum log level to display
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.DEBUG) return;
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  /**
   * Info level logging - general informational messages
   */
  info(message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.INFO) return;
    console.info(`[INFO] ${message}`, ...args);
  }

  /**
   * Warning level logging - potentially harmful situations
   */
  warn(message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.WARN) return;
    console.warn(`[WARN] ${message}`, ...args);
    // TODO: Send to remote logging service in production
  }

  /**
   * Error level logging - error events
   */
  error(message: string, error?: any, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.ERROR) return;
    console.error(`[ERROR] ${message}`, error, ...args);
    // TODO: Send to remote error tracking service (Sentry)
    // this.sendToErrorTracker(message, error);
  }

  /**
   * Log widget-related operations
   */
  widget(message: string, data?: any) {
    if (!this.enabled || this.level > LogLevel.DEBUG) return;
    console.log(`[💬 Widget] ${message}`, data ? JSON.stringify(data) : '');
  }

  /**
   * Log database operations
   */
  db(message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.INFO) return;
    console.log(`[🗄️ DB] ${message}`, ...args);
  }

  /**
   * Log sync operations
   */
  sync(message: string, ...args: any[]) {
    if (!this.enabled || this.level > LogLevel.INFO) return;
    console.log(`[🔄 Sync] ${message}`, ...args);
  }

  /**
   * Log notification operations
   */
  notification(message: string, data?: any) {
    if (!this.enabled || this.level > LogLevel.DEBUG) return;
    console.log(`[🔔 Notification] ${message}`, data || '');
  }

  /**
   * Future: Send error to remote tracking service
   */
  private sendToErrorTracker(message: string, error?: any) {
    // Placeholder for Sentry, LogRocket, or custom service
    // Example:
    // if (window.Sentry) {
    //   Sentry.captureException(error, { extra: { message } });
    // }
  }
}

// Export singleton instance
export const Logger = new LoggerService();
