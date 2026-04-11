class Logger {
  log(...args: any[]) {
    console.log(...args);
  }

  error(...args: any[]) {
    // TODO: Send errors to external monitoring service like "Sentry"
    console.error(...args);
  }

  warn(...args: any[]) {
    console.warn(...args);
  }

  info(...args: any[]) {
    console.info(...args);
  }

  debug(...args: any[]) {
    console.debug(...args);
  }
}

const logger = new Logger();
export default logger;
