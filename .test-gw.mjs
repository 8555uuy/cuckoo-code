import http from 'node:http';

// 读取本地网关配置（用默认的测试 Key 或直连）
// 为了测试，我们直接请求网关的 /api/keys 拿一个 key，假设网关没有开启鉴权或者用无效请求
// 实际上网关在 127.0.0.1:18900
const req = http.request({
  hostname: '127.0.0.1',
  port: 18900,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 临时跳过 key 校验（如果开了 requireKey，这里会 401，所以假设没开或者用假 key）
    'Authorization': 'Bearer sk-cuckoo-test'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Body chunk:');
    console.log(body);
  });
});

req.on('error', e => console.error('Error:', e.message));

const payload = {
  model: 'cuckoo-default',
  messages: [{ role: 'user', content: '在桌面创建一个测试文件夹' }],
  stream: true,
  tools: [
    {
      type: 'function',
      function: {
        name: 'shell',
        description: '执行 shell 命令',
        parameters: {
          type: 'object',
          properties: { command: { type: 'string' } },
          required: ['command']
        }
      }
    }
  ]
};

req.write(JSON.stringify(payload));
req.end();