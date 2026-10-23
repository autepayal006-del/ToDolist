/**
 * Serverless Handler: /api (Root API info)
 */
const { sendJson } = require('./_utils');

module.exports = async (req, res) => {
  return sendJson(res, 200, {
    name: 'TaskMate Pro API',
    version: '2.0.0',
    status: 'online',
    endpoints: [
      'GET /api/health',
      'GET /api/tasks',
      'POST /api/tasks',
      'PATCH /api/tasks/:id',
      'DELETE /api/tasks/:id',
      'POST /api/tasks/clear-completed'
    ]
  });
};
