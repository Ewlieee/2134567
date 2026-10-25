const Shelf = require('../models/shelf');
const Book = require('../models/book');
const { badRequest, notFound, int, idParam } = require('../utils/http');

const STATUSES = ['want', 'reading', 'read'];

async function list(req, res) {
  res.json(await Shelf.listForUser(req.user.id));
}

/** Добавить книгу на полку / сменить статус / обновить текущую страницу. */
async function set(req, res) {
  const bookId = idParam(req.params.bookId);
  const book = await Book.findById(bookId, req.user.id);
  if (!book || (book.isArchived && !book.shelfStatus)) throw notFound('Книга не найдена');

  let status = req.body.status ?? book.shelfStatus ?? 'want';
  if (!STATUSES.includes(status)) throw badRequest('Некорректный статус');

  let currentPage = int(req.body.currentPage, { min: 0, field: 'Текущая страница' });
  if (currentPage === null) currentPage = book.currentPage ?? 0;
  if (book.pages && currentPage > book.pages) {
    throw badRequest(`Текущая страница не может быть больше ${book.pages}`);
  }

  let completed = false;
  if (status === 'want') currentPage = 0;
  if (status === 'read' && book.pages) currentPage = book.pages;
  // Дочитали до последней страницы — книга автоматически переходит в «Прочитано»
  if (status === 'reading' && book.pages && currentPage === book.pages) {
    status = 'read';
    completed = true;
  }

  const entry = await Shelf.upsert(req.user.id, bookId, { status, currentPage });
  res.json({ ...entry, pages: book.pages, completed });
}

async function remove(req, res) {
  if (!(await Shelf.remove(req.user.id, idParam(req.params.bookId)))) throw notFound('Книги нет на полке');
  res.json({ ok: true });
}

module.exports = { list, set, remove };
