import { html } from '../../ui.js';
import { crudPage } from './crud.js';

export default (view) => crudPage(view, {
  section: 'genres',
  title: 'Жанры',
  endpoint: '/genres',
  newLabel: 'Новый жанр',
  label: (g) => g.name,
  viewHref: (g) => `#/genre/${g.id}`,
  columns: [
    ['Название', (g) => g.name],
    ['Описание', (g) => g.description || '—'],
    ['Книг', (g) => g.bookCount],
  ],
  fields: (g) => html`
    <div class="field"><label for="name">Название *</label>
      <input type="text" id="name" name="name" required maxlength="100" value="${g.name ?? ''}"></div>
    <div class="field"><label for="description">Описание</label>
      <textarea id="description" name="description" maxlength="1000">${g.description ?? ''}</textarea></div>`,
});
