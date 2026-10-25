import { api } from '../api.js';
import {
  html, mount, cover, stars, ratingBadge, progressBar, formatDate, plural, toast, confirmDialog,
  submitting, emptyState, STATUS_LABELS,
} from '../ui.js';

export default async function bookPage(view, ctx) {
  const { params, user } = ctx;
  const [book, reviews] = await Promise.all([
    api.get(`/books/${params.id}`),
    api.get(`/books/${params.id}/reviews`),
  ]);
  const myReview = user && reviews.find((r) => r.userId === user.id);
  const others = reviews.filter((r) => r !== myReview);
  const rerender = () => bookPage(view, ctx);
  document.title = `${book.title} — Книжная полка`;

  mount(view, html`
    <nav class="breadcrumbs"><a href="#/catalog">Каталог</a> / <a href="#/genre/${book.genreId}">${book.genreName}</a> / ${book.title}</nav>
    ${book.isArchived ? html`<div class="notice">Книга находится в архиве и скрыта из каталога.</div>` : ''}
    <div class="book-page">
      <aside class="book-aside">
        ${cover(book)}
        ${user ? shelfControls(book) : html`<div class="card panel small">
          <a href="#/login?next=${encodeURIComponent(`/book/${book.id}`)}">Войдите</a>, чтобы добавить книгу на полку и оставить отзыв.
        </div>`}
      </aside>

      <div>
        <h1 class="book-title">${book.title}</h1>
        <a class="book-author" href="#/author/${book.authorId}">${book.authorName}</a>
        <div>${ratingBadge(book)}</div>

        <dl class="meta-table">
          <dt>Жанр</dt><dd><a href="#/genre/${book.genreId}">${book.genreName}</a></dd>
          ${book.year ? html`<dt>Год издания</dt><dd>${book.year}</dd>` : ''}
          ${book.publisher ? html`<dt>Издательство</dt><dd>${book.publisher}</dd>` : ''}
          ${book.language ? html`<dt>Язык</dt><dd>${book.language}</dd>` : ''}
          ${book.pages ? html`<dt>Страниц</dt><dd>${book.pages}</dd>` : ''}
          ${book.isbn ? html`<dt>ISBN</dt><dd>${book.isbn}</dd>` : ''}
        </dl>

        <h2>Аннотация</h2>
        ${book.annotation ? html`<p class="prewrap">${book.annotation}</p>` : html`<p class="muted">Аннотация пока не добавлена.</p>`}

        <section class="section" id="reviews">
          <div class="section-head">
            <h2>Отзывы <span class="muted">(${reviews.length})</span></h2>
          </div>
          ${user ? reviewForm(myReview) : ''}
          <div class="card panel">
            ${myReview ? reviewItem(myReview, user, true) : ''}
            ${others.length ? others.map((r) => reviewItem(r, user, false))
              : (!myReview ? emptyState('Отзывов пока нет. Станьте первым!') : '')}
          </div>
        </section>
      </div>
    </div>
  `);

  bindShelf(view, book, rerender);
  bindReviews(view, book, myReview, rerender);
}

function shelfControls(book) {
  const status = book.shelfStatus;
  return html`<div class="card panel shelf-controls">
    <h3>Моя полка</h3>
    <div class="btn-group" role="group" aria-label="Статус на полке">
      ${Object.entries(STATUS_LABELS).map(([value, label]) => html`<button type="button"
        class="btn btn-sm btn-outline ${status === value ? 'selected' : ''}" data-status="${value}"
        aria-pressed="${status === value}">${label}</button>`)}
    </div>
    ${status === 'reading' ? html`
      <form class="page-form" id="page-form">
        <input type="number" name="currentPage" min="0" ${book.pages ? html`max="${book.pages}"` : ''}
          value="${book.currentPage ?? 0}" aria-label="Текущая страница">
        <button class="btn btn-sm" type="submit">Сохранить</button>
      </form>
      <div class="small muted" style="margin:4px 0 8px">Текущая страница</div>
      ${progressBar(book.currentPage, book.pages)}` : ''}
    ${status === 'read' ? html`<div style="margin-top:12px">${progressBar(book.pages, book.pages)}</div>` : ''}
    ${status ? html`<p style="margin:12px 0 0"><button type="button" class="linklike danger small" data-remove-shelf>Убрать с полки</button></p>` : ''}
  </div>`;
}

