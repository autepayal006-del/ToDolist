/**
 * TaskMate Pro — Secure Backend Server & Task Ownership API
 * 
 * Provides:
 * 1. Static asset serving for HTML, CSS, JavaScript, and config.
 * 2. Secure browser session management via random HttpOnly, SameSite=Strict cookies.
 * 3. Server-side task ownership verification for all CRUD operations.
 * 4. Strict input sanitization, validation, and request rate limiting.
 * 5. Privileged Supabase database access using server-side environment variables.
 * 
 * Zero external dependencies — runs directly on Node.js 18+.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

// -----------------------------------------------------------------------------
// 1. Environment Configuration Loader (Built-in, zero-dependency)
// -----------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://tyapfcjbwlnkvypdkekw.supabase.co').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'taskmate_default_fallback_secret_key_min32';

// -----------------------------------------------------------------------------
// 2. Security & Session Helpers
// -----------------------------------------------------------------------------
const COOKIE_NAME = 'taskmate_session';

/**
 * Parses cookies from incoming HTTP request headers
 */
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

/**
 * Validates a session token format (64-char hex string)
 */
function isValidSessionToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Generates a cryptographically strong 64-character hex session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Cryptographically derives a deterministic UUID v4 format owner ID
 * from the verified session token and server-only SESSION_SECRET.
 * Ensures the client cannot forge, guess, or tamper with their owner ID.
 */
function deriveOwnerId(sessionToken) {
  const hash = crypto.createHmac('sha256', SESSION_SECRET).update(sessionToken).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * In-memory rate limiting to prevent denial of service and spamming
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;

function checkRateLimit(ipOrOwner) {
  const now = Date.now();
  let record = rateLimitMap.get(ipOrOwner);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { startTime: now, count: 1 };
    rateLimitMap.set(ipOrOwner, record);
    return true;
  }
  record.count++;
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

// Periodic cleanup of stale rate limit entries
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now - val.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

// -----------------------------------------------------------------------------
// 3. Supabase REST API Query Bridge (Server-side privileged)
// -----------------------------------------------------------------------------
async function querySupabase(endpoint, options = {}) {
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase_service_role_key')) {
    const error = new Error('Supabase Service Role Key is not configured in .env. Please see README.md for setup instructions.');
    error.code = 'CONFIG_MISSING';
    error.status = 503;
    throw error;
  }

  const targetUrl = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...(options.headers || {})
  };

  const response = await fetch(targetUrl, {
    method: options.method || 'GET',
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const err = new Error((data && data.message) || `Supabase query failed with HTTP status ${response.status}`);
    err.status = response.status;
    err.details = data;
    if (data && data.code === 'PGRST205') {
      err.code = 'TABLE_NOT_FOUND';
      err.message = "The 'public.tasks' table does not exist in your Supabase database yet. Run supabase-schema.sql in the Supabase SQL editor.";
    }
    throw err;
  }

  return data;
}

// -----------------------------------------------------------------------------
// 4. Request Validation & Response Helpers
// -----------------------------------------------------------------------------
function sendJson(res, statusCode, data, headers = {}) {
  const jsonString = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(jsonString),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers
  });
  res.end(jsonString);
}

