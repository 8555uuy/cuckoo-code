import React, { useState, useEffect } from 'react';
import { api } from '../shared.js';

export function MemoriesReact() {
  const [memories, setMemories] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await (api as any).listMemories();
      if (res && res.success) setMemories(res.memories || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const text = prompt('新建记忆（如：用户偏好用中文回复）');
    if (text && text.trim()) {
      await (api as any).addMemory(text.trim());
      load();
    }
  };

  const handleEdit = async (id: string, oldText: string) => {
    const text = prompt('编辑记忆', oldText);
    if (text && text.trim()) {
      await (api as any).updateMemory(id, text.trim());
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除这条记忆吗？')) {
      await (api as any).deleteMemory(id);
      load();
    }
  };

  const filtered = memories.filter(m => m.text.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input className="ck-input" placeholder="搜索记忆..." value={keyword} onChange={e => setKeyword(e.target.value)} style={{ flex: 1 }} />
        <button className="ck-btn ck-btn-anim" onClick={handleAdd}>新建记忆</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? <div style={{color: '#888'}}>加载中...</div> : null}
        {!loading && filtered.length === 0 ? <div style={{color: '#888'}}>暂无记忆</div> : null}
        {filtered.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: 'var(--ck-bg-2)', borderRadius: '6px' }}>
            <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{m.text}</div>
            <button className="ck-btn ghost" style={{ marginLeft: '8px' }} onClick={() => handleEdit(m.id, m.text)}>编辑</button>
            <button className="ck-btn ghost" style={{ marginLeft: '8px', color: 'red' }} onClick={() => handleDelete(m.id)}>删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}