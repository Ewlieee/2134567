import { html, formatDate } from '../../ui.js';
import { crudPage } from './crud.js';

export default (view) => crudPage(view, {
  section: 'news',
  title: 'Новости и объявления',
  endpoint: '/news',
  newLabel: 'Новая публикация',
  label: (n) => n.title,
  viewHref: (n) => `#/news/${n.id}`,
  columns: [
    ['Заголовок', (n) => n.title],
    ['Дата', (n) => formatDate(n.createdAt)],
  ],
  fields: (n) => html`
    <div class="field"><label for="title">Заголовок *</label>
      <input type="text" id="title" name="title" required maxlength="300" value="${n.title ?? ''}"></div>
    <div class="field"><label for="body">Текст *</label>
      <textarea id="body" name="body" required rows="8">${n.body ?? ''}</textarea></div>`,
});
