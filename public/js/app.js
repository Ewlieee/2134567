import { api } from './api.js';
import { html, mount, loading, toast, STATUS_LABELS } from './ui.js';

export const state = { user: null };

// [шаблон пути, загрузчик модуля, имя экспорта, ограничения доступа]
const routes = [
  ['/', () => import('./pages/home.js')],
  ['/catalog', () => import('./pages/catalog.js')],
  ['/book/:id', () => import('./pages/book.js')],
  ['/authors', () => import('./pages/authors.js'), 'list'],
  ['/author/:id', () => import('./pages/authors.js'), 'detail'],
  ['/genres', () => import('./pages/genres.js'), 'list'],
  ['/genre/:id', () => import('./pages/genres.js'), 'detail'],
  ['/news', () => import('./pages/news.js'), 'list'],
  ['/news/:id', () => import('./pages/news.js'), 'detail'],
  ['/login', () => import('./pages/auth.js'), 'login', { guest: true }],
  ['/register', () => import('./pages/auth.js'), 'register', { guest: true }],
  ['/profile', () => import('./pages/profile.js'), 'default', { auth: true }],
  ['/shelf', () => import('./pages/shelf.js'), 'default', { auth: true }],
  ['/requests', () => import('./pages/requests.js'), 'default', { auth: true }],
  ['/admin', () => import('./pages/admin/dashboard.js'), 'default', { admin: true }],
  ['/admin/books', () => import('./pages/admin/books.js'), 'list', { admin: true }],
  ['/admin/books/new', () => import('./pages/admin/books.js'), 'form', { admin: true }],
  ['/admin/books/:id/edit', () => import('./pages/admin/books.js'), 'form', { admin: true }],
  ['/admin/authors', () => import('./pages/admin/authors.js'), 'default', { admin: true }],
  ['/admin/genres', () => import('./pages/admin/genres.js'), 'default', { admin: true }],
  ['/admin/requests', () => import('./pages/admin/requests.js'), 'default', { admin: true }],
  ['/admin/reviews', () => import('./pages/admin/reviews.js'), 'default', { admin: true }],
  ['/admin/users', () => import('./pages/admin/users.js'), 'default', { admin: true }],
  ['/admin/news', () => import('./pages/admin/news.js'), 'default', { admin: true }],
].map(([pattern, load, name = 'default', access = {}]) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  return { re, keys, load, name, access };
});

export function navigate(path, { replace = false } = {}) {
  const hash = '#' + path;
  if (location.hash === hash) return render();
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) render();
}

function parseLocation() {
  const raw = location.hash.slice(1) || '/';
  const [path, search = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(search), full: raw };
}

export function setUser(user) {
  state.user = user;
  renderNav();
}

function initials(user) {
  return (user.displayName || user.username).trim().charAt(0).toUpperCase();
}

function renderNav() {
  const { user } = state;
  const box = document.getElementById('nav-user');
  if (!user) {
    mount(box, html`<a href="#/login" data-nav="login">Войти</a>
      <a href="#/register" class="btn btn-sm">Регистрация</a>`);
  } else {
    mount(box, html`
      <a href="#/shelf" data-nav="shelf">Моя полка</a>
      <a href="#/requests" data-nav="requests">Заявки</a>
      <div class="user-menu">
        <button type="button" aria-haspopup="true" aria-expanded="false">
          <span class="avatar">${initials(user)}</span>
          <span>${user.displayName || user.username}</span>
        </button>
        <div class="user-menu-list">
          <a href="#/profile">Профиль</a>
          <a href="#/shelf">Моя полка</a>
          <a href="#/requests">Мои заявки</a>
          ${user.role === 'admin' ? html`<hr><a href="#/admin">Панель администратора</a>` : ''}
          <hr><button type="button" data-logout>Выйти</button>
        </div>
      </div>`);
  }
  highlightNav();
}

function highlightNav() {
  const section = parseLocation().path.split('/')[1] || 'home';
  const aliases = { book: 'catalog', author: 'authors', genre: 'genres' };
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === (aliases[section] || section));
  });
}

function errorPage(view, title, text) {
  mount(view, html`<div class="error-page"><h1>${title}</h1><p>${text}</p><a class="btn" href="#/">На главную</a></div>`);
}

async function render() {
  const { path, query, full } = parseLocation();
  const app = document.getElementById('app');
  // Новый контейнер на каждый переход: ответы от устаревших запросов попадут в отсоединённый узел
  const view = document.createElement('div');
  app.replaceChildren(view);
  mount(view, loading());
  document.title = 'Книжная полка';
  closeMenus();
  highlightNav();
  window.scrollTo(0, 0);

  for (const route of routes) {
    const match = path.match(route.re);
    if (!match) continue;
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));

    if ((route.access.auth || route.access.admin) && !state.user) {
      return navigate(`/login?next=${encodeURIComponent(full)}`, { replace: true });
    }
    if (route.access.admin && state.user.role !== 'admin') {
      return errorPage(view, '403', 'Раздел доступен только администратору.');
    }
    if (route.access.guest && state.user) return navigate('/', { replace: true });

    try {
      const module = await route.load();
      await module[route.name](view, { params, query, user: state.user });
      if (view.isConnected) app.focus({ preventScroll: true });
    } catch (err) {
      if (!view.isConnected) return;
      if (err.status === 404) return errorPage(view, '404', err.message || 'Страница не найдена.');
      if (err.status === 401) return navigate(`/login?next=${encodeURIComponent(full)}`, { replace: true });
      console.error(err);
      errorPage(view, 'Ошибка', err.message || 'Не удалось загрузить страницу.');
    }
    return;
  }
  errorPage(view, '404', 'Страница не найдена.');
}

function closeMenus() {
  document.getElementById('main-nav').classList.remove('open');
  document.querySelector('.nav-toggle').setAttribute('aria-expanded', 'false');
  document.querySelectorAll('.user-menu.open').forEach((m) => m.classList.remove('open'));
}

// Глобальные обработчики
document.addEventListener('click', async (e) => {
  const toggle = e.target.closest('.nav-toggle');
  if (toggle) {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    return;
  }

  const menuBtn = e.target.closest('.user-menu > button');
  if (menuBtn) {
    const menu = menuBtn.parentElement;
    menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', menu.classList.contains('open'));
    return;
  }
  if (!e.target.closest('.user-menu')) {
    document.querySelectorAll('.user-menu.open').forEach((m) => m.classList.remove('open'));
  }

  if (e.target.closest('[data-logout]')) {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    toast('Вы вышли из аккаунта');
    navigate('/');
    return;
  }

  // Кнопка «На полку» на карточках книг
  const addBtn = e.target.closest('[data-add-shelf]');
  if (addBtn) {
    addBtn.disabled = true;
    try {
      await api.put(`/shelf/${addBtn.dataset.addShelf}`, { status: 'want' });
      addBtn.outerHTML = String(html`<a class="chip status-want" href="#/shelf">${STATUS_LABELS.want}</a>`);
      toast('Книга добавлена на полку');
    } catch (err) {
      addBtn.disabled = false;
      toast(err.message, 'error');
    }
  }
});

window.addEventListener('hashchange', render);

async function start() {
  try {
    const { user } = await api.get('/auth/me');
    state.user = user;
  } catch {
    state.user = null;
  }
  renderNav();
  render();
}

start();
