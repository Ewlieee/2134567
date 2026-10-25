// Общая страница справочника: таблица записей + форма создания/редактирования
import { api } from '../../api.js';
import { html, mount, emptyState, toast, confirmDialog, submitting, formData } from '../../ui.js';
import { adminLayout } from './layout.js';

/**
 * config: { section, title, endpoint, newLabel, columns: [[header, row => value]],
 *           fields: (item) => html, label: item => string, viewHref?: item => string }
 */
export async function crudPage(view, config) {
  const items = await api.get(config.endpoint);
  let editing = null;

  const draw = () => {
    mount(view, adminLayout(config.section, html`
      <h1>${config.title}</h1>
      <div class="two-col" style="grid-template-columns: 1.4fr 1fr">
        <div class="card table-wrap">
          ${items.length ? html`<table class="table">
            <thead><tr>${config.columns.map(([h]) => html`<th>${h}</th>`)}<th></th></tr></thead>
            <tbody>${items.map((item) => html`<tr>
              ${config.columns.map(([, cell], i) => html`<td>${i === 0 && config.viewHref
                ? html`<a href="${config.viewHref(item)}"><b>${cell(item)}</b></a>` : cell(item)}</td>`)}
              <td class="actions small">
                <button class="linklike" data-edit="${item.id}">Изменить</button>
                <button class="linklike danger" data-delete="${item.id}">Удалить</button>
              </td>
            </tr>`)}</tbody>
          </table>` : emptyState('Записей пока нет.')}
        </div>
        <form class="card panel" id="crud-form">
          <h2>${editing ? 'Редактирование' : config.newLabel}</h2>
          ${config.fields(editing || {})}
          <div class="form-error" role="alert"></div>
          <div class="btn-group">
            <button class="btn" type="submit">${editing ? 'Сохранить' : 'Добавить'}</button>
            ${editing ? html`<button class="btn btn-ghost" type="button" data-cancel>Отмена</button>` : ''}
          </div>
        </form>
      </div>
    `));
    bind();
  };

  const reload = async () => {
    const fresh = await api.get(config.endpoint);
    items.splice(0, items.length, ...fresh);
    draw();
  };

  const bind = () => {
    const form = view.querySelector('#crud-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitting(form, async () => {
        const data = formData(form);
        if (editing) await api.put(`${config.endpoint}/${editing.id}`, data);
        else await api.post(config.endpoint, data);
        toast(editing ? 'Изменения сохранены' : 'Запись добавлена');
        editing = null;
        await reload();
      });
    });
    view.querySelector('[data-cancel]')?.addEventListener('click', () => { editing = null; draw(); });
    view.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      editing = items.find((i) => i.id === Number(btn.dataset.edit));
      draw();
      view.querySelector('#crud-form input, #crud-form textarea')?.focus();
    }));
    view.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
      const item = items.find((i) => i.id === Number(btn.dataset.delete));
      if (!(await confirmDialog(`Удалить «${config.label(item)}»?`))) return;
      try {
        await api.del(`${config.endpoint}/${item.id}`);
        toast('Запись удалена');
        if (editing?.id === item.id) editing = null;
        await reload();
      } catch (err) { toast(err.message, 'error'); }
    }));
  };

  draw();
}
