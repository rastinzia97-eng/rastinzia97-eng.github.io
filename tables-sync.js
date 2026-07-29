(() => {
  'use strict';

  const DB_URL =
    typeof FIREBASE_DB_URL !== 'undefined'
      ? FIREBASE_DB_URL
      : 'https://raee-cafe-default-rtdb.europe-west1.firebasedatabase.app';

  const DEFAULT_TABLES = {
    1: 'free',
    2: 'free',
    3: 'free',
    4: 'free',
    5: 'free',
    6: 'free'
  };

  const TABLE_NAMES = {
    1: 'میز ۱',
    2: 'میز ۲',
    3: 'میز ۳',
    4: 'میز ۴',
    5: 'میز ۵',
    6: 'میز ۶ — VIP'
  };

  let onlineTableStatus = { ...DEFAULT_TABLES };
  let tableSyncBusy = false;
  let selectedTable = null;

  function normalizeStatus(value) {
    return value === 'occupied' ? 'occupied' : 'free';
  }

  function normalizeTables(data) {
    const result = { ...DEFAULT_TABLES };

    for (let n = 1; n <= 6; n++) {
      result[n] = normalizeStatus(data?.[n] ?? data?.[String(n)]);
    }

    return result;
  }

  function statusText(status) {
    return status === 'occupied' ? 'پر' : 'خالی';
  }

  function showTableToast(message) {
    if (typeof toast === 'function') {
      toast(message);
      return;
    }

    const box = document.getElementById('toast');
    if (!box) return;

    box.textContent = message;
    box.classList.add('show');

    clearTimeout(window.__tableToast);
    window.__tableToast = setTimeout(() => box.classList.remove('show'), 2700);
  }

  async function firebaseRequest(path, method = 'GET', body) {
    const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '');
    let url = `${DB_URL}/${cleanPath}.json`;

    if (method === 'GET') {
      url += `?_=${Date.now()}`;
    }

    const options = {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Firebase ${response.status}`);
      }

      if (response.status === 204) return null;
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function installStyles() {
    if (document.getElementById('raee-table-sync-styles')) return;

    const style = document.createElement('style');
    style.id = 'raee-table-sync-styles';
    style.textContent = `
      .table-chip.free {
        background: #e4f2e9 !important;
        border-color: #4f7a63 !important;
        color: #315b45 !important;
      }

      .table-chip.occupied {
        background: #fde7e7 !important;
        border-color: #a64d4d !important;
        color: #873b3b !important;
        cursor: not-allowed !important;
        opacity: .82;
      }

      .table-chip.free.vip {
        background: #fff4d9 !important;
        border-color: #d5a34b !important;
        color: #76511b !important;
        box-shadow: inset 0 0 0 1px rgba(213,163,75,.25);
      }

      .table-chip.occupied.vip {
        background: #fde7e7 !important;
        border-color: #a64d4d !important;
        color: #873b3b !important;
        outline: 2px solid #d5a34b;
        outline-offset: 2px;
      }

      .table-chip.selected,
      .table-chip.free.selected {
        background: #7b523d !important;
        border-color: #7b523d !important;
        color: #fff !important;
      }

      .table-chip.vip.selected {
        background: #b3811f !important;
        border-color: #b3811f !important;
        color: #fff !important;
      }

      .table-node {
        position: relative;
        min-width: 0;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .table-node.free {
        background: #4f7a63 !important;
      }

      .table-node.occupied {
        background: #a64d4d !important;
      }

      .table-node .table-state {
        display: block;
        margin-top: 4px;
        font-size: 11px;
        font-weight: normal;
        opacity: .9;
      }

      .notice-table-help {
        margin-top: 10px;
        color: #8b7567;
        font-size: 12px;
        line-height: 1.8;
      }

      .notice-table-help .free-label {
        color: #3f6d54;
        font-weight: bold;
      }

      .notice-table-help .occupied-label {
        color: #a64d4d;
        font-weight: bold;
      }

      .table-sync-note {
        margin-top: 12px;
        padding: 9px 11px;
        border: 1px dashed #dccbbb;
        border-radius: 12px;
        background: #fffaf5;
        color: #8b7567;
        font-size: 12px;
        line-height: 1.8;
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  }

  function updateManagerDescription() {
    const section = document.getElementById('view-tables');
    if (!section) return;

    const description = section.querySelector('.detail-head .muted');
    if (description) {
      description.textContent =
        'قرمز = پر، سبز = خالی. برای تغییر وضعیت روی میز بزنید و پیام تأیید را تأیید کنید.';
    }

    const legend = section.querySelector('.table-legend');
    if (legend) {
      legend.innerHTML = `
        <span><i class="legend-dot free"></i> خالی</span>
        <span><i class="legend-dot occupied"></i> پر</span>
        <span>میز ۶ با کادر طلایی = VIP</span>
      `;
    }

    const wrapper = document.getElementById('tableMapWrap');
    if (wrapper && !wrapper.querySelector('.table-sync-note')) {
      const note = document.createElement('div');
      note.className = 'table-sync-note';
      note.textContent =
        'وضعیت میزها به‌صورت آنلاین ذخیره می‌شود و در صفحه ورودی مشتریان نیز نمایش داده خواهد شد.';
      wrapper.appendChild(note);
    }
  }

  function renderManagerTableMap() {
    const box = document.getElementById('tableMap');
    if (!box) return;

    box.innerHTML =
      [1, 2, 3, 4, 5, 6]
        .map((number) => {
          const status = normalizeStatus(onlineTableStatus[number]);
          const vipClass = number === 6 ? ' vip' : '';

          return `
            <button
              type="button"
              class="table-node t${number} ${status}${vipClass}"
              data-manager-table="${number}"
              aria-label="${TABLE_NAMES[number]}، وضعیت ${statusText(status)}"
            >
              <span>
                ${TABLE_NAMES[number]}
                <small class="table-state">${statusText(status)}</small>
              </span>
            </button>
          `;
        })
        .join('') + '<div class="tv-node">📺 تلویزیون</div>';
  }

  function renderPublicTableButtons() {
    const row = document.getElementById('noticeTableRow');
    if (!row) return;

    for (let number = 1; number <= 6; number++) {
      const button = row.querySelector(`[data-table="${number}"]`);
      if (!button) continue;

      const status = normalizeStatus(onlineTableStatus[number]);
      const isOccupied = status === 'occupied';

      button.classList.remove('free', 'occupied', 'selected');
      button.classList.add(status);
      button.disabled = isOccupied;
      button.setAttribute('aria-disabled', String(isOccupied));
      button.setAttribute(
        'aria-label',
        `${TABLE_NAMES[number]}، وضعیت ${statusText(status)}`
      );

      button.textContent = `${TABLE_NAMES[number]} — ${statusText(status)}`;

      if (selectedTable === number && !isOccupied) {
        button.classList.add('selected');
      }

      if (selectedTable === number && isOccupied) {
        selectedTable = null;

        const badge = document.getElementById('pickedTableBadge');
        if (badge) {
          badge.textContent = '';
          badge.classList.remove('show');
        }
      }
    }

    const tablesBox = row.closest('.notice-tables');

    if (tablesBox && !tablesBox.querySelector('.notice-table-help')) {
      const help = document.createElement('div');
      help.className = 'notice-table-help';
      help.innerHTML =
        '<span class="free-label">سبز: خالی و قابل انتخاب</span> • ' +
        '<span class="occupied-label">قرمز: پر و غیرقابل انتخاب</span>';
      tablesBox.appendChild(help);
    }
  }

  function renderEverything() {
    installStyles();
    updateManagerDescription();
    renderManagerTableMap();
    renderPublicTableButtons();
  }

  async function initializeTablesIfNeeded(data) {
    if (data && typeof data === 'object') return data;

    try {
      await firebaseRequest('tableStatus', 'PUT', DEFAULT_TABLES);
      return { ...DEFAULT_TABLES };
    } catch {
      return { ...DEFAULT_TABLES };
    }
  }

  async function loadOnlineTableStatus(silent = false) {
    if (tableSyncBusy) return;

    tableSyncBusy = true;

    try {
      let data = await firebaseRequest('tableStatus', 'GET');
      data = await initializeTablesIfNeeded(data);
      onlineTableStatus = normalizeTables(data);
      renderEverything();
    } catch {
      if (!silent) {
        showTableToast('دریافت وضعیت آنلاین میزها انجام نشد؛ دوباره تلاش کنید.');
      }
    } finally {
      tableSyncBusy = false;
    }
  }

  async function changeManagerTableStatus(number) {
    number = Number(number);

    if (number < 1 || number > 6 || tableSyncBusy) return;

    const currentStatus = normalizeStatus(onlineTableStatus[number]);
    const nextStatus = currentStatus === 'occupied' ? 'free' : 'occupied';
    const currentLabel = statusText(currentStatus);
    const nextLabel = statusText(nextStatus);

    const confirmed = window.confirm(
      `${TABLE_NAMES[number]} اکنون «${currentLabel}» است.\n\n` +
      `آیا مطمئن هستید که وضعیت آن به «${nextLabel}» تغییر کند؟`
    );

    if (!confirmed) return;

    tableSyncBusy = true;

    const previousStatus = currentStatus;
    onlineTableStatus[number] = nextStatus;
    renderEverything();

    try {
      await firebaseRequest(`tableStatus/${number}`, 'PUT', nextStatus);
      showTableToast(`${TABLE_NAMES[number]} ${nextLabel} شد.`);
    } catch {
      onlineTableStatus[number] = previousStatus;
      renderEverything();
      showTableToast('تغییر وضعیت میز ذخیره نشد؛ اتصال اینترنت را بررسی کنید.');
    } finally {
      tableSyncBusy = false;
    }
  }

  function handleManagerTableClick(event) {
    const table = event.target.closest('[data-manager-table]');
    if (!table) return;

    event.preventDefault();
    event.stopPropagation();

    changeManagerTableStatus(table.dataset.managerTable);
  }

  function handlePublicTableClick(event) {
    const button = event.target.closest('#noticeTableRow .table-chip');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const number = Number(button.dataset.table);
    const status = normalizeStatus(onlineTableStatus[number]);

    if (status === 'occupied') {
      showTableToast(`${TABLE_NAMES[number]} در حال حاضر پر است.`);
      return;
    }

    selectedTable = number;

    document
      .querySelectorAll('#noticeTableRow .table-chip')
      .forEach((item) => item.classList.remove('selected'));

    button.classList.add('selected');

    if (typeof selectedPublicTable !== 'undefined') {
      selectedPublicTable = number;
    }

    if (typeof enterPublicMenu === 'function') {
      enterPublicMenu(number);
    }
  }

  function startTablePolling() {
    if (window.__raeeTableSyncTimer) {
      clearInterval(window.__raeeTableSyncTimer);
    }

    window.__raeeTableSyncTimer = setInterval(() => {
      if (!document.hidden) {
        loadOnlineTableStatus(true);
      }
    }, 2500);

    window.addEventListener('online', () => loadOnlineTableStatus(true));

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadOnlineTableStatus(true);
      }
    });
  }

  function overrideOldTableFunctions() {
    window.tableStatus = function (number) {
      return normalizeStatus(onlineTableStatus[number]);
    };

    window.renderTableMap = renderManagerTableMap;

    window.toggleTableStatus = function (number) {
      changeManagerTableStatus(number);
    };
  }

  function boot() {
    installStyles();
    overrideOldTableFunctions();
    updateManagerDescription();

    const managerMap = document.getElementById('tableMap');
    const publicRow = document.getElementById('noticeTableRow');

    if (managerMap) {
      managerMap.addEventListener('click', handleManagerTableClick, true);
    }

    if (publicRow) {
      publicRow.addEventListener('click', handlePublicTableClick, true);
    }

    renderEverything();
    loadOnlineTableStatus(true);
    startTablePolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();