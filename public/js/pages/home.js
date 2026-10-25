import { api } from '../api.js';
import { navigate } from '../app.js';
import { html, mount, bookCard, cover, ratingBadge, plural, formatDate, emptyState } from '../ui.js';

export default async function home(view, { user }) {
  const [genres, top, latest, news] = await Promise.all([
    api.get('/genres/popular?limit=8'),
    api.get('/books/top?limit=10'),
    api.get('/books/latest?limit=8'),
    api.get('/news?limit=3'),
  ]);

  mount(view, html`
    <section class="hero">
      <h1>Ваш читательский дневник</h1>
      <p>Находите книги, собирайте личную полку, отмечайте прогресс чтения и делитесь впечатлениями.</p>
      <form class="search-bar" role="search" id="home-search">
        <input type="search" name="q" placeholder="Название, автор или ISBN" aria-label="Поиск книг">
        <button class="btn" type="submit">Найти</button>
      </form>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Популярные жанры</h2>
        <a href="#/genres">Все жанры →</a>
      </div>
      <div class="genre-tiles">
        ${genres.map((g) => html`<a class="card genre-tile" href="#/genre/${g.id}">
          <b>${g.name}</b><span class="small muted">${plural(g.bookCount, 'книга', 'книги', 'книг')}</span>
        </a>`)}
      </div>
    </section>

    <section class="section home-columns">
      <div class="card panel">
        <div class="section-head"><h2>Топ-10 по рейтингу</h2></div>
        ${top.length ? html`<ol class="top-list">
          ${top.map((b) => html`<li>
            <a href="#/book/${b.id}">${cover(b, 'sm')}</a>
            <div class="info">
              <a class="title" href="#/book/${b.id}">${b.title}</a>
              <div class="small"><a href="#/author/${b.authorId}">${b.authorName}</a></div>
              ${ratingBadge(b)}
            </div>
          </li>`)}
        </ol>` : emptyState('Пока никто не оценил ни одной книги.')}
      </div>
      <div class="card panel">
        <div class="section-head">
          <h2>Новости</h2>
          <a href="#/news">Все новости →</a>
        </div>
        ${news.length ? news.map((n) => html`<article class="news-item">
          <h3><a href="#/news/${n.id}">${n.title}</a></h3>
          <div class="small muted">${formatDate(n.createdAt)}</div>
        </article>`) : emptyState('Новостей пока нет.')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Новинки каталога</h2>
        <a href="#/catalog?sort=new">Весь каталог →</a>
      </div>
      <div class="grid-books">${latest.map((b) => bookCard(b, { user }))}</div>
    </section>
  `);

  view.querySelector('#home-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    navigate('/catalog' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  });
}
