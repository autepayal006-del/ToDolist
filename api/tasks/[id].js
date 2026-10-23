/**
 * Serverless Handler:
 * PATCH  /api/tasks/:id — Update task title, completion, priority, or category
 * DELETE /api/tasks/:id — Delete task
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

  // Extract ID from query param (Vercel) or fallback from URL pathname
  let taskId = req.query && req.query.id;
  if (!taskId && req.url) {
    const urlParts = req.url.split('?')[0].split('/');
    taskId = urlParts[urlParts.length - 1];
  }

  const { ownerId, setCookieHeader } = getSessionAndOwner(req);
  const baseHeaders = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {};
  const method = (req.method || 'GET').toUpperCase();

  // Defense-in-depth: if Vercel routes clear-completed here
  if (taskId === 'clear-completed') {
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
  }

  if (!taskId) {
    return sendError(res, 400, 'Task ID is required.', 'VALIDATION_ERROR', null, baseHeaders);
  }

  // PATCH /api/tasks/:id
  if (method === 'PATCH') {
    try {
      const body = await getRequestBody(req);
      const updatePayload = {};

      if (body.title !== undefined || body.text !== undefined) {
        const title = (typeof body.title === 'string' ? body.title : (body.text || '')).trim();
        if (!title) {
          return sendError(res, 400, 'Task title cannot be blank.', 'VALIDATION_ERROR', null, baseHeaders);
        }
        if (title.length > 160) {
          return sendError(res, 400, 'Task title cannot exceed 160 characters.', 'VALIDATION_ERROR', null, baseHeaders);
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
        return sendError(res, 400, 'No valid fields provided for update.', 'VALIDATION_ERROR', null, baseHeaders);
      }

      // Enforce owner verification
      const result = await querySupabase(`tasks?id=eq.${taskId}&owner_id=eq.${ownerId}`, {
        method: 'PATCH',
        body: updatePayload
      });

      if (!Array.isArray(result) || result.length === 0) {
        return sendError(res, 404, 'Task not found or access denied.', 'NOT_FOUND', null, baseHeaders);
      }

      return sendJson(res, 200, {
        success: true,
        task: formatTask(result[0])
      }, baseHeaders);
    } catch (err) {
      return sendError(res, err.status || 500, err.message, err.code || 'UPDATE_FAILED', null, baseHeaders);
    }
  }

  // DELETE /api/tasks/:id
  if (method === 'DELETE') {
    try {
      // Enforce owner verification
      const result = await querySupabase(`tasks?id=eq.${taskId}&owner_id=eq.${ownerId}`, {
        method: 'DELETE'
      });

      if (!Array.isArray(result) || result.length === 0) {
        return sendError(res, 404, 'Task not found or access denied.', 'NOT_FOUND', null, baseHeaders);
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Task successfully deleted.'
      }, baseHeaders);
    } catch (err) {
      return sendError(res, err.status || 500, err.message, err.code || 'DELETE_FAILED', null, baseHeaders);
    }
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
};