function bindShelf(view, book, rerender) {
  view.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await api.put(`/shelf/${book.id}`, { status: btn.dataset.status });
      toast(book.shelfStatus ? `Статус: ${STATUS_LABELS[btn.dataset.status]}` : 'Книга добавлена на полку');
      rerender();
    } catch (err) { toast(err.message, 'error'); }
  }));

  view.querySelector('#page-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(e.target, async () => {
      const res = await api.put(`/shelf/${book.id}`, { status: 'reading', currentPage: e.target.currentPage.value });
      toast(res.completed ? 'Поздравляем! Книга прочитана' : 'Прогресс сохранён');
      rerender();
    });
  });

  view.querySelector('[data-remove-shelf]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Убрать книгу с полки? Прогресс чтения будет потерян.', 'Убрать'))) return;
    try {
      await api.del(`/shelf/${book.id}`);
      toast('Книга убрана с полки');
      rerender();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function starInput(current) {
  return html`<div class="star-input" role="radiogroup" aria-label="Оценка">
    ${[5, 4, 3, 2, 1].map((n) => html`
      <input type="radio" id="star-${n}" name="rating" value="${n}" ${current === n ? 'checked' : ''} required>
      <label for="star-${n}" title="${plural(n, 'звезда', 'звезды', 'звёзд')}">★</label>`)}
  </div>`;
}

function reviewForm(myReview) {
  return html`<form class="card panel ${myReview ? 'hidden' : ''}" id="review-form" style="margin-bottom:20px">
    <h3>${myReview ? 'Редактировать отзыв' : 'Ваш отзыв'}</h3>
    <div class="field">${starInput(myReview?.rating)}</div>
    <div class="field">
      <label for="review-text">Комментарий</label>
      <textarea id="review-text" name="text" maxlength="4000" placeholder="Поделитесь впечатлениями о книге">${myReview?.text || ''}</textarea>
    </div>
    <div class="form-error"></div>
    <div class="btn-group">
      <button class="btn" type="submit">${myReview ? 'Сохранить' : 'Опубликовать'}</button>
      ${myReview ? html`<button class="btn btn-ghost" type="button" data-cancel-edit>Отмена</button>` : ''}
    </div>
  </form>`;
}

function reviewItem(r, user, mine) {
  const canDelete = user && (mine || user.role === 'admin');
  return html`<article class="review">
    <div class="review-head">
      <b>${r.userName}</b>${mine ? html`<span class="chip">Ваш отзыв</span>` : ''}
      ${stars(r.rating)}
      <span class="small muted">${formatDate(r.createdAt)}${r.updatedAt ? ' · изменён' : ''}</span>
    </div>
    ${r.text ? html`<p class="prewrap" style="margin:0">${r.text}</p>` : ''}
    ${mine || canDelete ? html`<div class="review-actions small">
      ${mine ? html`<button type="button" class="linklike" data-edit-review>Редактировать</button>` : ''}
      ${canDelete ? html`<button type="button" class="linklike danger" data-delete-review="${r.id}">Удалить</button>` : ''}
    </div>` : ''}
  </article>`;
}

function bindReviews(view, book, myReview, rerender) {
  const form = view.querySelector('#review-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(form, async () => {
      const rating = form.querySelector('input[name=rating]:checked')?.value;
      if (!rating) throw new Error('Поставьте оценку от 1 до 5 звёзд');
      const body = { rating: Number(rating), text: form.text.value };
      if (myReview) await api.put(`/reviews/${myReview.id}`, body);
      else await api.post(`/books/${book.id}/reviews`, body);
      toast(myReview ? 'Отзыв обновлён' : 'Спасибо за отзыв!');
      rerender();
    });
  });

  view.querySelector('[data-edit-review]')?.addEventListener('click', () => {
    form.classList.remove('hidden');
    form.querySelector('textarea').focus();
  });
  view.querySelector('[data-cancel-edit]')?.addEventListener('click', () => form.classList.add('hidden'));

  view.querySelectorAll('[data-delete-review]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!(await confirmDialog('Удалить отзыв?'))) return;
    try {
      await api.del(`/reviews/${btn.dataset.deleteReview}`);
      toast('Отзыв удалён');
      rerender();
    } catch (err) { toast(err.message, 'error'); }
  }));
}
