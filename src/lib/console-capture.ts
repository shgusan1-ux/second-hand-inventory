// 브라우저 콘솔 로그 캡처 (최근 50개)
const LOG_BUFFER_SIZE = 50;
const logBuffer: { level: string; msg: string; ts: string }[] = [];
let initialized = false;

export function initConsoleCapture() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  const capture = (level: string, origFn: (...args: any[]) => void) => {
    return (...args: any[]) => {
      origFn.apply(console, args);
      try {
        const msg = args.map(a => {
          if (a instanceof Error) return `${a.message}\n${a.stack}`;
          if (typeof a === 'object') return JSON.stringify(a, null, 0).substring(0, 300);
          return String(a).substring(0, 300);
        }).join(' ');
        logBuffer.push({ level, msg, ts: new Date().toISOString() });
        if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();
      } catch { /* 캡처 실패 무시 */ }
    };
  };

  console.log = capture('log', original.log);
  console.warn = capture('warn', original.warn);
  console.error = capture('error', original.error);
}

export function getRecentLogs(): string {
  if (logBuffer.length === 0) return '';
  // error/warn만 우선, 최근 30개
  const important = logBuffer.filter(l => l.level !== 'log');
  const logs = important.length > 0 ? important.slice(-30) : logBuffer.slice(-20);
  return logs.map(l => `[${l.level.toUpperCase()}] ${l.ts.substring(11, 19)} ${l.msg}`).join('\n');
}
