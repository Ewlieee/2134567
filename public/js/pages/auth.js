import { api } from '../api.js';
import { navigate, setUser } from '../app.js';
import { html, mount, toast, submitting, formData } from '../ui.js';

/** Безопасный адрес возврата после входа — только внутренние маршруты. */
function nextPath(query) {
  const next = query.get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function login(view, { query }) {
  const next = query.get('next');
  mount(view, html`
    <form class="card auth-box" id="login-form" novalidate>
      <h1>Вход</h1>
      <div class="field">
        <label for="login">Логин или email</label>
        <input type="text" id="login" name="login" autocomplete="username" required autofocus>
      </div>
      <div class="field">
        <label for="password">Пароль</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <div class="form-error" role="alert"></div>
      <button class="btn" type="submit">Войти</button>
      <p class="alt small">Нет аккаунта? <a href="#/register${next ? `?next=${encodeURIComponent(next)}` : ''}">Зарегистрируйтесь</a></p>
      <div class="demo-hint">Демо-доступ: <b>reader</b> / reader123 (читатель), <b>admin</b> / admin123 (администратор)</div>
    </form>
  `);

  const form = view.querySelector('#login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(form, async () => {
      const { user } = await api.post('/auth/login', formData(form));
      setUser(user);
      toast(`Добро пожаловать, ${user.displayName || user.username}!`);
      navigate(nextPath(query), { replace: true });
    });
  });
}

export async function register(view, { query }) {
  mount(view, html`
    <form class="card auth-box" id="register-form" novalidate>
      <h1>Регистрация</h1>
      <div class="field">
        <label for="username">Логин</label>
        <input type="text" id="username" name="username" autocomplete="username" required minlength="3" maxlength="30" autofocus>
        <div class="hint">Латинские буквы, цифры, «_», «.», «-»; от 3 до 30 символов</div>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="displayName">Имя <span class="muted">(необязательно)</span></label>
        <input type="text" id="displayName" name="displayName" autocomplete="nickname" maxlength="100">
      </div>
      <div class="field">
        <label for="password">Пароль</label>
        <input type="password" id="password" name="password" autocomplete="new-password" required minlength="6">
        <div class="hint">Не менее 6 символов</div>
      </div>
      <div class="field">
        <label for="password2">Повторите пароль</label>
        <input type="password" id="password2" name="password2" autocomplete="new-password" required>
      </div>
      <div class="form-error" role="alert"></div>
      <button class="btn" type="submit">Создать аккаунт</button>
      <p class="alt small">Уже есть аккаунт? <a href="#/login">Войдите</a></p>
    </form>
  `);

  const form = view.querySelector('#register-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitting(form, async () => {
      const data = formData(form);
      if (data.password !== data.password2) throw new Error('Пароли не совпадают');
      delete data.password2;
      const { user } = await api.post('/auth/register', data);
      setUser(user);
      toast('Регистрация прошла успешно!');
      navigate(nextPath(query), { replace: true });
    });
  });
}
