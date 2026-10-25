const { query } = require('../config/db');

async function listForUser(userId) {
  const r = await query(
    `SELECT s.BookId AS bookId, s.Status AS status, s.CurrentPage AS currentPage,
       s.AddedAt AS addedAt, s.UpdatedAt AS updatedAt,
       b.Title AS title, b.Pages AS pages, b.CoverUrl AS coverUrl, b.IsArchived AS isArchived,
       b.AuthorId AS authorId, a.Name AS authorName, g.Name AS genreName,
       myr.Rating AS myRating
     FROM dbo.Shelf s
     JOIN dbo.Books b ON b.Id = s.BookId
     JOIN dbo.Authors a ON a.Id = b.AuthorId
     JOIN dbo.Genres g ON g.Id = b.GenreId
     LEFT JOIN dbo.Reviews myr ON myr.BookId = s.BookId AND myr.UserId = s.UserId
     WHERE s.UserId = @userId
     ORDER BY s.UpdatedAt DESC`,
    { userId }
  );
  return r.recordset;
}

async function find(userId, bookId) {
  const r = await query(
    `SELECT BookId AS bookId, Status AS status, CurrentPage AS currentPage
     FROM dbo.Shelf WHERE UserId = @userId AND BookId = @bookId`,
    { userId, bookId }
  );
  return r.recordset[0] || null;
}

/** Добавляет книгу на полку или обновляет её статус / прогресс. */
async function upsert(userId, bookId, { status, currentPage }) {
  await query(
    `MERGE dbo.Shelf WITH (HOLDLOCK) AS t
     USING (SELECT @userId AS UserId, @bookId AS BookId) AS src
       ON t.UserId = src.UserId AND t.BookId = src.BookId
     WHEN MATCHED THEN
       UPDATE SET Status = @status, CurrentPage = @currentPage, UpdatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (UserId, BookId, Status, CurrentPage) VALUES (@userId, @bookId, @status, @currentPage);`,
    { userId, bookId, status, currentPage }
  );
  return find(userId, bookId);
}

async function remove(userId, bookId) {
  const r = await query('DELETE FROM dbo.Shelf WHERE UserId = @userId AND BookId = @bookId', { userId, bookId });
  return r.rowsAffected[0] > 0;
}

async function countsForUser(userId) {
  const r = await query(
    `SELECT Status AS status, COUNT(*) AS n FROM dbo.Shelf WHERE UserId = @userId GROUP BY Status`,
    { userId }
  );
  const counts = { want: 0, reading: 0, read: 0 };
  for (const row of r.recordset) counts[row.status] = row.n;
  return counts;
}

module.exports = { listForUser, find, upsert, remove, countsForUser };
