var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-gT84zL/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir4, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count4, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd3) {
    this.#cwd = cwd3;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// .wrangler/tmp/pages-pSnAck/bundledWorker-0.45736640984352395.mjs
import { Writable as Writable2 } from "node:stream";
import { EventEmitter as EventEmitter2 } from "node:events";
import { Socket as Socket3 } from "node:net";
import { Socket as Socket22 } from "node:net";
var __defProp2 = Object.defineProperty;
var __defNormalProp2 = /* @__PURE__ */ __name((obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value, "__defNormalProp");
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __publicField2 = /* @__PURE__ */ __name((obj, key, value) => {
  __defNormalProp2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
}, "__publicField");
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
__name2(createNotImplementedError2, "createNotImplementedError");
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
__name2(notImplemented2, "notImplemented");
function notImplementedClass2(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass2, "notImplementedClass");
__name2(notImplementedClass2, "notImplementedClass");
var _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
var nodeTiming2 = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry2 = /* @__PURE__ */ __name(class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow2();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow2() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
}, "PerformanceEntry");
__name2(PerformanceEntry2, "PerformanceEntry");
var PerformanceMark3 = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(class PerformanceMark22 extends PerformanceEntry2 {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark2"), "PerformanceMark");
var PerformanceMeasure2 = /* @__PURE__ */ __name(class extends PerformanceEntry2 {
  entryType = "measure";
}, "PerformanceMeasure");
__name2(PerformanceMeasure2, "PerformanceMeasure");
var PerformanceResourceTiming2 = /* @__PURE__ */ __name(class extends PerformanceEntry2 {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
}, "PerformanceResourceTiming");
__name2(PerformanceResourceTiming2, "PerformanceResourceTiming");
var PerformanceObserverEntryList2 = /* @__PURE__ */ __name(class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
}, "PerformanceObserverEntryList");
__name2(PerformanceObserverEntryList2, "PerformanceObserverEntryList");
var Performance2 = /* @__PURE__ */ __name(class {
  __unenv__ = true;
  timeOrigin = _timeOrigin2;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError2("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming2;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming2("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin2) {
      return _performanceNow2();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark3(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure2(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError2("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError2("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError2("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
}, "Performance");
__name2(Performance2, "Performance");
var PerformanceObserver2 = /* @__PURE__ */ __name(class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError2("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError2("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
}, "PerformanceObserver");
__name2(PerformanceObserver2, "PerformanceObserver");
__publicField2(PerformanceObserver2, "supportedEntryTypes", []);
var performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
globalThis.performance = performance2;
globalThis.Performance = Performance2;
globalThis.PerformanceEntry = PerformanceEntry2;
globalThis.PerformanceMark = PerformanceMark3;
globalThis.PerformanceMeasure = PerformanceMeasure2;
globalThis.PerformanceObserver = PerformanceObserver2;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
var noop_default2 = Object.assign(() => {
}, { __unenv__: true });
var _console2 = globalThis.console;
var _ignoreErrors2 = true;
var _stderr2 = new Writable2();
var _stdout2 = new Writable2();
var log3 = _console2?.log ?? noop_default2;
var info3 = _console2?.info ?? log3;
var trace3 = _console2?.trace ?? info3;
var debug3 = _console2?.debug ?? log3;
var table3 = _console2?.table ?? log3;
var error3 = _console2?.error ?? log3;
var warn3 = _console2?.warn ?? error3;
var createTask3 = _console2?.createTask ?? /* @__PURE__ */ notImplemented2("console.createTask");
var clear3 = _console2?.clear ?? noop_default2;
var count3 = _console2?.count ?? noop_default2;
var countReset3 = _console2?.countReset ?? noop_default2;
var dir3 = _console2?.dir ?? noop_default2;
var dirxml3 = _console2?.dirxml ?? noop_default2;
var group3 = _console2?.group ?? noop_default2;
var groupEnd3 = _console2?.groupEnd ?? noop_default2;
var groupCollapsed3 = _console2?.groupCollapsed ?? noop_default2;
var profile3 = _console2?.profile ?? noop_default2;
var profileEnd3 = _console2?.profileEnd ?? noop_default2;
var time3 = _console2?.time ?? noop_default2;
var timeEnd3 = _console2?.timeEnd ?? noop_default2;
var timeLog3 = _console2?.timeLog ?? noop_default2;
var timeStamp3 = _console2?.timeStamp ?? noop_default2;
var Console2 = _console2?.Console ?? /* @__PURE__ */ notImplementedClass2("console.Console");
var _times2 = /* @__PURE__ */ new Map();
var _stdoutErrorHandler2 = noop_default2;
var _stderrErrorHandler2 = noop_default2;
var workerdConsole2 = globalThis["console"];
var {
  assert: assert3,
  clear: clear22,
  // @ts-expect-error undocumented public API
  context: context2,
  count: count22,
  countReset: countReset22,
  // @ts-expect-error undocumented public API
  createTask: createTask22,
  debug: debug22,
  dir: dir22,
  dirxml: dirxml22,
  error: error22,
  group: group22,
  groupCollapsed: groupCollapsed22,
  groupEnd: groupEnd22,
  info: info22,
  log: log22,
  profile: profile22,
  profileEnd: profileEnd22,
  table: table22,
  time: time22,
  timeEnd: timeEnd22,
  timeLog: timeLog22,
  timeStamp: timeStamp22,
  trace: trace22,
  warn: warn22
} = workerdConsole2;
Object.assign(workerdConsole2, {
  Console: Console2,
  _ignoreErrors: _ignoreErrors2,
  _stderr: _stderr2,
  _stderrErrorHandler: _stderrErrorHandler2,
  _stdout: _stdout2,
  _stdoutErrorHandler: _stdoutErrorHandler2,
  _times: _times2
});
var console_default2 = workerdConsole2;
globalThis.console = console_default2;
var hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
  return BigInt(Date.now() * 1e6);
}, "bigint"), "bigint") });
var ReadStream2 = /* @__PURE__ */ __name(class extends Socket3 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
}, "ReadStream");
__name2(ReadStream2, "ReadStream");
var WriteStream2 = /* @__PURE__ */ __name(class extends Socket22 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir32, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env22) {
    return 1;
  }
  hasColors(count32, env22) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
}, "WriteStream");
__name2(WriteStream2, "WriteStream");
var Process2 = /* @__PURE__ */ __name(class extends EventEmitter2 {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process2.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream2(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream2(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream2(2);
  }
  #cwd = "/";
  chdir(cwd22) {
    this.#cwd = cwd22;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError2("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError2("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError2("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError2("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError2("process.kill");
  }
  abort() {
    throw createNotImplementedError2("process.abort");
  }
  dlopen() {
    throw createNotImplementedError2("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError2("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError2("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError2("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError2("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError2("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError2("process.openStdin");
  }
  assert() {
    throw createNotImplementedError2("process.assert");
  }
  binding() {
    throw createNotImplementedError2("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
}, "Process");
__name2(Process2, "Process");
var globalProcess2 = globalThis["process"];
var getBuiltinModule2 = globalProcess2.getBuiltinModule;
var { exit: exit2, platform: platform2, nextTick: nextTick2 } = getBuiltinModule2(
  "node:process"
);
var unenvProcess2 = new Process2({
  env: globalProcess2.env,
  hrtime: hrtime4,
  nextTick: nextTick2
});
var {
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  loadEnvFile: loadEnvFile2,
  sourceMapsEnabled: sourceMapsEnabled2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  availableMemory: availableMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  disconnect: disconnect2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  finalization: finalization2,
  features: features2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getMaxListeners: getMaxListeners2,
  hrtime: hrtime32,
  kill: kill2,
  listeners: listeners2,
  listenerCount: listenerCount2,
  memoryUsage: memoryUsage2,
  on: on2,
  off: off2,
  once: once2,
  pid: pid2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  title: title2,
  throwDeprecation: throwDeprecation2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  uptime: uptime2,
  version: version2,
  versions: versions2,
  domain: domain2,
  initgroups: initgroups2,
  moduleLoadList: moduleLoadList2,
  reallyExit: reallyExit2,
  openStdin: openStdin2,
  assert: assert22,
  binding: binding2,
  send: send2,
  exitCode: exitCode2,
  channel: channel2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getuid: getuid2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setuid: setuid2,
  permission: permission2,
  mainModule: mainModule2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _maxListeners: _maxListeners2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _kill: _kill2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  _disconnect: _disconnect2,
  _handleQueue: _handleQueue2,
  _pendingMessage: _pendingMessage2,
  _channel: _channel2,
  _send: _send2,
  _linkedBinding: _linkedBinding2
} = unenvProcess2;
var _process2 = {
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  loadEnvFile: loadEnvFile2,
  sourceMapsEnabled: sourceMapsEnabled2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  availableMemory: availableMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  disconnect: disconnect2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exit: exit2,
  finalization: finalization2,
  features: features2,
  getBuiltinModule: getBuiltinModule2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getMaxListeners: getMaxListeners2,
  hrtime: hrtime32,
  kill: kill2,
  listeners: listeners2,
  listenerCount: listenerCount2,
  memoryUsage: memoryUsage2,
  nextTick: nextTick2,
  on: on2,
  off: off2,
  once: once2,
  pid: pid2,
  platform: platform2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  title: title2,
  throwDeprecation: throwDeprecation2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  uptime: uptime2,
  version: version2,
  versions: versions2,
  // @ts-expect-error old API
  domain: domain2,
  initgroups: initgroups2,
  moduleLoadList: moduleLoadList2,
  reallyExit: reallyExit2,
  openStdin: openStdin2,
  assert: assert22,
  binding: binding2,
  send: send2,
  exitCode: exitCode2,
  channel: channel2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getuid: getuid2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setuid: setuid2,
  permission: permission2,
  mainModule: mainModule2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _maxListeners: _maxListeners2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _kill: _kill2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  _disconnect: _disconnect2,
  _handleQueue: _handleQueue2,
  _pendingMessage: _pendingMessage2,
  _channel: _channel2,
  _send: _send2,
  _linkedBinding: _linkedBinding2
};
var process_default2 = _process2;
globalThis.process = process_default2;
var wt = Object.defineProperty;
var Ne = /* @__PURE__ */ __name2((e) => {
  throw TypeError(e);
}, "Ne");
var yt = /* @__PURE__ */ __name2((e, t, s) => t in e ? wt(e, t, { enumerable: true, configurable: true, writable: true, value: s }) : e[t] = s, "yt");
var p = /* @__PURE__ */ __name2((e, t, s) => yt(e, typeof t != "symbol" ? t + "" : t, s), "p");
var ke = /* @__PURE__ */ __name2((e, t, s) => t.has(e) || Ne("Cannot " + s), "ke");
var l = /* @__PURE__ */ __name2((e, t, s) => (ke(e, t, "read from private field"), s ? s.call(e) : t.get(e)), "l");
var g = /* @__PURE__ */ __name2((e, t, s) => t.has(e) ? Ne("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), "g");
var u = /* @__PURE__ */ __name2((e, t, s, n) => (ke(e, t, "write to private field"), n ? n.call(e, s) : t.set(e, s), s), "u");
var v = /* @__PURE__ */ __name2((e, t, s) => (ke(e, t, "access private method"), s), "v");
var He = /* @__PURE__ */ __name2((e, t, s, n) => ({ set _(i) {
  u(e, t, i, s);
}, get _() {
  return l(e, t, n);
} }), "He");
var $e = /* @__PURE__ */ __name2((e, t, s) => (n, i) => {
  let a = -1;
  return r(0);
  async function r(c) {
    if (c <= a)
      throw new Error("next() called multiple times");
    a = c;
    let o, d = false, f;
    if (e[c] ? (f = e[c][0][0], n.req.routeIndex = c) : f = c === e.length && i || void 0, f)
      try {
        o = await f(n, () => r(c + 1));
      } catch (h) {
        if (h instanceof Error && t)
          n.error = h, o = await t(h, n), d = true;
        else
          throw h;
      }
    else
      n.finalized === false && s && (o = await s(n));
    return o && (n.finalized === false || d) && (n.res = o), n;
  }
  __name(r, "r");
  __name2(r, "r");
}, "$e");
var Et = Symbol();
var Tt = /* @__PURE__ */ __name2(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: s = false, dot: n = false } = t, a = (e instanceof it ? e.raw.headers : e.headers).get("Content-Type");
  return a != null && a.startsWith("multipart/form-data") || a != null && a.startsWith("application/x-www-form-urlencoded") ? Rt(e, { all: s, dot: n }) : {};
}, "Tt");
async function Rt(e, t) {
  const s = await e.formData();
  return s ? jt(s, t) : {};
}
__name(Rt, "Rt");
__name2(Rt, "Rt");
function jt(e, t) {
  const s = /* @__PURE__ */ Object.create(null);
  return e.forEach((n, i) => {
    t.all || i.endsWith("[]") ? St(s, i, n) : s[i] = n;
  }), t.dot && Object.entries(s).forEach(([n, i]) => {
    n.includes(".") && (Ot(s, n, i), delete s[n]);
  }), s;
}
__name(jt, "jt");
__name2(jt, "jt");
var St = /* @__PURE__ */ __name2((e, t, s) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(s) : e[t] = [e[t], s] : t.endsWith("[]") ? e[t] = [s] : e[t] = s;
}, "St");
var Ot = /* @__PURE__ */ __name2((e, t, s) => {
  let n = e;
  const i = t.split(".");
  i.forEach((a, r) => {
    r === i.length - 1 ? n[a] = s : ((!n[a] || typeof n[a] != "object" || Array.isArray(n[a]) || n[a] instanceof File) && (n[a] = /* @__PURE__ */ Object.create(null)), n = n[a]);
  });
}, "Ot");
var Ze = /* @__PURE__ */ __name2((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "Ze");
var _t = /* @__PURE__ */ __name2((e) => {
  const { groups: t, path: s } = At(e), n = Ze(s);
  return kt(n, t);
}, "_t");
var At = /* @__PURE__ */ __name2((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (s, n) => {
    const i = `@${n}`;
    return t.push([i, s]), i;
  }), { groups: t, path: e };
}, "At");
var kt = /* @__PURE__ */ __name2((e, t) => {
  for (let s = t.length - 1; s >= 0; s--) {
    const [n] = t[s];
    for (let i = e.length - 1; i >= 0; i--)
      if (e[i].includes(n)) {
        e[i] = e[i].replace(n, t[s][1]);
        break;
      }
  }
  return e;
}, "kt");
var ye = {};
var Lt = /* @__PURE__ */ __name2((e, t) => {
  if (e === "*")
    return "*";
  const s = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (s) {
    const n = `${e}#${t}`;
    return ye[n] || (s[2] ? ye[n] = t && t[0] !== ":" && t[0] !== "*" ? [n, s[1], new RegExp(`^${s[2]}(?=/${t})`)] : [e, s[1], new RegExp(`^${s[2]}$`)] : ye[n] = [e, s[1], true]), ye[n];
  }
  return null;
}, "Lt");
var Ie = /* @__PURE__ */ __name2((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (s) => {
      try {
        return t(s);
      } catch {
        return s;
      }
    });
  }
}, "Ie");
var Ct = /* @__PURE__ */ __name2((e) => Ie(e, decodeURI), "Ct");
var et = /* @__PURE__ */ __name2((e) => {
  const t = e.url, s = t.indexOf("/", t.indexOf(":") + 4);
  let n = s;
  for (; n < t.length; n++) {
    const i = t.charCodeAt(n);
    if (i === 37) {
      const a = t.indexOf("?", n), r = t.slice(s, a === -1 ? void 0 : a);
      return Ct(r.includes("%25") ? r.replace(/%25/g, "%2525") : r);
    } else if (i === 63)
      break;
  }
  return t.slice(s, n);
}, "et");
var Dt = /* @__PURE__ */ __name2((e) => {
  const t = et(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "Dt");
var se = /* @__PURE__ */ __name2((e, t, ...s) => (s.length && (t = se(t, ...s)), `${(e == null ? void 0 : e[0]) === "/" ? "" : "/"}${e}${t === "/" ? "" : `${(e == null ? void 0 : e.at(-1)) === "/" ? "" : "/"}${(t == null ? void 0 : t[0]) === "/" ? t.slice(1) : t}`}`), "se");
var tt = /* @__PURE__ */ __name2((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":"))
    return null;
  const t = e.split("/"), s = [];
  let n = "";
  return t.forEach((i) => {
    if (i !== "" && !/\:/.test(i))
      n += "/" + i;
    else if (/\:/.test(i))
      if (/\?/.test(i)) {
        s.length === 0 && n === "" ? s.push("/") : s.push(n);
        const a = i.replace("?", "");
        n += "/" + a, s.push(n);
      } else
        n += "/" + i;
  }), s.filter((i, a, r) => r.indexOf(i) === a);
}, "tt");
var Le = /* @__PURE__ */ __name2((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? Ie(e, nt) : e) : e, "Le");
var st = /* @__PURE__ */ __name2((e, t, s) => {
  let n;
  if (!s && t && !/[%+]/.test(t)) {
    let r = e.indexOf("?", 8);
    if (r === -1)
      return;
    for (e.startsWith(t, r + 1) || (r = e.indexOf(`&${t}`, r + 1)); r !== -1; ) {
      const c = e.charCodeAt(r + t.length + 1);
      if (c === 61) {
        const o = r + t.length + 2, d = e.indexOf("&", o);
        return Le(e.slice(o, d === -1 ? void 0 : d));
      } else if (c == 38 || isNaN(c))
        return "";
      r = e.indexOf(`&${t}`, r + 1);
    }
    if (n = /[%+]/.test(e), !n)
      return;
  }
  const i = {};
  n ?? (n = /[%+]/.test(e));
  let a = e.indexOf("?", 8);
  for (; a !== -1; ) {
    const r = e.indexOf("&", a + 1);
    let c = e.indexOf("=", a);
    c > r && r !== -1 && (c = -1);
    let o = e.slice(a + 1, c === -1 ? r === -1 ? void 0 : r : c);
    if (n && (o = Le(o)), a = r, o === "")
      continue;
    let d;
    c === -1 ? d = "" : (d = e.slice(c + 1, r === -1 ? void 0 : r), n && (d = Le(d))), s ? (i[o] && Array.isArray(i[o]) || (i[o] = []), i[o].push(d)) : i[o] ?? (i[o] = d);
  }
  return t ? i[t] : i;
}, "st");
var Pt = st;
var It = /* @__PURE__ */ __name2((e, t) => st(e, t, true), "It");
var nt = decodeURIComponent;
var Be = /* @__PURE__ */ __name2((e) => Ie(e, nt), "Be");
var ae;
var A;
var $;
var at;
var rt;
var De;
var F;
var qe;
var it = (qe = /* @__PURE__ */ __name2(class {
  constructor(e, t = "/", s = [[]]) {
    g(this, $);
    p(this, "raw");
    g(this, ae);
    g(this, A);
    p(this, "routeIndex", 0);
    p(this, "path");
    p(this, "bodyCache", {});
    g(this, F, (e2) => {
      const { bodyCache: t2, raw: s2 } = this, n = t2[e2];
      if (n)
        return n;
      const i = Object.keys(t2)[0];
      return i ? t2[i].then((a) => (i === "json" && (a = JSON.stringify(a)), new Response(a)[e2]())) : t2[e2] = s2[e2]();
    });
    this.raw = e, this.path = t, u(this, A, s), u(this, ae, {});
  }
  param(e) {
    return e ? v(this, $, at).call(this, e) : v(this, $, rt).call(this);
  }
  query(e) {
    return Pt(this.url, e);
  }
  queries(e) {
    return It(this.url, e);
  }
  header(e) {
    if (e)
      return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((s, n) => {
      t[n] = s;
    }), t;
  }
  async parseBody(e) {
    var t;
    return (t = this.bodyCache).parsedBody ?? (t.parsedBody = await Tt(this, e));
  }
  json() {
    return l(this, F).call(this, "text").then((e) => JSON.parse(e));
  }
  text() {
    return l(this, F).call(this, "text");
  }
  arrayBuffer() {
    return l(this, F).call(this, "arrayBuffer");
  }
  blob() {
    return l(this, F).call(this, "blob");
  }
  formData() {
    return l(this, F).call(this, "formData");
  }
  addValidatedData(e, t) {
    l(this, ae)[e] = t;
  }
  valid(e) {
    return l(this, ae)[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [Et]() {
    return l(this, A);
  }
  get matchedRoutes() {
    return l(this, A)[0].map(([[, e]]) => e);
  }
  get routePath() {
    return l(this, A)[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
}, "qe"), ae = /* @__PURE__ */ new WeakMap(), A = /* @__PURE__ */ new WeakMap(), $ = /* @__PURE__ */ new WeakSet(), at = /* @__PURE__ */ __name2(function(e) {
  const t = l(this, A)[0][this.routeIndex][1][e], s = v(this, $, De).call(this, t);
  return s && /\%/.test(s) ? Be(s) : s;
}, "at"), rt = /* @__PURE__ */ __name2(function() {
  const e = {}, t = Object.keys(l(this, A)[0][this.routeIndex][1]);
  for (const s of t) {
    const n = v(this, $, De).call(this, l(this, A)[0][this.routeIndex][1][s]);
    n !== void 0 && (e[s] = /\%/.test(n) ? Be(n) : n);
  }
  return e;
}, "rt"), De = /* @__PURE__ */ __name2(function(e) {
  return l(this, A)[1] ? l(this, A)[1][e] : e;
}, "De"), F = /* @__PURE__ */ new WeakMap(), qe);
var Mt = { Stringify: 1 };
var ot = /* @__PURE__ */ __name2(async (e, t, s, n, i) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const a = e.callbacks;
  return a != null && a.length ? (i ? i[0] += e : i = [e], Promise.all(a.map((c) => c({ phase: t, buffer: i, context: n }))).then((c) => Promise.all(c.filter(Boolean).map((o) => ot(o, t, false, n, i))).then(() => i[0]))) : Promise.resolve(e);
}, "ot");
var Nt = "text/plain; charset=UTF-8";
var Ce = /* @__PURE__ */ __name2((e, t) => ({ "Content-Type": e, ...t }), "Ce");
var me;
var ge;
var I;
var re;
var M;
var O;
var ve;
var oe;
var le;
var J;
var be;
var xe;
var z;
var ne;
var We;
var Ht = (We = /* @__PURE__ */ __name2(class {
  constructor(e, t) {
    g(this, z);
    g(this, me);
    g(this, ge);
    p(this, "env", {});
    g(this, I);
    p(this, "finalized", false);
    p(this, "error");
    g(this, re);
    g(this, M);
    g(this, O);
    g(this, ve);
    g(this, oe);
    g(this, le);
    g(this, J);
    g(this, be);
    g(this, xe);
    p(this, "render", (...e2) => (l(this, oe) ?? u(this, oe, (t2) => this.html(t2)), l(this, oe).call(this, ...e2)));
    p(this, "setLayout", (e2) => u(this, ve, e2));
    p(this, "getLayout", () => l(this, ve));
    p(this, "setRenderer", (e2) => {
      u(this, oe, e2);
    });
    p(this, "header", (e2, t2, s) => {
      this.finalized && u(this, O, new Response(l(this, O).body, l(this, O)));
      const n = l(this, O) ? l(this, O).headers : l(this, J) ?? u(this, J, new Headers());
      t2 === void 0 ? n.delete(e2) : s != null && s.append ? n.append(e2, t2) : n.set(e2, t2);
    });
    p(this, "status", (e2) => {
      u(this, re, e2);
    });
    p(this, "set", (e2, t2) => {
      l(this, I) ?? u(this, I, /* @__PURE__ */ new Map()), l(this, I).set(e2, t2);
    });
    p(this, "get", (e2) => l(this, I) ? l(this, I).get(e2) : void 0);
    p(this, "newResponse", (...e2) => v(this, z, ne).call(this, ...e2));
    p(this, "body", (e2, t2, s) => v(this, z, ne).call(this, e2, t2, s));
    p(this, "text", (e2, t2, s) => !l(this, J) && !l(this, re) && !t2 && !s && !this.finalized ? new Response(e2) : v(this, z, ne).call(this, e2, t2, Ce(Nt, s)));
    p(this, "json", (e2, t2, s) => v(this, z, ne).call(this, JSON.stringify(e2), t2, Ce("application/json", s)));
    p(this, "html", (e2, t2, s) => {
      const n = /* @__PURE__ */ __name2((i) => v(this, z, ne).call(this, i, t2, Ce("text/html; charset=UTF-8", s)), "n");
      return typeof e2 == "object" ? ot(e2, Mt.Stringify, false, {}).then(n) : n(e2);
    });
    p(this, "redirect", (e2, t2) => {
      const s = String(e2);
      return this.header("Location", /[^\x00-\xFF]/.test(s) ? encodeURI(s) : s), this.newResponse(null, t2 ?? 302);
    });
    p(this, "notFound", () => (l(this, le) ?? u(this, le, () => new Response()), l(this, le).call(this, this)));
    u(this, me, e), t && (u(this, M, t.executionCtx), this.env = t.env, u(this, le, t.notFoundHandler), u(this, xe, t.path), u(this, be, t.matchResult));
  }
  get req() {
    return l(this, ge) ?? u(this, ge, new it(l(this, me), l(this, xe), l(this, be))), l(this, ge);
  }
  get event() {
    if (l(this, M) && "respondWith" in l(this, M))
      return l(this, M);
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (l(this, M))
      return l(this, M);
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return l(this, O) || u(this, O, new Response(null, { headers: l(this, J) ?? u(this, J, new Headers()) }));
  }
  set res(e) {
    if (l(this, O) && e) {
      e = new Response(e.body, e);
      for (const [t, s] of l(this, O).headers.entries())
        if (t !== "content-type")
          if (t === "set-cookie") {
            const n = l(this, O).headers.getSetCookie();
            e.headers.delete("set-cookie");
            for (const i of n)
              e.headers.append("set-cookie", i);
          } else
            e.headers.set(t, s);
    }
    u(this, O, e), this.finalized = true;
  }
  get var() {
    return l(this, I) ? Object.fromEntries(l(this, I)) : {};
  }
}, "We"), me = /* @__PURE__ */ new WeakMap(), ge = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), M = /* @__PURE__ */ new WeakMap(), O = /* @__PURE__ */ new WeakMap(), ve = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakMap(), le = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), be = /* @__PURE__ */ new WeakMap(), xe = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakSet(), ne = /* @__PURE__ */ __name2(function(e, t, s) {
  const n = l(this, O) ? new Headers(l(this, O).headers) : l(this, J) ?? new Headers();
  if (typeof t == "object" && "headers" in t) {
    const a = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
    for (const [r, c] of a)
      r.toLowerCase() === "set-cookie" ? n.append(r, c) : n.set(r, c);
  }
  if (s)
    for (const [a, r] of Object.entries(s))
      if (typeof r == "string")
        n.set(a, r);
      else {
        n.delete(a);
        for (const c of r)
          n.append(a, c);
      }
  const i = typeof t == "number" ? t : (t == null ? void 0 : t.status) ?? l(this, re);
  return new Response(e, { status: i, headers: n });
}, "ne"), We);
var E = "ALL";
var $t = "all";
var Bt = ["get", "post", "put", "delete", "options", "patch"];
var lt = "Can not add a route since the matcher is already built.";
var ct = /* @__PURE__ */ __name2(class extends Error {
}, "ct");
var Ft = "__COMPOSED_HANDLER";
var zt = /* @__PURE__ */ __name2((e) => e.text("404 Not Found", 404), "zt");
var Fe = /* @__PURE__ */ __name2((e, t) => {
  if ("getResponse" in e) {
    const s = e.getResponse();
    return t.newResponse(s.body, s);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "Fe");
var k;
var T;
var ft;
var L;
var K;
var Ee;
var Te;
var Ve;
var dt = (Ve = /* @__PURE__ */ __name2(class {
  constructor(t = {}) {
    g(this, T);
    p(this, "get");
    p(this, "post");
    p(this, "put");
    p(this, "delete");
    p(this, "options");
    p(this, "patch");
    p(this, "all");
    p(this, "on");
    p(this, "use");
    p(this, "router");
    p(this, "getPath");
    p(this, "_basePath", "/");
    g(this, k, "/");
    p(this, "routes", []);
    g(this, L, zt);
    p(this, "errorHandler", Fe);
    p(this, "onError", (t2) => (this.errorHandler = t2, this));
    p(this, "notFound", (t2) => (u(this, L, t2), this));
    p(this, "fetch", (t2, ...s) => v(this, T, Te).call(this, t2, s[1], s[0], t2.method));
    p(this, "request", (t2, s, n2, i2) => t2 instanceof Request ? this.fetch(s ? new Request(t2, s) : t2, n2, i2) : (t2 = t2.toString(), this.fetch(new Request(/^https?:\/\//.test(t2) ? t2 : `http://localhost${se("/", t2)}`, s), n2, i2)));
    p(this, "fire", () => {
      addEventListener("fetch", (t2) => {
        t2.respondWith(v(this, T, Te).call(this, t2.request, t2, void 0, t2.request.method));
      });
    });
    [...Bt, $t].forEach((a) => {
      this[a] = (r, ...c) => (typeof r == "string" ? u(this, k, r) : v(this, T, K).call(this, a, l(this, k), r), c.forEach((o) => {
        v(this, T, K).call(this, a, l(this, k), o);
      }), this);
    }), this.on = (a, r, ...c) => {
      for (const o of [r].flat()) {
        u(this, k, o);
        for (const d of [a].flat())
          c.map((f) => {
            v(this, T, K).call(this, d.toUpperCase(), l(this, k), f);
          });
      }
      return this;
    }, this.use = (a, ...r) => (typeof a == "string" ? u(this, k, a) : (u(this, k, "*"), r.unshift(a)), r.forEach((c) => {
      v(this, T, K).call(this, E, l(this, k), c);
    }), this);
    const { strict: n, ...i } = t;
    Object.assign(this, i), this.getPath = n ?? true ? t.getPath ?? et : Dt;
  }
  route(t, s) {
    const n = this.basePath(t);
    return s.routes.map((i) => {
      var r;
      let a;
      s.errorHandler === Fe ? a = i.handler : (a = /* @__PURE__ */ __name2(async (c, o) => (await $e([], s.errorHandler)(c, () => i.handler(c, o))).res, "a"), a[Ft] = i.handler), v(r = n, T, K).call(r, i.method, i.path, a);
    }), this;
  }
  basePath(t) {
    const s = v(this, T, ft).call(this);
    return s._basePath = se(this._basePath, t), s;
  }
  mount(t, s, n) {
    let i, a;
    n && (typeof n == "function" ? a = n : (a = n.optionHandler, n.replaceRequest === false ? i = /* @__PURE__ */ __name2((o) => o, "i") : i = n.replaceRequest));
    const r = a ? (o) => {
      const d = a(o);
      return Array.isArray(d) ? d : [d];
    } : (o) => {
      let d;
      try {
        d = o.executionCtx;
      } catch {
      }
      return [o.env, d];
    };
    i || (i = (() => {
      const o = se(this._basePath, t), d = o === "/" ? 0 : o.length;
      return (f) => {
        const h = new URL(f.url);
        return h.pathname = h.pathname.slice(d) || "/", new Request(h, f);
      };
    })());
    const c = /* @__PURE__ */ __name2(async (o, d) => {
      const f = await s(i(o.req.raw), ...r(o));
      if (f)
        return f;
      await d();
    }, "c");
    return v(this, T, K).call(this, E, se(t, "*"), c), this;
  }
}, "Ve"), k = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakSet(), ft = /* @__PURE__ */ __name2(function() {
  const t = new dt({ router: this.router, getPath: this.getPath });
  return t.errorHandler = this.errorHandler, u(t, L, l(this, L)), t.routes = this.routes, t;
}, "ft"), L = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ __name2(function(t, s, n) {
  t = t.toUpperCase(), s = se(this._basePath, s);
  const i = { basePath: this._basePath, path: s, method: t, handler: n };
  this.router.add(t, s, [n, i]), this.routes.push(i);
}, "K"), Ee = /* @__PURE__ */ __name2(function(t, s) {
  if (t instanceof Error)
    return this.errorHandler(t, s);
  throw t;
}, "Ee"), Te = /* @__PURE__ */ __name2(function(t, s, n, i) {
  if (i === "HEAD")
    return (async () => new Response(null, await v(this, T, Te).call(this, t, s, n, "GET")))();
  const a = this.getPath(t, { env: n }), r = this.router.match(i, a), c = new Ht(t, { path: a, matchResult: r, env: n, executionCtx: s, notFoundHandler: l(this, L) });
  if (r[0].length === 1) {
    let d;
    try {
      d = r[0][0][0][0](c, async () => {
        c.res = await l(this, L).call(this, c);
      });
    } catch (f) {
      return v(this, T, Ee).call(this, f, c);
    }
    return d instanceof Promise ? d.then((f) => f || (c.finalized ? c.res : l(this, L).call(this, c))).catch((f) => v(this, T, Ee).call(this, f, c)) : d ?? l(this, L).call(this, c);
  }
  const o = $e(r[0], this.errorHandler, l(this, L));
  return (async () => {
    try {
      const d = await o(c);
      if (!d.finalized)
        throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
      return d.res;
    } catch (d) {
      return v(this, T, Ee).call(this, d, c);
    }
  })();
}, "Te"), Ve);
var ut = [];
function Ut(e, t) {
  const s = this.buildAllMatchers(), n = /* @__PURE__ */ __name2((i, a) => {
    const r = s[i] || s[E], c = r[2][a];
    if (c)
      return c;
    const o = a.match(r[0]);
    if (!o)
      return [[], ut];
    const d = o.indexOf("", 1);
    return [r[1][d], o];
  }, "n");
  return this.match = n, n(e, t);
}
__name(Ut, "Ut");
__name2(Ut, "Ut");
var je = "[^/]+";
var he = ".*";
var pe = "(?:|/.*)";
var ie = Symbol();
var qt = new Set(".\\+*[^]$()");
function Wt(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === he || e === pe ? 1 : t === he || t === pe ? -1 : e === je ? 1 : t === je ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(Wt, "Wt");
__name2(Wt, "Wt");
var Y;
var X;
var C;
var Ke;
var Pe = (Ke = /* @__PURE__ */ __name2(class {
  constructor() {
    g(this, Y);
    g(this, X);
    g(this, C, /* @__PURE__ */ Object.create(null));
  }
  insert(t, s, n, i, a) {
    if (t.length === 0) {
      if (l(this, Y) !== void 0)
        throw ie;
      if (a)
        return;
      u(this, Y, s);
      return;
    }
    const [r, ...c] = t, o = r === "*" ? c.length === 0 ? ["", "", he] : ["", "", je] : r === "/*" ? ["", "", pe] : r.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let d;
    if (o) {
      const f = o[1];
      let h = o[2] || je;
      if (f && o[2] && (h === ".*" || (h = h.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(h))))
        throw ie;
      if (d = l(this, C)[h], !d) {
        if (Object.keys(l(this, C)).some((m) => m !== he && m !== pe))
          throw ie;
        if (a)
          return;
        d = l(this, C)[h] = new Pe(), f !== "" && u(d, X, i.varIndex++);
      }
      !a && f !== "" && n.push([f, l(d, X)]);
    } else if (d = l(this, C)[r], !d) {
      if (Object.keys(l(this, C)).some((f) => f.length > 1 && f !== he && f !== pe))
        throw ie;
      if (a)
        return;
      d = l(this, C)[r] = new Pe();
    }
    d.insert(c, s, n, i, a);
  }
  buildRegExpStr() {
    const s = Object.keys(l(this, C)).sort(Wt).map((n) => {
      const i = l(this, C)[n];
      return (typeof l(i, X) == "number" ? `(${n})@${l(i, X)}` : qt.has(n) ? `\\${n}` : n) + i.buildRegExpStr();
    });
    return typeof l(this, Y) == "number" && s.unshift(`#${l(this, Y)}`), s.length === 0 ? "" : s.length === 1 ? s[0] : "(?:" + s.join("|") + ")";
  }
}, "Ke"), Y = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), C = /* @__PURE__ */ new WeakMap(), Ke);
var Se;
var we;
var Ge;
var Vt = (Ge = /* @__PURE__ */ __name2(class {
  constructor() {
    g(this, Se, { varIndex: 0 });
    g(this, we, new Pe());
  }
  insert(e, t, s) {
    const n = [], i = [];
    for (let r = 0; ; ) {
      let c = false;
      if (e = e.replace(/\{[^}]+\}/g, (o) => {
        const d = `@\\${r}`;
        return i[r] = [d, o], r++, c = true, d;
      }), !c)
        break;
    }
    const a = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let r = i.length - 1; r >= 0; r--) {
      const [c] = i[r];
      for (let o = a.length - 1; o >= 0; o--)
        if (a[o].indexOf(c) !== -1) {
          a[o] = a[o].replace(c, i[r][1]);
          break;
        }
    }
    return l(this, we).insert(a, t, n, l(this, Se), s), n;
  }
  buildRegExp() {
    let e = l(this, we).buildRegExpStr();
    if (e === "")
      return [/^$/, [], []];
    let t = 0;
    const s = [], n = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (i, a, r) => a !== void 0 ? (s[++t] = Number(a), "$()") : (r !== void 0 && (n[Number(r)] = ++t), "")), [new RegExp(`^${e}`), s, n];
  }
}, "Ge"), Se = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), Ge);
var Kt = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var Re = /* @__PURE__ */ Object.create(null);
function ht(e) {
  return Re[e] ?? (Re[e] = new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, s) => s ? `\\${s}` : "(?:|/.*)")}$`));
}
__name(ht, "ht");
__name2(ht, "ht");
function Gt() {
  Re = /* @__PURE__ */ Object.create(null);
}
__name(Gt, "Gt");
__name2(Gt, "Gt");
function Jt(e) {
  var d;
  const t = new Vt(), s = [];
  if (e.length === 0)
    return Kt;
  const n = e.map((f) => [!/\*|\/:/.test(f[0]), ...f]).sort(([f, h], [m, y]) => f ? 1 : m ? -1 : h.length - y.length), i = /* @__PURE__ */ Object.create(null);
  for (let f = 0, h = -1, m = n.length; f < m; f++) {
    const [y, _, b] = n[f];
    y ? i[_] = [b.map(([S]) => [S, /* @__PURE__ */ Object.create(null)]), ut] : h++;
    let w;
    try {
      w = t.insert(_, h, y);
    } catch (S) {
      throw S === ie ? new ct(_) : S;
    }
    y || (s[h] = b.map(([S, ee]) => {
      const de = /* @__PURE__ */ Object.create(null);
      for (ee -= 1; ee >= 0; ee--) {
        const [D, _e] = w[ee];
        de[D] = _e;
      }
      return [S, de];
    }));
  }
  const [a, r, c] = t.buildRegExp();
  for (let f = 0, h = s.length; f < h; f++)
    for (let m = 0, y = s[f].length; m < y; m++) {
      const _ = (d = s[f][m]) == null ? void 0 : d[1];
      if (!_)
        continue;
      const b = Object.keys(_);
      for (let w = 0, S = b.length; w < S; w++)
        _[b[w]] = c[_[b[w]]];
    }
  const o = [];
  for (const f in r)
    o[f] = s[r[f]];
  return [a, o, i];
}
__name(Jt, "Jt");
__name2(Jt, "Jt");
function te(e, t) {
  if (e) {
    for (const s of Object.keys(e).sort((n, i) => i.length - n.length))
      if (ht(s).test(t))
        return [...e[s]];
  }
}
__name(te, "te");
__name2(te, "te");
var U;
var q;
var Oe;
var pt;
var Je;
var Yt = (Je = /* @__PURE__ */ __name2(class {
  constructor() {
    g(this, Oe);
    p(this, "name", "RegExpRouter");
    g(this, U);
    g(this, q);
    p(this, "match", Ut);
    u(this, U, { [E]: /* @__PURE__ */ Object.create(null) }), u(this, q, { [E]: /* @__PURE__ */ Object.create(null) });
  }
  add(e, t, s) {
    var c;
    const n = l(this, U), i = l(this, q);
    if (!n || !i)
      throw new Error(lt);
    n[e] || [n, i].forEach((o) => {
      o[e] = /* @__PURE__ */ Object.create(null), Object.keys(o[E]).forEach((d) => {
        o[e][d] = [...o[E][d]];
      });
    }), t === "/*" && (t = "*");
    const a = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const o = ht(t);
      e === E ? Object.keys(n).forEach((d) => {
        var f;
        (f = n[d])[t] || (f[t] = te(n[d], t) || te(n[E], t) || []);
      }) : (c = n[e])[t] || (c[t] = te(n[e], t) || te(n[E], t) || []), Object.keys(n).forEach((d) => {
        (e === E || e === d) && Object.keys(n[d]).forEach((f) => {
          o.test(f) && n[d][f].push([s, a]);
        });
      }), Object.keys(i).forEach((d) => {
        (e === E || e === d) && Object.keys(i[d]).forEach((f) => o.test(f) && i[d][f].push([s, a]));
      });
      return;
    }
    const r = tt(t) || [t];
    for (let o = 0, d = r.length; o < d; o++) {
      const f = r[o];
      Object.keys(i).forEach((h) => {
        var m;
        (e === E || e === h) && ((m = i[h])[f] || (m[f] = [...te(n[h], f) || te(n[E], f) || []]), i[h][f].push([s, a - d + o + 1]));
      });
    }
  }
  buildAllMatchers() {
    const e = /* @__PURE__ */ Object.create(null);
    return Object.keys(l(this, q)).concat(Object.keys(l(this, U))).forEach((t) => {
      e[t] || (e[t] = v(this, Oe, pt).call(this, t));
    }), u(this, U, u(this, q, void 0)), Gt(), e;
  }
}, "Je"), U = /* @__PURE__ */ new WeakMap(), q = /* @__PURE__ */ new WeakMap(), Oe = /* @__PURE__ */ new WeakSet(), pt = /* @__PURE__ */ __name2(function(e) {
  const t = [];
  let s = e === E;
  return [l(this, U), l(this, q)].forEach((n) => {
    const i = n[e] ? Object.keys(n[e]).map((a) => [a, n[e][a]]) : [];
    i.length !== 0 ? (s || (s = true), t.push(...i)) : e !== E && t.push(...Object.keys(n[E]).map((a) => [a, n[E][a]]));
  }), s ? Jt(t) : null;
}, "pt"), Je);
var W;
var N;
var Ye;
var Xt = (Ye = /* @__PURE__ */ __name2(class {
  constructor(e) {
    p(this, "name", "SmartRouter");
    g(this, W, []);
    g(this, N, []);
    u(this, W, e.routers);
  }
  add(e, t, s) {
    if (!l(this, N))
      throw new Error(lt);
    l(this, N).push([e, t, s]);
  }
  match(e, t) {
    if (!l(this, N))
      throw new Error("Fatal error");
    const s = l(this, W), n = l(this, N), i = s.length;
    let a = 0, r;
    for (; a < i; a++) {
      const c = s[a];
      try {
        for (let o = 0, d = n.length; o < d; o++)
          c.add(...n[o]);
        r = c.match(e, t);
      } catch (o) {
        if (o instanceof ct)
          continue;
        throw o;
      }
      this.match = c.match.bind(c), u(this, W, [c]), u(this, N, void 0);
      break;
    }
    if (a === i)
      throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, r;
  }
  get activeRouter() {
    if (l(this, N) || l(this, W).length !== 1)
      throw new Error("No active router has been determined yet.");
    return l(this, W)[0];
  }
}, "Ye"), W = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakMap(), Ye);
var ue = /* @__PURE__ */ Object.create(null);
var V;
var j;
var Q;
var ce;
var R;
var H;
var G;
var Xe;
var mt = (Xe = /* @__PURE__ */ __name2(class {
  constructor(e, t, s) {
    g(this, H);
    g(this, V);
    g(this, j);
    g(this, Q);
    g(this, ce, 0);
    g(this, R, ue);
    if (u(this, j, s || /* @__PURE__ */ Object.create(null)), u(this, V, []), e && t) {
      const n = /* @__PURE__ */ Object.create(null);
      n[e] = { handler: t, possibleKeys: [], score: 0 }, u(this, V, [n]);
    }
    u(this, Q, []);
  }
  insert(e, t, s) {
    u(this, ce, ++He(this, ce)._);
    let n = this;
    const i = _t(t), a = [];
    for (let r = 0, c = i.length; r < c; r++) {
      const o = i[r], d = i[r + 1], f = Lt(o, d), h = Array.isArray(f) ? f[0] : o;
      if (h in l(n, j)) {
        n = l(n, j)[h], f && a.push(f[1]);
        continue;
      }
      l(n, j)[h] = new mt(), f && (l(n, Q).push(f), a.push(f[1])), n = l(n, j)[h];
    }
    return l(n, V).push({ [e]: { handler: s, possibleKeys: a.filter((r, c, o) => o.indexOf(r) === c), score: l(this, ce) } }), n;
  }
  search(e, t) {
    var c;
    const s = [];
    u(this, R, ue);
    let i = [this];
    const a = Ze(t), r = [];
    for (let o = 0, d = a.length; o < d; o++) {
      const f = a[o], h = o === d - 1, m = [];
      for (let y = 0, _ = i.length; y < _; y++) {
        const b = i[y], w = l(b, j)[f];
        w && (u(w, R, l(b, R)), h ? (l(w, j)["*"] && s.push(...v(this, H, G).call(this, l(w, j)["*"], e, l(b, R))), s.push(...v(this, H, G).call(this, w, e, l(b, R)))) : m.push(w));
        for (let S = 0, ee = l(b, Q).length; S < ee; S++) {
          const de = l(b, Q)[S], D = l(b, R) === ue ? {} : { ...l(b, R) };
          if (de === "*") {
            const B = l(b, j)["*"];
            B && (s.push(...v(this, H, G).call(this, B, e, l(b, R))), u(B, R, D), m.push(B));
            continue;
          }
          const [_e, Me, fe] = de;
          if (!f && !(fe instanceof RegExp))
            continue;
          const P = l(b, j)[_e], xt = a.slice(o).join("/");
          if (fe instanceof RegExp) {
            const B = fe.exec(xt);
            if (B) {
              if (D[Me] = B[0], s.push(...v(this, H, G).call(this, P, e, l(b, R), D)), Object.keys(l(P, j)).length) {
                u(P, R, D);
                const Ae = ((c = B[0].match(/\//)) == null ? void 0 : c.length) ?? 0;
                (r[Ae] || (r[Ae] = [])).push(P);
              }
              continue;
            }
          }
          (fe === true || fe.test(f)) && (D[Me] = f, h ? (s.push(...v(this, H, G).call(this, P, e, D, l(b, R))), l(P, j)["*"] && s.push(...v(this, H, G).call(this, l(P, j)["*"], e, D, l(b, R)))) : (u(P, R, D), m.push(P)));
        }
      }
      i = m.concat(r.shift() ?? []);
    }
    return s.length > 1 && s.sort((o, d) => o.score - d.score), [s.map(({ handler: o, params: d }) => [o, d])];
  }
}, "Xe"), V = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakMap(), H = /* @__PURE__ */ new WeakSet(), G = /* @__PURE__ */ __name2(function(e, t, s, n) {
  const i = [];
  for (let a = 0, r = l(e, V).length; a < r; a++) {
    const c = l(e, V)[a], o = c[t] || c[E], d = {};
    if (o !== void 0 && (o.params = /* @__PURE__ */ Object.create(null), i.push(o), s !== ue || n && n !== ue))
      for (let f = 0, h = o.possibleKeys.length; f < h; f++) {
        const m = o.possibleKeys[f], y = d[o.score];
        o.params[m] = n != null && n[m] && !y ? n[m] : s[m] ?? (n == null ? void 0 : n[m]), d[o.score] = true;
      }
  }
  return i;
}, "G"), Xe);
var Z;
var Qe;
var Qt = (Qe = /* @__PURE__ */ __name2(class {
  constructor() {
    p(this, "name", "TrieRouter");
    g(this, Z);
    u(this, Z, new mt());
  }
  add(e, t, s) {
    const n = tt(t);
    if (n) {
      for (let i = 0, a = n.length; i < a; i++)
        l(this, Z).insert(e, n[i], s);
      return;
    }
    l(this, Z).insert(e, t, s);
  }
  match(e, t) {
    return l(this, Z).search(e, t);
  }
}, "Qe"), Z = /* @__PURE__ */ new WeakMap(), Qe);
var gt = /* @__PURE__ */ __name2(class extends dt {
  constructor(e = {}) {
    super(e), this.router = e.router ?? new Xt({ routers: [new Yt(), new Qt()] });
  }
}, "gt");
var Zt = /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var ze = /* @__PURE__ */ __name2((e, t = ts) => {
  const s = /\.([a-zA-Z0-9]+?)$/, n = e.match(s);
  if (!n)
    return;
  let i = t[n[1]];
  return i && i.startsWith("text") && (i += "; charset=utf-8"), i;
}, "ze");
var es = { aac: "audio/aac", avi: "video/x-msvideo", avif: "image/avif", av1: "video/av1", bin: "application/octet-stream", bmp: "image/bmp", css: "text/css", csv: "text/csv", eot: "application/vnd.ms-fontobject", epub: "application/epub+zip", gif: "image/gif", gz: "application/gzip", htm: "text/html", html: "text/html", ico: "image/x-icon", ics: "text/calendar", jpeg: "image/jpeg", jpg: "image/jpeg", js: "text/javascript", json: "application/json", jsonld: "application/ld+json", map: "application/json", mid: "audio/x-midi", midi: "audio/x-midi", mjs: "text/javascript", mp3: "audio/mpeg", mp4: "video/mp4", mpeg: "video/mpeg", oga: "audio/ogg", ogv: "video/ogg", ogx: "application/ogg", opus: "audio/opus", otf: "font/otf", pdf: "application/pdf", png: "image/png", rtf: "application/rtf", svg: "image/svg+xml", tif: "image/tiff", tiff: "image/tiff", ts: "video/mp2t", ttf: "font/ttf", txt: "text/plain", wasm: "application/wasm", webm: "video/webm", weba: "audio/webm", webmanifest: "application/manifest+json", webp: "image/webp", woff: "font/woff", woff2: "font/woff2", xhtml: "application/xhtml+xml", xml: "application/xml", zip: "application/zip", "3gp": "video/3gpp", "3g2": "video/3gpp2", gltf: "model/gltf+json", glb: "model/gltf-binary" };
var ts = es;
var ss = /* @__PURE__ */ __name2((...e) => {
  let t = e.filter((i) => i !== "").join("/");
  t = t.replace(new RegExp("(?<=\\/)\\/+", "g"), "");
  const s = t.split("/"), n = [];
  for (const i of s)
    i === ".." && n.length > 0 && n.at(-1) !== ".." ? n.pop() : i !== "." && n.push(i);
  return n.join("/") || ".";
}, "ss");
var vt = { br: ".br", zstd: ".zst", gzip: ".gz" };
var ns = Object.keys(vt);
var is = "index.html";
var as = /* @__PURE__ */ __name2((e) => {
  const t = e.root ?? "./", s = e.path, n = e.join ?? ss;
  return async (i, a) => {
    var f, h, m, y;
    if (i.finalized)
      return a();
    let r;
    if (e.path)
      r = e.path;
    else
      try {
        if (r = decodeURIComponent(i.req.path), /(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(r))
          throw new Error();
      } catch {
        return await ((f = e.onNotFound) == null ? void 0 : f.call(e, i.req.path, i)), a();
      }
    let c = n(t, !s && e.rewriteRequestPath ? e.rewriteRequestPath(r) : r);
    e.isDir && await e.isDir(c) && (c = n(c, is));
    const o = e.getContent;
    let d = await o(c, i);
    if (d instanceof Response)
      return i.newResponse(d.body, d);
    if (d) {
      const _ = e.mimes && ze(c, e.mimes) || ze(c);
      if (i.header("Content-Type", _ || "application/octet-stream"), e.precompressed && (!_ || Zt.test(_))) {
        const b = new Set((h = i.req.header("Accept-Encoding")) == null ? void 0 : h.split(",").map((w) => w.trim()));
        for (const w of ns) {
          if (!b.has(w))
            continue;
          const S = await o(c + vt[w], i);
          if (S) {
            d = S, i.header("Content-Encoding", w), i.header("Vary", "Accept-Encoding", { append: true });
            break;
          }
        }
      }
      return await ((m = e.onFound) == null ? void 0 : m.call(e, c, i)), i.body(d);
    }
    await ((y = e.onNotFound) == null ? void 0 : y.call(e, c, i)), await a();
  };
}, "as");
var rs = /* @__PURE__ */ __name2(async (e, t) => {
  let s;
  t && t.manifest ? typeof t.manifest == "string" ? s = JSON.parse(t.manifest) : s = t.manifest : typeof __STATIC_CONTENT_MANIFEST == "string" ? s = JSON.parse(__STATIC_CONTENT_MANIFEST) : s = __STATIC_CONTENT_MANIFEST;
  let n;
  t && t.namespace ? n = t.namespace : n = __STATIC_CONTENT;
  const i = s[e] || e;
  if (!i)
    return null;
  const a = await n.get(i, { type: "stream" });
  return a || null;
}, "rs");
var os = /* @__PURE__ */ __name2((e) => async function(s, n) {
  return as({ ...e, getContent: async (a) => rs(a, { manifest: e.manifest, namespace: e.namespace ? e.namespace : s.env ? s.env.__STATIC_CONTENT : void 0 }) })(s, n);
}, "os");
var ls = /* @__PURE__ */ __name2((e) => os(e), "ls");
var cs = /* @__PURE__ */ __name2((e) => {
  const s = { ...{ origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [] }, ...e }, n = ((a) => typeof a == "string" ? a === "*" ? () => a : (r) => a === r ? r : null : typeof a == "function" ? a : (r) => a.includes(r) ? r : null)(s.origin), i = ((a) => typeof a == "function" ? a : Array.isArray(a) ? () => a : () => [])(s.allowMethods);
  return async function(r, c) {
    var f;
    function o(h, m) {
      r.res.headers.set(h, m);
    }
    __name(o, "o");
    __name2(o, "o");
    const d = await n(r.req.header("origin") || "", r);
    if (d && o("Access-Control-Allow-Origin", d), s.credentials && o("Access-Control-Allow-Credentials", "true"), (f = s.exposeHeaders) != null && f.length && o("Access-Control-Expose-Headers", s.exposeHeaders.join(",")), r.req.method === "OPTIONS") {
      s.origin !== "*" && o("Vary", "Origin"), s.maxAge != null && o("Access-Control-Max-Age", s.maxAge.toString());
      const h = await i(r.req.header("origin") || "", r);
      h.length && o("Access-Control-Allow-Methods", h.join(","));
      let m = s.allowHeaders;
      if (!(m != null && m.length)) {
        const y = r.req.header("Access-Control-Request-Headers");
        y && (m = y.split(/\s*,\s*/));
      }
      return m != null && m.length && (o("Access-Control-Allow-Headers", m.join(",")), r.res.headers.append("Vary", "Access-Control-Request-Headers")), r.res.headers.delete("Content-Length"), r.res.headers.delete("Content-Type"), new Response(null, { headers: r.res.headers, status: 204, statusText: "No Content" });
    }
    await c(), s.origin !== "*" && r.header("Vary", "Origin", { append: true });
  };
}, "cs");
var x = new gt();
x.use("/*", cs());
x.use("/static/*", ls({ root: "./public" }));
x.get("/api/locations", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT * FROM stations").all();
  return e.json(t);
});
x.get("/api/location/:id", async (e) => {
  const t = e.req.param("id"), s = await e.env.DB.prepare("SELECT * FROM stations WHERE id = ?").bind(t).first(), n = await e.env.DB.prepare("SELECT * FROM cells WHERE station_id = ?").bind(t).all(), i = await e.env.DB.prepare("SELECT * FROM tariffs WHERE station_id = ?").bind(t).all(), a = { S: n.results.filter((r) => r.size === "S" && r.status === "free").length, M: n.results.filter((r) => r.size === "M" && r.status === "free").length, L: n.results.filter((r) => r.size === "L" && r.status === "free").length };
  return e.json({ station: s, available: a, tariffs: i.results });
});
x.post("/api/check-promo", async (e) => {
  const { code: t } = await e.req.json(), s = await e.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").bind(t).first();
  return s ? e.json({ valid: true, discount: s.discount_percent, code: s.code }) : e.json({ valid: false, error: "\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
});
x.post("/api/book", async (e) => {
  const { stationId: t, size: s, promoCode: n, phone: i } = await e.req.json();
  if (i) {
    let o = await e.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(i).first();
    if (o || (await e.env.DB.prepare("INSERT INTO users (phone) VALUES (?)").bind(i).run(), o = await e.env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(i).first()), o.is_blocked)
      return e.json({ success: false, error: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D" }, 403);
  }
  let a = 0;
  if (n) {
    const o = await e.env.DB.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").bind(n).first();
    o && (a = o.discount_percent, await e.env.DB.prepare("UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?").bind(o.id).run());
  }
  const r = await e.env.DB.prepare("SELECT * FROM cells WHERE station_id = ? AND size = ? AND status = 'free' LIMIT 1").bind(t, s).first();
  if (!r)
    return e.json({ error: "\u041D\u0435\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u044F\u0447\u0435\u0435\u043A" }, 400);
  if (await e.env.DB.prepare("UPDATE cells SET status = 'booked' WHERE id = ?").bind(r.id).run(), i) {
    const o = Math.max(100 * (1 - a / 100), 0);
    await e.env.DB.prepare("UPDATE users SET ltv = ltv + ?, last_booking = CURRENT_TIMESTAMP WHERE phone = ?").bind(o, i).run();
  }
  const c = `Booking: ${s} | Phone: ${i} | Promo: ${n || "None"}`;
  return await e.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'booking', ?)").bind(t, c).run(), e.json({ success: true, cellNumber: r.cell_number, accessCode: Math.floor(1e5 + Math.random() * 9e5), validUntil: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString() });
});
x.get("/api/admin/dashboard", async (e) => {
  const t = { revenue: await e.env.DB.prepare("SELECT sum(ltv) as s FROM users").first("s") || 0, stations_online: await e.env.DB.prepare("SELECT count(*) as c FROM stations").first("c"), cells_occupied: await e.env.DB.prepare("SELECT count(*) as c FROM cells WHERE status != 'free'").first("c"), incidents: await e.env.DB.prepare("SELECT count(*) as c FROM station_health WHERE error_msg IS NOT NULL AND error_msg != ''").first("c") };
  return e.json(t);
});
x.get("/api/admin/monitoring", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT s.id, s.name, s.address, s.lat, s.lng, h.battery_level, h.wifi_signal, h.last_heartbeat, h.error_msg FROM stations s LEFT JOIN station_health h ON s.id = h.station_id").all();
  return e.json(t);
});
x.get("/api/admin/users", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT * FROM users ORDER BY last_booking DESC LIMIT 50").all();
  return e.json(t);
});
x.post("/api/admin/user/block", async (e) => {
  const { id: t, block: s } = await e.req.json();
  return await e.env.DB.prepare("UPDATE users SET is_blocked = ? WHERE id = ?").bind(s ? 1 : 0, t).run(), e.json({ success: true });
});
x.get("/api/admin/cells_live", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT c.id, c.cell_number, c.size, c.status, c.door_open, s.name as station_name FROM cells c JOIN stations s ON c.station_id = s.id ORDER BY s.name, c.cell_number").all();
  return e.json(t);
});
x.get("/api/admin/tariffs", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT t.*, s.name as station_name FROM tariffs t JOIN stations s ON t.station_id = s.id ORDER BY s.name").all();
  return e.json(t);
});
x.post("/api/admin/tariff/update", async (e) => {
  const { id: t, price: s } = await e.req.json();
  return await e.env.DB.prepare("UPDATE tariffs SET price_initial = ? WHERE id = ?").bind(s, t).run(), e.json({ success: true });
});
x.get("/api/admin/promos", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
  return e.json(t);
});
x.post("/api/admin/promo/create", async (e) => {
  const { code: t, discount: s } = await e.req.json();
  try {
    return await e.env.DB.prepare("INSERT INTO promo_codes (code, discount_percent) VALUES (?, ?)").bind(t, s).run(), e.json({ success: true });
  } catch {
    return e.json({ error: "Err" }, 400);
  }
});
x.post("/api/admin/promo/delete", async (e) => {
  const { id: t } = await e.req.json();
  return await e.env.DB.prepare("DELETE FROM promo_codes WHERE id = ?").bind(t).run(), e.json({ success: true });
});
x.post("/api/admin/command", async (e) => {
  const { cellId: t, cmd: s } = await e.req.json();
  return s === "open" && (await e.env.DB.prepare("UPDATE cells SET door_open = 1 WHERE id = ?").bind(t).run(), await e.env.DB.prepare("INSERT INTO logs (action, details) VALUES ('admin_cmd', ?)").bind(`Force OPEN cell ${t}`).run()), e.json({ success: true });
});
x.get("/api/admin/logs", async (e) => {
  const { results: t } = await e.env.DB.prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT 100").all();
  return e.json(t);
});
x.post("/api/hardware/heartbeat", async (e) => {
  const { stationId: t, battery: s, wifi: n, error: i } = await e.req.json();
  return await e.env.DB.prepare("INSERT INTO station_health (station_id, battery_level, wifi_signal, last_heartbeat, error_msg) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?) ON CONFLICT(station_id) DO UPDATE SET battery_level = excluded.battery_level, wifi_signal = excluded.wifi_signal, last_heartbeat = CURRENT_TIMESTAMP, error_msg = excluded.error_msg").bind(t, s, n, i).run(), i && await e.env.DB.prepare("INSERT INTO logs (station_id, action, details) VALUES (?, 'ALARM', ?)").bind(t, `Hardware Error: ${i}`).run(), e.json({ command: "sync_ok" });
});
x.get("*", (e) => e.html(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Lock&Go</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .brand-gradient { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scan-region { position: relative; overflow: hidden; }
        .scan-line { position: absolute; width: 100%; height: 2px; background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: scan 2s linear infinite; }
        @keyframes scan { 0% {top: 0;} 50% {top: 100%;} 100% {top: 0;} }
        .admin-nav-item.active { background-color: #4338ca !important; color: white !important; }
    </style>
</head>
<body class="bg-gray-50 h-screen flex flex-col overflow-hidden text-gray-900">
    <div id="app" class="flex-1 flex flex-col h-full relative"></div>
    
    <!-- HELP MODAL -->
    <div id="help-modal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black/60 backdrop-blur-sm px-4" onclick="toggleHelp(false)">
        <div class="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative" onclick="event.stopPropagation()">
            <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-900" onclick="toggleHelp(false)"><i class="fas fa-times text-xl"></i></button>
            <h2 class="text-2xl font-black text-indigo-700 mb-6">\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442?</h2>
            <div class="space-y-6">
                <div class="flex gap-4"><div class="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl shrink-0"><i class="fas fa-qrcode"></i></div><div><h3 class="font-bold">1. \u0421\u043A\u0430\u043D\u0438\u0440\u0443\u0439</h3><p class="text-sm text-gray-500">\u041D\u0430\u0432\u0435\u0434\u0438 \u043A\u0430\u043C\u0435\u0440\u0443 \u043D\u0430 QR-\u043A\u043E\u0434</p></div></div>
                <div class="flex gap-4"><div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-xl shrink-0"><i class="fas fa-ruler-combined"></i></div><div><h3 class="font-bold">2. \u0412\u044B\u0431\u0435\u0440\u0438</h3><p class="text-sm text-gray-500">\u0412\u044B\u0431\u0435\u0440\u0438 \u0440\u0430\u0437\u043C\u0435\u0440 (S, M, L)</p></div></div>
                <div class="flex gap-4"><div class="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 text-xl shrink-0"><i class="fab fa-apple"></i></div><div><h3 class="font-bold">3. \u041E\u043F\u043B\u0430\u0442\u0438</h3><p class="text-sm text-gray-500">\u041E\u043F\u043B\u0430\u0442\u0438 \u043A\u0430\u0440\u0442\u043E\u0439 \u0438\u043B\u0438 Pay</p></div></div>
            </div>
            <button onclick="toggleHelp(false)" class="w-full bg-gray-900 text-white font-bold py-3 rounded-xl mt-8">\u041F\u043E\u043D\u044F\u0442\u043D\u043E</button>
        </div>
    </div>

    <!-- AUTH MOCK MODAL -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onclick="closeAuth()">
        <div class="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-3xl p-6 shadow-2xl relative transform transition-transform duration-300 translate-y-full" id="auth-panel" onclick="event.stopPropagation()">
            <div class="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h2 class="text-xl font-bold text-center mb-2">\u0412\u0445\u043E\u0434 \u0432 Lock&Go</h2>
            <p class="text-center text-gray-400 text-sm mb-8">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0434\u043E\u0431\u043D\u044B\u0439 \u0441\u043F\u043E\u0441\u043E\u0431</p>

            <div class="space-y-3">
                <button onclick="loginWith('tinkoff')" class="w-full py-4 bg-yellow-300 hover:bg-yellow-400 rounded-xl font-bold text-gray-900 flex items-center justify-center gap-3 relative overflow-hidden group">
                    <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition duration-700"></div>
                    <span class="font-black">T-ID</span> <span class="font-medium">Tinkoff</span>
                </button>
                
                <button onclick="loginWith('mos')" class="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white flex items-center justify-center gap-3">
                    <i class="fas fa-landmark"></i> MOS.RU / \u0413\u043E\u0441\u0443\u0441\u043B\u0443\u0433\u0438
                </button>

                <button onclick="loginWith('max')" class="w-full py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-white flex items-center justify-center gap-3">
                    <i class="fab fa-whatsapp text-xl"></i> MAX / \u041C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B
                </button>
            </div>

            <div class="mt-6 text-center text-xs text-gray-400">
                \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044F, \u0432\u044B \u0441\u043E\u0433\u043B\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044C \u0441 <a href="#" class="underline">\u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C\u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u0430</a>
            </div>
        </div>
    </div>

    <script>
        const state = { view: 'home', data: {}, activePromo: null, userPhone: '' };

        // --- Components ---
        const HomeView = () => \`
            <div class="flex flex-col h-full">
                <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
                    <div class="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tighter"><i class="fas fa-cube"></i> Lock&Go</div>
                    <button onclick="navigate('admin_login')" class="text-gray-300 hover:text-indigo-600"><i class="fas fa-cog"></i></button>
                </div>
                <div class="p-4 space-y-4 overflow-y-auto flex-1 pb-20">
                    <div class="brand-gradient rounded-2xl p-6 text-white shadow-lg cursor-pointer active:scale-[0.98] transition" onclick="toggleHelp(true)">
                        <h2 class="font-bold text-2xl mb-1">\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0435 \u0440\u0443\u043A\u0438</h2>
                        <p class="opacity-90 text-sm mb-4">\u0418\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0432\u0430\u0448\u0435\u0439 \u0441\u0432\u043E\u0431\u043E\u0434\u044B</p>
                        <button class="bg-white text-indigo-700 px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase tracking-wide">\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442?</button>
                    </div>
                    <div id="stations-list" class="space-y-3"><div class="text-center py-8 text-gray-400"><i class="fas fa-circle-notch fa-spin"></i> \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
                </div>
                <div class="bg-white border-t px-6 py-3 flex justify-between items-center text-xs text-gray-400 sticky bottom-0">
                    <button class="flex flex-col items-center text-indigo-600 font-bold"><i class="fas fa-map-marker-alt text-lg mb-1"></i>\u041A\u0430\u0440\u0442\u0430</button>
                    <button onclick="startScanner()" class="flex flex-col items-center hover:text-gray-800"><i class="fas fa-qrcode text-lg mb-1"></i>\u0421\u043A\u0430\u043D\u0435\u0440</button>
                </div>
            </div>
        \`;

        const ScannerView = () => \`<div class="flex flex-col h-full bg-black text-white relative"><button onclick="navigate('home')" class="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"><i class="fas fa-times"></i></button><div class="flex-1 flex flex-col items-center justify-center relative"><div class="w-64 h-64 border-2 border-white/50 rounded-3xl relative scan-region"><div class="scan-line"></div></div><div class="mt-8 text-center"><p class="font-bold text-lg mb-1">\u041D\u0430\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u0430\u043C\u0435\u0440\u0443</p></div></div></div>\`;

        const BookingView = (station) => {
            // Auto-open auth if no phone
            if(!state.userPhone) setTimeout(openAuth, 500);

            return \`
            <div class="flex flex-col h-full bg-white">
                <div class="px-4 py-4 border-b flex items-center sticky top-0 bg-white z-10">
                    <button onclick="navigate('home')" class="mr-4 text-gray-600"><i class="fas fa-arrow-left"></i></button>
                    <h1 class="font-bold text-lg truncate">\${station.name}</h1>
                </div>
                <div class="flex-1 overflow-y-auto p-5">
                    <div class="mb-4 flex items-start gap-3 text-gray-600"><i class="fas fa-map-pin mt-1 text-indigo-500"></i><span class="text-sm">\${station.address}</span></div>
                    
                    <!-- USER INFO -->
                    <div class="bg-indigo-50 p-4 rounded-xl mb-6 flex justify-between items-center" onclick="openAuth()">
                         <div>
                            <div class="text-xs text-indigo-400 font-bold uppercase">\u0412\u044B \u0432\u043E\u0448\u043B\u0438 \u043A\u0430\u043A</div>
                            <div class="font-bold text-indigo-900">\${state.userPhone || '\u0413\u043E\u0441\u0442\u044C'}</div>
                         </div>
                         <i class="fas fa-pen text-indigo-300"></i>
                    </div>

                    <h3 class="font-bold mb-3">\u0420\u0430\u0437\u043C\u0435\u0440 \u044F\u0447\u0435\u0439\u043A\u0438</h3>
                    <div id="tariffs-list" class="space-y-3 mb-6">Loading...</div>
                    <h3 class="font-bold mb-3">\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434</h3>
                    <div class="flex gap-2 mb-6"><input type="text" id="promoInput" placeholder="CODE" class="flex-1 p-2 bg-white rounded border uppercase"><button onclick="checkPromo()" class="bg-gray-900 text-white px-4 rounded text-sm">OK</button></div>
                    <div id="promoStatus" class="text-xs font-bold hidden mb-4"></div>
                </div>
                <div class="p-4 border-t">
                    <div class="flex justify-between items-center mb-4"><span class="text-gray-500 text-sm">\u0418\u0442\u043E\u0433\u043E:</span><div class="text-right"><span class="text-xl font-black text-gray-900" id="total-price">--</span><div id="discount-label" class="text-xs text-green-600 font-bold hidden"></div></div></div>
                    <button onclick="processBooking(\${station.id})" class="w-full brand-gradient text-white font-bold py-4 rounded-xl shadow-lg flex justify-between px-6"><span>\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C</span><i class="fas fa-chevron-right mt-1"></i></button>
                </div>
            </div>
            \`;
        };

        // Success & Admin Views (Kept concise)
        const SuccessView = (data) => \`<div class="flex flex-col h-full brand-gradient text-white p-8 items-center justify-center text-center"><div class="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-4xl mb-8"><i class="fas fa-unlock-alt"></i></div><h1 class="text-3xl font-bold mb-2">\u041E\u0442\u043A\u0440\u044B\u0442\u043E!</h1><div class="bg-white text-gray-900 rounded-2xl p-6 w-full shadow-2xl mb-4"><div class="text-6xl font-black text-indigo-600">\${data.cellNumber}</div><div class="text-gray-400 text-xs uppercase font-bold">\u041A\u043E\u0434: \${data.accessCode}</div></div><button onclick="navigate('home')" class="mt-auto w-full py-4 text-white/70">\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E</button></div>\`;
        const AdminView = () => \`<div class="flex h-full bg-gray-100 font-sans"><div class="w-64 bg-gray-900 text-gray-400 hidden md:flex flex-col"><div class="p-6 text-white font-bold text-xl tracking-wider border-b border-gray-800">LOCK&GO <span class="text-xs text-indigo-500 block">ADMIN</span></div><nav class="flex-1 p-4 space-y-1"><a href="#" onclick="renderAdminTab('dash')" id="nav-dash" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-chart-pie"></i> \u0414\u0430\u0448\u0431\u043E\u0440\u0434</a><a href="#" onclick="renderAdminTab('map')" id="nav-map" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-map"></i> \u041A\u0430\u0440\u0442\u0430</a><a href="#" onclick="renderAdminTab('clients')" id="nav-clients" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-users"></i> CRM</a><a href="#" onclick="renderAdminTab('monitoring')" id="nav-monitoring" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-heartbeat"></i> \u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433</a><a href="#" onclick="renderAdminTab('cells')" id="nav-cells" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-th-large"></i> \u042F\u0447\u0435\u0439\u043A\u0438</a><a href="#" onclick="renderAdminTab('tariffs')" id="nav-tariffs" class="admin-nav-item flex items-center gap-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition"><i class="fas fa-tag"></i> \u0422\u0430\u0440\u0438\u0444\u044B</a></nav></div><div class="flex-1 flex flex-col overflow-hidden"><header class="bg-white shadow-sm py-4 px-6"><h2 class="font-bold text-gray-800 text-lg">\u0410\u0434\u043C\u0438\u043D-\u043F\u0430\u043D\u0435\u043B\u044C</h2></header><div class="flex-1 overflow-y-auto p-6" id="admin-content"></div></div></div>\`;

        // --- Logic ---
        async function navigate(view, params = null) {
            state.view = view; state.activePromo = null;
            const app = document.getElementById('app');
            if (view === 'home') { app.innerHTML = HomeView(); loadStations(); }
            else if (view === 'booking') { app.innerHTML = BookingView(params); loadTariffs(params.id); }
            else if (view === 'success') { app.innerHTML = SuccessView(params); }
            else if (view === 'scanner') { app.innerHTML = ScannerView(); }
            else if (view === 'admin_login') { if (prompt("\u041F\u0430\u0440\u043E\u043B\u044C:") === '12345') navigate('admin'); }
            else if (view === 'admin') { app.innerHTML = AdminView(); renderAdminTab('dash'); }
        }

        // Auth Logic
        function openAuth() {
            const modal = document.getElementById('auth-modal');
            const panel = document.getElementById('auth-panel');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => panel.classList.remove('translate-y-full'), 10);
        }
        function closeAuth() {
            const modal = document.getElementById('auth-modal');
            const panel = document.getElementById('auth-panel');
            panel.classList.add('translate-y-full');
            setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
        }
        function loginWith(provider) {
            const btn = event.currentTarget;
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            
            setTimeout(() => {
                state.userPhone = '+7 (999) 000-00-01'; // Mock ID
                closeAuth();
                navigate('booking', state.activeStationData.station); // Refresh booking view
            }, 1500);
        }

        // ... (Other logic same as before)
        function toggleHelp(show) { const m=document.getElementById('help-modal'); if(show){m.classList.remove('hidden');m.classList.add('flex');}else{m.classList.add('hidden');m.classList.remove('flex');} }
        function startScanner() { navigate('scanner'); setTimeout(async () => { const res = await fetch('/api/locations'); const st = await res.json(); if(st.length>0){navigator.vibrate?.(200); openBooking(st[0].id);} else {alert('Error'); navigate('home');} }, 2500); }
        async function loadStations() { const res = await fetch('/api/locations'); const data = await res.json(); document.getElementById('stations-list').innerHTML = data.map(s => \`<div onclick='openBooking(\${s.id})' class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition"><div class="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-2xl"><i class="fas fa-box"></i></div><div class="flex-1"><h3 class="font-bold text-gray-900">\${s.name}</h3><p class="text-xs text-gray-500">\${s.address}</p></div></div>\`).join(''); }
        async function openBooking(id) { const res = await fetch('/api/location/'+id); state.activeStationData = await res.json(); navigate('booking', state.activeStationData.station); }
        async function loadTariffs(stationId) { const { tariffs } = state.activeStationData; state.currentTariffs = tariffs; document.getElementById('tariffs-list').innerHTML = tariffs.map(t => \`<label class="block relative group"><input type="radio" name="tariff" value="\${t.size}" class="peer sr-only" onchange="updateTotal()"><div class="p-4 rounded-xl border-2 border-gray-100 peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition flex justify-between items-center"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700">\${t.size}</div><div class="text-sm font-bold text-gray-900">\${t.description}</div></div><div class="font-bold">\${t.price_initial} \u20BD</div></div></label>\`).join(''); }
        // checkPromo, updateTotal same as before
        async function checkPromo() { const code = document.getElementById('promoInput').value.toUpperCase(); const res = await fetch('/api/check-promo', { method: 'POST', body: JSON.stringify({code}) }); const data = await res.json(); const s = document.getElementById('promoStatus'); s.classList.remove('hidden','text-green-600','text-red-600'); if(data.valid) { state.activePromo = data; s.innerText = '\u2705 OK -'+data.discount+'%'; s.classList.add('text-green-600'); updateTotal(); } else { state.activePromo = null; s.innerText = '\u274C Error'; s.classList.add('text-red-600'); updateTotal(); } }
        function updateTotal() { const sizeInput = document.querySelector('input[name="tariff"]:checked'); if(!sizeInput) return; const tariff = state.currentTariffs.find(t => t.size === sizeInput.value); let price = state.activePromo ? Math.round(tariff.price_initial * (1 - state.activePromo.discount / 100)) : tariff.price_initial; document.getElementById('total-price').innerText = price + ' \u20BD'; const dl = document.getElementById('discount-label'); if(state.activePromo) { dl.innerText = '-'+state.activePromo.discount+'%'; dl.classList.remove('hidden'); } else dl.classList.add('hidden'); }
        async function processBooking(stationId) {
             if(!state.userPhone) { openAuth(); return; }
             const sizeInput = document.querySelector('input[name="tariff"]:checked'); if(!sizeInput) return alert('\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0430\u0437\u043C\u0435\u0440');
             const res = await fetch('/api/book', { method: 'POST', body: JSON.stringify({ stationId, size: sizeInput.value, promoCode: state.activePromo?.code, phone: state.userPhone }) });
             const result = await res.json(); if(result.success) navigate('success', result); else alert(result.error);
        }

        // Admin Logic restored
        async function renderAdminTab(tab) {
             const content = document.getElementById('admin-content');
             document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active')); document.getElementById('nav-'+tab)?.classList.add('active');
             if (tab === 'dash') { const res = await fetch('/api/admin/dashboard'); const s = await res.json(); content.innerHTML = \`<div class="grid grid-cols-4 gap-4"><div class="bg-white p-4 rounded shadow border-l-4 border-indigo-500"><div class="text-xs text-gray-400">LTV</div><div class="text-2xl font-bold">\${s.revenue} \u20BD</div></div></div>\`; }
             else if (tab === 'map') { content.innerHTML = \`<div class="h-[600px] w-full bg-gray-200 rounded-xl overflow-hidden shadow-lg" id="map-container"></div>\`; const res = await fetch('/api/admin/monitoring'); const data = await res.json(); setTimeout(() => { const map = L.map('map-container').setView([59.9343, 30.3351], 11); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); data.forEach(s => { if(s.lat && s.lng) { const color = (s.error_msg || !s.last_heartbeat) ? 'red' : 'green'; const icon = L.divIcon({ className: 'custom-div-icon', html: \`<div style='background-color:\${color}; width:15px; height:15px; border-radius:50%; border:2px solid white;'></div>\`, iconSize: [15, 15] }); L.marker([s.lat, s.lng], {icon: icon}).addTo(map).bindPopup(\`<b>\${s.name}</b><br>\${s.address}\`); } }); }, 100); }
             else if (tab === 'cells') { const res = await fetch('/api/admin/cells_live'); const cells = await res.json(); content.innerHTML = \`<div class="bg-white rounded shadow overflow-hidden"><table class="w-full text-sm text-left"><thead class="bg-gray-50 font-bold"><tr><th class="p-3">\u0421\u0442\u0430\u043D\u0446\u0438\u044F</th><th class="p-3">\u042F\u0447\u0435\u0439\u043A\u0430</th><th class="p-3">\u0421\u0442\u0430\u0442\u0443\u0441</th><th class="p-3">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435</th></tr></thead><tbody>\${cells.map(c => \`<tr><td class="p-3">\${c.station_name}</td><td class="p-3">\${c.cell_number}</td><td class="p-3">\${c.status}</td><td class="p-3"><button onclick="adminCmd(\${c.id},'open')" class="text-blue-600">\u041E\u0442\u043A\u0440\u044B\u0442\u044C</button></td></tr>\`).join('')}</tbody></table></div>\`; }
             else if (tab === 'tariffs') { const res = await fetch('/api/admin/tariffs'); const tariffs = await res.json(); content.innerHTML = \`<div class="bg-white rounded shadow overflow-hidden"><table class="w-full text-sm text-left"><thead class="bg-gray-50 font-bold"><tr><th class="p-3">\u0421\u0442\u0430\u043D\u0446\u0438\u044F</th><th class="p-3">\u0420\u0430\u0437\u043C\u0435\u0440</th><th class="p-3">\u0426\u0435\u043D\u0430</th></tr></thead><tbody>\${tariffs.map(t => \`<tr><td class="p-3">\${t.station_name}</td><td class="p-3">\${t.size}</td><td class="p-3"><input type="number" value="\${t.price_initial}" onchange="updateTariff(\${t.id}, this.value)" class="w-20 border rounded p-1"></td></tr>\`).join('')}</tbody></table></div>\`; }
        }
        // ... Tools
        async function updateTariff(id, price) { await fetch('/api/admin/tariff/update', { method: 'POST', body: JSON.stringify({ id, price: parseInt(price) }) }); }
        async function adminCmd(cellId, cmd) { if(confirm('\u041E\u0442\u043A\u0440\u044B\u0442\u044C?')) { await fetch('/api/admin/command', {method:'POST', body:JSON.stringify({cellId, cmd})}); renderAdminTab('cells'); } }

        navigate('home');
    <\/script>
</body>
</html>
  `));
var Ue = new gt();
var ds = Object.assign({ "/src/index.tsx": x });
var bt = false;
for (const [, e] of Object.entries(ds))
  e && (Ue.route("/", e), Ue.notFound(e.notFoundHandler), bt = true);
if (!bt)
  throw new Error("Can't import modules from ['/src/index.tsx','/app/server.ts']");
var drainBody = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } catch (e) {
    const error32 = reduceError(e);
    return Response.json(error32, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = Ue;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env22, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env22, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env22, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env22, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env22, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env22, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env22, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env22, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env22, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env22, ctx) => {
      this.env = env22;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/pages-dev-util.ts
function isRoutingRuleMatch(pathname, routingRule) {
  if (!pathname) {
    throw new Error("Pathname is undefined.");
  }
  if (!routingRule) {
    throw new Error("Routing rule is undefined.");
  }
  const ruleRegExp = transformRoutingRuleToRegExp(routingRule);
  return pathname.match(ruleRegExp) !== null;
}
__name(isRoutingRuleMatch, "isRoutingRuleMatch");
function transformRoutingRuleToRegExp(rule) {
  let transformedRule;
  if (rule === "/" || rule === "/*") {
    transformedRule = rule;
  } else if (rule.endsWith("/*")) {
    transformedRule = `${rule.substring(0, rule.length - 2)}(/*)?`;
  } else if (rule.endsWith("/")) {
    transformedRule = `${rule.substring(0, rule.length - 1)}(/)?`;
  } else if (rule.endsWith("*")) {
    transformedRule = rule;
  } else {
    transformedRule = `${rule}(/)?`;
  }
  transformedRule = `^${transformedRule.replaceAll(/\./g, "\\.").replaceAll(/\*/g, ".*")}$`;
  return new RegExp(transformedRule);
}
__name(transformRoutingRuleToRegExp, "transformRoutingRuleToRegExp");

// .wrangler/tmp/pages-pSnAck/c75hjpjt5cg.js
var define_ROUTES_default = { version: 1, include: ["/*"], exclude: ["/static/*"] };
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env3, context3) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env3.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = middleware_loader_entry_default;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env3, context3);
      }
    }
    return env3.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error4 = reduceError2(e);
    return Response.json(error4, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-gT84zL/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = pages_dev_pipeline_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env3, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-gT84zL/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=c75hjpjt5cg.js.map
