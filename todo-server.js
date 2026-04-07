const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'todo-data.json');
const HTML_FILE = path.join(__dirname, 'todo-app.html');

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: GET /api/data
  if (req.method === 'GET' && req.url === '/api/data') {
    if (!fs.existsSync(DATA_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(null));
      return;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
    return;
  }

  // API: POST /api/data
  if (req.method === 'POST' && req.url === '/api/data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      fs.writeFileSync(DATA_FILE, body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Serve HTML (strip query string for matching)
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '/todo-app.html') {
    const html = fs.readFileSync(HTML_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Todo server running at http://localhost:${PORT}`);
});
