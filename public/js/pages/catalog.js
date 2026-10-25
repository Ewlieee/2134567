import { api, qs } from '../api.js';
import { navigate } from '../app.js';
import { html, mount, bookCard, pagination, emptyState, plural, formData } from '../ui.js';

const FILTER_KEYS = ['q', 'genre', 'author', 'yearFrom', 'yearTo', 'language', 'pagesMin', 'pagesMax', 'sort'];
const SORTS = [['rating', 'По рейтингу'], ['new', 'По дате добавления'], ['title', 'По названию (А–Я)'], ['year', 'По году издания']];

export default async function catalog(view, { query, user }) {
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, query.get(k) || '']));
  if (!filters.sort) filters.sort = 'rating';
  const page = Number(query.get('page')) || 1;

  const [result, genres, authors, languages] = await Promise.all([
    api.get('/books' + qs({ ...filters, page, limit: 12 })),
    api.get('/genres'),
    api.get('/authors'),
    api.get('/books/languages'),
  ]);

  const hrefFor = (p) => '#/catalog' + qs({ ...filters, page: p > 1 ? p : '' });
  const activeFilters = FILTER_KEYS.filter((k) => k !== 'q' && k !== 'sort' && filters[k]).length;
  const option = (value, label, current) => html`<option value="${value}" ${String(value) === current ? 'selected' : ''}>${label}</option>`;

  mount(view, html`
    <h1>Каталог книг</h1>
    <div class="catalog-layout">
      <aside class="card panel filters" id="filters">
        <h3>Фильтры</h3>
        <form id="filter-form">
          <div class="field">
            <label for="f-genre">Жанр</label>
            <select id="f-genre" name="genre">
              ${option('', 'Все жанры', filters.genre)}
              ${genres.map((g) => option(g.id, g.name, filters.genre))}
            </select>
          </div>
          <div class="field">
            <label for="f-author">Автор</label>
            <select id="f-author" name="author">
              ${option('', 'Все авторы', filters.author)}
              ${authors.map((a) => option(a.id, a.name, filters.author))}
            </select>
          </div>
          <div class="field">
            <label for="f-language">Язык</label>
            <select id="f-language" name="language">
              ${option('', 'Любой', filters.language)}
              ${languages.map((l) => option(l, l, filters.language))}
            </select>
          </div>
          <div class="field">
            <label>Год издания</label>
            <div class="range">
              <input type="number" name="yearFrom" placeholder="с" value="${filters.yearFrom}" aria-label="Год издания с">
              <span>—</span>
              <input type="number" name="yearTo" placeholder="по" value="${filters.yearTo}" aria-label="Год издания по">
            </div>
          </div>
          <div class="field">
            <label>Количество страниц</label>
            <div class="range">
              <input type="number" name="pagesMin" min="0" placeholder="от" value="${filters.pagesMin}" aria-label="Страниц от">
              <span>—</span>
              <input type="number" name="pagesMax" min="0" placeholder="до" value="${filters.pagesMax}" aria-label="Страниц до">
            </div>
          </div>
          <div class="btn-group">
            <button class="btn" type="submit">Применить</button>
            <a class="btn btn-ghost" href="#/catalog${qs({ q: filters.q, sort: filters.sort === 'rating' ? '' : filters.sort })}">Сбросить</a>
          </div>
        </form>
      </aside>

      <div>
        <div class="catalog-toolbar">
          <form class="search-inline" id="search-form" role="search">
            <input type="search" name="q" value="${filters.q}" placeholder="Название, автор или ISBN" aria-label="Поиск">
            <button class="btn" type="submit">Найти</button>
          </form>
          <button class="btn btn-ghost filters-toggle" type="button" id="filters-toggle">
            Фильтры${activeFilters ? ` (${activeFilters})` : ''}
          </button>
          <select id="sort" aria-label="Сортировка">${SORTS.map(([v, l]) => option(v, l, filters.sort))}</select>
        </div>
        <p class="muted small">Найдено: ${plural(result.total, 'книга', 'книги', 'книг')}${filters.q ? html` по запросу «${filters.q}»` : ''}</p>
        ${result.items.length
          ? html`<div class="grid-books">${result.items.map((b) => bookCard(b, { user }))}</div>
                 ${pagination(result.page, result.pages, hrefFor)}`
          : emptyState('По вашему запросу ничего не найдено.',
            user ? html`<a class="btn btn-outline" href="#/requests">Предложить книгу</a>` : '')}
      </div>
    </div>
  `);

  const apply = (patch) => navigate('/catalog' + qs({ ...filters, ...patch }));

  view.querySelector('#filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    apply(formData(e.target));
  });
  view.querySelector('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    apply({ q: e.target.q.value.trim() });
  });
  view.querySelector('#sort').addEventListener('change', (e) => apply({ sort: e.target.value }));
  view.querySelector('#filters-toggle').addEventListener('click', () => {
    view.querySelector('#filters').classList.toggle('open');
  });
}
