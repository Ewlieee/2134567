import { api, qs } from '../../api.js';
import { navigate } from '../../app.js';
import { html, mount, cover, pagination, emptyState, toast, confirmDialog, submitting, formatDate, plural } from '../../ui.js';
import { adminLayout } from './layout.js';

export async function list(view, { query }) {
  const q = query.get('q') || '';
  const archived = query.get('archived') === '1';
  const page = Number(query.get('page')) || 1;
  const result = await api.get('/books' + qs({ q, page, limit: 20, sort: 'new', archived: archived ? 1 : '' }));
  const reload = () => list(view, { query });

  mount(view, adminLayout('books', html`
    <div class="section-head">
      <h1>Книги</h1>
      <a class="btn" href="#/admin/books/new">+ Добавить книгу</a>
    </div>
    <form class="catalog-toolbar" id="search">
      <div class="search-inline">
        <input type="search" name="q" value="${q}" placeholder="Название, автор или ISBN" aria-label="Поиск">
        <button class="btn btn-ghost" type="submit">Найти</button>
      </div>
      <label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:400">
        <input type="checkbox" name="archived" value="1" ${archived ? 'checked' : ''}> Показывать архивные
      </label>
    </form>
    <p class="small muted">${plural(result.total, 'книга', 'книги', 'книг')}</p>
    ${result.items.length ? html`<div class="card table-wrap"><table class="table">
      <thead><tr><th>Книга</th><th>Жанр</th><th>Год</th><th>Рейтинг</th><th>Добавлена</th><th></th></tr></thead>
      <tbody>${result.items.map((b) => html`<tr>
        <td><div class="cell-book">${cover(b, 'sm')}<div>
          <a href="#/book/${b.id}"><b>${b.title}</b></a>
          ${b.isArchived ? html` <span class="chip status-archived">Архив</span>` : ''}
          <div class="small muted">${b.authorName}</div></div></div></td>
        <td>${b.genreName}</td>
        <td>${b.year ?? '—'}</td>
        <td>${b.reviewCount ? `${Number(b.rating).toFixed(1)} (${b.reviewCount})` : '—'}</td>
        <td class="nowrap small">${formatDate(b.createdAt)}</td>
        <td class="actions small">
          <a href="#/admin/books/${b.id}/edit">Изменить</a>
          <button class="linklike" data-archive="${b.id}" data-state="${b.isArchived ? 0 : 1}">${b.isArchived ? 'Вернуть' : 'В архив'}</button>
          <button class="linklike danger" data-delete="${b.id}" data-title="${b.title}">Удалить</button>
        </td>
      </tr>`)}</tbody>
    </table></div>
    ${pagination(result.page, result.pages, (p) => '#/admin/books' + qs({ q, archived: archived ? 1 : '', page: p }))}`
    : emptyState('Книги не найдены.')}
  `));

  const form = view.querySelector('#search');
  const apply = () => navigate('/admin/books' + qs({ q: form.q.value.trim(), archived: form.archived.checked ? 1 : '' }));
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  form.archived.addEventListener('change', apply);

  view.querySelectorAll('[data-archive]').forEach((btn) => btn.addEventListener('click', async () => {
    const toArchive = btn.dataset.state === '1';
    try {
      await api.patch(`/books/${btn.dataset.archive}/archive`, { archived: toArchive });
      toast(toArchive ? 'Книга перемещена в архив' : 'Книга возвращена в каталог');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  }));

  view.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!(await confirmDialog(`Удалить «${btn.dataset.title}» навсегда? Отзывы и записи на полках читателей тоже будут удалены. Чтобы просто скрыть книгу, используйте архив.`))) return;
    try {
      await api.del(`/books/${btn.dataset.delete}`);
      toast('Книга удалена');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  }));
}

