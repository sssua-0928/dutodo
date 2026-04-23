require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, 'todo-app.html');

// Supabase 클라이언트 (service role - 서버 전용)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// JWT에서 사용자 정보 추출
async function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// JSON body 파싱
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API: GET /api/data
  if (req.method === 'GET' && urlPath === '/api/data') {
    const user = await getUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // 데이터 없음 — 빈 상태 반환
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(null));
      return;
    }
    if (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data.data));
    return;
  }

  // API: POST /api/data
  if (req.method === 'POST' && urlPath === '/api/data') {
    const user = await getUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const body = await parseBody(req);
    const jsonData = JSON.parse(body);

    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: user.id,
        data: jsonData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Serve HTML (Supabase 키 주입)
  if (urlPath === '/' || urlPath === '/todo-app.html') {
    let html = fs.readFileSync(HTML_FILE, 'utf8');
    html = html.replace('__SUPABASE_URL__', process.env.SUPABASE_URL || '');
    html = html.replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`dutodo server running at http://localhost:${PORT}`);
});
