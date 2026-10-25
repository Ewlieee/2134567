const Stats = require('../models/stats');
const User = require('../models/user');
const { badRequest, notFound, str, idParam } = require('../utils/http');

async function stats(req, res) {
  const [summary, booksByMonth] = await Promise.all([Stats.summary(), Stats.booksByMonth(12)]);
  res.json({ ...summary, booksByMonth });
}

async function users(req, res) {
  res.json(await User.list({ q: str(req.query.q, { max: 100 }) }));
}

async function setBlocked(req, res) {
  const id = idParam(req.params.id);
  const blocked = req.body.blocked !== false;
  if (id === req.user.id) throw badRequest('Нельзя заблокировать самого себя');
  const target = await User.findById(id);
  if (!target) throw notFound('Пользователь не найден');
  if (target.role === 'admin') throw badRequest('Нельзя заблокировать администратора');
  await User.setBlocked(id, blocked);
  res.json({ ok: true, blocked });
}

module.exports = { stats, users, setBlocked };
