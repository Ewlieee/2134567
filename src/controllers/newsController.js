const News = require('../models/news');
const { notFound, str, int, idParam } = require('../utils/http');

function readNews(body) {
  return {
    title: str(body.title, { required: true, max: 300, field: 'Заголовок' }),
    body: str(body.body, { required: true, max: 50000, field: 'Текст' }),
  };
}

async function list(req, res) {
  res.json(await News.list(Math.min(int(req.query.limit, { min: 1 }) || 20, 100)));
}

async function get(req, res) {
  const item = await News.findById(idParam(req.params.id));
  if (!item) throw notFound('Новость не найдена');
  res.json(item);
}

async function create(req, res) {
  res.status(201).json(await News.create({ ...readNews(req.body), authorId: req.user.id }));
}

async function update(req, res) {
  const item = await News.update(idParam(req.params.id), readNews(req.body));
  if (!item) throw notFound('Новость не найдена');
  res.json(item);
}

async function remove(req, res) {
  if (!(await News.remove(idParam(req.params.id)))) throw notFound('Новость не найдена');
  res.json({ ok: true });
}

module.exports = { list, get, create, update, remove };
