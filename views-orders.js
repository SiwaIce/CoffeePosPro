/* ============================================
   COFFEE POS — VIEWS-ORDERS.JS
   รายการออเดอร์ / ประวัติ / ค้นหา
   ============================================ */

/* === ORDERS VIEW STATE === */
var ORDVIEW = {
  filterDate: '',        /* '' = today */
  filterRange: 'today',  /* 'today' | 'yesterday' | 'week' | 'month' | 'custom' */
  filterStatus: 'all',   /* 'all' | 'completed' | 'cancelled' */
  filterPayment: 'all',  /* 'all' | 'cash' | 'transfer' | 'qr' */
  searchQuery: '',
  customFrom: '',
  customTo: '',
  sortKey: 'timestamp',
  sortDesc: true,
  page: 1,
  perPage: 30
};

/* ============================================
   RENDER ORDERS VIEW
   ============================================ */
function renderOrdersView() {
  var main = $('mainContent');
  if (!main) return;

  var html = '';
  html += '<div class="page-pad anim-fadeUp">';

  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">📜 รายการออเดอร์</div>';
  html += '<div class="section-tools">';
  html += '<button class="btn btn-secondary btn-sm" onclick="refreshOrdersView()">🔄 รีเฟรช</button>';
  html += '</div>';
  html += '</div>';

  /* KPI Cards */
  html += renderOrderKPI();

  /* Filters */
  html += renderOrderFilters();

  /* Order List */
  html += '<div id="orderListArea">';
  html += renderOrderList();
  html += '</div>';

  html += '</div>';
  main.innerHTML = html;
}

function refreshOrdersView() {
  renderOrdersView();
  toast('รีเฟรชแล้ว', 'info', 1000);
}

/* ============================================
   ORDER KPI CARDS
   ============================================ */
function renderOrderKPI() {
  var orders = getFilteredOrders();
  var completed = [];
  var cancelled = [];

  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status === 'cancelled') {
      cancelled.push(orders[i]);
    } else {
      completed.push(orders[i]);
    }
  }

  var totalSales = sumBy(completed, 'total');
  var totalOrders = completed.length;
  var avgPerBill = totalOrders > 0 ? roundTo(totalSales / totalOrders, 0) : 0;

  /* Count items sold */
  var itemsSold = 0;
  for (var j = 0; j < completed.length; j++) {
    var items = completed[j].items || [];
    for (var k = 0; k < items.length; k++) {
      itemsSold += items[k].qty || 0;
    }
  }

  /* Payment breakdown */
  var cashTotal = 0;
  var transferTotal = 0;
  var qrTotal = 0;
  for (var p = 0; p < completed.length; p++) {
    var amt = completed[p].total || 0;
    if (completed[p].payment === 'cash') cashTotal += amt;
    else if (completed[p].payment === 'transfer') transferTotal += amt;
    else if (completed[p].payment === 'qr') qrTotal += amt;
  }

  var html = '<div class="kpi-grid mb-20">';

  html += kpiCard('💰', formatMoneySign(totalSales), 'ยอดขาย', 'accent');
  html += kpiCard('🧾', totalOrders, 'ออเดอร์', 'info');
  html += kpiCard('📊', formatMoneySign(avgPerBill), 'เฉลี่ย/บิล', 'accent2');
  html += kpiCard('☕', itemsSold, 'แก้ว/ชิ้น', 'success');

  html += '</div>';

  /* Payment breakdown mini */
  if (totalOrders > 0) {
    html += '<div class="flex gap-12 mb-16 flex-wrap">';
    if (cashTotal > 0) html += '<span class="badge badge-success">💵 เงินสด ' + formatMoneySign(cashTotal) + '</span>';
    if (transferTotal > 0) html += '<span class="badge badge-info">📱 โอน ' + formatMoneySign(transferTotal) + '</span>';
    if (qrTotal > 0) html += '<span class="badge badge-accent">📷 QR ' + formatMoneySign(qrTotal) + '</span>';
    if (cancelled.length > 0) html += '<span class="badge badge-danger">❌ ยกเลิก ' + cancelled.length + ' บิล</span>';
    html += '</div>';
  }

  return html;
}

