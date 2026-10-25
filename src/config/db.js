const sql = require('mssql');

function buildConfig(database = process.env.DB_NAME || 'BookShelf') {
  const config = {
    server: process.env.DB_SERVER || 'localhost',
    database,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
  // Именованный экземпляр (например, SQLEXPRESS) находится через SQL Browser, порт не указывается
  if (process.env.DB_INSTANCE) {
    config.options.instanceName = process.env.DB_INSTANCE;
  } else {
    config.port = Number(process.env.DB_PORT) || 1433;
  }
  return config;
}

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(buildConfig())
      .connect()
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

function bindParams(request, params) {
  for (const [name, value] of Object.entries(params)) {
    request.input(name, value === undefined ? null : value);
  }
  return request;
}

/**
 * Выполняет параметризованный запрос.
 * @param {string} text SQL с параметрами вида @name
 * @param {object} params значения параметров
 */
async function query(text, params = {}, executor = null) {
  const target = executor || (await getPool());
  return bindParams(target.request(), params).query(text);
}

/** Выполняет fn(tx) в транзакции; tx передаётся в query третьим аргументом. */
async function transaction(fn) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback().catch(() => {});
    throw err;
  }
}

/** Шаблон для LIKE '%...%' с экранированием спецсимволов. */
function like(text) {
  return text ? `%${String(text).replace(/[[%_]/g, '[$&]')}%` : null;
}

module.exports = { sql, buildConfig, getPool, query, transaction, like };
