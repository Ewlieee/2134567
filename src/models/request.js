const { query } = require('../config/db');

const COLUMNS = `
  q.Id AS id, q.UserId AS userId, q.Title AS title, q.AuthorName AS authorName, q.Comment AS comment,
  q.Status AS status, q.AdminComment AS adminComment, q.BookId AS bookId,
  q.CreatedAt AS createdAt, q.ReviewedAt AS reviewedAt,
  u.Username AS username, ISNULL(u.DisplayName, u.Username) AS userName`;

const FROM = 'FROM dbo.BookRequests q JOIN dbo.Users u ON u.Id = q.UserId';

async function listForUser(userId) {
  const r = await query(`SELECT ${COLUMNS} ${FROM} WHERE q.UserId = @userId ORDER BY q.CreatedAt DESC`, { userId });
  return r.recordset;
}

async function list({ status }) {
  const r = await query(
    `SELECT ${COLUMNS} ${FROM} WHERE @status IS NULL OR q.Status = @status
     ORDER BY CASE q.Status WHEN N'pending' THEN 0 ELSE 1 END, q.CreatedAt DESC`,
    { status }
  );
  return r.recordset;
}

async function findById(id, executor) {
  const r = await query(`SELECT ${COLUMNS} ${FROM} WHERE q.Id = @id`, { id }, executor);
  return r.recordset[0] || null;
}

async function create({ userId, title, authorName, comment }) {
  const r = await query(
    `INSERT INTO dbo.BookRequests (UserId, Title, AuthorName, Comment) OUTPUT INSERTED.Id AS id
     VALUES (@userId, @title, @authorName, @comment)`,
    { userId, title, authorName, comment }
  );
  return findById(r.recordset[0].id);
}

/** Закрывает заявку; возвращает false, если она уже была рассмотрена. */
async function resolve(id, { status, adminComment, bookId }, executor) {
  const r = await query(
    `UPDATE dbo.BookRequests
     SET Status = @status, AdminComment = @adminComment, BookId = @bookId, ReviewedAt = SYSUTCDATETIME()
     WHERE Id = @id AND Status = N'pending'`,
    { id, status, adminComment, bookId: bookId ?? null },
    executor
  );
  return r.rowsAffected[0] > 0;
}

async function remove(id, userId) {
  const r = await query(
    `DELETE FROM dbo.BookRequests WHERE Id = @id AND UserId = @userId AND Status = N'pending'`,
    { id, userId }
  );
  return r.rowsAffected[0] > 0;
}

module.exports = { listForUser, list, findById, create, resolve, remove };
