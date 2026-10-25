const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const { removeUpload } = require('../middleware/upload');
const { badRequest, notFound, str, int, idParam } = require('../utils/http');

const SORTS = ['rating', 'new', 'title', 'year'];
const ISBN_RE = /^[0-9Xx-]{10,17}$/;

function parseFilters(q) {
  return {
    q: str(q.q, { max: 200, field: 'Поиск' }),
    genreId: int(q.genre, { min: 1, field: 'Жанр' }),
    authorId: int(q.author, { min: 1, field: 'Автор' }),
    yearFrom: int(q.yearFrom, { min: 0, max: 3000, field: 'Год с' }),
    yearTo: int(q.yearTo, { min: 0, max: 3000, field: 'Год по' }),
    language: str(q.language, { max: 50, field: 'Язык' }),
    pagesMin: int(q.pagesMin, { min: 0, field: 'Страниц от' }),
    pagesMax: int(q.pagesMax, { min: 0, field: 'Страниц до' }),
    sort: SORTS.includes(q.sort) ? q.sort : 'rating',
    page: int(q.page, { min: 1, field: 'Страница' }) || 1,
    limit: Math.min(int(q.limit, { min: 1, field: 'Лимит' }) || 12, 100),
  };
}

const viewer = (req) => req.user?.id || 0;
const isAdmin = (req) => req.user?.role === 'admin';

async function list(req, res) {
  const filters = parseFilters(req.query);
  const includeArchived = isAdmin(req) && req.query.archived === '1';
  res.json(await Book.search(filters, { userId: viewer(req), includeArchived }));
}

async function top(req, res) {
  const limit = Math.min(int(req.query.limit, { min: 1 }) || 10, 50);
  res.json(await Book.top(limit, viewer(req)));
}

async function latest(req, res) {
  const limit = Math.min(int(req.query.limit, { min: 1 }) || 8, 50);
  res.json(await Book.latest(limit, viewer(req)));
}

async function languages(req, res) {
  res.json(await Book.languages());
}

async function get(req, res) {
  const book = await Book.findById(idParam(req.params.id), viewer(req));
  // Архивная книга видна только администратору и тем, у кого она уже на полке
  if (!book || (book.isArchived && !isAdmin(req) && !book.shelfStatus)) throw notFound('Книга не найдена');
  res.json(book);
}

async function readBookBody(body) {
  const data = {
    title: str(body.title, { required: true, max: 300, field: 'Название' }),
    authorId: int(body.authorId, { required: true, min: 1, field: 'Автор' }),
    genreId: int(body.genreId, { required: true, min: 1, field: 'Жанр' }),
    year: int(body.year, { min: 0, max: new Date().getFullYear() + 1, field: 'Год издания' }),
    isbn: str(body.isbn, { max: 20, field: 'ISBN' }),
    publisher: str(body.publisher, { max: 200, field: 'Издательство' }),
    language: str(body.language, { max: 50, field: 'Язык' }),
    pages: int(body.pages, { min: 1, max: 100000, field: 'Количество страниц' }),
    annotation: str(body.annotation, { max: 20000, field: 'Аннотация' }),
  };
  if (data.isbn && !ISBN_RE.test(data.isbn)) throw badRequest('ISBN: допустимы цифры, «X» и дефисы');
  if (!(await Author.findById(data.authorId))) throw badRequest('Автор не найден');
  if (!(await Genre.findById(data.genreId))) throw badRequest('Жанр не найден');
  return data;
}

/** Обложка: загруженный файл, внешняя ссылка или удаление текущей. */
function resolveCover(req, current = null) {
  if (req.file) return `/uploads/${req.file.filename}`;
  if (req.body.removeCover === 'true' || req.body.removeCover === true) return null;
  const url = str(req.body.coverUrl, { max: 500, field: 'Ссылка на обложку' });
  if (url && url !== current && !/^https?:\/\//i.test(url)) throw badRequest('Ссылка на обложку должна начинаться с http(s)://');
  return url ?? current;
}

async function create(req, res) {
  try {
    const data = await readBookBody(req.body);
    data.coverUrl = resolveCover(req);
    const id = await Book.create(data);
    res.status(201).json(await Book.findById(id, viewer(req)));
  } catch (err) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw err;
  }
}

async function update(req, res) {
  const id = idParam(req.params.id);
  try {
    const existing = await Book.findById(id);
    if (!existing) throw notFound('Книга не найдена');
    const data = await readBookBody(req.body);
    data.coverUrl = resolveCover(req, existing.coverUrl);
    await Book.update(id, data);
    if (existing.coverUrl !== data.coverUrl) removeUpload(existing.coverUrl);
    res.json(await Book.findById(id, viewer(req)));
  } catch (err) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw err;
  }
}

async function archive(req, res) {
  const archived = req.body.archived !== false;
  if (!(await Book.setArchived(idParam(req.params.id), archived))) throw notFound('Книга не найдена');
  res.json({ ok: true, archived });
}

async function remove(req, res) {
  const id = idParam(req.params.id);
  const existing = await Book.findById(id);
  if (!existing || !(await Book.remove(id))) throw notFound('Книга не найдена');
  removeUpload(existing.coverUrl);
  res.json({ ok: true });
}

module.exports = { list, top, latest, languages, get, create, update, archive, remove };
