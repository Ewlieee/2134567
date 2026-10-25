// Авторы и жанры
const Author = require('../models/author');
const Genre = require('../models/genre');
const { badRequest, conflict, notFound, str, int, idParam } = require('../utils/http');

function readAuthor(body) {
  const data = {
    name: str(body.name, { required: true, max: 200, field: 'Имя автора' }),
    birthYear: int(body.birthYear, { min: -3000, max: 3000, field: 'Год рождения' }),
    deathYear: int(body.deathYear, { min: -3000, max: 3000, field: 'Год смерти' }),
    country: str(body.country, { max: 100, field: 'Страна' }),
    bio: str(body.bio, { max: 20000, field: 'Биография' }),
  };
  if (data.birthYear && data.deathYear && data.deathYear < data.birthYear) {
    throw badRequest('Год смерти не может быть раньше года рождения');
  }
  return data;
}

function readGenre(body) {
  return {
    name: str(body.name, { required: true, max: 100, field: 'Название жанра' }),
    description: str(body.description, { max: 1000, field: 'Описание' }),
  };
}

// Нарушение уникальности в MS SQL Server — ошибки 2627 / 2601
const isDuplicate = (err) => err.number === 2627 || err.number === 2601;

const authors = {
  async list(req, res) {
    res.json(await Author.list({ q: str(req.query.q, { max: 200 }) }));
  },
  async get(req, res) {
    const author = await Author.findById(idParam(req.params.id));
    if (!author) throw notFound('Автор не найден');
    res.json(author);
  },
  async create(req, res) {
    try {
      const id = await Author.create(readAuthor(req.body));
      res.status(201).json(await Author.findById(id));
    } catch (err) {
      if (isDuplicate(err)) throw conflict('Автор с таким именем уже существует');
      throw err;
    }
  },
  async update(req, res) {
    const id = idParam(req.params.id);
    try {
      if (!(await Author.update(id, readAuthor(req.body)))) throw notFound('Автор не найден');
    } catch (err) {
      if (isDuplicate(err)) throw conflict('Автор с таким именем уже существует');
      throw err;
    }
    res.json(await Author.findById(id));
  },
  async remove(req, res) {
    const id = idParam(req.params.id);
    if (await Author.hasBooks(id)) throw conflict('Нельзя удалить автора, у которого есть книги');
    if (!(await Author.remove(id))) throw notFound('Автор не найден');
    res.json({ ok: true });
  },
};

const genres = {
  async list(req, res) {
    res.json(await Genre.list());
  },
  async popular(req, res) {
    res.json(await Genre.popular(Math.min(int(req.query.limit, { min: 1 }) || 8, 50)));
  },
  async get(req, res) {
    const genre = await Genre.findById(idParam(req.params.id));
    if (!genre) throw notFound('Жанр не найден');
    res.json(genre);
  },
  async create(req, res) {
    try {
      const id = await Genre.create(readGenre(req.body));
      res.status(201).json(await Genre.findById(id));
    } catch (err) {
      if (isDuplicate(err)) throw conflict('Такой жанр уже существует');
      throw err;
    }
  },
  async update(req, res) {
    const id = idParam(req.params.id);
    try {
      if (!(await Genre.update(id, readGenre(req.body)))) throw notFound('Жанр не найден');
    } catch (err) {
      if (isDuplicate(err)) throw conflict('Такой жанр уже существует');
      throw err;
    }
    res.json(await Genre.findById(id));
  },
  async remove(req, res) {
    const id = idParam(req.params.id);
    if (await Genre.hasBooks(id)) throw conflict('Нельзя удалить жанр, к которому привязаны книги');
    if (!(await Genre.remove(id))) throw notFound('Жанр не найден');
    res.json({ ok: true });
  },
};

module.exports = { authors, genres };
