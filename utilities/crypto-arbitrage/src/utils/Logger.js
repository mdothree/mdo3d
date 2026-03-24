export class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message, data) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message, data) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message, data) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message, data) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }
}
