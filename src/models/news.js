const { query } = require('../config/db');

const COLUMNS = `
  n.Id AS id, n.Title AS title, n.Body AS body, n.CreatedAt AS createdAt,
  ISNULL(u.DisplayName, u.Username) AS authorName`;

const FROM = 'FROM dbo.News n LEFT JOIN dbo.Users u ON u.Id = n.AuthorId';

async function list(limit = 50) {
  const r = await query(`SELECT TOP (@limit) ${COLUMNS} ${FROM} ORDER BY n.CreatedAt DESC`, { limit });
  return r.recordset;
}

async function findById(id) {
  const r = await query(`SELECT ${COLUMNS} ${FROM} WHERE n.Id = @id`, { id });
  return r.recordset[0] || null;
}

async function create({ title, body, authorId }) {
  const r = await query(
    'INSERT INTO dbo.News (Title, Body, AuthorId) OUTPUT INSERTED.Id AS id VALUES (@title, @body, @authorId)',
    { title, body, authorId }
  );
  return findById(r.recordset[0].id);
}

async function update(id, { title, body }) {
  const r = await query('UPDATE dbo.News SET Title = @title, Body = @body WHERE Id = @id', { id, title, body });
  return r.rowsAffected[0] > 0 ? findById(id) : null;
}

async function remove(id) {
  const r = await query('DELETE FROM dbo.News WHERE Id = @id', { id });
  return r.rowsAffected[0] > 0;
}

module.exports = { list, findById, create, update, remove };