function sendError(res, statusCode, message, code = 'ERROR', details = null) {
  sendJson(res, statusCode, {
    success: false,
    error: message,
    code: code,
    details: details
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 64) {
        // Guard against overly large payloads (max 64KB)
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

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
    res.writeHead(403);
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

function formatTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    text: row.title,
    is_completed: Boolean(row.is_completed),
    completed: Boolean(row.is_completed),
    priority: row.priority || 'low',
    category: row.category || 'work',
    created_at: row.created_at,
    updated_at: row.updated_at,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    owner_id: row.owner_id
  };
}

// -----------------------------------------------------------------------------
// 5. Main HTTP Request Handler
// -----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return sendError(res, 429, 'Too many requests. Please slow down.', 'RATE_LIMITED');
  }

  // Manage Cookie & Session
  const cookies = parseCookies(req);
  let sessionToken = cookies[COOKIE_NAME];
  let setCookieHeader = null;

  if (!isValidSessionToken(sessionToken)) {
    sessionToken = generateSessionToken();
    const secureFlag = (NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
    setCookieHeader = `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${secureFlag}`;
  }

  // Attach session header if updated
  const baseHeaders = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {};

  const hostHeader = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${hostHeader}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // ---------------------------------------------------------------------------
  // API Routes (/api/...)
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const ownerId = deriveOwnerId(sessionToken);

    // GET /api/health — System & Database Health Check
    if (pathname === '/api/health' && method === 'GET') {
      const isConfigured = Boolean(SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase_service_role_key'));
      return sendJson(res, 200, {
        status: 'healthy',
        server: 'TaskMate Node.js API',
        supabaseConfigured: isConfigured,
        supabaseUrl: SUPABASE_URL,
        sessionActive: true
      }, baseHeaders);
    }

    // GET /api/tasks — Read all tasks for verified owner
    if (pathname === '/api/tasks' && method === 'GET') {
      try {
        const rows = await querySupabase(`tasks?owner_id=eq.${ownerId}&order=created_at.desc`);
        return sendJson(res, 200, {
          success: true,
          tasks: Array.isArray(rows) ? rows.map(formatTask) : []
        }, baseHeaders);
      } catch (err) {
        return sendError(res, err.status || 500, err.message, err.code || 'FETCH_FAILED');
      }
    }

    // POST /api/tasks — Create a new task
    if (pathname === '/api/tasks' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const title = (typeof body.title === 'string' ? body.title : (body.text || '')).trim();

        // Strict input validation
        if (!title) {
          return sendError(res, 400, 'Task title cannot be empty.', 'VALIDATION_ERROR');
        }
        if (title.length > 160) {
          return sendError(res, 400, 'Task title cannot exceed 160 characters.', 'VALIDATION_ERROR');
        }

        const validPriorities = ['low', 'medium', 'high'];
        const priority = validPriorities.includes(body.priority) ? body.priority : 'low';

        const validCategories = ['work', 'personal', 'study', 'goals'];
        const category = validCategories.includes(body.category) ? body.category : 'work';

        const isCompleted = Boolean(body.is_completed || body.completed);

        const newTaskPayload = {
          title: title,
          is_completed: isCompleted,
          priority: priority,
          category: category,
          owner_id: ownerId
        };

        const result = await querySupabase('tasks', {
          method: 'POST',
          body: newTaskPayload
        });

        const createdTask = Array.isArray(result) ? result[0] : result;
        return sendJson(res, 201, {
          success: true,
          task: formatTask(createdTask)
        }, baseHeaders);
      } catch (err) {
        return sendError(res, err.status || 500, err.message, err.code || 'CREATE_FAILED');
      }
    }

    // POST /api/tasks/clear-completed — Clear completed tasks for verified owner
    if (pathname === '/api/tasks/clear-completed' && method === 'POST') {
      try {
        const result = await querySupabase(`tasks?owner_id=eq.${ownerId}&is_completed=eq.true`, {
          method: 'DELETE'
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Completed tasks removed successfully.',
          deletedCount: Array.isArray(result) ? result.length : 0
        }, baseHeaders);
      } catch (err) {
        return sendError(res, err.status || 500, err.message, err.code || 'DELETE_FAILED');
      }
    }

    // PATCH /api/tasks/:id — Update title, completion, priority, or category
    const patchMatch = pathname.match(/^\/api\/tasks\/([0-9a-fA-F-]+)$/);
    if (patchMatch && method === 'PATCH') {
      const taskId = patchMatch[1];
      try {
        const body = await parseJsonBody(req);
        const updatePayload = {};

        if (body.title !== undefined || body.text !== undefined) {
          const title = (typeof body.title === 'string' ? body.title : (body.text || '')).trim();
          if (!title) {
            return sendError(res, 400, 'Task title cannot be blank.', 'VALIDATION_ERROR');
          }
          if (title.length > 160) {
            return sendError(res, 400, 'Task title cannot exceed 160 characters.', 'VALIDATION_ERROR');
          }
          updatePayload.title = title;
        }

        if (body.is_completed !== undefined) {
          updatePayload.is_completed = Boolean(body.is_completed);
        } else if (body.completed !== undefined) {
          updatePayload.is_completed = Boolean(body.completed);
        }

        if (body.priority !== undefined) {
          const validPriorities = ['low', 'medium', 'high'];
          if (validPriorities.includes(body.priority)) {
            updatePayload.priority = body.priority;
          }
        }

        if (body.category !== undefined) {
          const validCategories = ['work', 'personal', 'study', 'goals'];
          if (validCategories.includes(body.category)) {
            updatePayload.category = body.category;
          }
        }

        if (Object.keys(updatePayload).length === 0) {
          return sendError(res, 400, 'No valid fields provided for update.', 'VALIDATION_ERROR');
        }

        // Enforce owner verification: task must match BOTH id AND owner_id
        const result = await querySupabase(`tasks?id=eq.${taskId}&owner_id=eq.${ownerId}`, {
          method: 'PATCH',
          body: updatePayload
        });

        if (!Array.isArray(result) || result.length === 0) {
          return sendError(res, 404, 'Task not found or access denied.', 'NOT_FOUND');
        }

        return sendJson(res, 200, {
          success: true,
          task: formatTask(result[0])
        }, baseHeaders);
      } catch (err) {
        return sendError(res, err.status || 500, err.message, err.code || 'UPDATE_FAILED');
      }
    }

    // DELETE /api/tasks/:id — Delete a single task
    const deleteMatch = pathname.match(/^\/api\/tasks\/([0-9a-fA-F-]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const taskId = deleteMatch[1];
      try {
        // Enforce owner verification: task must match BOTH id AND owner_id
        const result = await querySupabase(`tasks?id=eq.${taskId}&owner_id=eq.${ownerId}`, {
          method: 'DELETE'
        });

        if (!Array.isArray(result) || result.length === 0) {
          return sendError(res, 404, 'Task not found or access denied.', 'NOT_FOUND');
        }

        return sendJson(res, 200, {
          success: true,
          message: 'Task successfully deleted.'
        }, baseHeaders);
      } catch (err) {
        return sendError(res, err.status || 500, err.message, err.code || 'DELETE_FAILED');
      }
    }

    // Unrecognized API route
    return sendError(res, 404, 'Endpoint not found', 'NOT_FOUND');
  }

  // ---------------------------------------------------------------------------
  // Static Files Serving
  // ---------------------------------------------------------------------------
  if (method === 'GET') {
    let targetFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    // Sanitize targetFile
    targetFile = path.normalize(targetFile).replace(/^(\.\.[\/\\])+/, '');
    return serveStaticFile(req, res, targetFile);
  }

  // Fallback for unsupported methods
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` TaskMate Pro Server running at http://localhost:${PORT}`);
    console.log(` Environment: ${NODE_ENV}`);
    console.log(` Supabase URL: ${SUPABASE_URL}`);
    console.log(` Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Configured [Private]' : 'Not Configured (See README.md)'}`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
