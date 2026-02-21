/**
 * storage.js
 * フォーマットデータ・回答セッションの LocalStorage 永続化管理
 */

/* ================================================================== */
/* フォーマット                                                           */
/* ================================================================== */
const FORMAT_KEY = 'answersheet_formats';

function loadFormats() {
  try { return JSON.parse(localStorage.getItem(FORMAT_KEY) ?? '{}'); } catch { return {}; }
}

function saveFormat(name, schema) {
  const f = loadFormats();
  f[name] = schema;
  localStorage.setItem(FORMAT_KEY, JSON.stringify(f));
}

function deleteFormat(name) {
  const f = loadFormats();
  delete f[name];
  localStorage.setItem(FORMAT_KEY, JSON.stringify(f));
}

/* ================================================================== */
/* 回答セッション（複数保存対応）                                          */
/* ================================================================== */
const SESSION_KEY = 'answersheet_sessions';

/**
 * @typedef {Object} AnswerSession
 * @property {number}  id          - Date.now() によるユニークID
 * @property {string}  sessionName - ユーザーが付けたセッション名
 * @property {string}  formatName  - 紐付きフォーマット名
 * @property {string}  savedAt     - ISO 8601 形式
 * @property {Object}  answers     - { [qKey]: string }
 */

/** @returns {AnswerSession[]} */
function loadAllSessions() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? '[]'); } catch { return []; }
}

/**
 * @param {string} sessionName
 * @param {string} formatName
 * @param {Object} answers
 * @param {Array}  schema    - 保存時点のスキーマスナップショット
 * @returns {AnswerSession}
 */
function saveAnswerSession(sessionName, formatName, answers, schema) {
  const sessions = loadAllSessions();
  const entry = {
    id: Date.now(),
    sessionName,
    formatName,
    savedAt: new Date().toISOString(),
    answers: structuredClone(answers),
    schema:  structuredClone(schema),   // ← スキーマを一緒に保存
  };
  sessions.unshift(entry);
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  return entry;
}

/**
 * @param {number} id
 */
function deleteAnswerSession(id) {
  const sessions = loadAllSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

/** @param {number} id @returns {AnswerSession|undefined} */
function getAnswerSession(id) {
  return loadAllSessions().find(s => s.id === id);
}
