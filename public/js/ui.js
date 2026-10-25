// Шаблоны, форматирование и общие элементы интерфейса

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(String(s));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderValue(v) {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (v instanceof Raw) return v.s;
  return esc(v);
}

/** Тегированный шаблон: все подстановки экранируются, кроме raw() и вложенных html``. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += renderValue(v) + strings[i + 1]; });
  return new Raw(out);
}

export function mount(root, content) {
  root.innerHTML = String(content);
}

export const STATUS_LABELS = { want: 'Хочу прочитать', reading: 'Читаю', read: 'Прочитано' };
export const REQUEST_LABELS = { pending: 'На рассмотрении', approved: 'Одобрена', rejected: 'Отклонена' };

export function formatDate(value, withTime = false) {
  if (!value) return '';
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Date(value).toLocaleDateString('ru-RU', opts);
}

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function stars(rating, { size = '' } = {}) {
  const full = Math.round(rating || 0);
  return html`<span class="stars ${size}" aria-label="Оценка ${rating || 0} из 5">${[1, 2, 3, 4, 5].map(
    (i) => html`<span class="${i <= full ? 'on' : ''}">★</span>`
  )}</span>`;
}

export function ratingBadge(book) {
  if (!book.reviewCount) return html`<span class="muted small">Нет оценок</span>`;
  return html`<span class="rating">${stars(book.rating)} <b>${Number(book.rating).toFixed(1)}</b>
    <span class="muted small">(${book.reviewCount})</span></span>`;
}

/** Обложка: картинка или сгенерированная «книжная» заглушка. */
export function cover(book, cls = '') {
  if (book.coverUrl) {
    return html`<div class="cover ${cls}"><img src="${book.coverUrl}" alt="${book.title}" loading="lazy"></div>`;
  }
  const id = book.id ?? book.bookId ?? 0;
  const hue = (id * 47) % 360;
  return html`<div class="cover cover-gen ${cls}" style="--hue:${hue}" aria-hidden="true">
    <span class="cover-title">${book.title}</span>
    <span class="cover-author">${book.authorName || ''}</span>
  </div>`;
}

export function progressBar(current, total) {
  const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return html`<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="progress-label small muted">${current || 0} из ${total || '?'} стр. · ${pct}%</div>`;
}

export function pagination(page, pages, hrefFor) {
  if (pages <= 1) return '';
  const items = [];
  const add = (p) => items.push(p === page
    ? html`<span class="page current" aria-current="page">${p}</span>`
    : html`<a class="page" href="${hrefFor(p)}">${p}</a>`);
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) add(p);
    else if (items.at(-1)?.s !== '<span class="page gap">…</span>') items.push(raw('<span class="page gap">…</span>'));
  }
  return html`<nav class="pagination" aria-label="Страницы">${items}</nav>`;
}

export function emptyState(text, action = '') {
  return html`<div class="empty"><p>${text}</p>${action}</div>`;
}

export function loading() {
  return html`<div class="loading" aria-live="polite"><span class="spinner"></span> Загрузка…</div>`;
}

let toastTimer;
export function toast(message, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

export function confirmDialog(message, okLabel = 'Удалить') {
  return new Promise((resolve) => {
    const dlg = document.getElementById('confirm');
    dlg.querySelector('.confirm-text').textContent = message;
    dlg.querySelector('[value=ok]').textContent = okLabel;
    dlg.returnValue = '';
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
  });
}

/** Данные формы в виде объекта. */
export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/** Блокирует кнопку отправки на время выполнения запроса и показывает ошибки. */
export async function submitting(form, fn) {
  const btn = form.querySelector('[type=submit]');
  const errorBox = form.querySelector('.form-error');
  if (errorBox) errorBox.textContent = '';
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    if (errorBox) errorBox.textContent = err.message;
    else toast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

export function bookCard(book, { user } = {}) {
  return html`<article class="card book-card">
    <a href="#/book/${book.id}" class="book-card-cover">${cover(book)}</a>
    <div class="book-card-body">
      <h3 class="book-card-title"><a href="#/book/${book.id}">${book.title}</a></h3>
      <a class="book-card-author" href="#/author/${book.authorId}">${book.authorName}</a>
      <div class="book-card-meta small muted">
        <a href="#/genre/${book.genreId}">${book.genreName}</a>${book.year ? html` · ${book.year}` : ''}
      </div>
      ${ratingBadge(book)}
      ${user ? (book.shelfStatus
        ? html`<a class="chip status-${book.shelfStatus}" href="#/shelf">${STATUS_LABELS[book.shelfStatus]}</a>`
        : html`<button class="btn btn-sm btn-outline" data-add-shelf="${book.id}">+ На полку</button>`) : ''}
    </div>
  </article>`;
}
