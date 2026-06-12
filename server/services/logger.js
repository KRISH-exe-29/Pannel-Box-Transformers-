const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'server-errors.log');
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

function writeLog(level, ...args) {
  const timestamp = new Date().toISOString();
  const logMessage = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }
    return String(arg);
  }).join(' ');

  const logEntry = `[${timestamp}] [${level}] ${logMessage}\n`;

  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        // Reset file if too large
        fs.writeFileSync(LOG_FILE, logEntry);
        return;
      }
    }
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    // Silently fail to avoid infinite loops
  }
}

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  writeLog('ERROR', ...args);
};

// Also catch uncaught exceptions
process.on('uncaughtException', (err) => {
  writeLog('FATAL', 'Uncaught Exception:', err);
  originalConsoleError('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  writeLog('FATAL', 'Unhandled Rejection at:', promise, 'reason:', reason);
  originalConsoleError('Unhandled Rejection:', reason);
});

module.exports = {
  getLogs: () => {
    try {
      if (fs.existsSync(LOG_FILE)) {
        return fs.readFileSync(LOG_FILE, 'utf8');
      }
      return 'No server logs recorded yet.';
    } catch (err) {
      return 'Failed to read log file on server.';
    }
  },
  clearLogs: () => {
    try {
      if (fs.existsSync(LOG_FILE)) {
        fs.unlinkSync(LOG_FILE);
      }
      return true;
    } catch (err) {
      return false;
    }
  }
};
