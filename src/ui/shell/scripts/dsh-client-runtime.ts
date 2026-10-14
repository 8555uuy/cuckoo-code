/**
 * DSH client 运行时（feat/022-dsh-compat-c7）
 *
 * 让 DSH 的 ./client 入口（window.__ModuleLoader__.load({ id, factory })）在 Cuckoo 壳页面执行：
 * - window.__ModuleLoader__ + require(react/@deepseek-ai/*)
 * - ctx.slots（inject/register）→ 本地插槽表，各 React 页面消费
 * - ctx.plugin(definition) → 真执行子插件（DSH 聚合插件靠它挂 N 个子插件）
 * - ctx.get(服务名) → 最小服务（sessions/workspaces/locale/layout/remote/connection/...）
 */
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';

export interface SlotItem {
  key: string;
  pluginId: string;
  slot: string;
  id: string;
  order: number;
  spec: any;
  Component: any;
  /** i18n 翻译函数（来自 spec.locale） */
  t?: (k: string) => string;
  /** DSH 依赖注入面：spec.inject（函数 → 返回值；数组 → 从服务表取）*/
  injectedProps?: any;
}

const slotTable = new Map<string, SlotItem[]>();
const listeners = new Set<() => void>();

function notify(): void { for (const cb of listeners) { try { cb(); } catch (_) {} } }

/** 订阅插槽变化（React 页面用） */
export function subscribeSlots(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** 取某插槽下的所有项（按 order 排序） */
export function getSlotItems(slotName: string): SlotItem[] {
  return (slotTable.get(slotName) || []).slice().sort((a, b) => (a.order || 100) - (b.order || 100));
}

/** 万能 stub（任意属性/调用不抛错） */
function makeStub(name: string): any {
  const fn: any = function () { return p; };
  const p: any = new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === '__esModule') return false;
      if (prop === 'default') return p;
      if (prop === 'toString') return () => '[dsh-client-stub ' + name + ']';
      return makeStub(name + '.' + String(prop));
    },
    apply() { return p; },
    construct() { return p; },
  });
  return p;
}

/** 占位图标组件（SVG 小方块），供 DSH primitives 的 IconXxx 兜底 */
function makePlaceholderIcon(): any {
  return function PlaceholderIcon(props: any) {
    const size = (props && props.size) || 16;
    return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      React.createElement('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }));
  };
}

/** DSH primitives 包 shim：IconXxx → 占位图标组件；其他 → 空组件（不崩）
 *
 * 关键：DSH 插件用 `__toESM(require(...))` 包装——它靠 `Object.getOwnPropertyNames`
 * 遍历属性来复制。纯 Proxy 没 `ownKeys` trap → 遍历为空 → 复制后什么都有没有
 * → dsh-market 的 `missingPrimitives` 检查不过 → 它直接 return（什么都不注册）。
 * 所以这里【预填】必需组件名，并补 ownKeys/getOwnPropertyDescriptor/has trap。
 */
function makePrimitivesShim(): any {
  const cache: Record<string, any> = {};
  const shimObj: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === '__esModule') return true;
      if (prop === Symbol.toStringTag) return 'Module';
      if (prop === 'default') return shimObj;
      const name = String(prop);
      if (name in cache) return cache[name];
      const val = name.startsWith('Icon') ? makePlaceholderIcon() : (function Empty() { return null; });
      cache[name] = val;
      return val;
    },
    /** 让 __toESM 的 Object.getOwnPropertyNames 能"看到"预填的组件 */
    ownKeys() { return Object.keys(cache); },
    getOwnPropertyDescriptor(_t, prop) {
      const name = String(prop);
      if (name in cache) return { enumerable: true, configurable: true, value: cache[name] };
      return undefined;
    },
    has(_t, prop) {
      const name = String(prop);
      if (name in cache) return true;
      return typeof prop === 'string' && !name.startsWith('__');
    },
  });
  // 预填 DSH 插件【必需】的 primitives（dsh-market 检查这 4 个）
  const REQUIRED = ['Menu', 'DisclosureRow', 'Tooltip', 'Toast'];
  for (const n of REQUIRED) cache[n] = function Empty() { return null; };
  return shimObj;
}

