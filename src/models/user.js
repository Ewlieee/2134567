const { query, like } = require('../config/db');

const PUBLIC_COLUMNS = `
  u.Id AS id, u.Username AS username, u.Email AS email, u.DisplayName AS displayName,
  u.Bio AS bio, u.Role AS role, u.IsBlocked AS isBlocked, u.CreatedAt AS createdAt`;

async function findById(id) {
  const r = await query(`SELECT ${PUBLIC_COLUMNS} FROM dbo.Users u WHERE u.Id = @id`, { id });
  return r.recordset[0] || null;
}

/** Поиск по логину или email; возвращает и хеш пароля для проверки. */
async function findByLogin(login) {
  const r = await query(
    `SELECT ${PUBLIC_COLUMNS}, u.PasswordHash AS passwordHash
     FROM dbo.Users u WHERE u.Username = @login OR u.Email = @login`,
    { login }
  );
  return r.recordset[0] || null;
}

async function findPasswordHash(id) {
  const r = await query('SELECT PasswordHash AS passwordHash FROM dbo.Users WHERE Id = @id', { id });
  return r.recordset[0]?.passwordHash || null;
}

/** Возвращает 'username' / 'email', если значение уже занято другим пользователем. */
async function findTaken({ username, email }, exceptId = 0) {
  const r = await query(
    `SELECT TOP 1 CASE WHEN Username = @username THEN 'username' ELSE 'email' END AS field
     FROM dbo.Users WHERE (Username = @username OR Email = @email) AND Id <> @exceptId`,
    { username: username ?? '', email: email ?? '', exceptId }
  );
  return r.recordset[0]?.field || null;
}

async function create({ username, email, passwordHash, displayName }) {
  const r = await query(
    `INSERT INTO dbo.Users (Username, Email, PasswordHash, DisplayName)
     OUTPUT INSERTED.Id AS id
     VALUES (@username, @email, @passwordHash, @displayName)`,
    { username, email, passwordHash, displayName }
  );
  return findById(r.recordset[0].id);
}

async function updateProfile(id, { displayName, email, bio }) {
  await query(
    `UPDATE dbo.Users SET DisplayName = @displayName, Email = @email, Bio = @bio WHERE Id = @id`,
    { id, displayName, email, bio }
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await query('UPDATE dbo.Users SET PasswordHash = @passwordHash WHERE Id = @id', { id, passwordHash });
}

async function list({ q }) {
  const r = await query(
    `SELECT ${PUBLIC_COLUMNS},
       (SELECT COUNT(*) FROM dbo.Reviews WHERE UserId = u.Id) AS reviewCount,
       (SELECT COUNT(*) FROM dbo.Shelf WHERE UserId = u.Id) AS shelfCount
     FROM dbo.Users u
     WHERE @q IS NULL OR u.Username LIKE @like OR u.Email LIKE @like OR u.DisplayName LIKE @like
     ORDER BY u.CreatedAt DESC`,
    { q, like: like(q) }
  );
  return r.recordset;
}

async function setBlocked(id, blocked) {
  const r = await query('UPDATE dbo.Users SET IsBlocked = @blocked WHERE Id = @id', { id, blocked });
  return r.rowsAffected[0] > 0;
}

module.exports = {
  findById, findByLogin, findPasswordHash, findTaken, create, updateProfile, updatePassword, list, setBlocked,
};