function kpiCard(icon, value, label, color) {
  var colorVar = color === 'accent' ? 'var(--accent)' :
    color === 'accent2' ? 'var(--accent2)' :
    color === 'info' ? 'var(--info)' :
    color === 'success' ? 'var(--success)' :
    color === 'danger' ? 'var(--danger)' :
    color === 'warning' ? 'var(--warning)' : 'var(--text-primary)';

  var html = '<div class="kpi-card">';
  html += '<div class="kpi-icon">' + icon + '</div>';
  html += '<div class="kpi-value" style="color:' + colorVar + ';">' + value + '</div>';
  html += '<div class="kpi-label">' + sanitize(label) + '</div>';
  html += '</div>';
  return html;
}

/* ============================================
   ORDER FILTERS
   ============================================ */
function renderOrderFilters() {
  var html = '<div class="order-filters card mb-16">';

  /* Date range tabs */
  html += '<div class="flex gap-8 mb-12 flex-wrap">';
  html += orderRangeBtn('today', '📅 วันนี้');
  html += orderRangeBtn('yesterday', 'เมื่อวาน');
  html += orderRangeBtn('week', '📆 สัปดาห์นี้');
  html += orderRangeBtn('month', '🗓️ เดือนนี้');
  html += orderRangeBtn('custom', '📌 กำหนดเอง');
  html += '</div>';

  /* Custom date range */
  if (ORDVIEW.filterRange === 'custom') {
    html += '<div class="form-row mb-12">';
    html += '<div class="form-group">';
    html += '<label class="form-label">จาก</label>';
    html += '<input type="date" id="ordFromDate" value="' + toInputDate(ORDVIEW.customFrom) + '" onchange="onOrdCustomDate()">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label class="form-label">ถึง</label>';
    html += '<input type="date" id="ordToDate" value="' + toInputDate(ORDVIEW.customTo) + '" onchange="onOrdCustomDate()">';
    html += '</div>';
    html += '</div>';
  }

  /* Second row: status + payment + search */
  html += '<div class="flex gap-8 flex-wrap" style="align-items:flex-end;">';

  /* Status filter */
  html += '<div class="form-group" style="margin-bottom:0;min-width:120px;">';
  html += '<label class="form-label">สถานะ</label>';
  html += '<select id="ordStatus" onchange="onOrdFilterChange()" style="width:auto;">';
  html += '<option value="all"' + (ORDVIEW.filterStatus === 'all' ? ' selected' : '') + '>ทั้งหมด</option>';
  html += '<option value="completed"' + (ORDVIEW.filterStatus === 'completed' ? ' selected' : '') + '>✅ สำเร็จ</option>';
  html += '<option value="cancelled"' + (ORDVIEW.filterStatus === 'cancelled' ? ' selected' : '') + '>❌ ยกเลิก</option>';
  html += '</select>';
  html += '</div>';

  /* Payment filter */
  html += '<div class="form-group" style="margin-bottom:0;min-width:120px;">';
  html += '<label class="form-label">ชำระโดย</label>';
  html += '<select id="ordPayment" onchange="onOrdFilterChange()" style="width:auto;">';
  html += '<option value="all"' + (ORDVIEW.filterPayment === 'all' ? ' selected' : '') + '>ทั้งหมด</option>';
  html += '<option value="cash"' + (ORDVIEW.filterPayment === 'cash' ? ' selected' : '') + '>💵 เงินสด</option>';
  html += '<option value="transfer"' + (ORDVIEW.filterPayment === 'transfer' ? ' selected' : '') + '>📱 โอน</option>';
  html += '<option value="qr"' + (ORDVIEW.filterPayment === 'qr' ? ' selected' : '') + '>📷 QR</option>';
  html += '</select>';
  html += '</div>';

  /* Search */
  html += '<div class="form-group" style="margin-bottom:0;flex:1;min-width:180px;">';
  html += '<label class="form-label">ค้นหา</label>';
  html += '<input type="text" id="ordSearch" value="' + sanitize(ORDVIEW.searchQuery) + '" placeholder="เลขออเดอร์, เมนู..." oninput="onOrdSearch(this.value)">';
  html += '</div>';

  html += '</div>';

  html += '</div>';
  return html;
}

function orderRangeBtn(key, label) {
  var active = ORDVIEW.filterRange === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="setOrderRange(\'' + key + '\')">' + label + '</button>';
}

/* ============================================
   DATE RANGE LOGIC
   ============================================ */
function setOrderRange(range) {
  ORDVIEW.filterRange = range;
  ORDVIEW.page = 1;
  vibrate(20);

  /* Set default custom dates */
  if (range === 'custom' && !ORDVIEW.customFrom) {
    ORDVIEW.customFrom = todayStr();
    ORDVIEW.customTo = todayStr();
  }

  renderOrdersView();
}

