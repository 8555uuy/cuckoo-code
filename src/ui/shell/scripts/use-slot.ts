/**
 * 订阅 DSH 插槽（本地 client 注册 + 主进程 host 注册）的 React Hook。
 */
import { useState, useEffect } from 'react';
import { api } from './shared.js';
import { subscribeSlots, getSlotItems } from './dsh-client-runtime.js';

export interface SlotEntry {
  kind: 'client' | 'host';
  key: string;
  id: string;
  pluginId: string;
  spec: any;
  Component?: any;
  t?: (k: string) => string;
  order?: number;
}

/** 订阅某个插槽下的所有项（client 组件 + host 文字） */
export function useSlot(slotName: string): SlotEntry[] {
  const [items, setItems] = useState<SlotEntry[]>([]);
  useEffect(() => {
    const anyApi = api as any;
    const keyOf = (m: any) => m.pluginId + ':' + m.slot + ':' + m.id;
    const isMine = (m: any) => !!(m && m.slot === slotName);

    const localItems = (): SlotEntry[] => getSlotItems(slotName).map((s: any) => ({
      kind: 'client' as const, key: 'c:' + s.key, id: s.id, pluginId: s.pluginId,
      spec: s.spec, Component: s.Component, t: s.t,
    }));

    const refreshLocal = () => {
      setItems((prev) => [...localItems(), ...prev.filter((x) => x.kind === 'host')]);
    };
    refreshLocal();
    const unsub = subscribeSlots(refreshLocal);

    if (anyApi.listPluginSlots) {
      anyApi.listPluginSlots().then((r: any) => {
        if (!r || !r.success || !Array.isArray(r.slots)) return;
        const host = r.slots.filter(isMine).map((m: any) => ({
          kind: 'host' as const, key: 'h:' + keyOf(m), id: m.id, pluginId: m.pluginId,
          spec: m.spec, order: m.order,
        }));
        setItems([...localItems(), ...host]);
      }).catch(() => {});
    }
    if (anyApi.onPluginSlotRegister) {
      anyApi.onPluginSlotRegister((m: any) => {
        if (!isMine(m)) return;
        setItems((prev) => {
          const k = 'h:' + keyOf(m);
          const next = prev.filter((x) => x.key !== k);
          next.push({ kind: 'host', key: k, id: m.id, pluginId: m.pluginId, spec: m.spec, order: m.order });
          return next;
        });
      });
    }
    if (anyApi.onPluginSlotUnregister) {
      anyApi.onPluginSlotUnregister((m: any) => {
        if (!isMine(m)) return;
        setItems((prev) => prev.filter((x) => !(x.kind === 'host' && x.pluginId === m.pluginId && x.id === m.id)));
      });
    }
    return unsub;
  }, [slotName]);
  return items;
}

/** 取 spec 上的文案（label 可能是函数，DSH 常用 i18n） */
export function specLabel(spec: any, fallback: string): string {
  if (!spec) return fallback;
  const pick = (v: any) => {
    if (typeof v === 'function') { try { return v(); } catch (_) { return null; } }
    return v;
  };
  return String(pick(spec.label) || pick(spec.text) || pick(spec.title) || fallback);
}
