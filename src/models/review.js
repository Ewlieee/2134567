const { query, like } = require('../config/db');

const COLUMNS = `
  r.Id AS id, r.BookId AS bookId, r.UserId AS userId, r.Rating AS rating, r.Text AS text,
  r.CreatedAt AS createdAt, r.UpdatedAt AS updatedAt,
  u.Username AS username, ISNULL(u.DisplayName, u.Username) AS userName`;

async function listForBook(bookId) {
  const r = await query(
    `SELECT ${COLUMNS} FROM dbo.Reviews r JOIN dbo.Users u ON u.Id = r.UserId
     WHERE r.BookId = @bookId ORDER BY ISNULL(r.UpdatedAt, r.CreatedAt) DESC`,
    { bookId }
  );
  return r.recordset;
}

async function findById(id) {
  const r = await query(`SELECT ${COLUMNS} FROM dbo.Reviews r JOIN dbo.Users u ON u.Id = r.UserId WHERE r.Id = @id`, {
    id,
  });
  return r.recordset[0] || null;
}

async function findByUserAndBook(userId, bookId) {
  const r = await query('SELECT Id AS id FROM dbo.Reviews WHERE UserId = @userId AND BookId = @bookId', {
    userId, bookId,
  });
  return r.recordset[0] || null;
}

async function create({ userId, bookId, rating, text }) {
  const r = await query(
    `INSERT INTO dbo.Reviews (UserId, BookId, Rating, Text) OUTPUT INSERTED.Id AS id
     VALUES (@userId, @bookId, @rating, @text)`,
    { userId, bookId, rating, text }
  );
  return findById(r.recordset[0].id);
}

async function update(id, { rating, text }) {
  await query('UPDATE dbo.Reviews SET Rating = @rating, Text = @text, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id', {
    id, rating, text,
  });
  return findById(id);
}

async function remove(id) {
  const r = await query('DELETE FROM dbo.Reviews WHERE Id = @id', { id });
  return r.rowsAffected[0] > 0;
}

/** Все отзывы для модерации. */
async function listAll({ q }) {
  const r = await query(
    `SELECT TOP 200 ${COLUMNS}, b.Title AS bookTitle
     FROM dbo.Reviews r
     JOIN dbo.Users u ON u.Id = r.UserId
     JOIN dbo.Books b ON b.Id = r.BookId
     WHERE @q IS NULL OR r.Text LIKE @q OR b.Title LIKE @q OR u.Username LIKE @q
     ORDER BY r.CreatedAt DESC`,
    { q: like(q) }
  );
  return r.recordset;
}

module.exports = { listForBook, findById, findByUserAndBook, create, update, remove, listAll };