function getDateRange() {
  var now = new Date();
  var from, to;

  switch (ORDVIEW.filterRange) {
    case 'today':
      from = todayStr();
      to = todayStr();
      break;
    case 'yesterday':
      var y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = formatDate(y);
      to = formatDate(y);
      break;
    case 'week':
      var ws = startOfWeek(now);
      from = formatDate(ws);
      to = todayStr();
      break;
    case 'month':
      var ms = startOfMonth(now);
      from = formatDate(ms);
      to = todayStr();
      break;
    case 'custom':
      from = ORDVIEW.customFrom || todayStr();
      to = ORDVIEW.customTo || todayStr();
      break;
    default:
      from = todayStr();
      to = todayStr();
  }

  return { from: from, to: to };
}

/* Convert DD/MM/YYYY → YYYY-MM-DD for input[type=date] */
function toInputDate(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  var parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return '';
  return parts[2] + '-' + parts[1] + '-' + parts[0];
}

/* Convert YYYY-MM-DD → DD/MM/YYYY */
function fromInputDate(ymd) {
  if (!ymd) return '';
  var parts = ymd.split('-');
  if (parts.length !== 3) return '';
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function onOrdCustomDate() {
  var fromEl = $('ordFromDate');
  var toEl = $('ordToDate');
  if (fromEl) ORDVIEW.customFrom = fromInputDate(fromEl.value);
  if (toEl) ORDVIEW.customTo = fromInputDate(toEl.value);
  ORDVIEW.page = 1;
  setHTML('orderListArea', renderOrderList());
}

/* ============================================
   FILTER LOGIC
   ============================================ */
function onOrdFilterChange() {
  var statusEl = $('ordStatus');
  var payEl = $('ordPayment');
  if (statusEl) ORDVIEW.filterStatus = statusEl.value;
  if (payEl) ORDVIEW.filterPayment = payEl.value;
  ORDVIEW.page = 1;
  renderOrdersView();
}

var _ordSearchDebounce = debounce(function(val) {
  ORDVIEW.searchQuery = val;
  ORDVIEW.page = 1;
  setHTML('orderListArea', renderOrderList());
}, 250);

function onOrdSearch(val) {
  _ordSearchDebounce(val);
}

/* ============================================
   GET FILTERED ORDERS
   ============================================ */
function getFilteredOrders() {
  var range = getDateRange();
  var orders = ST.getOrdersByRange(range.from, range.to);

  /* Status filter */
  if (ORDVIEW.filterStatus !== 'all') {
    var filtered = [];
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].status === ORDVIEW.filterStatus) {
        filtered.push(orders[i]);
      }
    }
    orders = filtered;
  }

  /* Payment filter */
  if (ORDVIEW.filterPayment !== 'all') {
    var pFiltered = [];
    for (var p = 0; p < orders.length; p++) {
      if (orders[p].payment === ORDVIEW.filterPayment) {
        pFiltered.push(orders[p]);
      }
    }
    orders = pFiltered;
  }

  /* Search filter */
  if (ORDVIEW.searchQuery) {
    var sFiltered = [];
    for (var s = 0; s < orders.length; s++) {
      if (orderMatchSearch(orders[s], ORDVIEW.searchQuery)) {
        sFiltered.push(orders[s]);
      }
    }
    orders = sFiltered;
  }

  /* Sort */
  orders = sortBy(orders, ORDVIEW.sortKey, ORDVIEW.sortDesc);

  return orders;
}

function orderMatchSearch(order, query) {
  var q = query.toLowerCase().trim();
  /* Match order number */
  var numStr = String(order.number || '');
  if (numStr.indexOf(q) !== -1) return true;

  /* Match item names */
  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].name || '').toLowerCase().indexOf(q) !== -1) return true;
  }

  /* Match staff name */
  if (String(order.staffName || '').toLowerCase().indexOf(q) !== -1) return true;

  /* Match total */
  if (String(order.total || '').indexOf(q) !== -1) return true;

  return false;
}

/* ============================================
   RENDER ORDER LIST
   ============================================ */
