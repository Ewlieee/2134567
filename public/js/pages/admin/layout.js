import { html } from '../../ui.js';

const SECTIONS = [
  ['', 'Дашборд'],
  ['books', 'Книги'],
  ['authors', 'Авторы'],
  ['genres', 'Жанры'],
  ['requests', 'Заявки'],
  ['reviews', 'Отзывы'],
  ['users', 'Пользователи'],
  ['news', 'Новости'],
];

export function adminLayout(active, content) {
  return html`<div class="admin-layout">
    <nav class="card admin-nav" aria-label="Разделы администрирования">
      ${SECTIONS.map(([key, label]) => html`<a href="#/admin${key ? '/' + key : ''}" class="${key === active ? 'active' : ''}">${label}</a>`)}
    </nav>
    <div class="admin-content">${content}</div>
  </div>`;
}
