/**
 * Serverless Handler: GET /api/health
 */
const { getSessionAndOwner, sendJson } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method && req.method.toUpperCase() !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
  }

  const { setCookieHeader } = getSessionAndOwner(req);
  const baseHeaders = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {};
  const isConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase_service_role_key')
  );

  return sendJson(res, 200, {
    status: 'healthy',
    server: 'TaskMate Serverless / Vercel API',
    supabaseConfigured: isConfigured,
    supabaseUrl: process.env.SUPABASE_URL || 'https://tyapfcjbwlnkvypdkekw.supabase.co',
    sessionActive: true
  }, baseHeaders);
};
