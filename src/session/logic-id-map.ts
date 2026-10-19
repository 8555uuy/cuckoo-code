import type { DatabaseSync } from 'node:sqlite';
import type { WebId, LogicId } from './ids.js';

interface LogicIdMap {
  webIdOf(logicId: LogicId): WebId | null;
  logicIdOf(webId: WebId): LogicId | null;
  bind(logicId: LogicId, webId: WebId): void;
  ensureLogicId(webId: WebId): LogicId;
  has(logicId: LogicId): boolean;
}

/**
 * 基于 SQLite 的翻译层。
 * 不再读写 JSON，而是直接查 sessions 表。
 */
function createLogicIdMap(db: DatabaseSync): LogicIdMap {
  return {
    webIdOf(logicId: LogicId): WebId | null {
      if (!logicId) return null;
      const row = db.prepare('SELECT web_id FROM sessions WHERE logic_id = ?').get(logicId) as any;
      return row && row.web_id ? (row.web_id as WebId) : null;
    },

    logicIdOf(webId: WebId): LogicId | null {
      if (!webId) return null;
      const row = db.prepare('SELECT logic_id FROM sessions WHERE web_id = ?').get(webId) as any;
      return row && row.logic_id ? (row.logic_id as LogicId) : null;
    },

    bind(logicId: LogicId, webId: WebId): void {
      if (!logicId || !webId) return;
      // 看看这两个 id 是不是已经存在
      const exist = db.prepare('SELECT logic_id, web_id FROM sessions WHERE logic_id = ? OR web_id = ?').get(logicId, webId) as any;
      if (exist) {
        // 如果已经存在，更新它的 webId 和 logicId
        db.prepare('UPDATE sessions SET web_id = ? WHERE logic_id = ?').run(webId, logicId);
        return;
      }
      // 如果不存在，新建一条记录
      const now = new Date().toISOString();
      db.prepare('INSERT INTO sessions (logic_id, web_id, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(logicId, webId, now, now);
    },

    ensureLogicId(webId: WebId): LogicId {
      if (!webId) throw new Error('ensureLogicId: webId 为空');
      const row = db.prepare('SELECT logic_id FROM sessions WHERE web_id = ?').get(webId) as any;
      if (row && row.logic_id) return row.logic_id as LogicId;
      
      // 不存在，则 logicId = webId
      const now = new Date().toISOString();
      db.prepare('INSERT INTO sessions (logic_id, web_id, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(webId, webId, now, now);
      return webId as unknown as LogicId;
    },

    has(logicId: LogicId): boolean {
      if (!logicId) return false;
      const row = db.prepare('SELECT 1 FROM sessions WHERE logic_id = ?').get(logicId);
      return !!row;
    },
  };
}

export { createLogicIdMap };
export type { WebId, LogicId, LogicIdMap };