/** 最小 store 引擎（DSH @deepseek-ai/dsh-client-store 的简化实现） */
function makeStoreEngine(): any {
  /** defineStore(spec) → { create() }。spec: { init(), actions: { name(draft, ...args) } } */
  function defineStore(spec: any): any {
    const s = spec || {};
    return {
      create() {
        let state = typeof s.init === 'function' ? s.init() : {};
        const subs = new Set<() => void>();
        const notify = () => { for (const fn of [...subs]) { try { fn(); } catch (_) {} } };
        const actions: Record<string, any> = {};
        const src = s.actions || {};
        for (const key of Object.keys(src)) {
          actions[key] = (...args: any[]) => {
            try { src[key](state, ...args); } catch (e) { console.error('[store] action 失败 ' + key, e); }
            notify();
          };
        }
        return {
          getSnapshot: () => state,
          subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },
          actions,
        };
      },
    };
  }
  /** 快照 store（简化：同 defineStore） */
  function createSnapshotStore(init?: any): any {
    return defineStore({ init: typeof init === 'function' ? init : () => (init || {}), actions: {} });
  }
  function shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) { if (a[k] !== b[k]) return false; }
    return true;
  }
  return { defineStore, createSnapshotStore, shallowEqual };
}

/** 可被插件 require 的模块表 */
const moduleTable: Record<string, any> = {
  'react': React,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
  'react/jsx-runtime': jsxRuntime,
  'react/jsx-dev-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-ui-primitives': makePrimitivesShim(),
  '@deepseek-ai/dsh-client-store': makeStoreEngine(),
  '@deepseek-ai/dsh-client-runtime/client': makeStoreEngine(),
  '@deepseek-ai/dsh-client-runtime': makeStoreEngine(),
};

const loadedModules: Record<string, any> = {};

// ===== 最小客户端服务（供 ctx.get / inject 使用）=====

/** 可订阅的快照容器（DSH 的 Observable 简化版） */
function makeObservable(initial: any): any {
  let value = initial;
  const subs = new Set<(v: any) => void>();
  return {
    getSnapshot: () => value,
    subscribe(fn: (v: any) => void) { subs.add(fn); return () => { subs.delete(fn); }; },
    set(v: any) { value = v; for (const fn of [...subs]) { try { fn(v); } catch (_) {} } },
  };
}

