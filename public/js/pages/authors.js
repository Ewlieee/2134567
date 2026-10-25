import { api, qs } from '../api.js';
import { navigate } from '../app.js';
import { html, mount, bookCard, plural, emptyState, pagination } from '../ui.js';

function lifeYears(a) {
  if (!a.birthYear && !a.deathYear) return '';
  return `${a.birthYear ?? '?'} — ${a.deathYear ?? ''}`.trim();
}

export async function list(view, { query }) {
  const q = query.get('q') || '';
  const authors = await api.get('/authors' + qs({ q }));
  mount(view, html`
    <div class="section-head">
      <h1>Авторы</h1>
      <form class="search-inline" id="author-search" role="search" style="display:flex;gap:8px">
        <input type="search" name="q" value="${q}" placeholder="Поиск автора" aria-label="Поиск автора">
        <button class="btn" type="submit">Найти</button>
      </form>
    </div>
    ${authors.length ? html`<div class="genre-tiles">
      ${authors.map((a) => html`<a class="card genre-tile" href="#/author/${a.id}">
        <b>${a.name}</b>
        <span class="small muted">${[a.country, lifeYears(a)].filter(Boolean).join(' · ')}</span><br>
        <span class="small">${plural(a.bookCount, 'книга', 'книги', 'книг')}</span>
      </a>`)}
    </div>` : emptyState('Авторы не найдены.')}
  `);
  view.querySelector('#author-search').addEventListener('submit', (e) => {
    e.preventDefault();
    navigate('/authors' + qs({ q: e.target.q.value.trim() }));
  });
}

export async function detail(view, { params, query, user }) {
  const page = Number(query.get('page')) || 1;
  const [author, books] = await Promise.all([
    api.get(`/authors/${params.id}`),
    api.get('/books' + qs({ author: params.id, sort: 'year', page, limit: 12 })),
  ]);
  document.title = `${author.name} — Книжная полка`;
  mount(view, html`
    <nav class="breadcrumbs"><a href="#/authors">Авторы</a> / ${author.name}</nav>
    <div class="card panel">
      <h1>${author.name}</h1>
      <p class="muted">${[author.country, lifeYears(author)].filter(Boolean).join(' · ')}</p>
      ${author.bio ? html`<p class="prewrap" style="margin:0">${author.bio}</p>` : ''}
    </div>
    <section class="section">
      <div class="section-head">
        <h2>Книги автора</h2>
        <span class="muted">${plural(books.total, 'книга', 'книги', 'книг')}</span>
      </div>
      ${books.items.length
        ? html`<div class="grid-books">${books.items.map((b) => bookCard(b, { user }))}</div>
          ${pagination(books.page, books.pages, (p) => `#/author/${author.id}?page=${p}`)}`
        : emptyState('В каталоге пока нет книг этого автора.')}
    </section>
  `);
}
