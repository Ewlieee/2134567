import { api } from '../../api.js';
import { html, mount, raw, esc } from '../../ui.js';
import { adminLayout } from './layout.js';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

function monthLabel(key, full = false) {
  const [y, m] = key.split('-').map(Number);
  return full ? `${MONTHS_FULL[m - 1]} ${y}` : MONTHS[m - 1];
}

function niceMax(v) {
  if (v <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / step) * step;
}

/** Столбчатая диаграмма (SVG): одна серия, столбцы ≤ 24px со скруглённым верхом. */
function barChart(data) {
  const W = 640, H = 240, padL = 32, padR = 8, padT = 20, padB = 28;
  const max = niceMax(Math.max(...data.map((d) => d.count), 1));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const slot = plotW / data.length;
  const barW = Math.min(24, slot - 2);
  const y = (v) => padT + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max].filter((t) => Number.isInteger(t));
  const peak = Math.max(...data.map((d) => d.count));

  const parts = [];
  for (const t of ticks) {
    parts.push(`<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/>`);
    parts.push(`<text class="axis" x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`);
  }
  data.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const x = cx - barW / 2;
    const top = y(d.count);
    const h = padT + plotH - top;
    const r = Math.min(4, h);
    const tip = esc(`${monthLabel(d.month, true)}: ${d.count}`);
    parts.push(`<rect class="hit" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${plotH}" data-tip="${tip}" data-x="${cx}" data-y="${top}"/>`);
    if (h > 0) {
      // Скруглён только верхний (data-end) край, у основания — прямой угол
      parts.push(`<path class="bar" d="M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z"/>`);
    }
    if (d.count === peak && peak > 0) {
      parts.push(`<text class="val" x="${cx}" y="${top - 6}" text-anchor="middle">${d.count}</text>`);
    }
    parts.push(`<text class="axis" x="${cx}" y="${H - 8}" text-anchor="middle">${monthLabel(d.month)}</text>`);
  });

  return raw(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Количество добавленных книг по месяцам">${parts.join('')}</svg>`);
}

export default async function dashboard(view) {
  const s = await api.get('/admin/stats');
  const tiles = [
    ['Книг в каталоге', s.books, '#/admin/books', s.archivedBooks ? `ещё ${s.archivedBooks} в архиве` : ''],
    ['Пользователей', s.users, '#/admin/users', s.blockedUsers ? `заблокировано: ${s.blockedUsers}` : ''],
    ['Отзывов', s.reviews, '#/admin/reviews', ''],
    ['Активных заявок', s.pendingRequests, '#/admin/requests', ''],
    ['Авторов', s.authors, '#/admin/authors', ''],
    ['Жанров', s.genres, '#/admin/genres', ''],
  ];

  mount(view, adminLayout('', html`
    <h1>Панель администратора</h1>
    <div class="stat-row">
      ${tiles.map(([label, value, href, note]) => html`<a class="card stat" href="${href}" style="color:inherit;text-decoration:none">
        <div class="value">${value}</div><div class="label">${label}</div>
        ${note ? html`<div class="small muted">${note}</div>` : ''}
      </a>`)}
    </div>
    <div class="card panel">
      <h2>Добавление книг по месяцам</h2>
      <p class="small muted">За последние 12 месяцев</p>
      <div class="chart-wrap">${barChart(s.booksByMonth)}<div class="chart-tip" role="tooltip"></div></div>
      <details style="margin-top:12px">
        <summary class="small">Показать таблицей</summary>
        <div class="table-wrap"><table class="table" style="margin-top:8px">
          <thead><tr><th>Месяц</th><th>Добавлено книг</th></tr></thead>
          <tbody>${s.booksByMonth.map((d) => html`<tr><td>${monthLabel(d.month, true)}</td><td>${d.count}</td></tr>`)}</tbody>
        </table></div>
      </details>
    </div>
  `));

  // Подсказка при наведении на столбец
  const wrap = view.querySelector('.chart-wrap');
  const svg = wrap.querySelector('svg');
  const tip = wrap.querySelector('.chart-tip');
  svg.addEventListener('mouseover', (e) => {
    const hit = e.target.closest('.hit');
    if (!hit) return;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    tip.textContent = hit.dataset.tip;
    tip.style.left = `${hit.dataset.x * scale}px`;
    tip.style.top = `${hit.dataset.y * scale - 8}px`;
    tip.style.display = 'block';
  });
  svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
}
