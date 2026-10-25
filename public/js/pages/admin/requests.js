import { api, qs } from '../../api.js';
import { navigate } from '../../app.js';
import { html, mount, emptyState, toast, formatDate, REQUEST_LABELS } from '../../ui.js';
import { adminLayout } from './layout.js';

const FILTERS = [['pending', 'На рассмотрении'], ['approved', 'Одобренные'], ['rejected', 'Отклонённые'], ['', 'Все']];

export default async function requestsAdmin(view, { query }) {
  const status = query.has('status') ? query.get('status') : 'pending';
  const [requests, genres] = await Promise.all([api.get('/requests' + qs({ status })), api.get('/genres')]);
  const reload = () => requestsAdmin(view, { query });

  mount(view, adminLayout('requests', html`
    <h1>Заявки пользователей</h1>
    <div class="tabs">
      ${FILTERS.map(([v, l]) => html`<a class="tab ${v === status ? 'active' : ''}" href="#/admin/requests?status=${v}" style="text-decoration:none">${l}</a>`)}
    </div>
    ${requests.length ? requests.map((r) => html`<article class="card request-card">
      <div class="request-head">
        <div>
          <b>${r.title}</b> — ${r.authorName}
          <div class="small muted">от ${r.userName} (@${r.username}) · ${formatDate(r.createdAt, true)}</div>
        </div>
        <span class="chip status-${r.status}">${REQUEST_LABELS[r.status]}</span>
      </div>
      ${r.comment ? html`<p class="small prewrap" style="margin:8px 0 0">${r.comment}</p>` : ''}
      ${r.adminComment ? html`<p class="small" style="margin:8px 0 0"><b>Ответ:</b> ${r.adminComment}</p>` : ''}
      ${r.bookId ? html`<p class="small" style="margin:8px 0 0"><a href="#/admin/books/${r.bookId}/edit">Дополнить карточку книги →</a></p>` : ''}
      ${r.status === 'pending' ? html`<form class="request-actions" data-request="${r.id}">
        <div class="field"><label>Название</label><input type="text" name="title" value="${r.title}" maxlength="300"></div>
        <div class="field"><label>Автор</label><input type="text" name="authorName" value="${r.authorName}" maxlength="200"></div>
        <div class="field"><label>Жанр</label>
          <select name="genreId"><option value="">— выберите —</option>${genres.map((g) => html`<option value="${g.id}">${g.name}</option>`)}</select></div>
        <div class="field" style="flex-basis:100%"><label>Комментарий для пользователя</label>
          <input type="text" name="adminComment" maxlength="2000" placeholder="Необязательно"></div>
        <button class="btn btn-ok" type="submit" name="action" value="approve">Одобрить и добавить</button>
        <button class="btn btn-ghost" type="submit" name="action" value="reject">Отклонить</button>
      </form>` : ''}
    </article>`) : emptyState('Заявок нет.')}
  `));

  view.querySelectorAll('[data-request]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = e.submitter?.value;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (action === 'approve') {
        if (!data.genreId) return toast('Выберите жанр для новой книги', 'error');
        const { bookId } = await api.post(`/requests/${form.dataset.request}/approve`, data);
        toast('Заявка одобрена, книга добавлена в каталог');
        return navigate(`/admin/books/${bookId}/edit`);
      }
      await api.post(`/requests/${form.dataset.request}/reject`, { adminComment: data.adminComment });
      toast('Заявка отклонена');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  }));
}