export async function form(view, { params }) {
  const editing = Boolean(params.id);
  const [book, authors, genres] = await Promise.all([
    editing ? api.get(`/books/${params.id}`) : Promise.resolve({}),
    api.get('/authors'),
    api.get('/genres'),
  ]);
  const opt = (value, label, current) => html`<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`;
  const val = (v) => v ?? '';
  const externalCover = book.coverUrl && !book.coverUrl.startsWith('/uploads/') ? book.coverUrl : '';

  mount(view, adminLayout('books', html`
    <nav class="breadcrumbs"><a href="#/admin/books">Книги</a> / ${editing ? book.title : 'Новая книга'}</nav>
    <h1>${editing ? 'Редактирование книги' : 'Новая книга'}</h1>
    <form class="card panel" id="book-form" enctype="multipart/form-data">
      <div class="field">
        <label for="title">Название *</label>
        <input type="text" id="title" name="title" required maxlength="300" value="${val(book.title)}">
      </div>
      <div class="form-row">
        <div class="field">
          <label for="authorId">Автор *</label>
          <select id="authorId" name="authorId" required>
            <option value="">— выберите —</option>
            ${authors.map((a) => opt(a.id, a.name, book.authorId))}
          </select>
          <div class="hint">Нет в списке? <a href="#/admin/authors">Добавьте автора</a></div>
        </div>
        <div class="field">
          <label for="genreId">Жанр *</label>
          <select id="genreId" name="genreId" required>
            <option value="">— выберите —</option>
            ${genres.map((g) => opt(g.id, g.name, book.genreId))}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label for="year">Год издания</label>
          <input type="number" id="year" name="year" min="0" max="${new Date().getFullYear() + 1}" value="${val(book.year)}"></div>
        <div class="field"><label for="pages">Количество страниц</label>
          <input type="number" id="pages" name="pages" min="1" value="${val(book.pages)}"></div>
        <div class="field"><label for="language">Язык</label>
          <input type="text" id="language" name="language" maxlength="50" list="languages" value="${val(book.language ?? (editing ? '' : 'Русский'))}">
          <datalist id="languages"><option value="Русский"><option value="Английский"><option value="Немецкий"><option value="Французский"></datalist></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="isbn">ISBN</label>
          <input type="text" id="isbn" name="isbn" maxlength="20" placeholder="978-5-..." value="${val(book.isbn)}"></div>
        <div class="field"><label for="publisher">Издательство</label>
          <input type="text" id="publisher" name="publisher" maxlength="200" value="${val(book.publisher)}"></div>
      </div>
      <div class="field">
        <label for="annotation">Аннотация</label>
        <textarea id="annotation" name="annotation" rows="6">${val(book.annotation)}</textarea>
      </div>
      <fieldset class="field" style="border:1px solid var(--border);border-radius:8px;padding:12px 14px">
        <legend class="small" style="font-weight:600;padding:0 4px">Обложка</legend>
        <div class="cover-preview">
          <div id="cover-preview">${cover({ ...book, title: book.title || 'Без названия', id: book.id || 1 })}</div>
          <div style="flex:1">
            <div class="field"><label for="cover">Загрузить файл</label>
              <input type="file" id="cover" name="cover" accept="image/jpeg,image/png,image/webp,image/gif">
              <div class="hint">JPG, PNG, WEBP или GIF, до 5 МБ</div></div>
            <div class="field"><label for="coverUrl">или ссылка на изображение</label>
              <input type="url" id="coverUrl" name="coverUrl" placeholder="https://…" value="${externalCover}"></div>
            ${book.coverUrl ? html`<label style="font-weight:400;display:flex;gap:6px;align-items:center">
              <input type="checkbox" name="removeCover" value="true"> Удалить текущую обложку</label>` : ''}
          </div>
        </div>
      </fieldset>
      <div class="form-error" role="alert"></div>
      <div class="btn-group">
        <button class="btn" type="submit">${editing ? 'Сохранить' : 'Добавить книгу'}</button>
        <a class="btn btn-ghost" href="#/admin/books">Отмена</a>
      </div>
    </form>
  `));

  const formEl = view.querySelector('#book-form');
  formEl.cover.addEventListener('change', () => {
    const file = formEl.cover.files[0];
    if (!file) return;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = '';
    const box = document.createElement('div');
    box.className = 'cover';
    box.append(img);
    view.querySelector('#cover-preview').replaceChildren(box);
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(formEl, async () => {
      const data = new FormData(formEl);
      if (!formEl.cover.files.length) data.delete('cover');
      const saved = editing ? await api.put(`/books/${params.id}`, data) : await api.post('/books', data);
      toast(editing ? 'Книга сохранена' : 'Книга добавлена');
      navigate(`/book/${saved.id}`);
    });
  });
}
