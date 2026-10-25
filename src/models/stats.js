const { query } = require('../config/db');

async function summary() {
  const r = await query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Books WHERE IsArchived = 0) AS books,
      (SELECT COUNT(*) FROM dbo.Books WHERE IsArchived = 1) AS archivedBooks,
      (SELECT COUNT(*) FROM dbo.Users) AS users,
      (SELECT COUNT(*) FROM dbo.Users WHERE IsBlocked = 1) AS blockedUsers,
      (SELECT COUNT(*) FROM dbo.Reviews) AS reviews,
      (SELECT COUNT(*) FROM dbo.BookRequests WHERE Status = N'pending') AS pendingRequests,
      (SELECT COUNT(*) FROM dbo.Authors) AS authors,
      (SELECT COUNT(*) FROM dbo.Genres) AS genres`);
  return r.recordset[0];
}

/** Количество добавленных книг по месяцам за последние `months` месяцев (пустые месяцы — 0). */
async function booksByMonth(months = 12) {
  const r = await query(
    `SELECT FORMAT(CreatedAt, 'yyyy-MM') AS month, COUNT(*) AS count
     FROM dbo.Books
     WHERE CreatedAt >= DATEADD(MONTH, 1 - @months, DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1))
     GROUP BY FORMAT(CreatedAt, 'yyyy-MM')`,
    { months }
  );
  const byMonth = new Map(r.recordset.map((row) => [row.month, row.count]));
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, count: byMonth.get(key) || 0 });
  }
  return result;
}

module.exports = { summary, booksByMonth };