function renderOrderList() {
  var orders = getFilteredOrders();
  var cfg = ST.getConfig();

  if (orders.length === 0) {
    var html = '<div class="empty-state">';
    html += '<div class="empty-icon">📜</div>';
    html += '<div class="empty-text">';
    if (ORDVIEW.searchQuery) {
      html += 'ไม่พบออเดอร์ที่ค้นหา';
    } else {
      html += 'ยังไม่มีออเดอร์ในช่วงนี้';
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* Pagination */
  var totalPages = Math.ceil(orders.length / ORDVIEW.perPage);
  var startIdx = (ORDVIEW.page - 1) * ORDVIEW.perPage;
  var endIdx = Math.min(startIdx + ORDVIEW.perPage, orders.length);
  var pageOrders = orders.slice(startIdx, endIdx);

  var html = '';

  /* Count info */
  html += '<div class="flex-between mb-12">';
  html += '<span class="text-muted fs-sm">แสดง ' + (startIdx + 1) + '-' + endIdx + ' จาก ' + orders.length + ' ออเดอร์</span>';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="ordSortToggle()" title="เรียงลำดับ">';
  html += ORDVIEW.sortDesc ? '🔽 ใหม่สุด' : '🔼 เก่าสุด';
  html += '</button>';
  html += '</div>';
  html += '</div>';

  /* Group by date */
  var grouped = groupOrdersByDate(pageOrders);
  var dateKeys = Object.keys(grouped);

  for (var d = 0; d < dateKeys.length; d++) {
    var dateStr = dateKeys[d];
    var dayOrders = grouped[dateStr];

    /* Date header */
    html += '<div class="order-date-header">';
    html += '<span class="fw-700">' + relativeDay(dateStr) + '</span>';
    html += '<span class="text-muted fs-sm">' + sanitize(dateStr) + ' — ' + dayOrders.length + ' ออเดอร์</span>';
    html += '</div>';

    /* Order cards */
    html += '<div class="order-list stagger">';
    for (var o = 0; o < dayOrders.length; o++) {
      html += renderOrderCard(dayOrders[o], cfg);
    }
    html += '</div>';
  }

  /* Pagination */
  if (totalPages > 1) {
    html += renderPagination(totalPages);
  }

  return html;
}

function groupOrdersByDate(orders) {
  var result = {};
  for (var i = 0; i < orders.length; i++) {
    var d = orders[i].date || 'ไม่ระบุ';
    if (!result[d]) result[d] = [];
    result[d].push(orders[i]);
  }
  return result;
}

/* ============================================
   RENDER ORDER CARD
   ============================================ */
function renderOrderCard(order, cfg) {
  var isCancelled = order.status === 'cancelled';
  var payLabels = { cash: '💵', transfer: '📱', qr: '📷' };
  var payIcon = payLabels[order.payment] || '💳';

  var html = '';
  html += '<div class="order-card anim-fadeUp' + (isCancelled ? ' cancelled' : '') + '" onclick="modalOrderDetail(findById(ST.getOrders(),\'' + sanitize(order.id) + '\'))">';

  /* Top row */
  html += '<div class="order-top">';
  html += '<div class="flex gap-8" style="align-items:center;">';
  html += '<span class="order-num">' + cfg.orderPrefix + padZ(order.number) + '</span>';
  if (isCancelled) {
    html += '<span class="badge badge-danger">ยกเลิก</span>';
  } else {
    html += '<span class="badge badge-success">สำเร็จ</span>';
  }
  html += '</div>';
  html += '<div class="order-time">' + sanitize(order.time) + '</div>';
  html += '</div>';

  /* Items preview */
  var items = order.items || [];
  var preview = [];
  for (var i = 0; i < items.length && i < 4; i++) {
    var it = items[i];
    var line = sanitize(it.name);
    if (it.size) line += ' (' + it.size + ')';
    line += ' x' + it.qty;
    preview.push(line);
  }
  if (items.length > 4) {
    preview.push('...อีก ' + (items.length - 4) + ' รายการ');
  }

  html += '<div class="order-items-preview">';
  html += preview.join('<br>');
  html += '</div>';

  /* Bottom row */
  html += '<div class="order-bottom">';
  html += '<div class="flex gap-8" style="align-items:center;">';
  html += '<span>' + payIcon + '</span>';
  if (order.channelName && order.channelName !== 'Walk-in') {
    html += '<span class="badge badge-info" style="font-size:10px;">' + sanitize(order.channelName) + '</span>';
  }
  if (order.staffName) {
    html += '<span class="text-muted fs-sm">👤 ' + sanitize(order.staffName) + '</span>';
  }
  html += '</div>';
  html += '<div class="order-total' + (isCancelled ? ' text-muted' : '') + '">';
  if (isCancelled) {
    html += '<s>' + formatMoneySign(order.total) + '</s>';
  } else {
    html += formatMoneySign(order.total);
  }
  html += '</div>';
  html += '</div>';

  html += '</div>';
  return html;
}

/* ============================================
   SORT TOGGLE
   ============================================ */
function ordSortToggle() {
  ORDVIEW.sortDesc = !ORDVIEW.sortDesc;
  setHTML('orderListArea', renderOrderList());
}

/* ============================================
   PAGINATION
   ============================================ */
function renderPagination(totalPages) {
  var html = '<div class="pagination">';

  /* Prev */
  var prevDisabled = ORDVIEW.page <= 1 ? ' disabled' : '';
  html += '<button class="btn btn-secondary btn-sm" onclick="ordGoPage(' + (ORDVIEW.page - 1) + ')"' + prevDisabled + '>← ก่อนหน้า</button>';

  /* Page numbers */
  html += '<div class="pagination-pages">';
  var startPage = Math.max(1, ORDVIEW.page - 2);
  var endPage = Math.min(totalPages, ORDVIEW.page + 2);

  if (startPage > 1) {
    html += '<button class="pagination-num" onclick="ordGoPage(1)">1</button>';
    if (startPage > 2) html += '<span class="pagination-dots">...</span>';
  }

  for (var p = startPage; p <= endPage; p++) {
    var active = p === ORDVIEW.page ? ' active' : '';
    html += '<button class="pagination-num' + active + '" onclick="ordGoPage(' + p + ')">' + p + '</button>';
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span class="pagination-dots">...</span>';
    html += '<button class="pagination-num" onclick="ordGoPage(' + totalPages + ')">' + totalPages + '</button>';
  }
  html += '</div>';

  /* Next */
  var nextDisabled = ORDVIEW.page >= totalPages ? ' disabled' : '';
  html += '<button class="btn btn-secondary btn-sm" onclick="ordGoPage(' + (ORDVIEW.page + 1) + ')"' + nextDisabled + '>ถัดไป →</button>';

  html += '</div>';
  return html;
}

function ordGoPage(page) {
  var orders = getFilteredOrders();
  var totalPages = Math.ceil(orders.length / ORDVIEW.perPage);
  ORDVIEW.page = clamp(page, 1, totalPages);
  setHTML('orderListArea', renderOrderList());

  /* Scroll to top */
  var main = $('mainContent');
  if (main) main.scrollTop = 0;
}

/* ============================================
   ADDITIONAL CSS (inject once)
   ============================================ */
(function() {
  var styleId = 'ordersViewStyle';
  if (document.getElementById(styleId)) return;

  var css = '';

  /* Filters card */
  css += '.order-filters{padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);}';

  /* Date header */
  css += '.order-date-header{display:flex;align-items:center;justify-content:space-between;padding:12px 0 8px;margin-top:8px;border-bottom:1px solid var(--border);}';

  /* Order list */
  css += '.order-list{display:flex;flex-direction:column;gap:8px;margin-bottom:8px;}';

  /* Cancelled order card */
  css += '.order-card.cancelled{opacity:0.5;border-left:3px solid var(--danger);}';
  css += '.order-card.cancelled:hover{opacity:0.7;}';

  /* Pagination */
  css += '.pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px 0;flex-wrap:wrap;}';
  css += '.pagination-pages{display:flex;align-items:center;gap:4px;}';
  css += '.pagination-num{width:36px;height:36px;display:flex;align-items:center;justify-content:center;';
  css += 'border-radius:var(--radius-sm);font-size:14px;font-weight:600;background:var(--bg-card);';
  css += 'border:1px solid var(--border);transition:all var(--transition);cursor:pointer;}';
  css += '.pagination-num:hover{border-color:var(--accent);color:var(--accent);}';
  css += '.pagination-num.active{background:var(--accent);color:#fff;border-color:var(--accent);}';
  css += '.pagination-dots{color:var(--text-muted);padding:0 4px;}';

  /* Mobile */
  css += '@media(max-width:768px){';
  css += '.order-filters .form-row{flex-direction:column;gap:8px;}';
  css += '.pagination{gap:4px;}';
  css += '.pagination-num{width:32px;height:32px;font-size:12px;}';
  css += '}';

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

console.log('[views-orders.js] loaded');