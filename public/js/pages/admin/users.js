import { api, qs } from '../../api.js';
import { navigate } from '../../app.js';
import { html, mount, emptyState, toast, confirmDialog, formatDate } from '../../ui.js';
import { adminLayout } from './layout.js';

export default async function usersAdmin(view, ctx) {
  const q = ctx.query.get('q') || '';
  const users = await api.get('/admin/users' + qs({ q }));

  mount(view, adminLayout('users', html`
    <h1>Пользователи</h1>
    <form class="catalog-toolbar" id="search">
      <div class="search-inline">
        <input type="search" name="q" value="${q}" placeholder="Логин, имя или email" aria-label="Поиск">
        <button class="btn btn-ghost" type="submit">Найти</button>
      </div>
    </form>
    ${users.length ? html`<div class="card table-wrap"><table class="table">
      <thead><tr><th>Пользователь</th><th>Email</th><th>Роль</th><th>Полка / отзывы</th><th>Регистрация</th><th>Статус</th><th></th></tr></thead>
      <tbody>${users.map((u) => html`<tr>
        <td><b>${u.displayName || u.username}</b><div class="small muted">@${u.username}</div></td>
        <td>${u.email}</td>
        <td>${u.role === 'admin' ? 'Администратор' : 'Читатель'}</td>
        <td>${u.shelfCount} / ${u.reviewCount}</td>
        <td class="nowrap small">${formatDate(u.createdAt)}</td>
        <td>${u.isBlocked ? html`<span class="chip status-blocked">Заблокирован</span>` : html`<span class="chip status-read">Активен</span>`}</td>
        <td class="actions small">${u.role === 'admin' || u.id === ctx.user.id ? '' : html`<button
          class="linklike ${u.isBlocked ? '' : 'danger'}" data-block="${u.id}" data-state="${u.isBlocked ? 0 : 1}"
          data-name="${u.username}">${u.isBlocked ? 'Разблокировать' : 'Заблокировать'}</button>`}</td>
      </tr>`)}</tbody>
    </table></div>` : emptyState('Пользователи не найдены.')}
  `));

  view.querySelector('#search').addEventListener('submit', (e) => {
    e.preventDefault();
    navigate('/admin/users' + qs({ q: e.target.q.value.trim() }));
  });
  view.querySelectorAll('[data-block]').forEach((btn) => btn.addEventListener('click', async () => {
    const block = btn.dataset.state === '1';
    if (block && !(await confirmDialog(`Заблокировать пользователя @${btn.dataset.name}? Он не сможет войти в приложение.`, 'Заблокировать'))) return;
    try {
      await api.patch(`/admin/users/${btn.dataset.block}/block`, { blocked: block });
      toast(block ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      usersAdmin(view, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));
}
