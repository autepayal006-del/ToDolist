/**
 * Serverless Handler:
 * GET  /api/tasks — Read tasks for verified owner
 * POST /api/tasks — Create a new task for verified owner
 */
const {
  getSessionAndOwner,
  sendJson,
  sendError,
  getRequestBody,
  formatTask,
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
  const method = (req.method || 'GET').toUpperCase();

  // GET /api/tasks — Read all tasks for verified owner
  if (method === 'GET') {
    try {
      const rows = await querySupabase(`tasks?owner_id=eq.${ownerId}&order=created_at.desc`);
      return sendJson(res, 200, {
        success: true,
        tasks: Array.isArray(rows) ? rows.map(formatTask) : []
      }, baseHeaders);
    } catch (err) {
      return sendError(res, err.status || 500, err.message, err.code || 'FETCH_FAILED', null, baseHeaders);
    }
  }

  // POST /api/tasks — Create a new task
  if (method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const title = (typeof body.title === 'string' ? body.title : (body.text || '')).trim();

      // Input validation
      if (!title) {
        return sendError(res, 400, 'Task title cannot be empty.', 'VALIDATION_ERROR', null, baseHeaders);
      }
      if (title.length > 160) {
        return sendError(res, 400, 'Task title cannot exceed 160 characters.', 'VALIDATION_ERROR', null, baseHeaders);
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
      return sendError(res, err.status || 500, err.message, err.code || 'CREATE_FAILED', null, baseHeaders);
    }
  }

  // Method not allowed
  res.writeHead(405, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
};
