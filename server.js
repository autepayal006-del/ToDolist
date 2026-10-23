/**
 * TaskMate Pro — Local Development Server
 * 
 * Routes API requests to the exact same Vercel Serverless Functions in /api,
 * while serving static frontend assets (HTML, CSS, JS) locally.
 * 
 * Runs directly on Node.js without third-party dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv, sendError } = require('./api/_utils');

loadEnv();

// Serverless Handlers
const apiIndexHandler = require('./api/index');
const healthHandler = require('./api/health');
const tasksIndexHandler = require('./api/tasks/index');
const tasksClearCompletedHandler = require('./api/tasks/clear-completed');
const taskByIdHandler = require('./api/tasks/[id]');

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tyapfcjbwlnkvypdkekw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function serveStaticFile(req, res, filePath) {
  const safePath = path.normalize(path.join(__dirname, filePath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access denied');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const hostHeader = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${hostHeader}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Populate req.query for compatibility with Vercel serverless format
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  // ---------------------------------------------------------------------------
  // API Routes -> Dispatched to Vercel Serverless Handlers
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/api')) {
    // GET /api
    if (pathname === '/api' || pathname === '/api/') {
      return apiIndexHandler(req, res);
    }

    // GET /api/health
    if (pathname === '/api/health') {
      return healthHandler(req, res);
    }

    // POST /api/tasks/clear-completed
    if (pathname === '/api/tasks/clear-completed') {
      return tasksClearCompletedHandler(req, res);
    }

    // /api/tasks/:id (PATCH / DELETE)
    const taskMatch = pathname.match(/^\/api\/tasks\/([0-9a-fA-F-]+)$/);
    if (taskMatch) {
      req.query.id = taskMatch[1];
      return taskByIdHandler(req, res);
    }

    // /api/tasks (GET / POST)
    if (pathname === '/api/tasks' || pathname === '/api/tasks/') {
      return tasksIndexHandler(req, res);
    }

    // Unknown API endpoint -> ALWAYS returns JSON, never HTML
    return sendError(res, 404, `Endpoint ${pathname} not found`, 'NOT_FOUND');
  }

  // ---------------------------------------------------------------------------
  // Static Assets (GET)
  // ---------------------------------------------------------------------------
  if (method === 'GET') {
    let targetFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    targetFile = path.normalize(targetFile).replace(/^(\.\.[\/\\])+/, '');
    return serveStaticFile(req, res, targetFile);
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
});

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` TaskMate Pro Server running at http://localhost:${PORT}`);
    console.log(` Environment: ${NODE_ENV}`);
    console.log(` Supabase URL: ${SUPABASE_URL}`);
    console.log(` Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Configured [Private]' : 'Not Configured (See README.md)'}`);
    console.log(` Vercel Serverless Handlers Active`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
