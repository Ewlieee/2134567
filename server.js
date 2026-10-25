require('dotenv').config({ quiet: true });
const app = require('./src/app');
const { getPool } = require('./src/config/db');

const PORT = Number(process.env.PORT) || 3000;

getPool()
  .then(() => {
    app.listen(PORT, () => console.log(`Книжная полка запущена: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Не удалось подключиться к MS SQL Server:', err.message);
    console.error('Проверьте настройки в файле .env и выполните `npm run db:init`.');
    process.exit(1);
  });
