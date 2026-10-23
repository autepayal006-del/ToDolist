/**
 * Serverless Handler:
 * POST /api/tasks/clear-completed — Clear completed tasks for verified owner
 */
const {
  getSessionAndOwner,
  sendJson,
  sendError,
  querySupabase,
  checkRateLimit
} = require('../_utils');

module.exports = async (req, res) => {
  const clientIp = (req.headers && (req.headers['x-forwarded-for'] || req.socket.remoteAddress)) || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return sendError(res, 429, 'Too many requests. Please slow down.', 'RATE_LIMITED');
  }

  const { ownerId, setCookieHeader } = getSessionAndOwner(req);
  const baseHeaders = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {};
  const method = (req.method || 'POST').toUpperCase();

  if (method === 'POST' || method === 'DELETE') {
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
      return sendError(res, err.status || 500, err.message, err.code || 'DELETE_FAILED', null, baseHeaders);
    }
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
};
