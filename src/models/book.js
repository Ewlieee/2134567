const { query, like } = require('../config/db');

// Средний рейтинг и число отзывов считаются по таблице Reviews
const SELECT_BOOK = `
  SELECT b.Id AS id, b.Title AS title,
    b.AuthorId AS authorId, a.Name AS authorName,
    b.GenreId AS genreId, g.Name AS genreName,
    b.Year AS year, b.ISBN AS isbn, b.Publisher AS publisher, b.Language AS language,
    b.Pages AS pages, b.CoverUrl AS coverUrl, b.IsArchived AS isArchived, b.CreatedAt AS createdAt,
    ROUND(ISNULL(rs.avgRating, 0), 2) AS rating, ISNULL(rs.cnt, 0) AS reviewCount,
    s.Status AS shelfStatus`;

const FROM_BOOK = `
  FROM dbo.Books b
  JOIN dbo.Authors a ON a.Id = b.AuthorId
  JOIN dbo.Genres g ON g.Id = b.GenreId
  OUTER APPLY (
    SELECT AVG(CAST(r.Rating AS FLOAT)) AS avgRating, COUNT(*) AS cnt
    FROM dbo.Reviews r WHERE r.BookId = b.Id
  ) rs
  LEFT JOIN dbo.Shelf s ON s.BookId = b.Id AND s.UserId = @userId`;

const SORTS = {
  rating: 'rating DESC, reviewCount DESC, b.Title',
  new: 'b.CreatedAt DESC, b.Id DESC',
  title: 'b.Title COLLATE Cyrillic_General_CI_AS ASC',
  year: 'b.Year DESC, b.Title',
};

/**
 * Поиск по каталогу с фильтрами, сортировкой и пагинацией.
 * filters: { q, genreId, authorId, yearFrom, yearTo, language, pagesMin, pagesMax, sort, page, limit }
 */
async function search(filters, { userId = 0, includeArchived = false } = {}) {
  const where = [];
  const params = { userId };

  if (!includeArchived) where.push('b.IsArchived = 0');
  if (filters.q) {
    where.push('(b.Title LIKE @q OR a.Name LIKE @q OR REPLACE(b.ISBN, \'-\', \'\') LIKE @isbn)');
    params.q = like(filters.q);
    params.isbn = like(filters.q.replace(/-/g, ''));
  }
  const exact = { genreId: 'b.GenreId = @genreId', authorId: 'b.AuthorId = @authorId',
    yearFrom: 'b.Year >= @yearFrom', yearTo: 'b.Year <= @yearTo', language: 'b.Language = @language',
    pagesMin: 'b.Pages >= @pagesMin', pagesMax: 'b.Pages <= @pagesMax' };
  for (const [key, condition] of Object.entries(exact)) {
    if (filters[key] !== null && filters[key] !== undefined) {
      where.push(condition);
      params[key] = filters[key];
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  params.offset = (page - 1) * limit;
  params.limit = limit;

  const r = await query(
    `${SELECT_BOOK}, COUNT(*) OVER () AS totalCount
     ${FROM_BOOK}
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY ${SORTS[filters.sort] || SORTS.rating}
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  const total = r.recordset[0]?.totalCount || 0;
  const items = r.recordset.map(({ totalCount, ...book }) => book);
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function top(limit, userId = 0) {
  const r = await query(
    `SELECT TOP (@limit) * FROM (${SELECT_BOOK} ${FROM_BOOK} WHERE b.IsArchived = 0) t
     WHERE t.reviewCount > 0
     ORDER BY t.rating DESC, t.reviewCount DESC, t.title`,
    { limit, userId }
  );
  return r.recordset;
}

async function latest(limit, userId = 0) {
  const r = await query(
    `${SELECT_BOOK} ${FROM_BOOK} WHERE b.IsArchived = 0
     ORDER BY b.CreatedAt DESC, b.Id DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`,
    { limit, userId }
  );
  return r.recordset;
}

async function findById(id, userId = 0) {
  const r = await query(
    `${SELECT_BOOK}, b.Annotation AS annotation, s.CurrentPage AS currentPage
     ${FROM_BOOK} WHERE b.Id = @id`,
    { id, userId }
  );
  return r.recordset[0] || null;
}

async function languages() {
  const r = await query(
    `SELECT DISTINCT Language AS language FROM dbo.Books
     WHERE IsArchived = 0 AND Language IS NOT NULL ORDER BY Language`
  );
  return r.recordset.map((row) => row.language);
}

const FIELDS = ['title', 'authorId', 'genreId', 'year', 'isbn', 'publisher', 'language', 'pages', 'annotation', 'coverUrl'];

async function create(data, executor) {
  const params = Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? null]));
  const r = await query(
    `INSERT INTO dbo.Books (Title, AuthorId, GenreId, Year, ISBN, Publisher, Language, Pages, Annotation, CoverUrl)
     OUTPUT INSERTED.Id AS id
     VALUES (@title, @authorId, @genreId, @year, @isbn, @publisher, @language, @pages, @annotation, @coverUrl)`,
    params,
    executor
  );
  return r.recordset[0].id;
}

async function update(id, data) {
  const params = Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? null]));
  await query(
    `UPDATE dbo.Books SET Title = @title, AuthorId = @authorId, GenreId = @genreId, Year = @year,
       ISBN = @isbn, Publisher = @publisher, Language = @language, Pages = @pages,
       Annotation = @annotation, CoverUrl = @coverUrl
     WHERE Id = @id`,
    { ...params, id }
  );
}

async function setArchived(id, archived) {
  const r = await query('UPDATE dbo.Books SET IsArchived = @archived WHERE Id = @id', { id, archived });
  return r.rowsAffected[0] > 0;
}

async function remove(id) {
  const r = await query('DELETE FROM dbo.Books WHERE Id = @id', { id });
  return r.rowsAffected[0] > 0;
}

module.exports = { search, top, latest, findById, languages, create, update, setArchived, remove };
