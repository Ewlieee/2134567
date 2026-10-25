class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new HttpError(400, msg);
const notFound = (msg = 'Не найдено') => new HttpError(404, msg);
const forbidden = (msg = 'Доступ запрещён') => new HttpError(403, msg);
const conflict = (msg) => new HttpError(409, msg);

/** Обрезанная строка или null для пустого значения. */
function str(value, { max = 1000, required = false, field = 'Поле' } = {}) {
  const s = value === undefined || value === null ? '' : String(value).trim();
  if (!s) {
    if (required) throw badRequest(`${field}: обязательное поле`);
    return null;
  }
  if (s.length > max) throw badRequest(`${field}: не более ${max} символов`);
  return s;
}

/** Целое число или null для пустого значения. */
function int(value, { min = -Infinity, max = Infinity, required = false, field = 'Поле' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field}: обязательное поле`);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${field}: некорректное значение`);
  }
  return n;
}

/** Целочисленный параметр маршрута (:id). */
function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
}

module.exports = { HttpError, badRequest, notFound, forbidden, conflict, str, int, idParam };
