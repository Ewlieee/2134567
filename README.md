# Книжная полка

Веб-приложение для каталогизации книг, ведения личной читательской полки, отслеживания прогресса чтения и обмена отзывами.

**Стек:** HTML5 / CSS3 / Vanilla JS (SPA) · Node.js + Express.js · Microsoft SQL Server (драйвер `mssql`).

## Быстрый старт — одной командой

Нужен только [Docker](https://www.docker.com/products/docker-desktop/) (на Windows 10 — Docker Desktop). Node.js и SQL Server устанавливать не нужно.

```bash
docker compose up --build -d --wait
```

Команда соберёт приложение, запустит SQL Server, при первом запуске создаст базу с демо-данными и дождётся готовности. Откройте http://localhost:3000.

Если установлен `make` (Linux, macOS), те же действия короче:

| `make` | `docker compose` | Действие |
|---|---|---|
| `make up` | `docker compose up --build -d --wait` | Собрать и запустить |
| `make down` | `docker compose down` | Остановить (данные сохраняются) |
| `make logs` | `docker compose logs -f` | Логи |
| `make reset` | `docker compose exec app node scripts/init-db.js --reset` | Вернуть демо-данные (текущие данные удаляются) |
| `make clean` | `docker compose down -v` | Остановить и удалить базу и обложки |

База и загруженные обложки хранятся в Docker-томах и сохраняются между перезапусками. Порт, пароль SQL Server и секрет JWT можно переопределить переменными `APP_PORT`, `MSSQL_SA_PASSWORD`, `JWT_SECRET`.

Ниже — установка без Docker, на локальный SQL Server.

## Возможности

| Роль | Что доступно |
|---|---|
| Гость | Главная (поиск, популярные жанры, топ-10, новинки, новости), каталог с поиском по названию/автору/ISBN, фильтрами (жанр, автор, год, язык, страницы) и сортировкой, страницы книг, авторов, жанров, отзывы, регистрация и вход |
| Читатель | Профиль и смена пароля, личная полка («Хочу прочитать» / «Читаю» / «Прочитано»), текущая страница и прогресс-бар, один отзыв с оценкой 1–5 на книгу (редактирование и удаление), заявки на добавление книг и их статусы |
| Администратор | Дашборд (книги, пользователи, отзывы, активные заявки, график добавления книг по месяцам), книги (создание, редактирование, обложки, архив, удаление), авторы, жанры, модерация заявок и отзывов, блокировка пользователей, новости |

Правила из требований соблюдаются на уровне БД: у книги ровно один автор и один жанр (FK), один отзыв на книгу от пользователя (UNIQUE), пароли хранятся как bcrypt-хеши.

## Установка (Windows 10, VS Code)

1. Установите [Node.js](https://nodejs.org/) версии 18 или новее.
2. Установите **Microsoft SQL Server** (подойдёт бесплатная редакция Express или Developer) и SQL Server Management Studio (SSMS).
3. Включите в SQL Server вход по паролю:
   - SSMS → свойства сервера → *Security* → **SQL Server and Windows Authentication mode**;
   - *Security → Logins → sa* → задайте пароль и включите вход (или создайте отдельный логин с правом `dbcreator`);
   - перезапустите службу SQL Server.
4. Включите протокол TCP/IP: *SQL Server Configuration Manager → SQL Server Network Configuration → Protocols → TCP/IP → Enabled*, затем перезапустите службу. Для именованного экземпляра (например, `SQLEXPRESS`) также запустите службу **SQL Server Browser**.
5. В папке проекта:
   ```bash
   npm install
   copy .env.example .env
   ```
   Откройте `.env` и укажите параметры подключения. Для SQL Server Express обычно:
   ```ini
   DB_SERVER=localhost
   DB_INSTANCE=SQLEXPRESS
   DB_USER=sa
   DB_PASSWORD=ваш_пароль
   ```
   Также замените `JWT_SECRET` на длинную случайную строку.
6. Создайте базу данных с демо-данными и запустите приложение:
   ```bash
   npm run db:init
   npm start
   ```
7. Откройте http://localhost:3000

### Демо-учётные записи

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `admin123` | Администратор |
| `reader` | `reader123` | Читатель (полка и отзывы уже заполнены) |
| `anna`, `ivan` | `anna123`, `ivan123` | Читатели |

### Команды

| Команда | Действие |
|---|---|
| `npm start` | Запуск сервера |
| `npm run dev` | Запуск с автоперезапуском при изменении файлов |
| `npm run db:init` | Создать БД и таблицы с демо-данными (если ещё не созданы) |
| `npm run db:reset` | Пересоздать таблицы — **все данные будут удалены** |

## Структура проекта

```text
docker-compose.yml        запуск приложения и SQL Server одной командой
Dockerfile                образ приложения
Makefile                  короткие команды для Docker Compose
server.js                 точка входа: подключение к БД и запуск Express
src/
  app.js                  настройка Express: статика, /api, SPA, обработка ошибок
  config/db.js            пул соединений mssql, параметризованные запросы, транзакции
  middleware/             auth.js (JWT в httpOnly-cookie, роли), upload.js (обложки, multer)
  routes/index.js         маршруты REST API
  controllers/            обработка запросов и валидация
  models/                 SQL-запросы к таблицам
  utils/http.js           ошибки HTTP и проверка входных данных
db/schema.sql             схема БД (таблицы, ключи, ограничения, индексы)
scripts/init-db.js        создание БД и загрузка демо-данных
public/                   фронтенд (SPA на ES-модулях, без сборки)
  js/app.js               роутер, шапка, состояние авторизации
  js/pages/               страницы приложения; admin/ — панель администратора
uploads/                  загруженные обложки книг
```

## REST API (кратко)

| Метод и путь | Доступ | Назначение |
|---|---|---|
| `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me` | все | Авторизация |
| `GET/PUT /api/profile`, `PUT /api/profile/password` | читатель | Профиль |
| `GET /api/books?q=&genre=&author=&yearFrom=&yearTo=&language=&pagesMin=&pagesMax=&sort=&page=` | все | Каталог |
| `GET /api/books/top`, `/latest`, `/languages`, `/:id` | все | Топ, новинки, языки, книга |
| `POST/PUT/DELETE /api/books[/:id]`, `PATCH /api/books/:id/archive` | админ | Управление книгами |
| `GET/POST /api/books/:id/reviews`; `PUT/DELETE /api/reviews/:id` | все / читатель | Отзывы |
| `GET/PUT/DELETE /api/shelf[/:bookId]` | читатель | Полка и прогресс |
| `GET /api/requests/my`, `POST /api/requests`, `DELETE /api/requests/:id` | читатель | Свои заявки |
| `GET /api/requests`, `POST /api/requests/:id/approve` / `reject` | админ | Модерация заявок |
| `/api/authors`, `/api/genres`, `/api/news` | чтение — все, изменение — админ | Справочники и новости |
| `GET /api/admin/stats`, `/users`, `/reviews`; `PATCH /api/admin/users/:id/block` | админ | Администрирование |
