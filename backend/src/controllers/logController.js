const { Log, User } = require('../models');

async function listLogs(req, res) {
  const page = normalizePositiveInteger(req.query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(req.query.pageSize, 10), 100);

  const { rows, count } = await Log.findAndCountAll({
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
    order: [['id', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize
  });

  res.json({
    code: 0,
    message: 'ok',
    data: {
      list: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    }
  });
}

function normalizePositiveInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = { listLogs };
