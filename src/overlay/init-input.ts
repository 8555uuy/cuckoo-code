/**
 * 原版模式初始化输入框
 *
 * 选完目录后，通过此模块弹出一个我们自己的输入框。
 * 用户点击发送时，请求主进程合并系统提示词，并触发真正的发送。
 */
import { sendMessageToChat } from './chat-input.js';

let isVisible = false;

export function showInitInput() {
  const dialog = document.getElementById('cuckoo-init-input-dialog');
  if (!dialog) return;
  dialog.classList.remove('cuckoo-hidden');
  isVisible = true;
  
  const textarea = document.getElementById('cuckoo-init-textarea') as HTMLTextAreaElement;
  if (textarea) {
    textarea.value = '';
    textarea.focus();
  }
}

export function hideInitInput() {
  const dialog = document.getElementById('cuckoo-init-input-dialog');
  if (!dialog) return;
  dialog.classList.add('cuckoo-hidden');
  isVisible = false;
}

export function bindInitInputEvents() {
  const closeBtn = document.getElementById('cuckoo-btn-init-close');
  if (closeBtn) {
    closeBtn.onclick = () => hideInitInput();
  }

  const sendBtn = document.getElementById('cuckoo-btn-init-send');
  if (sendBtn) {
    sendBtn.onclick = async () => {
      const textarea = document.getElementById('cuckoo-init-textarea') as HTMLTextAreaElement;
      if (!textarea) return;
      const text = textarea.value.trim();
      if (!text) return;

      sendBtn.setAttribute('disabled', 'true');
      sendBtn.textContent = '发送中...';

      try {
        // 调用主进程的 init-send 接口，合并系统提示词
        // 注意：由于这里是 overlay 渲染进程，需要通过 electronAPI 调用
        const api = (window as any).electronAPI || (window as any).cuckoo;
        if (api && api.mergeSystemPrompt) {
          const res = await api.mergeSystemPrompt(text);
          if (res && res.success && res.text) {
            // 拿到合并后的内容，发给网页
            await sendMessageToChat(res.text, '用户消息');
            hideInitInput();
          } else {
            console.error('[Cuckoo Code] 合并提示词失败:', res?.error);
            alert('发送失败：' + (res?.error || '未知错误'));
          }
        } else {
          // 兜底：如果没有暴露接口，就直接发（不带提示词）
          await sendMessageToChat(text, '用户消息');
          hideInitInput();
        }
      } catch (err: any) {
        console.error('[Cuckoo Code] 发送失败:', err.message);
      } finally {
        sendBtn.removeAttribute('disabled');
        sendBtn.textContent = '发送';
      }
    };
  }

  // 支持 Ctrl/Cmd + Enter 发送
  const textarea = document.getElementById('cuckoo-init-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendBtn?.dispatchEvent(new MouseEvent('click'));
      }
    });
  }
}
