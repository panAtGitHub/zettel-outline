

function nowMs() {
  const p = globalThis.performance;
  if (p && typeof p.now === "function") return p.now();
  return Date.now();
}
var Profiler = class {
  constructor(isEnabled) {
    this.isEnabled = isEnabled;
  }
  time(label, fn, opts) {
    var _a;
    if (!this.isEnabled()) return fn();
    const t0 = nowMs();
    try {
      return fn();
    } finally {
      const dt = nowMs() - t0;
      const threshold = (_a = opts == null ? void 0 : opts.thresholdMs) != null ? _a : 0;
      if (dt >= threshold) this.log(label, dt, opts == null ? void 0 : opts.extra);
    }
  }
  async timeAsync(label, fn, opts) {
    var _a;
    if (!this.isEnabled()) return await fn();
    const t0 = nowMs();
    try {
      return await fn();
    } finally {
      const dt = nowMs() - t0;
      const threshold = (_a = opts == null ? void 0 : opts.thresholdMs) != null ? _a : 0;
      if (dt >= threshold) this.log(label, dt, opts == null ? void 0 : opts.extra);
    }
  }
  logMs(label, ms, extra) {
    if (!this.isEnabled()) return;
    this.log(label, ms, extra);
  }
  log(label, ms, extra) {
    const payload = extra ? { ...extra } : void 0;
    console.debug(`[zettel-outline] ${label}: ${ms.toFixed(1)}ms`, payload != null ? payload : "");
  }
};
function profilerFromSettings(settings) {
  return new Profiler(() => !!settings().enableProfiler);
}

export { nowMs, Profiler, profilerFromSettings };
