import { html } from '../../ui.js';
import { crudPage } from './crud.js';

export default (view) => crudPage(view, {
  section: 'authors',
  title: 'Авторы',
  endpoint: '/authors',
  newLabel: 'Новый автор',
  label: (a) => a.name,
  viewHref: (a) => `#/author/${a.id}`,
  columns: [
    ['Имя', (a) => a.name],
    ['Страна', (a) => a.country || '—'],
    ['Годы жизни', (a) => (a.birthYear || a.deathYear ? `${a.birthYear ?? '?'} — ${a.deathYear ?? ''}` : '—')],
    ['Книг', (a) => a.bookCount],
  ],
  fields: (a) => html`
    <div class="field"><label for="name">Имя *</label>
      <input type="text" id="name" name="name" required maxlength="200" value="${a.name ?? ''}"></div>
    <div class="form-row">
      <div class="field"><label for="birthYear">Год рождения</label>
        <input type="number" id="birthYear" name="birthYear" value="${a.birthYear ?? ''}"></div>
      <div class="field"><label for="deathYear">Год смерти</label>
        <input type="number" id="deathYear" name="deathYear" value="${a.deathYear ?? ''}"></div>
    </div>
    <div class="field"><label for="country">Страна</label>
      <input type="text" id="country" name="country" maxlength="100" value="${a.country ?? ''}"></div>
    <div class="field"><label for="bio">Биография</label>
      <textarea id="bio" name="bio">${a.bio ?? ''}</textarea></div>`,
});
