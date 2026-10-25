const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { HttpError } = require('../utils/http');

const COOKIE_NAME = 'token';
const TOKEN_TTL_DAYS = 7;

function secret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function issueToken(res, user) {
  const token = jwt.sign({ id: user.id }, secret(), { expiresIn: `${TOKEN_TTL_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME);
}

/** Определяет текущего пользователя по cookie (если есть). Заблокированные считаются гостями. */
async function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, secret());
    const user = await User.findById(payload.id);
    if (user && !user.isBlocked) req.user = user;
    else clearToken(res);
  } catch {
    clearToken(res);
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Требуется авторизация'));
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Требуется авторизация'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Доступно только администратору'));
  next();
}

module.exports = { issueToken, clearToken, loadUser, requireAuth, requireAdmin };
