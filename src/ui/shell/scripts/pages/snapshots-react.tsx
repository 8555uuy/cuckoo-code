import React, { useState, useEffect } from 'react';
import { api } from '../shared.js';

export function SnapshotsReact() {
  const [snaps, setSnaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await (api as any).listSnapshots();
      if (res && res.success) setSnaps(res.snapshots || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const name = prompt('快照名称（如：重构前）');
    if (name && name.trim()) {
      await (api as any).createSnapshot(name.trim());
      load();
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('恢复快照会覆盖当前项目，且自动创建回滚备份。确定继续？')) {
      try {
        const r = await (api as any).restoreSnapshot(id);
        if (r && r.success) alert('恢复成功！恢复文件数：' + r.restored);
        else alert('恢复失败：' + (r ? r.error : '未知错误'));
      } catch (e: any) {
        alert('恢复异常：' + e.message);
      }
      load();
    }
  };

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="ck-btn ck-btn-anim" onClick={handleCreate}>新建快照</button>
        <button className="ck-btn ghost" onClick={load}>刷新</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? <div style={{color: '#888'}}>加载中...</div> : null}
        {!loading && snaps.length === 0 ? <div style={{color: '#888'}}>暂无快照</div> : null}
        {snaps.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: 'var(--ck-bg-2)', borderRadius: '6px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{s.name}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{new Date(s.createdAt).toLocaleString()} · {s.fileCount} 个文件</div>
            </div>
            <button className="ck-btn ghost" onClick={() => handleRestore(s.id)}>恢复</button>
          </div>
        ))}
      </div>
    </div>
  );
}