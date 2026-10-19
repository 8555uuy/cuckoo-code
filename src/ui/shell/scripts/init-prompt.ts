/**
 * 初始化项目输入弹窗（壳页面）
 */
import { api } from './shared.js';

export function bindInitPrompt() {
  const modal = document.getElementById('init-prompt-modal');
  const sendBtn = document.getElementById('init-prompt-send') as HTMLButtonElement;
  const cancelBtn = document.getElementById('init-prompt-cancel') as HTMLButtonElement;
  const dirInput = document.getElementById('init-prompt-dir') as HTMLInputElement;
  const selectDirBtn = document.getElementById('init-prompt-select-dir') as HTMLButtonElement;
  const textarea = document.getElementById('init-prompt-textarea') as HTMLTextAreaElement;

  if (!modal || !sendBtn || !textarea) return;

  // 🔥 关键修复：把弹窗从侧边栏容器里挪出来，放到 body 下，防止被裁剪
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  // 将内部显示逻辑提取出来
  const triggerShow = async () => {
    // 如果已经显示了，就不要重复弹
    if (!modal.classList.contains('cuckoo-hidden')) return;
    
    console.log('[Cuckoo Shell] 显示初始化弹窗');
    modal.classList.remove('cuckoo-hidden');
    // 隐藏 AI 视图，防止遮挡
    if (api.setAiViewVisible) {
      try { await api.setAiViewVisible(false); } catch (_) {}
    }
    // 默认清空，不自动弹目录框
    dirInput.value = '';
    textarea.value = '';
  };

  // 暴露给 toolbar 等地方调用
  (window as any).__ckShowInitModal = triggerShow;

  if (api.onShowInitPrompt) {
    api.onShowInitPrompt(triggerShow);
  }

  if (selectDirBtn) {
    selectDirBtn.onclick = async () => {
      if (!api.selectProjectDir) return;
      selectDirBtn.disabled = true;
      selectDirBtn.textContent = '选择中...';
      try {
        const res = await api.selectProjectDir();
        if (res && res.success && res.dir) {
          dirInput.value = res.dir;
          textarea.focus();
        } else if (res && !res.success) {
          alert(res.message || '未选择目录');
        }
      } finally {
        selectDirBtn.disabled = false;
        selectDirBtn.textContent = '选择目录';
      }
    };
  }

  sendBtn.onclick = async () => {
    const text = textarea.value.trim();
    if (!dirInput.value) {
      alert('请先选择项目目录');
      return;
    }
    if (!text) return;

    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    try {
      if (!api.mergeSystemPrompt || !api.sendUserMessage) {
        throw new Error('缺少必要的 API');
      }
      const res = await api.mergeSystemPrompt(text);
      if (res && res.success && res.text) {
        await api.sendUserMessage(res.text);
        modal.classList.add('cuckoo-hidden');
        if (api.setAiViewVisible) { try { api.setAiViewVisible(true); } catch (_) {} }
      } else {
        alert('发送失败: ' + (res?.error || '未知错误'));
      }
    } catch (e: any) {
      alert('发送异常: ' + e.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送';
    }
  };

  cancelBtn.onclick = () => {
    modal.classList.add('cuckoo-hidden');
    if (api.setAiViewVisible) {
      try { api.setAiViewVisible(true); } catch (_) {}
    }
    if (api.cancelInitPrompt) {
      api.cancelInitPrompt();
    }
  };
}
