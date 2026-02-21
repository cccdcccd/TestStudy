/**
 * app.js
 * フォームビルダー・解答入力・セッション管理のメインロジック
 */

/* ------------------------------------------------------------------ */
/* 定数：回答タイプ定義                                                    */
/* ------------------------------------------------------------------ */
const ANSWER_TYPES = [
  { value: 'number',    label: '数字（1, 2, 3…）',          hasCount: true  },
  { value: 'katakana',  label: 'カタカナ（ア, イ, ウ…）',   hasCount: true  },
  { value: 'alpha',     label: 'アルファベット（A, B, C…）', hasCount: true  },
  { value: 'truefalse', label: '○✕',                        hasCount: false },
  { value: 'text',      label: '記述（自由入力）',            hasCount: false },
];

const KATAKANA_SEQ = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

function generateOptions(answerType, count) {
  switch (answerType) {
    case 'number':    return Array.from({ length: count }, (_, i) => String(i + 1));
    case 'katakana':  return Array.from({ length: Math.min(count, KATAKANA_SEQ.length) }, (_, i) => KATAKANA_SEQ[i]);
    case 'alpha':     return Array.from({ length: Math.min(count, 26) }, (_, i) => String.fromCharCode(65 + i));
    case 'truefalse': return ['○', '✕'];
    default:          return [];
  }
}

/* ------------------------------------------------------------------ */
/* 状態                                                                  */
/* ------------------------------------------------------------------ */
let schema            = [];
let nextId            = 1;
let currentFormatName = '';
let answerState       = {};

/* ------------------------------------------------------------------ */
/* DOM 参照                                                              */
/* ------------------------------------------------------------------ */
const tabs          = document.querySelectorAll('.tab-btn');
const panels        = document.querySelectorAll('.tab-panel');
const builderList   = document.getElementById('builder-list');
const answerForm    = document.getElementById('answer-form');
const formatSelect  = document.getElementById('format-select');
const saveNameInput = document.getElementById('save-name');
const toast         = document.getElementById('toast');
const sessionList   = document.getElementById('session-list');

/* ------------------------------------------------------------------ */
/* ユーティリティ                                                         */
/* ------------------------------------------------------------------ */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function generateId() { return nextId++; }

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/* タブ切り替え                                                           */
/* ------------------------------------------------------------------ */
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b  => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    if (btn.dataset.target === 'panel-answer')  renderAnswerSheet();
    if (btn.dataset.target === 'panel-sessions') renderSessionList();
  });
});

/* ================================================================== */
/* フォームビルダー                                                       */
/* ================================================================== */

