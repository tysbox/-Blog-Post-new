// スプレッドシート型エディタのクライアント。
// 依存を増やさないため素の DOM API のみで実装している。

const state = {
  karuta: { perPage: 3, max: 100, cards: [] },
  glossary: [],
  usage: { bySlug: {}, articleCount: 0, totalChars: 0, errors: [] },
  meta: null,
  dirty: false,
  activeTab: 'karuta',
};

const $ = (id) => document.getElementById(id);

// --- ユーティリティ -------------------------------------------------------

function setDirty(value) {
  state.dirty = value;
  $('dirty-badge').hidden = !value;
}

function showStatus(message, { error = false, details = [] } = {}) {
  const el = $('status');
  el.classList.toggle('is-error', error);
  el.innerHTML = '';
  const p = document.createElement('div');
  p.textContent = message;
  el.appendChild(p);
  if (details.length > 0) {
    const ul = document.createElement('ul');
    for (const d of details) {
      const li = document.createElement('li');
      li.textContent = d;
      ul.appendChild(li);
    }
    el.appendChild(ul);
  }
  el.hidden = false;
  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    el.hidden = true;
  }, error ? 12000 : 4000);
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.errors?.[0] ?? `HTTP ${res.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

function applyState(payload) {
  state.karuta = payload.karuta;
  state.glossary = payload.glossary;
  state.usage = payload.usage;
  state.meta = payload.meta;
  setDirty(false);
  render();
}

// --- カルタ ---------------------------------------------------------------

function karutaColumns() {
  return state.meta.karutaFields.map((field) => ({
    field,
    label: state.meta.karutaLabels[field] ?? field,
    multiline: state.meta.karutaMultiline.includes(field),
    wide: state.meta.karutaMultiline.includes(field) || field === 'alt',
    narrow: ['number', 'kanjiNum', 'folioId', 'icon'].includes(field),
  }));
}

function renderKaruta() {
  const table = $('karuta-table');
  table.innerHTML = '';
  const columns = karutaColumns();

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  for (const col of columns) {
    const th = document.createElement('th');
    th.textContent = col.label;
    const name = document.createElement('span');
    name.className = 'field-name';
    name.textContent = col.field;
    th.appendChild(name);
    headRow.appendChild(th);
  }
  const opsHead = document.createElement('th');
  opsHead.textContent = '操作';
  headRow.appendChild(opsHead);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.karuta.cards.forEach((card, index) => {
    const tr = document.createElement('tr');

    const rowHead = document.createElement('td');
    rowHead.className = 'row-head';
    rowHead.textContent = String(index + 1);
    tr.appendChild(rowHead);

    for (const col of columns) {
      const td = document.createElement('td');
      td.className = `cell${col.wide ? ' wide' : ''}${col.narrow ? ' narrow' : ''}`;

      const input = col.multiline ? document.createElement('textarea') : document.createElement('input');
      if (!col.multiline) input.type = 'text';
      input.value = card[col.field] ?? '';
      input.spellcheck = false;
      input.addEventListener('input', () => {
        card[col.field] = input.value;
        setDirty(true);
        if (col.field === 'image') updateImageNote(td, input.value);
      });
      td.appendChild(input);

      if (col.field === 'image') {
        const note = document.createElement('span');
        note.className = 'cell-note';
        td.appendChild(note);
        updateImageNote(td, input.value);
      }

      tr.appendChild(td);
    }

    tr.appendChild(opsCell(index, state.karuta.cards, renderKaruta));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  $('karuta-per-page').value = state.karuta.perPage;
  $('karuta-max').value = state.karuta.max;
  $('karuta-count').textContent = `${state.karuta.cards.length} / ${state.karuta.max} 枚`;
}

function updateImageNote(td, value) {
  const note = td.querySelector('.cell-note');
  if (!note) return;
  note.innerHTML = '';
  const path = String(value ?? '').trim();
  if (!path) {
    note.textContent = '未設定';
    note.classList.add('is-ng');
    return;
  }
  note.classList.remove('is-ng');
  if (!path.startsWith('/')) {
    note.textContent = '/ から始めてください';
    note.classList.add('is-ng');
    return;
  }
  const img = document.createElement('img');
  img.src = path;
  img.alt = '';
  img.style.cssText = 'max-height:44px;border-radius:4px;display:block;margin-top:4px';
  img.addEventListener('error', () => {
    img.remove();
    note.textContent = '画像が見つかりません';
    note.classList.add('is-ng');
  });
  note.appendChild(img);
}

// --- 用語集 ---------------------------------------------------------------

function glossaryColumns() {
  return state.meta.glossaryFields.map((field) => ({
    field,
    label: state.meta.glossaryLabels[field] ?? field,
    multiline: field === 'description',
    wide: field === 'description' || field === 'excludeSpellings',
    narrow: field === 'slug' || field === 'caseSensitive',
  }));
}

function renderGlossary() {
  const table = $('glossary-table');
  table.innerHTML = '';
  const columns = glossaryColumns();

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  for (const col of columns) {
    const th = document.createElement('th');
    th.textContent = col.label;
    const name = document.createElement('span');
    name.className = 'field-name';
    name.textContent = col.field;
    th.appendChild(name);
    headRow.appendChild(th);
  }
  const usageHead = document.createElement('th');
  usageHead.textContent = '本文での出現';
  headRow.appendChild(usageHead);
  const opsHead = document.createElement('th');
  opsHead.textContent = '操作';
  headRow.appendChild(opsHead);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.glossary.forEach((entry, index) => {
    const tr = document.createElement('tr');

    const rowHead = document.createElement('td');
    rowHead.className = 'row-head';
    rowHead.textContent = String(index + 1);
    tr.appendChild(rowHead);

    for (const col of columns) {
      const td = document.createElement('td');
      td.className = `cell${col.wide ? ' wide' : ''}${col.narrow ? ' narrow' : ''}`;

      if (col.field === 'caseSensitive') {
        const wrap = document.createElement('div');
        wrap.className = 'checkbox-cell';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = entry.caseSensitive === true;
        input.addEventListener('change', () => {
          entry.caseSensitive = input.checked;
          setDirty(true);
          renderGlossaryUsage();
        });
        wrap.appendChild(input);
        td.appendChild(wrap);
      } else {
        const input = col.multiline
          ? document.createElement('textarea')
          : document.createElement('input');
        if (!col.multiline) input.type = 'text';
        input.value =
          col.field === 'excludeSpellings' ? entry.excludeSpellings.join(' | ') : entry[col.field] ?? '';
        input.spellcheck = false;
        input.addEventListener('input', () => {
          if (col.field === 'excludeSpellings') {
            entry.excludeSpellings = input.value
              .split(/\s*[|｜]\s*/)
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            entry[col.field] = input.value;
          }
          setDirty(true);
          if (col.field === 'term' || col.field === 'slug') renderGlossaryUsage();
        });
        td.appendChild(input);
      }

      tr.appendChild(td);
    }

    const usageCell = document.createElement('td');
    usageCell.className = 'cell narrow';
    usageCell.dataset.usageRow = String(index);
    tr.appendChild(usageCell);

    tr.appendChild(opsCell(index, state.glossary, renderGlossary));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  $('glossary-count').textContent = `${state.glossary.length} 語`;
  renderGlossaryUsage();
}

function renderGlossaryUsage() {
  const cells = document.querySelectorAll('[data-usage-row]');
  cells.forEach((cell) => {
    const index = Number(cell.dataset.usageRow);
    const entry = state.glossary[index];
    if (!entry) return;
    const slug = String(entry.slug || entry.term || '').trim();
    const usage = state.usage.bySlug[slug];
    cell.innerHTML = '';
    const note = document.createElement('span');
    note.className = 'cell-note';
    if (!usage) {
      note.textContent = '未登録';
      note.classList.add('is-ng');
    } else if (usage.count === 0) {
      note.textContent = '本文に出現なし';
      note.classList.add('is-ng');
    } else {
      note.textContent = `${usage.count} 回`;
      note.classList.add('is-ok');
    }
    cell.appendChild(note);
  });

  $('glossary-usage').textContent = `記事 ${state.usage.articleCount} 件 / 本文 ${state.usage.totalChars} 文字`;
}

// --- 行操作 ---------------------------------------------------------------

function opsCell(index, list, rerender) {
  const td = document.createElement('td');
  td.className = 'ops';

  const up = document.createElement('button');
  up.type = 'button';
  up.textContent = '↑';
  up.title = '上へ移動';
  up.disabled = index === 0;
  up.addEventListener('click', () => {
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    setDirty(true);
    rerender();
  });

  const down = document.createElement('button');
  down.type = 'button';
  down.textContent = '↓';
  down.title = '下へ移動';
  down.disabled = index === list.length - 1;
  down.addEventListener('click', () => {
    [list[index + 1], list[index]] = [list[index], list[index + 1]];
    setDirty(true);
    rerender();
  });

  const dup = document.createElement('button');
  dup.type = 'button';
  dup.textContent = '複製';
  dup.addEventListener('click', () => {
    list.splice(index + 1, 0, structuredClone(list[index]));
    setDirty(true);
    rerender();
  });

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'danger';
  del.textContent = '削除';
  del.addEventListener('click', () => {
    if (!confirm(`${index + 1} 行目を削除します。よろしいですか？`)) return;
    list.splice(index, 1);
    setDirty(true);
    rerender();
  });

  td.append(up, down, dup, del);
  return td;
}

function addKarutaRow() {
  const next = state.karuta.cards.length + 1;
  state.karuta.cards.push({
    number: String(next).padStart(2, '0'),
    kanjiNum: '',
    tag: '',
    romaji: '',
    titleJp: '',
    titleEn: '',
    image: '',
    alt: '',
    folioId: `FOLIO ${String(next).padStart(2, '0')}`,
    category: '',
    icon: '',
    bodyJp: '',
    bodyEn: '',
  });
  setDirty(true);
  renderKaruta();
}

function addGlossaryRow() {
  state.glossary.push({
    file: '',
    slug: '',
    term: '',
    reading: '',
    description: '',
    caseSensitive: false,
    excludeSpellings: [],
  });
  setDirty(true);
  renderGlossary();
}

// --- 保存 -----------------------------------------------------------------

async function save() {
  try {
    if (state.activeTab === 'karuta') {
      const payload = {
        perPage: Number($('karuta-per-page').value) || 3,
        max: Number($('karuta-max').value) || 100,
        cards: state.karuta.cards,
      };
      const res = await api('/api/karuta', { method: 'POST', body: JSON.stringify(payload) });
      applyState(res.state);
      showStatus(`カルタを保存しました（${res.written.length} ファイル）`, { details: res.warnings });
    } else {
      const res = await api('/api/glossary', {
        method: 'POST',
        body: JSON.stringify({ entries: state.glossary }),
      });
      applyState(res.state);
      showStatus(
        `用語集を保存しました（書き込み ${res.written.length} / 削除 ${res.removed.length}）`,
        { details: res.warnings },
      );
    }
  } catch (err) {
    showStatus(`保存できませんでした: ${err.message}`, {
      error: true,
      details: err.payload?.errors ?? [],
    });
  }
}

// --- タブ -----------------------------------------------------------------

function switchTab(tab) {
  state.activeTab = tab;
  $('tab-karuta').classList.toggle('is-active', tab === 'karuta');
  $('tab-glossary').classList.toggle('is-active', tab === 'glossary');
  $('panel-karuta').hidden = tab !== 'karuta';
  $('panel-glossary').hidden = tab !== 'glossary';
}

function render() {
  renderKaruta();
  renderGlossary();
}

// --- バックアップ ---------------------------------------------------------

async function openBackups() {
  const { backups } = await api('/api/backups');
  const list = $('backup-list');
  list.innerHTML = '';
  if (backups.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'バックアップはまだありません';
    list.appendChild(li);
  }
  for (const backup of backups) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${backup.id.replace('T', ' ').replace(/-/g, ':').slice(0, 19)}（${backup.files.length} ファイル）`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = '復元';
    btn.addEventListener('click', async () => {
      if (!confirm('この時点の状態に戻します。現在の内容は退避されます。よろしいですか？')) return;
      const res = await api('/api/restore', {
        method: 'POST',
        body: JSON.stringify({ id: backup.id }),
      });
      applyState(res.state);
      $('dialog-backups').close();
      showStatus(
        `${res.restored.length} ファイルを復元しました` +
          (res.removed?.length ? `（追加分 ${res.removed.length} 件を削除）` : ''),
      );
    });
    li.append(label, btn);
    list.appendChild(li);
  }
  $('dialog-backups').showModal();
}

