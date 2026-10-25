import { api } from '../api.js';
import { html, mount, cover, stars, progressBar, emptyState, toast, confirmDialog, STATUS_LABELS } from '../ui.js';

const TABS = ['all', 'reading', 'want', 'read'];
const TAB_LABELS = { all: 'Все', ...STATUS_LABELS };

export default async function shelfPage(view, { query }) {
  let items = await api.get('/shelf');
  let tab = TABS.includes(query.get('tab')) ? query.get('tab') : 'all';

  const draw = () => {
    const counts = { all: items.length, want: 0, reading: 0, read: 0 };
    items.forEach((i) => counts[i.status]++);
    const visible = tab === 'all' ? items : items.filter((i) => i.status === tab);
    // В режиме «Все» сначала то, что читается сейчас
    const order = { reading: 0, want: 1, read: 2 };
    if (tab === 'all') visible.sort((a, b) => order[a.status] - order[b.status]);

    mount(view, html`
      <div class="section-head"><h1>Моя полка</h1><a class="btn btn-outline" href="#/catalog">Найти книги</a></div>
      <div class="tabs" role="tablist">
        ${TABS.map((t) => html`<button class="tab ${t === tab ? 'active' : ''}" role="tab" aria-selected="${t === tab}" data-tab="${t}">
          ${TAB_LABELS[t]} <span class="count">${counts[t]}</span></button>`)}
      </div>
      ${visible.length ? html`<div class="shelf-list">${visible.map(shelfItem)}</div>`
        : emptyState(items.length ? 'В этом разделе пока нет книг.' : 'Ваша полка пуста. Добавьте книги из каталога!',
          html`<a class="btn" href="#/catalog">Перейти в каталог</a>`)}
    `);
    bind();
  };

  const update = async (bookId, body) => {
    try {
      const res = await api.put(`/shelf/${bookId}`, body);
      const item = items.find((i) => i.bookId === bookId);
      Object.assign(item, { status: res.status, currentPage: res.currentPage });
      toast(res.completed ? 'Поздравляем! Книга прочитана' : 'Сохранено');
    } catch (err) {
      toast(err.message, 'error');
    }
    draw();
  };

  const bind = () => {
    view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      history.replaceState(null, '', `#/shelf${tab === 'all' ? '' : `?tab=${tab}`}`);
      draw();
    }));
    view.querySelectorAll('[data-status-select]').forEach((sel) => sel.addEventListener('change', () => {
      update(Number(sel.dataset.statusSelect), { status: sel.value });
    }));
    view.querySelectorAll('[data-page-form]').forEach((form) => form.addEventListener('submit', (e) => {
      e.preventDefault();
      update(Number(form.dataset.pageForm), { status: 'reading', currentPage: form.currentPage.value });
    }));
    view.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', async () => {
      const bookId = Number(btn.dataset.remove);
      const item = items.find((i) => i.bookId === bookId);
      if (!(await confirmDialog(`Убрать «${item.title}» с полки?`, 'Убрать'))) return;
      try {
        await api.del(`/shelf/${bookId}`);
        items = items.filter((i) => i.bookId !== bookId);
        toast('Книга убрана с полки');
        draw();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };

  draw();
}

function shelfItem(item) {
  return html`<article class="card shelf-item">
    <a href="#/book/${item.bookId}">${cover({ ...item, id: item.bookId }, 'md')}</a>
    <div class="info">
      <h3><a href="#/book/${item.bookId}">${item.title}</a></h3>
      <div class="small"><a href="#/author/${item.authorId}">${item.authorName}</a> · <span class="muted">${item.genreName}</span></div>
      <div><span class="chip status-${item.status}">${STATUS_LABELS[item.status]}</span>
        ${item.myRating ? html` <span class="small muted">Ваша оценка:</span> ${stars(item.myRating)}` : ''}</div>
      ${item.status === 'reading' ? html`<div style="max-width:420px">${progressBar(item.currentPage, item.pages)}</div>` : ''}
      <div class="controls">
        <select data-status-select="${item.bookId}" aria-label="Статус">
          ${Object.entries(STATUS_LABELS).map(([v, l]) => html`<option value="${v}" ${v === item.status ? 'selected' : ''}>${l}</option>`)}
        </select>
        ${item.status === 'reading' ? html`<form data-page-form="${item.bookId}" class="controls">
          <input type="number" name="currentPage" min="0" ${item.pages ? html`max="${item.pages}"` : ''} value="${item.currentPage}" aria-label="Текущая страница">
          <button class="btn btn-sm" type="submit">Обновить страницу</button>
        </form>` : ''}
        <button type="button" class="linklike danger small" data-remove="${item.bookId}">Убрать с полки</button>
      </div>
    </div>
  </article>`;
}
