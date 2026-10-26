/**
 * 捐赠与支持区块（共用组件）
 *
 * 在 About 页和 Token 页各展示一份。
 * 样式复用 components.css 里的 ck-about-* 系列。
 */
import { createElement } from 'react';
import { api } from '../shared.js';

function openUrl(url: string) {
  const anyApi = api as any;
  if (anyApi.openExternal) anyApi.openExternal(url);
}

export function DonationBlock() {
  return createElement('div', { className: 'ck-about-group' },
    createElement('div', { className: 'ck-about-group-title' }, '捐赠与支持'),
    createElement('p', { className: 'ck-about-tip' }, '我个人不需要你的捐赠。如果你愿意支持本项目，欢迎通过', createElement('strong', null, '壹基金'), '进行捐赠：'),
    createElement('a', { className: 'ck-about-link', onClick: () => openUrl('https://onefoundation.cn/donate/') }, 'onefoundation.cn/donate'),
    createElement('p', { className: 'ck-about-tip' }, '捐赠后请通过以下方式联系作者（注明「Cuckoo 捐赠」），将你加入捐赠者名单：'),
    createElement('p', { className: 'ck-about-tip' }, 'QQ：61519628'),
    createElement('p', { className: 'ck-about-tip' }, '微信：w_y_p666'),
    createElement('p', { className: 'ck-about-tip' }, '邮箱：wangyongpeng@yongpeng.wang'),
    createElement('a', { className: 'ck-about-link', onClick: () => openUrl('https://github.com/wangyongpeng90/cuckoo-code/blob/master/DONORS.md') }, '查看完整捐赠者名单(github)'),
    createElement('br'),
    createElement('a', { className: 'ck-about-link', onClick: () => openUrl('https://docs.qq.com/smartsheet/DVWJoUkZVWHhzRVJw?tab=tkcqiO') }, '查看完整捐赠者名单(免梯链接)'),
  );
}
