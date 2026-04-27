const { Pool } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
// Skips ? inside single-quoted strings
function convertPlaceholders(text) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

// Handle MySQL-style batch inserts: VALUES ? with [[row1], [row2], ...]
// Converts to PostgreSQL multi-row INSERT: VALUES ($1,$2), ($3,$4), ...
function expandBatchInsert(text, params) {
  // Detect pattern: INSERT INTO ... VALUES ?  with params = [[array of arrays]]
  if (!text.match(/VALUES\s+\?\s*$/i)) return null;
  if (!params || params.length !== 1 || !Array.isArray(params[0])) return null;

  const rows = params[0];
  if (rows.length === 0 || !Array.isArray(rows[0])) return null;

  const colsPerRow = rows[0].length;
  const allParams = [];
  const valueClauses = [];

  for (const row of rows) {
    const placeholders = [];
    for (const val of row) {
      allParams.push(val);
      placeholders.push(`$${allParams.length}`);
    }
    valueClauses.push(`(${placeholders.join(", ")})`);
  }

  // Replace "VALUES ?" with expanded values
  const newText = text.replace(
    /VALUES\s+\?\s*$/i,
    `VALUES ${valueClauses.join(", ")}`,
  );
  return { text: newText, params: allParams };
}

// Core query function used by both the module-level query and getConnection
async function executeQuery(queryFn, text, params) {
  let convertedText = text;
  let convertedParams = params;

  // Check for batch insert pattern first
  const batch = expandBatchInsert(text, params);
  if (batch) {
    convertedText = batch.text;
    convertedParams = batch.params;
  } else {
    convertedText = convertPlaceholders(text);
  }

  const trimmed = convertedText.trim().toUpperCase();
  const isInsert = trimmed.startsWith("INSERT");
  const isUpdate = trimmed.startsWith("UPDATE");
  const isDelete = trimmed.startsWith("DELETE");

  // For INSERT queries, automatically add RETURNING id if not present
  if (isInsert && !convertedText.toUpperCase().includes("RETURNING")) {
    convertedText = convertedText.replace(/;?\s*$/, " RETURNING id");
  }

  const result = await queryFn(convertedText, convertedParams);

  if (isInsert) {
    const resultHeader = {
      insertId: result.rows[0]?.id,
      affectedRows: result.rowCount,
      rows: result.rows,
    };
    return [resultHeader, []];
  }

  if (isUpdate || isDelete) {
    const resultHeader = {
      affectedRows: result.rowCount,
      changedRows: result.rowCount,
    };
    return [resultHeader, []];
  }

  // SELECT queries - return rows array like mysql2
  return [result.rows, result.fields || []];
}

// Wrapper that mimics mysql2 promise pool interface
const db = {
  query: async (text, params) => {
    return executeQuery((t, p) => pool.query(t, p), text, params);
  },
  pool: pool,
  // Provide getConnection for code that uses connection-based transactions
  getConnection: async () => {
    const client = await pool.connect();
    const clientQuery = (t, p) => client.query(t, p);
    return {
      execute: async (text, params) => executeQuery(clientQuery, text, params),
      query: async (text, params) => executeQuery(clientQuery, text, params),
      release: () => client.release(),
      beginTransaction: async () => await client.query("BEGIN"),
      commit: async () => await client.query("COMMIT"),
      rollback: async () => await client.query("ROLLBACK"),
    };
  },
};

module.exports = db;
