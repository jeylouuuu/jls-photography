const { DatabaseSync } = require('node:sqlite');
const { getDbPath } = require('./paths');

let db;

function connect() {
  if (db) return db;
  const p = getDbPath();
  // Forward slashes avoid backslash-escape issues on Windows
  db = new DatabaseSync(p.replace(/\\/g, '/'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function getDb() {
  return connect();
}

module.exports = { getDb, connect };