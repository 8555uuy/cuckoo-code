import http from 'node:http';
import fs from 'node:fs';
const req = http.request({
  hostname: '127.0.0.1',
  port: 18900,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-cuckoo-test'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Body:');
    console.log(body);
  });
});
req.on('error', e => console.error('Error:', e.message));
const payload = {
  model: 'cuckoo-default',
  messages: [{ role: 'user', content: '你好' }],
  stream: false // 非流式测试
};
req.write(JSON.stringify(payload));
req.end();