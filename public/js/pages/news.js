import { api } from '../api.js';
import { html, mount, formatDate, emptyState } from '../ui.js';

export async function list(view) {
  const news = await api.get('/news?limit=50');
  mount(view, html`
    <h1>Новости и объявления</h1>
    <div class="card panel">
      ${news.length ? news.map((n) => html`<article class="news-item">
        <h3><a href="#/news/${n.id}">${n.title}</a></h3>
        <div class="small muted" style="margin-bottom:6px">${formatDate(n.createdAt)}</div>
        <p style="margin:0">${n.body.length > 260 ? n.body.slice(0, 260) + '…' : n.body}</p>
      </article>`) : emptyState('Новостей пока нет.')}
    </div>
  `);
}

export async function detail(view, { params }) {
  const n = await api.get(`/news/${params.id}`);
  document.title = `${n.title} — Книжная полка`;
  mount(view, html`
    <nav class="breadcrumbs"><a href="#/news">Новости</a></nav>
    <article class="card panel">
      <h1>${n.title}</h1>
      <p class="small muted">${formatDate(n.createdAt, true)}${n.authorName ? html` · ${n.authorName}` : ''}</p>
      <div class="prewrap">${n.body}</div>
    </article>
  `);
}