function addQuestion() {
  schema.push({ id: generateId(), answerType: 'number', count: 4, label: '' });
  renderBuilder();
  builderList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBuilder() {
  if (schema.length === 0) {
    builderList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📄</div>
        「＋ 問題を追加」ボタンから問題を追加してください
      </div>`;
    document.getElementById('question-count').textContent = 0;
    return;
  }

  builderList.innerHTML = '';
  schema.forEach((item, idx) => {
    const typeInfo   = ANSWER_TYPES.find(t => t.value === item.answerType) ?? ANSWER_TYPES[0];
    const hasCount   = typeInfo.hasCount;
    const previewOpts = generateOptions(item.answerType, item.count);

    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="card-header">
        <span class="q-index">問 ${idx + 1}</span>
        <span class="q-badge badge-${item.answerType}">${escHtml(typeInfo.label)}</span>
        <div class="card-actions">
          <button class="btn-icon" data-action="up"     title="上へ">↑</button>
          <button class="btn-icon" data-action="down"   title="下へ">↓</button>
          <button class="btn-icon btn-danger" data-action="delete" title="削除">✕</button>
        </div>
      </div>
      <div class="card-body">
        <label class="field-label">問題ラベル（任意）</label>
        <input class="field-input label-input" type="text"
               placeholder="例: 問1、(1) など" value="${escHtml(item.label)}">

        <label class="field-label mt">回答タイプ</label>
        <select class="field-input type-select">
          ${ANSWER_TYPES.map(t =>
            `<option value="${t.value}" ${t.value === item.answerType ? 'selected' : ''}>${escHtml(t.label)}</option>`
          ).join('')}
        </select>

        <div class="count-row ${hasCount ? '' : 'hidden'}">
          <label class="field-label mt">選択肢の個数</label>
          <div class="count-input-wrap">
            <button class="btn-icon count-dec" type="button">－</button>
            <input class="field-input count-input" type="number"
                   min="1" max="46" value="${item.count}" style="text-align:center;width:64px;">
            <button class="btn-icon count-inc" type="button">＋</button>
          </div>
        </div>

        <div class="opts-preview ${item.answerType === 'text' ? 'hidden' : ''}">
          <label class="field-label mt">生成される選択肢</label>
          <div class="opts-chips">
            ${previewOpts.map(o => `<span class="chip">${escHtml(o)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-ok" data-action="ok" type="button">OK — 次の設問へ ▶</button>
      </div>
    `;

    card.querySelector('.label-input').addEventListener('input', e => { item.label = e.target.value; });

    const typeSelect  = card.querySelector('.type-select');
    const countRow    = card.querySelector('.count-row');
    const optsPreview = card.querySelector('.opts-preview');
    const countInput  = card.querySelector('.count-input');

    const refreshPreview = () => {
      const ti = ANSWER_TYPES.find(t => t.value === item.answerType) ?? ANSWER_TYPES[0];
      countRow.classList.toggle('hidden', !ti.hasCount);
      optsPreview.classList.toggle('hidden', item.answerType === 'text');
      optsPreview.querySelector('.opts-chips').innerHTML =
        generateOptions(item.answerType, item.count)
          .map(o => `<span class="chip">${escHtml(o)}</span>`).join('');
      card.querySelector('.q-badge').textContent = ti.label;
      card.querySelector('.q-badge').className   = `q-badge badge-${item.answerType}`;
    };

    typeSelect.addEventListener('change', e => { item.answerType = e.target.value; refreshPreview(); });

    countInput.addEventListener('input', e => {
      item.count = Math.max(1, Math.min(46, parseInt(e.target.value, 10) || 1));
      countInput.value = item.count;
      refreshPreview();
    });

    card.querySelector('.count-dec').addEventListener('click', () => {
      item.count = Math.max(1, item.count - 1); countInput.value = item.count; refreshPreview();
    });
    card.querySelector('.count-inc').addEventListener('click', () => {
      item.count = Math.min(46, item.count + 1); countInput.value = item.count; refreshPreview();
    });

    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'delete') {
          schema = schema.filter(s => s.id !== item.id); renderBuilder();
        } else if (action === 'up' && idx > 0) {
          [schema[idx - 1], schema[idx]] = [schema[idx], schema[idx - 1]]; renderBuilder();
        } else if (action === 'down' && idx < schema.length - 1) {
          [schema[idx + 1], schema[idx]] = [schema[idx], schema[idx + 1]]; renderBuilder();
        } else if (action === 'ok') {
          const next = { id: generateId(), answerType: item.answerType, count: item.count, label: '' };
          schema.splice(idx + 1, 0, next);
          renderBuilder();
          const newCard = builderList.children[idx + 1];
          if (newCard) { newCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); newCard.querySelector('.label-input')?.focus(); }
        }
      });
    });

    builderList.appendChild(card);
  });

  document.getElementById('question-count').textContent = schema.length;
}

document.getElementById('add-question').addEventListener('click', addQuestion);
document.getElementById('clear-builder').addEventListener('click', () => {
  if (!schema.length) return;
  if (!confirm('フォーマットを全てクリアしますか？')) return;
  schema = []; nextId = 1; renderBuilder();
});

/* ================================================================== */
/* フォーマット保存・読み込み                                              */
/* ================================================================== */

document.getElementById('save-format').addEventListener('click', () => {
  const name = saveNameInput.value.trim();
  if (!name)          { showToast('⚠ フォーマット名を入力してください'); return; }
  if (!schema.length) { showToast('⚠ 問題が1問もありません'); return; }
  saveFormat(name, schema);
  refreshFormatSelect();
  showToast(`✓ 「${name}」を保存しました`);
});

document.getElementById('load-format').addEventListener('click', () => {
  const name = formatSelect.value;
  if (!name) { showToast('⚠ 読み込むフォーマットを選択してください'); return; }
  const formats = loadFormats();
  if (!formats[name]) { showToast('⚠ フォーマットが見つかりません'); return; }
  schema = structuredClone(formats[name]);
  nextId = Math.max(0, ...schema.map(s => s.id)) + 1;
  currentFormatName = name;
  answerState = {};
  saveNameInput.value = name;
  renderBuilder();
  showToast(`✓ 「${name}」を読み込みました`);
});

document.getElementById('delete-format').addEventListener('click', () => {
  const name = formatSelect.value;
  if (!name) return;
  if (!confirm(`「${name}」を削除しますか？`)) return;
  deleteFormat(name);
  refreshFormatSelect();
  showToast(`🗑 「${name}」を削除しました`);
});

function refreshFormatSelect() {
  const names = Object.keys(loadFormats());
  formatSelect.innerHTML =
    '<option value="">── 保存済みフォーマット ──</option>' +
    names.map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
}

/* ================================================================== */
/* 解答入力                                                              */
/* ================================================================== */

function renderAnswerSheet() {
  if (!schema.length) {
    answerForm.innerHTML = '<p class="empty-msg">「フォーマット作成」タブで問題を追加してください。</p>';
    return;
  }

  answerForm.innerHTML = '';
  schema.forEach((item, idx) => {
    const lbl   = item.label || `問 ${idx + 1}`;
    const qKey  = `q_${item.id}`;
    const saved = answerState[qKey] ?? '';

    const el = document.createElement('div');
    el.className = 'answer-item';

    if (item.answerType === 'text') {
      el.innerHTML = `
        <label class="answer-label">${escHtml(lbl)}</label>
        <textarea class="answer-textarea" rows="3" placeholder="ここに回答を入力…">${escHtml(saved)}</textarea>
      `;
      el.querySelector('textarea').addEventListener('input', e => { answerState[qKey] = e.target.value; });
    } else {
      const options = generateOptions(item.answerType, item.count);
      el.innerHTML = `
        <label class="answer-label">${escHtml(lbl)}</label>
        <div class="answer-chips" role="group">
          ${options.map(o => `
            <button class="answer-chip ${o === saved ? 'selected' : ''}" type="button" data-value="${escHtml(o)}">${escHtml(o)}</button>
          `).join('')}
          <button class="answer-chip chip-clear ${saved === '' ? 'hidden' : ''}" type="button" data-value="" title="クリア">×</button>
        </div>
      `;
      el.querySelector('.answer-chips').addEventListener('click', e => {
        const chip = e.target.closest('.answer-chip');
        if (!chip) return;
        const val = chip.dataset.value;
        answerState[qKey] = val;
        el.querySelectorAll('.answer-chip:not(.chip-clear)').forEach(c =>
          c.classList.toggle('selected', c.dataset.value === val && val !== '')
        );
        el.querySelector('.chip-clear').classList.toggle('hidden', val === '');
      });
    }

    answerForm.appendChild(el);
  });
}

/* ---- 回答を保存 ---- */
document.getElementById('save-answers').addEventListener('click', () => {
  if (!schema.length) { showToast('⚠ 問題がありません'); return; }

  const nameInput = document.getElementById('session-name-input');
  const sessionName = nameInput.value.trim();
  if (!sessionName) { showToast('⚠ 保存名を入力してください'); nameInput.focus(); return; }

  const fmtName = currentFormatName || '（未保存フォーマット）';
  saveAnswerSession(sessionName, fmtName, answerState, schema); // ← schemaを追加
  showToast(`✓ 「${sessionName}」を保存しました`);
  nameInput.value = '';
});

/* ---- 一括クリア ---- */
document.getElementById('clear-answers').addEventListener('click', () => {
  if (!schema.length) return;
  if (!confirm('全ての回答をクリアしますか？')) return;
  answerState = {};
  renderAnswerSheet();
  showToast('✓ 回答をクリアしました');
});

/* ================================================================== */
/* 保存済み回答セッション一覧                                              */
/* ================================================================== */

function renderSessionList() {
  const sessions = loadAllSessions();

  if (!sessions.length) {
    sessionList.innerHTML = `
      <div class="empty-state">
        <div class="icon">💾</div>
        保存された回答はまだありません
      </div>`;
    return;
  }

  /* フォーマット名ごとにグルーピング */
  const grouped = {};
  sessions.forEach(s => {
    if (!grouped[s.formatName]) grouped[s.formatName] = [];
    grouped[s.formatName].push(s);
  });

  sessionList.innerHTML = Object.entries(grouped).map(([fmtName, items]) => `
    <div class="session-group">
      <div class="session-group-header">
        <span class="session-format-badge">📄 ${escHtml(fmtName)}</span>
        <span class="session-count">${items.length} 件</span>
      </div>
      ${items.map(s => `
        <div class="session-item" data-id="${s.id}">
          <div class="session-meta">
            <span class="session-name">${escHtml(s.sessionName)}</span>
            <span class="session-date">${formatDate(s.savedAt)}</span>
          </div>
          <div class="session-actions">
            <button class="btn-secondary btn-sm session-load" data-id="${s.id}" type="button">呼び出し</button>
            <button class="btn-icon btn-danger session-delete" data-id="${s.id}" type="button">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  /* イベント */
  sessionList.querySelectorAll('.session-load').forEach(btn => {
    btn.addEventListener('click', () => loadSession(Number(btn.dataset.id)));
  });
  sessionList.querySelectorAll('.session-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('この回答を削除しますか？')) return;
      deleteAnswerSession(Number(btn.dataset.id));
      renderSessionList();
      showToast('🗑 回答を削除しました');
    });
  });
}

function loadSession(id) {
  const session = getAnswerSession(id);
  if (!session) { showToast('⚠ セッションが見つかりません'); return; }

  /* セッションにスキーマスナップショットがあればそれを使用（車びより診断） */
  if (session.schema && session.schema.length) {
    schema = structuredClone(session.schema);
    nextId = Math.max(0, ...schema.map(s => s.id)) + 1;
  } else {
    /* 旧形式データのフォールバック: フォーマット名で検索 */
    const formats = loadFormats();
    if (formats[session.formatName]) {
      schema = structuredClone(formats[session.formatName]);
      nextId = Math.max(0, ...schema.map(s => s.id)) + 1;
    } else {
      showToast(`⚠ フォーマットが復元できません`);
      return;
    }
  }

  currentFormatName = session.formatName;
  answerState = structuredClone(session.answers);

  /* 解答入力タブへ切り替え */
  tabs.forEach(b  => b.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  document.querySelector('[data-target="panel-answer"]').classList.add('active');
  document.getElementById('panel-answer').classList.add('active');
  renderAnswerSheet();
  showToast(`✓ 「${session.sessionName}」を呼び出しました`);
}

/* ================================================================== */
/* 初期化                                                                */
/* ================================================================== */
refreshFormatSelect();
/* 1問目を最初から表示 */
schema.push({ id: generateId(), answerType: 'number', count: 4, label: '' });
renderBuilder();
