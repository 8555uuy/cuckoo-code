'use strict';
/**
 * infra/user-agent 测试（纯函数）
 *
 * 关键：UA 里的 Chrome 版本必须来自 process.versions.chrome（真实内核），
 * 否则与 sec-ch-ua 矛盾，会被 Google 判定"浏览器不安全"。
 */
import { test } from 'vitest';
import assert from 'node:assert';
import { buildChromeUserAgent, chromeMajor, buildClientHintsHeaders, buildUserAgentDataFix, getPlatformProfile } from '../../src/infra/user-agent.js';

test('chromeMajor 取主版本号', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '152.0.7977.130', configurable: true });
    assert.strictEqual(chromeMajor(), '152');
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

test('chromeMajor 无版本时回退 0', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '', configurable: true });
    assert.strictEqual(chromeMajor(), '0');
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

test('buildChromeUserAgent 使用真实内核版本（非写死）', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '152.0.7977.130', configurable: true });
    const ua = buildChromeUserAgent();
    assert.ok(ua.includes('Chrome/152.0.0.0'), 'UA 应含真实主版本 152');
    assert.ok(!ua.includes('Electron'), 'UA 不应含 Electron 标识');
    assert.ok(ua.includes('Safari/537.36'));
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

test('buildChromeUserAgent 随内核版本变化（防写死回归）', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '160.1.2.3', configurable: true });
    assert.ok(buildChromeUserAgent().includes('Chrome/160.0.0.0'));
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

// ================= 平台感知（Chromium 源码冻结常量）=================

test('getPlatformProfile 三平台返回 Chromium 源码冻结常量', () => {
  const win = getPlatformProfile('win32', 'x64');
  assert.strictEqual(win.uaPlatform, 'Windows NT 10.0; Win64; x64');
  assert.strictEqual(win.chUaPlatform, '"Windows"');
  assert.strictEqual(win.uadPlatform, 'Windows');

  const mac = getPlatformProfile('darwin', 'arm64');
  assert.strictEqual(mac.uaPlatform, 'Macintosh; Intel Mac OS X 10_15_7');
  assert.strictEqual(mac.chUaPlatform, '"macOS"');
  assert.strictEqual(mac.uadPlatform, 'macOS');
  assert.strictEqual(mac.architecture, 'arm', 'Apple Silicon 架构应为 arm');

  const macIntel = getPlatformProfile('darwin', 'x64');
  assert.strictEqual(macIntel.architecture, 'x86');

  const linux = getPlatformProfile('linux', 'x64');
  assert.strictEqual(linux.uaPlatform, 'X11; Linux x86_64');
  assert.strictEqual(linux.chUaPlatform, '"Linux"');
  assert.strictEqual(linux.uadPlatform, 'Linux');
  assert.strictEqual(linux.platformVersion, '', 'Linux 的 platformVersion 为空串（对齐真实 Chrome）');
});

test('buildChromeUserAgent 三平台 UA 串正确且不含 Electron', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '152.0.7977.130', configurable: true });

    const win = buildChromeUserAgent('win32', 'x64');
    assert.ok(win.startsWith('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), win);
    assert.ok(win.includes('Chrome/152.0.0.0'));

    const mac = buildChromeUserAgent('darwin', 'arm64');
    assert.ok(mac.startsWith('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), mac);
    assert.ok(mac.includes('Chrome/152.0.0.0'));

    const linux = buildChromeUserAgent('linux', 'x64');
    assert.ok(linux.startsWith('Mozilla/5.0 (X11; Linux x86_64)'), linux);
    assert.ok(linux.includes('Chrome/152.0.0.0'));

    for (const ua of [win, mac, linux]) {
      assert.ok(!ua.includes('Electron'), 'UA 不应含 Electron');
      assert.ok(ua.endsWith('Safari/537.36'), 'UA 应以 Safari/537.36 结尾');
    }
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

test('buildClientHintsHeaders 的 sec-ch-ua-platform 随平台变化', () => {
  assert.strictEqual(buildClientHintsHeaders('win32', 'x64')['sec-ch-ua-platform'], '"Windows"');
  assert.strictEqual(buildClientHintsHeaders('darwin', 'arm64')['sec-ch-ua-platform'], '"macOS"');
  assert.strictEqual(buildClientHintsHeaders('linux', 'x64')['sec-ch-ua-platform'], '"Linux"');
});

test('buildUserAgentDataFix 注入脚本内 platform 与平台一致（不再恒为 Windows）', () => {
  const prev = process.versions.chrome;
  try {
    Object.defineProperty(process.versions, 'chrome', { value: '152.0.7977.130', configurable: true });

    const macScript = buildUserAgentDataFix('darwin', 'arm64');
    assert.ok(macScript.includes('platform:"macOS"'), 'userAgentData.platform 应为 macOS');
    assert.ok(!macScript.includes('platform:"Windows"'), 'macOS 脚本不应含 Windows');
    assert.ok(macScript.includes('architecture:"arm"'), 'Apple Silicon 架构应为 arm');
    assert.ok(macScript.includes('navigator,"webdriver"'), '应仍修正 webdriver');

    const linuxScript = buildUserAgentDataFix('linux', 'x64');
    assert.ok(linuxScript.includes('platform:"Linux"'));
    assert.ok(linuxScript.includes('platformVersion:""'), 'Linux platformVersion 应为空串');

    const winScript = buildUserAgentDataFix('win32', 'x64');
    assert.ok(winScript.includes('platform:"Windows"'));
    assert.ok(winScript.includes('platformVersion:"10.0.0"'));
  } finally {
    Object.defineProperty(process.versions, 'chrome', { value: prev, configurable: true });
  }
});

test('默认参数走 process.platform（Windows 环境回归保护）', () => {
  // 测试机是 Windows：默认调用应与显式传 win32 一致
  if (process.platform === 'win32') {
    assert.strictEqual(buildChromeUserAgent(), buildChromeUserAgent('win32', process.arch));
    assert.deepStrictEqual(buildClientHintsHeaders(), buildClientHintsHeaders('win32', process.arch));
  }
});