// --- 取込 -----------------------------------------------------------------

async function applyImport() {
  const text = $('import-text').value;
  if (!text.trim()) {
    $('import-note').textContent = '取り込む内容がありません';
    return;
  }
  const res = await api('/api/import', {
    method: 'POST',
    body: JSON.stringify({ type: state.activeTab, text }),
  });

  if (res.rows.length === 0) {
    $('import-note').textContent = 'データ行がありません（1行目はヘッダーとして扱います）';
    return;
  }

  const mode = confirm(
    `${res.rows.length} 行を取り込みます。\n\nOK: 末尾に追加\nキャンセル: すべて置き換え`,
  );

  if (state.activeTab === 'karuta') {
    const rows = res.rows.map((row) => ({ ...row }));
    state.karuta.cards = mode ? [...state.karuta.cards, ...rows] : rows;
    renderKaruta();
  } else {
    const rows = res.rows.map((row) => ({
      file: '',
      slug: row.slug ?? '',
      term: row.term ?? '',
      reading: row.reading ?? '',
      description: row.description ?? '',
      caseSensitive: row.caseSensitive === true,
      excludeSpellings: row.excludeSpellings ?? [],
    }));
    state.glossary = mode ? [...state.glossary, ...rows] : rows;
    renderGlossary();
  }

  setDirty(true);
  $('dialog-import').close();
  showStatus(`${res.rows.length} 行を取り込みました。内容を確認して「保存」してください。`, {
    details: res.unknownHeaders.length
      ? [`未対応の列は無視しました: ${res.unknownHeaders.join(', ')}`]
      : [],
  });
}

