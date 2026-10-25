const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { loadUser } = require('./middleware/auth');
const apiRoutes = require('./routes');

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));
app.use('/uploads', (req, res) => res.status(404).end());
app.use(express.static(PUBLIC_DIR));

app.use('/api', loadUser, apiRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Метод API не найден' }));

// SPA: остальные GET-запросы отдают index.html
app.get(/.*/, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Файл обложки больше 5 МБ' : 'Ошибка загрузки файла';
    return res.status(400).json({ error: message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Внутренняя ошибка сервера' : err.message });
});

module.exports = app;
