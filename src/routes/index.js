const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { coverUpload } = require('../middleware/upload');
const auth = require('../controllers/authController');
const books = require('../controllers/bookController');
const { authors, genres } = require('../controllers/catalogController');
const shelf = require('../controllers/shelfController');
const reviews = require('../controllers/reviewController');
const requests = require('../controllers/requestController');
const news = require('../controllers/newsController');
const admin = require('../controllers/adminController');

const router = Router();

// Авторизация и профиль
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);
router.get('/profile', requireAuth, auth.profile);
router.put('/profile', requireAuth, auth.updateProfile);
router.put('/profile/password', requireAuth, auth.changePassword);

// Книги
router.get('/books', books.list);
router.get('/books/top', books.top);
router.get('/books/latest', books.latest);
router.get('/books/languages', books.languages);
router.get('/books/:id', books.get);
router.post('/books', requireAdmin, coverUpload, books.create);
router.put('/books/:id', requireAdmin, coverUpload, books.update);
router.patch('/books/:id/archive', requireAdmin, books.archive);
router.delete('/books/:id', requireAdmin, books.remove);

// Отзывы
router.get('/books/:id/reviews', reviews.listForBook);
router.post('/books/:id/reviews', requireAuth, reviews.create);
router.put('/reviews/:id', requireAuth, reviews.update);
router.delete('/reviews/:id', requireAuth, reviews.remove);

// Авторы и жанры
router.get('/authors', authors.list);
router.get('/authors/:id', authors.get);
router.post('/authors', requireAdmin, authors.create);
router.put('/authors/:id', requireAdmin, authors.update);
router.delete('/authors/:id', requireAdmin, authors.remove);

router.get('/genres', genres.list);
router.get('/genres/popular', genres.popular);
router.get('/genres/:id', genres.get);
router.post('/genres', requireAdmin, genres.create);
router.put('/genres/:id', requireAdmin, genres.update);
router.delete('/genres/:id', requireAdmin, genres.remove);

// Личная полка
router.get('/shelf', requireAuth, shelf.list);
router.put('/shelf/:bookId', requireAuth, shelf.set);
router.delete('/shelf/:bookId', requireAuth, shelf.remove);

// Заявки на добавление книг
router.get('/requests/my', requireAuth, requests.mine);
router.post('/requests', requireAuth, requests.create);
router.delete('/requests/:id', requireAuth, requests.cancel);
router.get('/requests', requireAdmin, requests.list);
router.post('/requests/:id/approve', requireAdmin, requests.approve);
router.post('/requests/:id/reject', requireAdmin, requests.reject);

// Новости
router.get('/news', news.list);
router.get('/news/:id', news.get);
router.post('/news', requireAdmin, news.create);
router.put('/news/:id', requireAdmin, news.update);
router.delete('/news/:id', requireAdmin, news.remove);

// Администрирование
router.get('/admin/stats', requireAdmin, admin.stats);
router.get('/admin/users', requireAdmin, admin.users);
router.patch('/admin/users/:id/block', requireAdmin, admin.setBlocked);
router.get('/admin/reviews', requireAdmin, reviews.listAll);

module.exports = router;
