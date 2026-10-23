/**
 * TaskMate Pro — Shared Serverless Utilities & Supabase Bridge
 * 
 * Used by all Vercel Serverless Functions in /api and local server.js.
 * Provides cookie management, session ownership, input validation,
 * and secure Supabase database communication.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// -----------------------------------------------------------------------------
// 1. Environment Configuration Loader (Local fallback for dev)
// -----------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
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

const COOKIE_NAME = 'taskmate_session';

// -----------------------------------------------------------------------------
// 2. Cookie & Session Helpers
// -----------------------------------------------------------------------------
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers && req.headers.cookie;
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

function isValidSessionToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function deriveOwnerId(sessionToken) {
  const secret = process.env.SESSION_SECRET || 'taskmate_default_fallback_secret_key_min32';
  const hash = crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

function getSessionAndOwner(req) {
  const cookies = parseCookies(req);
  let sessionToken = cookies[COOKIE_NAME];
  let setCookieHeader = null;

  if (!isValidSessionToken(sessionToken)) {
    sessionToken = generateSessionToken();
    const isHttps = process.env.NODE_ENV === 'production' || 
                    (req.headers && req.headers['x-forwarded-proto'] === 'https') ||
                    (req.socket && req.socket.encrypted);
    const secureFlag = isHttps ? '; Secure' : '';
    setCookieHeader = `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${secureFlag}`;
  }

  const ownerId = deriveOwnerId(sessionToken);
  return { sessionToken, ownerId, setCookieHeader };
}

// -----------------------------------------------------------------------------
// 3. Response & Body Parsing Helpers
// -----------------------------------------------------------------------------
function sendJson(res, statusCode, data, headers = {}) {
  const jsonString = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(jsonString),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, max-age=0',
    ...headers
  });
  res.end(jsonString);
}

function sendError(res, statusCode, message, code = 'ERROR', details = null, headers = {}) {
  sendJson(res, statusCode, {
    success: false,
    error: message,
    code: code,
    details: details
  }, headers);
}

async function getRequestBody(req) {
  // If already parsed by Vercel Node runtime
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch (e) {
        return {};
      }
    }
    if (typeof req.body === 'object' && req.body !== null) {
      return req.body;
    }
  }

  // Fallback for standard Node.js streaming request
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
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
// 4. Supabase REST API Query Bridge
// -----------------------------------------------------------------------------
async function querySupabase(endpoint, options = {}) {
  const supabaseUrl = (process.env.SUPABASE_URL || 'https://tyapfcjbwlnkvypdkekw.supabase.co').replace(/\/+$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey || serviceRoleKey.includes('your_supabase_service_role_key')) {
    const error = new Error('Supabase Service Role Key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
    error.code = 'CONFIG_MISSING';
    error.status = 503;
    throw error;
  }

  const targetUrl = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
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
// 5. Rate Limiting Helper (In-memory)
// -----------------------------------------------------------------------------
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

module.exports = {
  COOKIE_NAME,
  loadEnv,
  parseCookies,
  isValidSessionToken,
  generateSessionToken,
  deriveOwnerId,
  getSessionAndOwner,
  sendJson,
  sendError,
  getRequestBody,
  formatTask,
  querySupabase,
  checkRateLimit
};
