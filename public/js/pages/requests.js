import { api } from '../api.js';
import { html, mount, toast, submitting, formData, formatDate, emptyState, confirmDialog, REQUEST_LABELS } from '../ui.js';

export default async function requestsPage(view) {
  const requests = await api.get('/requests/my');

  mount(view, html`
    <h1>Заявки на добавление книг</h1>
    <div class="two-col">
      <form class="card panel" id="request-form">
        <h2>Новая заявка</h2>
        <p class="small muted">Не нашли книгу в каталоге? Предложите её — администратор рассмотрит заявку.</p>
        <div class="field">
          <label for="title">Название книги</label>
          <input type="text" id="title" name="title" maxlength="300" required>
        </div>
        <div class="field">
          <label for="authorName">Автор</label>
          <input type="text" id="authorName" name="authorName" maxlength="200" required>
        </div>
        <div class="field">
          <label for="comment">Комментарий</label>
          <textarea id="comment" name="comment" maxlength="2000" placeholder="Год издания, издательство, ISBN, ссылка…"></textarea>
        </div>
        <div class="form-error" role="alert"></div>
        <button class="btn" type="submit">Отправить заявку</button>
      </form>

      <div>
        <h2>Мои заявки</h2>
        ${requests.length ? requests.map((r) => html`<article class="card request-card">
          <div class="request-head">
            <div><b>${r.title}</b><div class="small">${r.authorName}</div></div>
            <span class="chip status-${r.status}">${REQUEST_LABELS[r.status]}</span>
          </div>
          ${r.comment ? html`<p class="small prewrap" style="margin:8px 0 0">${r.comment}</p>` : ''}
          <div class="small muted" style="margin-top:8px">Отправлена ${formatDate(r.createdAt)}
            ${r.reviewedAt ? html` · рассмотрена ${formatDate(r.reviewedAt)}` : ''}</div>
          ${r.adminComment ? html`<p class="small" style="margin:8px 0 0"><b>Ответ администратора:</b> ${r.adminComment}</p>` : ''}
          ${r.status === 'approved' && r.bookId ? html`<p style="margin:8px 0 0"><a href="#/book/${r.bookId}">Открыть книгу в каталоге →</a></p>` : ''}
          ${r.status === 'pending' ? html`<p style="margin:8px 0 0"><button class="linklike danger small" data-cancel="${r.id}">Отозвать заявку</button></p>` : ''}
        </article>`) : emptyState('Вы ещё не отправляли заявок.')}
      </div>
    </div>
  `);

  const form = view.querySelector('#request-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(form, async () => {
      await api.post('/requests', formData(form));
      toast('Заявка отправлена');
      requestsPage(view);
    });
  });

  view.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!(await confirmDialog('Отозвать заявку?', 'Отозвать'))) return;
    try {
      await api.del(`/requests/${btn.dataset.cancel}`);
      toast('Заявка отозвана');
      requestsPage(view);
    } catch (err) { toast(err.message, 'error'); }
  }));
}
