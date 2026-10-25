import { api, qs } from '../api.js';
import { navigate } from '../app.js';
import { html, mount, bookCard, plural, emptyState, pagination } from '../ui.js';

const SORTS = [['rating', 'По рейтингу'], ['new', 'Новые'], ['title', 'По названию'], ['year', 'По году']];

export async function list(view) {
  const genres = await api.get('/genres');
  mount(view, html`
    <h1>Жанры</h1>
    ${genres.length ? html`<div class="genre-tiles">
      ${genres.map((g) => html`<a class="card genre-tile" href="#/genre/${g.id}">
        <b>${g.name}</b>
        <span class="small muted">${plural(g.bookCount, 'книга', 'книги', 'книг')}</span>
        ${g.description ? html`<p class="small" style="margin:6px 0 0">${g.description}</p>` : ''}
      </a>`)}
    </div>` : emptyState('Жанры ещё не добавлены.')}
  `);
}

export async function detail(view, { params, query, user }) {
  const page = Number(query.get('page')) || 1;
  const sort = query.get('sort') || 'rating';
  const [genre, books] = await Promise.all([
    api.get(`/genres/${params.id}`),
    api.get('/books' + qs({ genre: params.id, sort, page, limit: 12 })),
  ]);
  document.title = `${genre.name} — Книжная полка`;
  mount(view, html`
    <nav class="breadcrumbs"><a href="#/genres">Жанры</a> / ${genre.name}</nav>
    <div class="section-head">
      <div>
        <h1 style="margin-bottom:4px">${genre.name}</h1>
        ${genre.description ? html`<p class="muted" style="margin:0">${genre.description}</p>` : ''}
      </div>
      <select id="sort" aria-label="Сортировка" style="width:auto">
        ${SORTS.map(([v, l]) => html`<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`)}
      </select>
    </div>
    ${books.items.length
      ? html`<div class="grid-books">${books.items.map((b) => bookCard(b, { user }))}</div>
        ${pagination(books.page, books.pages, (p) => `#/genre/${genre.id}${qs({ sort, page: p })}`)}`
      : emptyState('В этом жанре пока нет книг.')}
  `);
  view.querySelector('#sort').addEventListener('change', (e) => navigate(`/genre/${genre.id}?sort=${e.target.value}`));
}
