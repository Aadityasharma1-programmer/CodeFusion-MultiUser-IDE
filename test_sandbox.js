const http = require('http');

const data = JSON.stringify({
  code: '#include<iostream>\nusing namespace std;\nint main(){ cout<<"hello"; }',
  language: 'cpp'
});

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/api/sandbox/execute',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
