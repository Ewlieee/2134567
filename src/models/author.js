const { query, like } = require('../config/db');

const COLUMNS = `
  a.Id AS id, a.Name AS name, a.BirthYear AS birthYear, a.DeathYear AS deathYear,
  a.Country AS country, a.Bio AS bio,
  (SELECT COUNT(*) FROM dbo.Books b WHERE b.AuthorId = a.Id AND b.IsArchived = 0) AS bookCount`;

async function list({ q } = {}) {
  const r = await query(
    `SELECT ${COLUMNS} FROM dbo.Authors a
     WHERE @q IS NULL OR a.Name LIKE @q
     ORDER BY a.Name COLLATE Cyrillic_General_CI_AS`,
    { q: like(q) }
  );
  return r.recordset;
}

async function findById(id) {
  const r = await query(`SELECT ${COLUMNS} FROM dbo.Authors a WHERE a.Id = @id`, { id });
  return r.recordset[0] || null;
}

async function findByName(name, executor) {
  const r = await query('SELECT Id AS id FROM dbo.Authors WHERE Name = @name', { name }, executor);
  return r.recordset[0] || null;
}

async function create({ name, birthYear, deathYear, country, bio }, executor) {
  const r = await query(
    `INSERT INTO dbo.Authors (Name, BirthYear, DeathYear, Country, Bio)
     OUTPUT INSERTED.Id AS id VALUES (@name, @birthYear, @deathYear, @country, @bio)`,
    { name, birthYear, deathYear, country, bio },
    executor
  );
  return r.recordset[0].id;
}

async function update(id, { name, birthYear, deathYear, country, bio }) {
  const r = await query(
    `UPDATE dbo.Authors SET Name = @name, BirthYear = @birthYear, DeathYear = @deathYear,
       Country = @country, Bio = @bio WHERE Id = @id`,
    { id, name, birthYear, deathYear, country, bio }
  );
  return r.rowsAffected[0] > 0;
}

async function hasBooks(id) {
  const r = await query('SELECT COUNT(*) AS n FROM dbo.Books WHERE AuthorId = @id', { id });
  return r.recordset[0].n > 0;
}

async function remove(id) {
  const r = await query('DELETE FROM dbo.Authors WHERE Id = @id', { id });
  return r.rowsAffected[0] > 0;
}

module.exports = { list, findById, findByName, create, update, hasBooks, remove };
