import { api } from '../api.js';
import { setUser } from '../app.js';
import { html, mount, toast, submitting, formData, formatDate, STATUS_LABELS } from '../ui.js';

export default async function profile(view) {
  const { user, shelf } = await api.get('/profile');
  const name = user.displayName || user.username;

  mount(view, html`
    <div class="profile-head">
      <span class="avatar lg">${name.charAt(0).toUpperCase()}</span>
      <div>
        <h1>${name}</h1>
        <div class="muted">@${user.username} · с нами с ${formatDate(user.createdAt)}
          ${user.role === 'admin' ? html` · <span class="chip">Администратор</span>` : ''}</div>
      </div>
    </div>

    <div class="stat-row">
      ${Object.entries(STATUS_LABELS).map(([key, label]) => html`<a class="card stat" href="#/shelf?tab=${key}" style="color:inherit;text-decoration:none">
        <div class="value">${shelf[key]}</div><div class="label">${label}</div></a>`)}
    </div>

    <div class="two-col">
      <form class="card panel" id="profile-form">
        <h2>Профиль</h2>
        <div class="field">
          <label for="displayName">Имя</label>
          <input type="text" id="displayName" name="displayName" maxlength="100" value="${user.displayName || ''}">
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required value="${user.email}">
        </div>
        <div class="field">
          <label for="bio">О себе</label>
          <textarea id="bio" name="bio" maxlength="1000" placeholder="Любимые жанры, авторы, читательские цели…">${user.bio || ''}</textarea>
        </div>
        <div class="form-error" role="alert"></div>
        <button class="btn" type="submit">Сохранить</button>
      </form>

      <form class="card panel" id="password-form">
        <h2>Смена пароля</h2>
        <div class="field">
          <label for="currentPassword">Текущий пароль</label>
          <input type="password" id="currentPassword" name="currentPassword" autocomplete="current-password" required>
        </div>
        <div class="field">
          <label for="newPassword">Новый пароль</label>
          <input type="password" id="newPassword" name="newPassword" autocomplete="new-password" minlength="6" required>
        </div>
        <div class="field">
          <label for="newPassword2">Повторите новый пароль</label>
          <input type="password" id="newPassword2" name="newPassword2" autocomplete="new-password" required>
        </div>
        <div class="form-error" role="alert"></div>
        <button class="btn" type="submit">Изменить пароль</button>
      </form>
    </div>
  `);

  const profileForm = view.querySelector('#profile-form');
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(profileForm, async () => {
      const { user: updated } = await api.put('/profile', formData(profileForm));
      setUser(updated);
      toast('Профиль сохранён');
      profile(view);
    });
  });

  const passwordForm = view.querySelector('#password-form');
  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(passwordForm, async () => {
      const data = formData(passwordForm);
      if (data.newPassword !== data.newPassword2) throw new Error('Пароли не совпадают');
      await api.put('/profile/password', data);
      passwordForm.reset();
      toast('Пароль изменён');
    });
  });
}
