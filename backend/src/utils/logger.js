const { Log } = require('../models');

async function writeLog(user, action, target = '') {
  try {
    await Log.create({
      user_id: user?.id || null,
      action,
      target
    });
  } catch (error) {
    console.warn('[logger] 写入日志失败:', error.message);
  }
}

module.exports = { writeLog };
