const Review = require('../models/review');
const Book = require('../models/book');
const { conflict, forbidden, notFound, str, int, idParam } = require('../utils/http');

function readReview(body) {
  return {
    rating: int(body.rating, { required: true, min: 1, max: 5, field: 'Оценка' }),
    text: str(body.text, { max: 4000, field: 'Текст отзыва' }),
  };
}

async function listForBook(req, res) {
  res.json(await Review.listForBook(idParam(req.params.id)));
}

async function create(req, res) {
  const bookId = idParam(req.params.id);
  const book = await Book.findById(bookId, req.user.id);
  if (!book || (book.isArchived && !book.shelfStatus)) throw notFound('Книга не найдена');
  if (await Review.findByUserAndBook(req.user.id, bookId)) {
    throw conflict('Вы уже оставили отзыв на эту книгу — его можно отредактировать');
  }
  try {
    res.status(201).json(await Review.create({ userId: req.user.id, bookId, ...readReview(req.body) }));
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) throw conflict('Вы уже оставили отзыв на эту книгу');
    throw err;
  }
}

async function loadOwned(req) {
  const review = await Review.findById(idParam(req.params.id));
  if (!review) throw notFound('Отзыв не найден');
  return review;
}

async function update(req, res) {
  const review = await loadOwned(req);
  if (review.userId !== req.user.id) throw forbidden('Можно редактировать только свой отзыв');
  res.json(await Review.update(review.id, readReview(req.body)));
}

/** Удалить может автор отзыва или администратор (модерация). */
async function remove(req, res) {
  const review = await loadOwned(req);
  if (review.userId !== req.user.id && req.user.role !== 'admin') throw forbidden();
  await Review.remove(review.id);
  res.json({ ok: true });
}

async function listAll(req, res) {
  res.json(await Review.listAll({ q: str(req.query.q, { max: 200 }) }));
}

module.exports = { listForBook, create, update, remove, listAll };
