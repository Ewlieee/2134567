const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Shelf = require('../models/shelf');
const { issueToken, clearToken } = require('../middleware/auth');
const { HttpError, badRequest, conflict, forbidden, str } = require('../utils/http');

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

function checkEmail(email) {
  if (!EMAIL_RE.test(email)) throw badRequest('Некорректный email');
  return email.toLowerCase();
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw badRequest('Пароль должен содержать не менее 6 символов');
  }
  if (password.length > 72) throw badRequest('Пароль слишком длинный');
  return password;
}

async function ensureFree(fields, exceptId) {
  const taken = await User.findTaken(fields, exceptId);
  if (taken === 'username') throw conflict('Этот логин уже занят');
  if (taken === 'email') throw conflict('Этот email уже зарегистрирован');
}

async function register(req, res) {
  const username = str(req.body.username, { required: true, field: 'Логин', max: 30 });
  if (!USERNAME_RE.test(username)) {
    throw badRequest('Логин: 3–30 символов, латинские буквы, цифры, «_», «.», «-»');
  }
  const email = checkEmail(str(req.body.email, { required: true, field: 'Email', max: 255 }));
  const password = checkPassword(req.body.password);
  const displayName = str(req.body.displayName, { field: 'Имя', max: 100 });

  await ensureFree({ username, email });
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, email, passwordHash, displayName });
  issueToken(res, user);
  res.status(201).json({ user });
}

async function login(req, res) {
  const login = str(req.body.login, { required: true, field: 'Логин' });
  const password = String(req.body.password || '');
  const user = await User.findByLogin(login.includes('@') ? login.toLowerCase() : login);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Неверный логин или пароль');
  }
  if (user.isBlocked) throw forbidden('Учётная запись заблокирована администратором');
  delete user.passwordHash;
  issueToken(res, user);
  res.json({ user });
}

function logout(req, res) {
  clearToken(res);
  res.json({ ok: true });
}

function me(req, res) {
  res.json({ user: req.user });
}

async function profile(req, res) {
  const counts = await Shelf.countsForUser(req.user.id);
  res.json({ user: req.user, shelf: counts });
}

async function updateProfile(req, res) {
  const email = checkEmail(str(req.body.email, { required: true, field: 'Email', max: 255 }));
  const displayName = str(req.body.displayName, { field: 'Имя', max: 100 });
  const bio = str(req.body.bio, { field: 'О себе', max: 1000 });
  await ensureFree({ email }, req.user.id);
  const user = await User.updateProfile(req.user.id, { email, displayName, bio });
  res.json({ user });
}

async function changePassword(req, res) {
  const hash = await User.findPasswordHash(req.user.id);
  if (!(await bcrypt.compare(String(req.body.currentPassword || ''), hash))) {
    throw badRequest('Текущий пароль указан неверно');
  }
  const password = checkPassword(req.body.newPassword);
  await User.updatePassword(req.user.id, await bcrypt.hash(password, BCRYPT_ROUNDS));
  res.json({ ok: true });
}

module.exports = { register, login, logout, me, profile, updateProfile, changePassword };