/** i18n：register(ns,{zh,en}) / bind(ns) → t 函数 / t(key) */
function makeLocale(): any {
  const dicts: Record<string, any> = {};
  let lang = 'zh';
  try { lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'; } catch (_) {}
  const lookup = (ns: string, key: string): string => {
    const d = dicts[ns];
    if (!d) return key;
    const pack = d[lang] || d.zh || d.en || {};
    return (pack && pack[key]) || key;
  };
  const t = (key: string): string => {
    // 无 ns 时全局找
    for (const ns of Object.keys(dicts)) { const v = lookup(ns, key); if (v !== key) return v; }
    return key;
  };
  const localeSubs = new Set<(l: string) => void>();
  const api: any = {
    register(ns: string, dict: any) { dicts[ns] = dict; return () => { delete dicts[ns]; }; },
    bind(ns: string) { return (key: string) => lookup(ns, key); },
    t,
    // 订阅语言变化（组件常用：locale.subscribe(() => ...)）
    subscribe(cb: any) { if (typeof cb === 'function') localeSubs.add(cb); return () => { localeSubs.delete(cb); }; },
    getSnapshot() { return { current: lang }; },
    setLocale(next: string) { lang = next; for (const fn of [...localeSubs]) { try { fn(next); } catch (_) {} } },
    get current() { return lang; },
  };
  return api;
}

/** 会话服务（最小） */
function makeSessions(): any {
  const list = makeObservable({ byId: {}, order: [] as string[] });
  return {
    list,
    get(id: string) { return list.getSnapshot().byId[id]; },
    current() { return null; },
  };
}

/** 工作区服务（最小） */
function makeWorkspaces(): any {
  const list = makeObservable({ items: [] as any[] });
  return {
    list,
    async create(spec: any) { return { workspaceId: (spec && spec.path) || 'ws-' + Date.now() }; },
  };
}

/** 布局服务（最小） */
function makeLayout(): any {
  const activePanelId = makeObservable(null);
  return {
    selectPanel(id: string | null) { activePanelId.set(id); },
    panelInfo: { getSnapshot: () => ({ activePanelId: activePanelId.getSnapshot() }), subscribe: activePanelId.subscribe },
  };
}

/** 连接服务（最小，api 用 stub 兜底） */
function makeConnection(): any {
  return { api: makeStub('connection.api'), agentPresets: undefined };
}

/** 远端服务（最小） */
function makeRemote(): any {
  const noop = () => () => {};
  return {
    $on: (_evt: string, _cb: any) => noop(),
    settings: { get: async () => undefined, set: async () => true },
    goals: { get: async () => null, edit: async () => ({ ok: false }), pause: async () => ({ ok: false }), resume: async () => ({ ok: false }), clear: async () => ({ ok: false }) },
    session: { modelCatalog: async () => ({ result: { value: { groups: [] } } }) },
    agentPresets: { list: async () => ({ result: { value: { presets: [] } } }) },
  };
}

/** 会话打开（uiWorkspace） */
function makeUiWorkspace(): any {
  return { openSession(_id: string) { /* noop */ }, openWorkspace(_id: string) { /* noop */ } };
}

/** 响应式表单（configForms.get 返回）：带 subscribe/getSnapshot/describe/... */
function makeReactiveForm(ns: string): any {
  const state = makeObservable({ status: 'ready', value: {} });
  const descState = makeObservable({ view: { namespaces: [{ ns }] } });
  return {
    /** 订阅表单值变化 */
    subscribe(fn: (v: any) => void) { return state.subscribe(fn); },
    /** 取快照 */
    getSnapshot() { return state.getSnapshot(); },
    /** 描述（命名空间视图） */
    describe() { return { getSnapshot: () => descState.getSnapshot(), subscribe: descState.subscribe }; },
    /** 读值 */
    get() { return state.getSnapshot().value; },
    /** 写值（本地） */
    set(v: any) { state.set({ status: 'ready', value: { ...(state.getSnapshot().value || {}), ...(v || {}) } }); },
    /** 保存（本地） */
    save: async () => ({ ok: true }),
    reset: async () => ({ ok: true }),
    /** 提交（兼容别名） */
    submit: async () => ({ ok: true }),
  };
}

/** 配置表单（configForms / forms） */
function makeConfigForms(): any {
  const forms: Record<string, any> = {};
  const desc = makeObservable({ view: { namespaces: [] as any[] } });
  const getForm = (ns: string) => (forms[ns] || (forms[ns] = makeReactiveForm(ns)));
  return {
    /** 取某命名空间的表单 */
    get(ns: string) { return getForm(ns || 'default'); },
    /** 描述（所有命名空间） */
    describe() { return { getSnapshot: () => desc.getSnapshot(), subscribe: desc.subscribe }; },
    /** 绑定（返回表单） */
    bind(ns: string) { return getForm(ns || 'default'); },
    open: () => {},
    getSnapshot: () => desc.getSnapshot(),
    subscribe: desc.subscribe,
  };
}

/** 主题服务（对齐 DSH ctx.theme）：getTheme/list/setTheme/subscribe */
function makeTheme(emit: (evt: string, ...a: any[]) => void): any {
  const themes = [
    { id: 'light', colorScheme: 'light', tokens: {} },
    { id: 'dark', colorScheme: 'dark', tokens: {} },
    { id: 'system', colorScheme: 'light', tokens: {} },
  ];
  let snapshot: any = { preference: 'system', active: { id: 'light', colorScheme: 'light', tokens: {} }, themes, revision: 0 };
  // 从主进程拉真主题
  try {
    const api = (window as any).shellAPI;
    if (api && typeof api.themeGet === 'function') {
      api.themeGet().then((r: any) => {
        if (r && r.success && r.snapshot) {
          snapshot = r.snapshot;
          emit('theme/change', snapshot);
        }
      }).catch(() => {});
    }
  } catch (_) {}
  const subs = new Set<(s: any) => void>();
  return {
    getTheme: () => snapshot,
    getSnapshot: () => snapshot,
    list: () => snapshot.themes || themes,
    subscribe(cb: (s: any) => void) { if (typeof cb === 'function') subs.add(cb); return () => { subs.delete(cb); }; },
    setTheme(id: string) {
      try {
        const api = (window as any).shellAPI;
        if (api && typeof api.themeSet === 'function') {
          api.themeSet(id).then((r: any) => {
            if (r && r.success && r.snapshot) { snapshot = r.snapshot; for (const f of [...subs]) { try { f(snapshot); } catch (_) {} } emit('theme/change', snapshot); }
          }).catch(() => {});
        }
      } catch (_) {}
    },
    register() { return () => {}; },
  };
}

/** 服务表（按名取） */
function makeServices(): Record<string, any> {
  const locale = makeLocale();
  // 事件总线（真实现，供 ctx.on/emit 用）
  const evBus = new Map<string, Set<Function>>();
  const emit = (evt: string, ...args: any[]) => {
    const set = evBus.get(evt);
    if (set) for (const fn of [...set]) { try { fn(...args); } catch (e) { console.error('[dsh-client] 事件回调失败 ' + evt, e); } }
  };
  const theme = makeTheme(emit);
  return {
    slots: null, // 每插件独立，稍后填
    sessions: makeSessions(),
    workspaces: makeWorkspaces(),
    layout: makeLayout(),
    connection: makeConnection(),
    remote: makeRemote(),
    'remote.session': makeRemote().session,
    uiWorkspace: makeUiWorkspace(),
    locale,
    theme,
    configForms: makeConfigForms(),
    forms: makeConfigForms(),
    tools: makeStub('tools'),
    store: makeStub('store'),
    __evBus: evBus,
    __emit: emit,
  };
}

/** 构造给插件 client 的 ctx（增强版） */
function makeCtx(pluginId: string, services: Record<string, any>): any {
  const effects: Array<() => void> = [];
  const slots = {
    inject(_name: string, cb: () => any) {
      try { const d = cb(); return typeof d === 'function' ? d : () => {}; } catch (_) { return () => {}; }
    },
    register(spec: any, Component: any) {
      const s = spec || {};
      const slotName = s.name || s.slot;
      const id = s.id || slotName;
      if (!slotName) return () => {};
      const key = pluginId + ':' + slotName + ':' + id;
      // i18n：从 spec.locale 生成 t 函数（DSH 组件常用 ({ t }) => ...）
      // 注意：返回的 t 必须是函数，任何 key 都安全返回（查不到回退 key）
      let t: any = (k: string) => String(k);
      try {
        const ns = s.locale;
        if (ns && services.locale && typeof services.locale.bind === 'function') {
          const bound = services.locale.bind(ns);
          if (typeof bound === 'function') t = (k: string) => { try { const v = bound(k); return (v === undefined || v === null) ? String(k) : String(v); } catch (_) { return String(k); } };
        }
      } catch (_) {}
      // DSH 依赖注入面：spec.inject
      //   函数 → 调它拿 props（如 dsh-usage 的 face() → { store, poll, settings }）
      //   数组 → 从服务表按名取
      let injectedProps: any = undefined;
      try {
        const inj = s.inject;
        if (typeof inj === 'function') {
          injectedProps = inj() || {};
        } else if (Array.isArray(inj)) {
          injectedProps = {};
          for (const nm of inj) {
            if (typeof nm === 'string' && services[nm]) injectedProps[nm] = services[nm];
          }
        }
      } catch (e) { console.error('[dsh-client] spec.inject 解析失败 ' + id, e); }

      const list = (slotTable.get(slotName) || []).filter((x) => x.key !== key);
      list.push({ key, pluginId, slot: slotName, id, order: typeof s.order === 'number' ? s.order : 100, spec: s, Component, t, injectedProps });
      slotTable.set(slotName, list);
      notify();
      try {
        const api = (window as any).shellAPI;
        if (api && typeof api.slotRegister === 'function') {
          api.slotRegister({ pluginId, slot: slotName, id, order: s.order, spec: { label: typeof s.label === 'function' ? undefined : s.label, title: s.title } }).catch(() => {});
        }
      } catch (_) {}
      return () => {
        const l = (slotTable.get(slotName) || []).filter((x) => x.key !== key);
        slotTable.set(slotName, l);
        notify();
      };
    },
    unregister() {},
  };
  services.slots = slots;

  const ctx: any = {
    pluginId,
    slots,
    ...services,
    effect(fn: any) {
      try { const c = fn(); const d = typeof c === 'function' ? c : () => {}; effects.push(d); return d; }
      catch (e) { console.error('[dsh-client] effect 失败 ' + pluginId, e); return () => {}; }
    },
    on(evt: string, fn: any) {
      const bus = services.__evBus as Map<string, Set<Function>>;
      if (!bus || typeof fn !== 'function') return () => {};
      if (!bus.has(evt)) bus.set(evt, new Set());
      bus.get(evt)!.add(fn);
      return () => { const s = bus.get(evt); if (s) s.delete(fn); };
    },
    once(evt: string, fn: any) {
      const off = (ctx as any).on(evt, (...args: any[]) => { off(); fn(...args); });
      return off;
    },
    off(evt: string, fn: any) { const s = (services.__evBus as any)?.get(evt); if (s) s.delete(fn); },
    emit(evt: string, ...args: any[]) { const f = services.__emit; if (typeof f === 'function') f(evt, ...args); },
    // cordis：依赖就绪后回调（简化：立即执行）
    inject(_names: any, cb: any) {
      if (typeof cb !== 'function') return () => {};
      try { const ret = cb(ctx); if (typeof ret === 'function') return ret; } catch (e) { console.error('[dsh-client] inject 回调失败 ' + pluginId, e); }
      return () => {};
    },
    // 真挂子插件（DSH 聚合插件靠它）：执行 definition.apply(子 ctx)
    plugin(definition: any) {
      const def = typeof definition === 'function' ? { apply: definition, name: pluginId + ':child' } : (definition || {});
      const childName = def.name || pluginId + ':child';
      const childCtx = makeCtx(childName, services);
      // 注入：把 def.inject 里的服务挂到 childCtx（已在 services 里，直接可见）
      try {
        if (typeof def.apply === 'function') {
          const ret = def.apply(childCtx);
          if (ret && typeof ret.then === 'function') return ret.then(() => ({ dispose() {} }));
        }
      } catch (e) { console.error('[dsh-client] 子插件 apply 失败 ' + childName, e); }
      return { dispose() {} };
    },
    get(key: string) { return services[key]; },
    provide(key: string, val: any) { services[key] = val; return () => { delete services[key]; }; },
    logger: { warn: (...a: any[]) => console.warn('[dsh-client:' + pluginId + ']', ...a), info: (...a: any[]) => console.info('[dsh-client:' + pluginId + ']', ...a), error: (...a: any[]) => console.error('[dsh-client:' + pluginId + ']', ...a) },
    log: (...a: any[]) => console.log('[dsh-client:' + pluginId + ']', ...a),
  };
  return ctx;
}

/** 执行一个插件的 client 模块（apply） */
function applyClient(pluginId: string, mod: any): void {
  const client = mod && (mod.default || mod);
  if (client && typeof client.apply === 'function') {
    try { client.apply(makeCtx(pluginId, makeServices())); }
    catch (e) { console.error('[dsh-client] apply 失败 ' + pluginId, e); }
  }
}

/** 拦截 fetch：把 /api/* 请求重写到插件本地 HTTP 服务 */
let httpBaseCache: string | null = null;
function installFetchInterceptor(): void {
  const w = window as any;
  if (w.__ckFetchPatched) return;
  w.__ckFetchPatched = true;
  const origFetch = w.fetch.bind(w);
  const isPluginApi = (u: string) => /(^|\/)api\/[\w.-]+\//.test(u) || /^file:.*\/api\//.test(u);
  w.fetch = async (input: any, init?: any) => {
    try {
      let url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
      if (isPluginApi(url)) {
        if (httpBaseCache === null) {
          try {
            const api = (window as any).shellAPI;
            const r = api && typeof api.webServerInfo === 'function' ? await api.webServerInfo() : null;
            httpBaseCache = (r && r.success && r.base) ? r.base : '';
          } catch (_) { httpBaseCache = ''; }
        }
        if (httpBaseCache) {
          const m = url.match(/\/api\/(.*)$/);
          if (m) {
            const rewritten = httpBaseCache + '/api/' + m[1];
            input = rewritten;
          }
        }
      }
    } catch (e) { console.error('[dsh-client] fetch 重写失败', e); }
    return origFetch(input, init);
  };
}

/** 全局 __ModuleLoader__（DSH client 入口会调它） */
function installModuleLoader(): void {
  const w = window as any;
  if (w.__ModuleLoader__) return;
  w.__ModuleLoader__ = {
    load(spec: any) {
      const { id, factory } = spec || {};
      if (!id || typeof factory !== 'function') return;
      const req = (name: string) => {
        if (moduleTable[name]) return moduleTable[name];
        if (loadedModules[name]) return loadedModules[name];
        // primitives 包（Icon 组件）用"组件安全 shim"
        if (name.includes('ui-primitives')) return makePrimitivesShim();
        // 其他 @deepseek-ai/*（服务/store 等）：万能 stub（可链式调用，不返回 null）
        return makeStub(name);
      };
      try {
        const exports = factory(req) || {};
        loadedModules[id] = exports;
        applyClient(id, exports);
      } catch (e) { console.error('[dsh-client] factory 执行失败 ' + id, e); }
    },
  };
}

/** 加载所有已启用插件的 client 源码并执行（幂等） */
export async function loadDshClients(): Promise<void> {
  installFetchInterceptor();
  installModuleLoader();
  const api = (window as any).shellAPI;
  if (!api || typeof api.cuckooPluginClientSources !== 'function') return;
  try {
    const r = await api.cuckooPluginClientSources();
    if (!r || !r.success || !Array.isArray(r.clients)) return;
    for (const c of r.clients) {
      const src = String(c.source || '');
      if (!src.includes('__ModuleLoader__')) continue;
      try {
        // eslint-disable-next-line no-new-func
        new Function(src)();
      } catch (e) {
        console.error('[dsh-client] 执行源码失败 ' + (c && c.pluginId), e);
      }
    }
  } catch (_) { /* ignore */ }
}
