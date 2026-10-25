const { query } = require('../config/db');

const COLUMNS = `
  g.Id AS id, g.Name AS name, g.Description AS description,
  (SELECT COUNT(*) FROM dbo.Books b WHERE b.GenreId = g.Id AND b.IsArchived = 0) AS bookCount`;

async function list() {
  const r = await query(`SELECT ${COLUMNS} FROM dbo.Genres g ORDER BY g.Name COLLATE Cyrillic_General_CI_AS`);
  return r.recordset;
}

/** Популярные жанры — по числу книг на полках читателей, затем по числу книг. */
async function popular(limit) {
  const r = await query(
    `SELECT TOP (@limit) ${COLUMNS},
       (SELECT COUNT(*) FROM dbo.Shelf s JOIN dbo.Books b ON b.Id = s.BookId WHERE b.GenreId = g.Id) AS readers
     FROM dbo.Genres g
     ORDER BY readers DESC, bookCount DESC, g.Name`,
    { limit }
  );
  return r.recordset;
}

async function findById(id) {
  const r = await query(`SELECT ${COLUMNS} FROM dbo.Genres g WHERE g.Id = @id`, { id });
  return r.recordset[0] || null;
}

async function create({ name, description }) {
  const r = await query(
    'INSERT INTO dbo.Genres (Name, Description) OUTPUT INSERTED.Id AS id VALUES (@name, @description)',
    { name, description }
  );
  return r.recordset[0].id;
}

async function update(id, { name, description }) {
  const r = await query('UPDATE dbo.Genres SET Name = @name, Description = @description WHERE Id = @id', {
    id, name, description,
  });
  return r.rowsAffected[0] > 0;
}

async function hasBooks(id) {
  const r = await query('SELECT COUNT(*) AS n FROM dbo.Books WHERE GenreId = @id', { id });
  return r.recordset[0].n > 0;
}

async function remove(id) {
  const r = await query('DELETE FROM dbo.Genres WHERE Id = @id', { id });
  return r.rowsAffected[0] > 0;
}

module.exports = { list, popular, findById, create, update, hasBooks, remove };
