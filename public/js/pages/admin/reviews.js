import { api, qs } from '../../api.js';
import { navigate } from '../../app.js';
import { html, mount, emptyState, toast, confirmDialog, stars, formatDate } from '../../ui.js';
import { adminLayout } from './layout.js';

export default async function reviewsAdmin(view, { query }) {
  const q = query.get('q') || '';
  const reviews = await api.get('/admin/reviews' + qs({ q }));

  mount(view, adminLayout('reviews', html`
    <h1>Модерация отзывов</h1>
    <form class="catalog-toolbar" id="search">
      <div class="search-inline">
        <input type="search" name="q" value="${q}" placeholder="Текст, книга или логин" aria-label="Поиск">
        <button class="btn btn-ghost" type="submit">Найти</button>
      </div>
    </form>
    ${reviews.length ? html`<div class="card table-wrap"><table class="table">
      <thead><tr><th>Книга</th><th>Автор отзыва</th><th>Оценка</th><th>Текст</th><th>Дата</th><th></th></tr></thead>
      <tbody>${reviews.map((r) => html`<tr>
        <td><a href="#/book/${r.bookId}">${r.bookTitle}</a></td>
        <td>${r.userName}<div class="small muted">@${r.username}</div></td>
        <td>${stars(r.rating)}</td>
        <td style="max-width:360px">${r.text || html`<span class="muted">—</span>`}</td>
        <td class="nowrap small">${formatDate(r.createdAt)}</td>
        <td class="actions small"><button class="linklike danger" data-delete="${r.id}">Удалить</button></td>
      </tr>`)}</tbody>
    </table></div>` : emptyState('Отзывы не найдены.')}
  `));

  view.querySelector('#search').addEventListener('submit', (e) => {
    e.preventDefault();
    navigate('/admin/reviews' + qs({ q: e.target.q.value.trim() }));
  });
  view.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!(await confirmDialog('Удалить отзыв?'))) return;
    try {
      await api.del(`/reviews/${btn.dataset.delete}`);
      toast('Отзыв удалён');
      reviewsAdmin(view, { query });
    } catch (err) { toast(err.message, 'error'); }
  }));
}
