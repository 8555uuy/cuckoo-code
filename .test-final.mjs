import http from 'node:http';
const req = http.request({
  hostname: '127.0.0.1',
  port: 18901,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-cuckoo-test'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', chunk => console.log('CHUNK:', JSON.stringify(chunk.toString())));
  res.on('end', () => console.log('END'));
});
req.on('error', e => console.error('Error:', e.message));
const payload = {
  model: 'cuckoo-default',
  messages: [{ role: 'user', content: '你好' }],
  stream: true,
  tools: [{
    type: 'function',
    function: {
      name: 'shell',
      description: '执行 shell 命令',
      parameters: { type: 'object', properties: { command: { type: 'string' } } }
    }
  }]
};
req.write(JSON.stringify(payload));
req.end();