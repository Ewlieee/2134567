const BookRequest = require('../models/request');
const Author = require('../models/author');
const Genre = require('../models/genre');
const Book = require('../models/book');
const { transaction } = require('../config/db');
const { badRequest, conflict, notFound, str, int, idParam } = require('../utils/http');

const STATUSES = ['pending', 'approved', 'rejected'];

async function mine(req, res) {
  res.json(await BookRequest.listForUser(req.user.id));
}

async function create(req, res) {
  const data = {
    userId: req.user.id,
    title: str(req.body.title, { required: true, max: 300, field: 'Название' }),
    authorName: str(req.body.authorName, { required: true, max: 200, field: 'Автор' }),
    comment: str(req.body.comment, { max: 2000, field: 'Комментарий' }),
  };
  res.status(201).json(await BookRequest.create(data));
}

async function cancel(req, res) {
  if (!(await BookRequest.remove(idParam(req.params.id), req.user.id))) {
    throw notFound('Заявка не найдена или уже рассмотрена');
  }
  res.json({ ok: true });
}

async function list(req, res) {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  res.json(await BookRequest.list({ status }));
}

/**
 * Одобрение: книга добавляется в каталог. Автор ищется по имени из заявки
 * (или создаётся), жанр выбирает администратор.
 */
async function approve(req, res) {
  const id = idParam(req.params.id);
  const genreId = int(req.body.genreId, { required: true, min: 1, field: 'Жанр' });
  if (!(await Genre.findById(genreId))) throw badRequest('Жанр не найден');
  const adminComment = str(req.body.adminComment, { max: 2000, field: 'Комментарий' });

  const bookId = await transaction(async (tx) => {
    const request = await BookRequest.findById(id, tx);
    if (!request) throw notFound('Заявка не найдена');
    if (request.status !== 'pending') throw conflict('Заявка уже рассмотрена');

    const title = str(req.body.title, { max: 300 }) || request.title;
    const authorName = str(req.body.authorName, { max: 200 }) || request.authorName;
    const author = await Author.findByName(authorName, tx);
    const authorId = author ? author.id : await Author.create({ name: authorName }, tx);
    const newBookId = await Book.create({ title, authorId, genreId }, tx);

    if (!(await BookRequest.resolve(id, { status: 'approved', adminComment, bookId: newBookId }, tx))) {
      throw conflict('Заявка уже рассмотрена');
    }
    return newBookId;
  });
  res.json({ ok: true, bookId });
}

async function reject(req, res) {
  const id = idParam(req.params.id);
  const adminComment = str(req.body.adminComment, { max: 2000, field: 'Комментарий' });
  if (!(await BookRequest.findById(id))) throw notFound('Заявка не найдена');
  if (!(await BookRequest.resolve(id, { status: 'rejected', adminComment }))) {
    throw conflict('Заявка уже рассмотрена');
  }
  res.json({ ok: true });
}

module.exports = { mine, create, cancel, list, approve, reject };