// --- 初期化 ---------------------------------------------------------------

function bind() {
  $('tab-karuta').addEventListener('click', () => switchTab('karuta'));
  $('tab-glossary').addEventListener('click', () => switchTab('glossary'));

  $('karuta-add').addEventListener('click', addKarutaRow);
  $('glossary-add').addEventListener('click', addGlossaryRow);

  $('karuta-per-page').addEventListener('input', (e) => {
    state.karuta.perPage = Number(e.target.value) || 3;
    setDirty(true);
  });
  $('karuta-max').addEventListener('input', (e) => {
    state.karuta.max = Number(e.target.value) || 100;
    setDirty(true);
    $('karuta-count').textContent = `${state.karuta.cards.length} / ${state.karuta.max} 枚`;
  });

  $('btn-save').addEventListener('click', save);

  $('btn-reload').addEventListener('click', async () => {
    if (state.dirty && !confirm('未保存の変更を破棄して読み込み直しますか？')) return;
    applyState(await api('/api/state'));
    showStatus('読み込み直しました');
  });

  $('btn-export').addEventListener('click', () => {
    window.location.href = `/api/export?type=${state.activeTab}`;
  });

  $('btn-import').addEventListener('click', () => {
    $('import-text').value = '';
    $('import-note').textContent = '';
    $('dialog-import').showModal();
  });
  $('import-apply').addEventListener('click', (e) => {
    e.preventDefault();
    applyImport();
  });

  $('btn-backups').addEventListener('click', openBackups);

  window.addEventListener('beforeunload', (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });
}

bind();
applyState(await api('/api/state'));
