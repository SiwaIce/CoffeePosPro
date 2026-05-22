/* ============================================
   COFFEE POS — VIEWS-STOCK.JS
   จัดการวัตถุดิบ / Stock พร้อมหมวดหมู่ + Grid/List View
   Version: 2.0
   ============================================ */

/* === STOCK VIEW STATE === */
var STKVIEW = {
  tab: 'stock',
  searchQuery: '',
  filterStatus: 'all',
  filterCategory: 'all',
  viewMode: 'grid',
  logSearch: '',
  logPage: 1,
  logPerPage: 30
};

/* ============================================
   RENDER STOCK VIEW (with Skeleton Loading)
   ============================================ */

// ฟังก์ชันแสดง skeleton loading
function renderStockSkeleton() {
  var html = '<div class="stock-grid stagger">';
  for (var i = 0; i < 6; i++) {
    html += '<div class="stock-card skeleton" style="height: 180px;"></div>';
  }
  html += '</div>';
  return html;
}

// ฟังก์ชันหลัก (แสดง skeleton แล้วค่อยโหลดข้อมูลจริง)
function renderStockView() {
  var main = $('mainContent');
  if (!main) return;

  var html = '';
  html += '<div class="page-pad anim-fadeUp">';

  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">📦 จัดการ Stock</div>';
  html += '<div class="section-tools">';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditStock(null)">➕ เพิ่มวัตถุดิบ</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="modalStockCategory()">📁 จัดหมวดหมู่</button>';
  html += '</div>';
  html += '</div>';

  /* Low stock alert */
  html += renderStockAlerts();

  /* Sub-tabs */
  html += '<div class="cat-tabs mb-16">';
  html += stkSubTab('stock', '📦 วัตถุดิบ');
  html += stkSubTab('logs', '📋 ประวัติ');
  html += '</div>';

  /* Content - แสดง skeleton ก่อน */
  html += '<div id="stkContent">';
  html += renderStockSkeleton();
  html += '</div>';

  html += '</div>';
  main.innerHTML = html;

  /* โหลดข้อมูลจริงหลังจาก 100ms */
  setTimeout(function() {
    loadStockDataReal();
  }, 100);
}

// ฟังก์ชันโหลดข้อมูลจริง
function loadStockDataReal() {
  var content = renderStockContent();
  setHTML('stkContent', content);
}

// ฟังก์ชัน renderStockContent (ไม่เปลี่ยน)
function renderStockContent() {
  switch (STKVIEW.tab) {
    case 'stock': return renderStockList();
    case 'logs': return renderStockLogs();
    default: return '';
  }
}

// ฟังก์ชัน stkSubTab (ไม่เปลี่ยน)
function stkSubTab(key, label) {
  var active = STKVIEW.tab === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="switchStkTab(\'' + key + '\')">' + label + '</button>';
}

// ฟังก์ชัน switchStkTab (ปรับปรุงเล็กน้อย)
function switchStkTab(tab) {
  STKVIEW.tab = tab;
  vibrate(20);
  
  // แสดง skeleton ขณะโหลด
  setHTML('stkContent', renderStockSkeleton());
  
  setTimeout(function() {
    setHTML('stkContent', renderStockContent());
  }, 100);

  var tabs = qsa('.cat-tabs .cat-tab');
  for (var i = 0; i < tabs.length; i++) {
    var onclick = tabs[i].getAttribute('onclick') || '';
    if (onclick.indexOf("'" + tab + "'") !== -1) {
      addClass(tabs[i], 'active');
    } else {
      removeClass(tabs[i], 'active');
    }
  }
}

/* ============================================
   LOW STOCK ALERTS
   ============================================ */
function renderStockAlerts() {
  var low = ST.getLowStock();
  if (low.length === 0) return '';

  var html = '<div class="stock-alert-card mb-16 anim-fadeUp">';
  html += '<div class="flex-between mb-8">';
  html += '<div class="fw-700 text-danger">⚠️ วัตถุดิบใกล้หมด (' + low.length + ' รายการ)</div>';
  html += '</div>';

  html += '<div class="stock-alert-items">';
  for (var i = 0; i < low.length; i++) {
    var s = low[i];
    var displayQty = formatStockQty(s.qty, s.unit, s.bigUnit, s.bigUnitSize);
    var isZero = s.qty <= 0;

    html += '<div class="stock-alert-item' + (isZero ? ' zero' : '') + '">';
    html += '<div class="flex gap-8" style="align-items:center;">';
    html += '<span style="font-size:20px;">' + (isZero ? '🔴' : '🟡') + '</span>';
    html += '<div>';
    html += '<div class="fw-600">' + sanitize(s.name) + '</div>';
    html += '<div class="fs-sm text-muted">เหลือ ' + displayQty + ' (ขั้นต่ำ ' + formatStockQty(s.minQty, s.unit, s.bigUnit, s.bigUnitSize) + ')</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="flex gap-8">';
    html += '<button class="btn btn-success btn-sm" onclick="quickStockAdd(\'' + sanitize(s.id) + '\')">📥 รับเข้า</button>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';
  return html;
}

function quickStockAdd(stockId) {
  var items = ST.getStock();
  var item = findById(items, stockId);
  if (item) modalStockAdjust(item, 'add');
}

/* ============================================
   TAB: STOCK LIST (พร้อม Grid/List + หมวดหมู่)
   ============================================ */
function renderStockList() {
  var allItems = ST.getStock();
  var low = ST.getLowStock();
  var stockCats = ST.getStockCategories();

  var html = '';

  /* Toolbar */
  html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">';

/* 🔥 เพิ่มสรุปมูลค่ารวม */
  var totalValue = 0;
  for (var v = 0; v < allItems.length; v++) {
    totalValue += (allItems[v].qty || 0) * (allItems[v].costPerUnit || 0);
  }
  
  html += '<div class="stock-summary-bar mb-16" style="background:linear-gradient(135deg,var(--bg-card),var(--accent-glow));">';
  html += '<div class="flex gap-16 flex-wrap">';
  html += '<div><span class="text-muted fs-sm">📦 รายการทั้งหมด</span><div class="fw-700">' + allItems.length + '</div></div>';
  html += '<div><span class="text-muted fs-sm">💰 มูลค่ารวม</span><div class="fw-700 text-accent" style="font-size:20px;">' + formatMoneySign(roundTo(totalValue, 0)) + '</div></div>';
  html += '<div><span class="text-muted fs-sm">⚠️ ใกล้หมด</span><div class="fw-700 text-danger">' + low.length + '</div></div>';
  html += '</div>';
  html += '</div>';

  /* Search */
  html += '<div class="pos-search" style="flex:1;min-width:200px;max-width:400px;">';
  html += '<span class="pos-search-icon">🔍</span>';
  html += '<input type="text" id="stkSearch" placeholder="ค้นหาวัตถุดิบ..." value="' + sanitize(STKVIEW.searchQuery) + '" oninput="stkSearch(this.value)">';
  html += '</div>';

  /* Filters */
  html += '<div class="flex gap-8 flex-wrap">';
  html += '<select id="stkFilter" onchange="stkFilterChange(this.value)" style="width:auto;">';
  html += '<option value="all"' + (STKVIEW.filterStatus === 'all' ? ' selected' : '') + '>ทั้งหมด (' + allItems.length + ')</option>';
  html += '<option value="low"' + (STKVIEW.filterStatus === 'low' ? ' selected' : '') + '>⚠️ ใกล้หมด (' + low.length + ')</option>';
  html += '<option value="ok"' + (STKVIEW.filterStatus === 'ok' ? ' selected' : '') + '>✅ ปกติ (' + (allItems.length - low.length) + ')</option>';
  html += '</select>';
  
  /* Category filter */
  html += '<select id="stkCategoryFilter" onchange="stkCategoryFilterChange(this.value)" style="width:auto;">';
  html += '<option value="all"' + (STKVIEW.filterCategory === 'all' ? ' selected' : '') + '>📁 ทุกหมวดหมู่</option>';
  for (var c = 0; c < stockCats.length; c++) {
    var selected = (STKVIEW.filterCategory === stockCats[c].id) ? ' selected' : '';
    html += '<option value="' + stockCats[c].id + '"' + selected + '>' + (stockCats[c].icon || '📦') + ' ' + sanitize(stockCats[c].name) + '</option>';
  }
  html += '</select>';
  html += '</div>';
  html += '</div>';

  /* View Mode Toggle */
  html += '<div class="flex-between mb-16">';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-sm ' + (STKVIEW.viewMode === 'grid' ? 'btn-primary' : 'btn-secondary') + '" onclick="setStockViewMode(\'grid\')">🔲 มุมมองการ์ด</button>';
  html += '<button class="btn btn-sm ' + (STKVIEW.viewMode === 'list' ? 'btn-primary' : 'btn-secondary') + '" onclick="setStockViewMode(\'list\')">📋 มุมมองรายการ</button>';
  html += '</div>';
  html += '<div class="text-muted fs-sm">' + allItems.length + ' รายการ</div>';
  html += '</div>';

  /* Get filtered items */
  var items = filterStockItems(allItems, low);

  if (items.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📦</div>';
    html += '<div class="empty-text">';
    if (STKVIEW.searchQuery) {
      html += 'ไม่พบวัตถุดิบที่ค้นหา';
    } else if (allItems.length === 0) {
      html += 'ยังไม่มีวัตถุดิบ — กด "เพิ่ม" เพื่อเริ่มต้น';
    } else {
      html += 'ไม่มีรายการตามเงื่อนไข';
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* Summary */
  var totalValue = 0;
  for (var v = 0; v < allItems.length; v++) {
    totalValue += (allItems[v].qty || 0) * (allItems[v].costPerUnit || 0);
  }
  
  html += '<div class="stock-summary-bar mb-16">';
  html += '<div class="flex gap-16 flex-wrap">';
  html += '<div><span class="text-muted fs-sm">📦 รายการทั้งหมด</span><div class="fw-700">' + allItems.length + '</div></div>';
  html += '<div><span class="text-muted fs-sm">💰 มูลค่าคงเหลือ</span><div class="fw-700 text-accent">' + formatMoneySign(roundTo(totalValue, 0)) + '</div></div>';
  html += '<div><span class="text-muted fs-sm">⚠️ ใกล้หมด</span><div class="fw-700 text-danger">' + low.length + '</div></div>';
  html += '</div>';
  html += '</div>';

  /* Render items based on view mode */
  if (STKVIEW.viewMode === 'grid') {
    html += '<div class="stock-grid stagger" id="stockGrid">';
    for (var i = 0; i < items.length; i++) {
      html += renderStockCard(items[i], low);
    }
    html += '</div>';
  } else {
    html += '<div class="stock-list stagger" id="stockList">';
    html += renderStockListHeader();
    for (var i = 0; i < items.length; i++) {
      html += renderStockListItem(items[i], low);
    }
    html += '</div>';
  }

  return html;
}

function renderStockListHeader() {
  return '<div class="stock-list-header">' +
    '<span class="stock-list-col-name">ชื่อวัตถุดิบ</span>' +
    '<span class="stock-list-col-cat">หมวดหมู่</span>' +
    '<span class="stock-list-col-qty">คงเหลือ</span>' +
    '<span class="stock-list-col-cost">ต้นทุน/หน่วย</span>' +
    '<span class="stock-list-col-value">มูลค่า</span>' +
    '<span class="stock-list-col-status">สถานะ</span>' +
    '<span class="stock-list-col-actions"></span>' +
    '</div>';
}

function renderStockListItem(item, lowItems) {
  var isLow = false;
  for (var i = 0; i < lowItems.length; i++) {
    if (lowItems[i].id === item.id) { isLow = true; break; }
  }
  var isZero = item.qty <= 0;
  var value = roundTo((item.qty || 0) * (item.costPerUnit || 0), 2);
  var displayQty = formatStockQty(item.qty, item.unit, item.bigUnit, item.bigUnitSize);
  
  var stockCats = ST.getStockCategories();
  var category = findById(stockCats, item.categoryId);
  var catDisplay = category ? (category.icon || '📦') + ' ' + category.name : '-';
  
  var statusText = isZero ? 'หมด!' : (isLow ? 'ใกล้หมด' : 'ปกติ');
  var statusClass = isZero ? 'text-danger' : (isLow ? 'text-warning' : 'text-success');
  
  var html = '<div class="stock-list-item" onclick="modalEditStock(findById(ST.getStock(),\'' + item.id + '\'))">';
  html += '<span class="stock-list-col-name fw-600">' + sanitize(item.name) + '</span>';
  html += '<span class="stock-list-col-cat">' + catDisplay + '</span>';
  html += '<span class="stock-list-col-qty">' + displayQty + '</span>';
  html += '<span class="stock-list-col-cost">' + formatMoneySign(item.costPerUnit || 0) + '</span>';
  html += '<span class="stock-list-col-value">' + formatMoneySign(value) + '</span>';
  html += '<span class="stock-list-col-status ' + statusClass + '">' + statusText + '</span>';
  html += '<span class="stock-list-col-actions" onclick="event.stopPropagation()">';
  html += '<button class="btn-icon" onclick="modalStockAdjust(findById(ST.getStock(),\'' + item.id + '\'),\'add\')" title="รับเข้า">📥</button>';
  html += '<button class="btn-icon" onclick="modalStockAdjust(findById(ST.getStock(),\'' + item.id + '\'),\'use\')" title="ใช้ไป">📤</button>';
  html += '</span>';
  html += '</div>';
  return html;
}

function filterStockItems(allItems, low) {
  var lowIds = {};
  for (var l = 0; l < low.length; l++) {
    lowIds[low[l].id] = true;
  }

  var result = [];
  for (var i = 0; i < allItems.length; i++) {
    var s = allItems[i];
    var isLow = !!lowIds[s.id];

    /* Status filter */
    if (STKVIEW.filterStatus === 'low' && !isLow) continue;
    if (STKVIEW.filterStatus === 'ok' && isLow) continue;

    /* Category filter */
    if (STKVIEW.filterCategory !== 'all' && s.categoryId !== STKVIEW.filterCategory) continue;

    /* Search filter */
    if (STKVIEW.searchQuery && !searchMatch(s.name, STKVIEW.searchQuery)) continue;

    result.push(s);
  }
  return result;
}

function setStockViewMode(mode) {
  STKVIEW.viewMode = mode;
  renderStockView();
}

function stkCategoryFilterChange(val) {
  STKVIEW.filterCategory = val;
  renderStockView();
}

/* ============================================
   RENDER STOCK CARD (Grid View)
   ============================================ */
function renderStockCard(item, lowItems) {
  var isLow = false;
  for (var i = 0; i < lowItems.length; i++) {
    if (lowItems[i].id === item.id) { isLow = true; break; }
  }
  var isZero = item.qty <= 0;
  var value = roundTo((item.qty || 0) * (item.costPerUnit || 0), 2);
  
  var displayQty = formatStockQty(item.qty, item.unit, item.bigUnit, item.bigUnitSize);
  var minDisplay = formatStockQty(item.minQty, item.unit, item.bigUnit, item.bigUnitSize);
  
  /* แยกตัวเลขหลักและตัวเลขย่อย */
  var mainQty = '';
  var subQty = '';
  var totalDisplay = '';
  
  if (item.bigUnit && item.bigUnitSize && item.bigUnitSize > 0) {
    var bigQty = Math.floor(item.qty / item.bigUnitSize);
    var smallQty = item.qty % item.bigUnitSize;
    mainQty = bigQty + ' ' + item.bigUnit;
    if (smallQty > 0) {
      subQty = smallQty + ' ' + item.unit;
    }
    totalDisplay = '(รวม ' + item.qty + ' ' + item.unit + ')';
  } else {
    mainQty = displayQty;
    totalDisplay = '';
  }
  
  /* Stock categories */
  var stockCats = ST.getStockCategories();
  var category = findById(stockCats, item.categoryId);
  var catDisplay = category ? (category.icon || '📦') + ' ' + category.name : '';
  
  /* Progress bar */
  var pctBar = 100;
  if (item.minQty > 0) {
    var fullRef = item.minQty * 3;
    pctBar = clamp(roundTo((item.qty / fullRef) * 100, 0), 0, 100);
  }
  var barColor = isZero ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)';
  
  var html = '';
  html += '<div class="stock-card anim-fadeUp' + (isLow ? ' low' : '') + (isZero ? ' zero' : '') + '" onclick="modalEditStock(findById(ST.getStock(),\'' + sanitize(item.id) + '\'))">';
  
  /* Header: Name + Badge + Category */
  html += '<div class="stock-name">';
  html += '<div class="stock-name-text">';
  html += '<span class="stock-name-icon">📦</span>';
  html += '<span>' + sanitize(item.name) + '</span>';
  if (catDisplay) {
    html += '<span class="stock-cat-badge">' + catDisplay + '</span>';
  }
  html += '</div>';
  if (isZero) {
    html += '<span class="badge badge-danger">หมด!</span>';
  } else if (isLow) {
    html += '<span class="badge badge-warning">ใกล้หมด</span>';
  } else {
    html += '<span class="badge badge-success">ปกติ</span>';
  }
  html += '</div>';
  
  /* Quantity */
  html += '<div class="stock-qty-wrapper">';
  html += '<span class="stock-qty-number">' + mainQty + '</span>';
  if (subQty) {
    html += '<span class="stock-qty-sub">' + subQty + '</span>';
  }
  if (totalDisplay) {
    html += '<span class="stock-qty-total">' + totalDisplay + '</span>';
  }
  if (item.minQty > 0 && !totalDisplay) {
    html += '<span class="stock-qty-min">(ขั้นต่ำ ' + minDisplay + ')</span>';
  }
  html += '</div>';
  
  /* Progress bar */
  html += '<div class="stock-progress">';
  html += '<div class="stock-progress-fill" style="width:' + pctBar + '%;background:' + barColor + ';"></div>';
  html += '</div>';
  
  /* Footer */
  html += '<div class="stock-footer">';
  html += '<div class="stock-cost">';
  if (item.costPerUnit > 0) {
    html += '💰 ' + formatMoneySign(item.costPerUnit) + '/' + sanitize(item.unit);
    if (item.bigUnit && item.bigUnitSize) {
      var bigPrice = (item.costPerUnit * item.bigUnitSize).toFixed(2);
      html += ' <span class="text-muted">(' + formatMoneySign(bigPrice) + '/' + sanitize(item.bigUnit) + ')</span>';
    }
  } else {
    html += '💰 ไม่ระบุต้นทุน';
  }
  html += '</div>';
  html += '<div class="stock-value">มูลค่า: <span class="amount">' + formatMoneySign(roundTo(value, 0)) + '</span></div>';
  html += '</div>';
  
  /* Last update */
  if (item.lastUpdate) {
    html += '<div class="stock-updated">🕐 อัปเดต: ' + relativeDay(item.lastUpdate) + '</div>';
  }
  
  /* Actions */
  html += '<div class="stock-actions" onclick="event.stopPropagation()">';
  html += '<button class="btn btn-success btn-sm" onclick="modalStockAdjust(findById(ST.getStock(),\'' + sanitize(item.id) + '\'),\'add\')">📥 รับเข้า</button>';
  html += '<button class="btn btn-warning btn-sm" onclick="modalStockAdjust(findById(ST.getStock(),\'' + sanitize(item.id) + '\'),\'use\')">📤 ใช้ไป</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="modalEditStock(findById(ST.getStock(),\'' + sanitize(item.id) + '\'))">✏️ แก้ไข</button>';
  html += '</div>';
  
  html += '</div>';
  return html;
}

/* Search */
var _stkSearchDebounce = debounce(function(val) {
  STKVIEW.searchQuery = val;
  setHTML('stkContent', renderStockList());
}, 250);

function stkSearch(val) {
  _stkSearchDebounce(val);
}

function stkFilterChange(val) {
  STKVIEW.filterStatus = val;
  renderStockView();
}

/* ============================================
   STOCK CATEGORY MODALS
   ============================================ */
function modalStockCategory() {
  var cats = ST.getStockCategories();
  
  var html = '<div class="mb-16">';
  html += '<button class="btn btn-primary btn-sm" onclick="modalAddStockCategory()">➕ เพิ่มหมวดหมู่</button>';
  html += '</div>';
  html += '<div class="stock-cat-list">';
  
  for (var i = 0; i < cats.length; i++) {
    html += '<div class="stock-cat-item">';
    html += '<div class="flex-between" style="align-items:center;">';
    html += '<div class="flex gap-8" style="align-items:center;">';
    html += '<span style="font-size:24px;">' + (cats[i].icon || '📦') + '</span>';
    html += '<div>';
    html += '<div class="fw-600">' + sanitize(cats[i].name) + '</div>';
    html += '<div class="text-muted fs-sm">ลำดับ ' + (cats[i].sort || i + 1) + '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="flex gap-4">';
    html += '<button class="btn-icon" onclick="modalEditStockCategory(\'' + cats[i].id + '\')">✏️</button>';
    html += '<button class="btn-icon" onclick="deleteStockCategory(\'' + cats[i].id + '\')" style="color:var(--danger);">🗑</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  openModal('📁 จัดหมวดหมู่วัตถุดิบ', html);
}

function modalAddStockCategory() {
  modalEditStockCategory(null);
}

function modalEditStockCategory(cat) {
  var isNew = !cat;
  var c = cat || {};
  
  var emojiList = ['📦', '🥤', '🍔', '🥛', '🍞', '🥚', '🧀', '🥩', '🐟', '🍎', '🥕', '🧂', '☕', '🍵', '🧋'];
  
  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อหมวดหมู่ *</label>';
  html += '<input type="text" id="fCatName" value="' + sanitize(c.name || '') + '" placeholder="เช่น เครื่องดื่ม">';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ไอคอน</label>';
  html += '<div class="flex flex-wrap gap-8">';
  for (var i = 0; i < emojiList.length; i++) {
    var selCls = (c.icon === emojiList[i]) ? ' active' : '';
    html += '<button class="size-option' + selCls + '" style="flex:none;width:44px;height:44px;font-size:22px;padding:0;" data-emoji="' + emojiList[i] + '" onclick="selectStockCatEmoji(this)">' + emojiList[i] + '</button>';
  }
  html += '</div>';
  html += '</div>';
  
  html += '<input type="hidden" id="fCatId" value="' + sanitize(c.id || '') + '">';
  html += '<input type="hidden" id="fCatIcon" value="' + sanitize(c.icon || '📦') + '">';
  
  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteStockCategoryFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveStockCategoryFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';
  
  openModal(isNew ? '➕ เพิ่มหมวดหมู่วัตถุดิบ' : '✏️ แก้ไขหมวดหมู่', html, footer);
}

function selectStockCatEmoji(el) {
  var siblings = el.parentNode.querySelectorAll('.size-option');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');
  var hidden = $('fCatIcon');
  if (hidden) hidden.value = el.getAttribute('data-emoji');
  vibrate(20);
}

function saveStockCategoryFromModal() {
  var id = ($('fCatId') || {}).value;
  var name = ($('fCatName') || {}).value.trim();
  var icon = ($('fCatIcon') || {}).value || '📦';
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  
  if (id) {
    ST.updateStockCategory(id, { name: name, icon: icon });
    toast('อัพเดตหมวดหมู่แล้ว', 'success');
  } else {
    ST.addStockCategory({ name: name, icon: icon });
    toast('เพิ่มหมวดหมู่แล้ว', 'success');
  }
  closeMForce();
  renderStockView();
}

function deleteStockCategoryFromModal() {
  var id = ($('fCatId') || {}).value;
  if (!id) return;
  confirmDialog('ลบหมวดหมู่นี้?', function() {
    ST.deleteStockCategory(id);
    closeMForce();
    toast('ลบหมวดหมู่แล้ว', 'warning');
    renderStockView();
  });
}

function deleteStockCategory(id) {
  confirmDialog('ลบหมวดหมู่นี้?', function() {
    ST.deleteStockCategory(id);
    toast('ลบหมวดหมู่แล้ว', 'warning');
    modalStockCategory();
  });
}

/* ============================================
   STOCK LOGS
   ============================================ */
function renderStockLogs() {
  var allLogs = ST.getStockLogs();

  var html = '';

  html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">';
  html += '<div class="pos-search" style="flex:1;min-width:200px;max-width:400px;">';
  html += '<span class="pos-search-icon">🔍</span>';
  html += '<input type="text" id="logSearch" placeholder="ค้นหาชื่อวัตถุดิบ, หมายเหตุ..." value="' + sanitize(STKVIEW.logSearch) + '" oninput="logSearchFn(this.value)">';
  html += '</div>';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="clearStockLogs()">🗑 ล้างประวัติ</button>';
  html += '</div>';
  html += '</div>';

  var logs = filterStockLogs(allLogs);

  if (logs.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📋</div>';
    html += '<div class="empty-text">' + (STKVIEW.logSearch ? 'ไม่พบประวัติ' : 'ยังไม่มีประวัติ') + '</div>';
    html += '</div>';
    return html;
  }

  logs = sortBy(logs, 'timestamp', true);

  var totalPages = Math.ceil(logs.length / STKVIEW.logPerPage);
  var startIdx = (STKVIEW.logPage - 1) * STKVIEW.logPerPage;
  var endIdx = Math.min(startIdx + STKVIEW.logPerPage, logs.length);
  var pageLogs = logs.slice(startIdx, endIdx);

  html += '<div class="text-muted fs-sm mb-8">แสดง ' + (startIdx + 1) + '-' + endIdx + ' จาก ' + logs.length + ' รายการ</div>';

  var grouped = groupLogsByDate(pageLogs);
  var dateKeys = Object.keys(grouped);

  for (var d = 0; d < dateKeys.length; d++) {
    var dateStr = dateKeys[d];
    var dayLogs = grouped[dateStr];

    html += '<div class="log-date-header">';
    html += '<span class="fw-600">' + relativeDay(dateStr) + '</span>';
    html += '<span class="text-muted fs-sm">' + sanitize(dateStr) + '</span>';
    html += '</div>';

    html += '<div class="log-list">';
    for (var l = 0; l < dayLogs.length; l++) {
      html += renderLogItem(dayLogs[l]);
    }
    html += '</div>';
  }

  if (totalPages > 1) {
    html += renderLogPagination(totalPages);
  }

  return html;
}

function filterStockLogs(allLogs) {
  if (!STKVIEW.logSearch) return allLogs;
  var result = [];
  var q = STKVIEW.logSearch.toLowerCase().trim();
  for (var i = 0; i < allLogs.length; i++) {
    var log = allLogs[i];
    if (searchMatch(log.stockName || '', q) ||
        searchMatch(log.reason || '', q)) {
      result.push(log);
    }
  }
  return result;
}

function groupLogsByDate(logs) {
  var result = {};
  for (var i = 0; i < logs.length; i++) {
    var d = logs[i].date || 'ไม่ระบุ';
    if (!result[d]) result[d] = [];
    result[d].push(logs[i]);
  }
  return result;
}

function renderLogItem(log) {
  var isAdd = (log.qty || 0) > 0;
  var icon = isAdd ? '📥' : '📤';
  var signClass = isAdd ? 'text-success' : 'text-danger';
  var sign = isAdd ? '+' : '';
  var displayQty = formatStockQty(Math.abs(log.qty), log.unit, log.bigUnit, log.bigUnitSize);

  var html = '';
  html += '<div class="log-item anim-fadeUp">';
  html += '<div class="flex gap-12" style="align-items:flex-start;">';
  html += '<div class="log-icon ' + (isAdd ? 'add' : 'use') + '">' + icon + '</div>';
  html += '<div style="flex:1;min-width:0;">';
  html += '<div class="flex-between">';
  html += '<div class="fw-600">' + sanitize(log.stockName || 'ไม่ระบุ') + '</div>';
  html += '<div class="fw-700 ' + signClass + '">' + sign + displayQty + '</div>';
  html += '</div>';
  html += '<div class="flex-between mt-4">';
  html += '<div class="text-muted fs-sm">' + sanitize(log.reason || '') + '</div>';
  html += '<div class="text-muted fs-sm">' + sanitize(log.time || '') + '</div>';
  html += '</div>';
  if (log.balance !== undefined) {
    var balanceDisplay = formatStockQty(log.balance, log.unit, log.bigUnit, log.bigUnitSize);
    html += '<div class="text-muted fs-sm mt-2">คงเหลือ: ' + balanceDisplay + '</div>';
  }
  html += '</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

var _logSearchDebounce = debounce(function(val) {
  STKVIEW.logSearch = val;
  STKVIEW.logPage = 1;
  setHTML('stkContent', renderStockLogs());
}, 250);

function logSearchFn(val) {
  _logSearchDebounce(val);
}

function clearStockLogs() {
  var logs = ST.getStockLogs();
  if (logs.length === 0) {
    toast('ไม่มีประวัติ', 'info');
    return;
  }
  confirmDialog('ล้างประวัติ Stock ทั้งหมด (' + logs.length + ' รายการ)?', function() {
    ST.saveStockLogs([]);
    toast('ล้างประวัติแล้ว', 'warning');
    setHTML('stkContent', renderStockLogs());
  });
}

function renderLogPagination(totalPages) {
  var html = '<div class="pagination">';
  html += '<button class="btn btn-secondary btn-sm" onclick="logGoPage(' + (STKVIEW.logPage - 1) + ')" ' + (STKVIEW.logPage <= 1 ? 'disabled' : '') + '>← ก่อนหน้า</button>';
  html += '<span class="text-muted fs-sm">หน้า ' + STKVIEW.logPage + ' / ' + totalPages + '</span>';
  html += '<button class="btn btn-secondary btn-sm" onclick="logGoPage(' + (STKVIEW.logPage + 1) + ')" ' + (STKVIEW.logPage >= totalPages ? 'disabled' : '') + '>ถัดไป →</button>';
  html += '</div>';
  return html;
}

function logGoPage(page) {
  var logs = filterStockLogs(ST.getStockLogs());
  var totalPages = Math.ceil(logs.length / STKVIEW.logPerPage);
  STKVIEW.logPage = clamp(page, 1, totalPages || 1);
  setHTML('stkContent', renderStockLogs());
  var main = $('mainContent');
  if (main) main.scrollTop = 0;
}

/* ============================================
   CSS
   ============================================ */
(function() {
  var styleId = 'stockViewStyle';
  if (document.getElementById(styleId)) return;

  var css = '';

  /* Alert card */
  css += '.stock-alert-card{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:16px;}';
  css += '.stock-alert-items{display:flex;flex-direction:column;gap:8px;}';
  css += '.stock-alert-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);gap:12px;}';
  css += '.stock-alert-item.zero{border-color:var(--danger);background:rgba(239,68,68,0.05);}';

  /* Stock grid */
  css += '.stock-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;}';

  /* Stock summary bar */
  css += '.stock-summary-bar{background:var(--bg-card);border-radius:var(--radius);padding:12px 16px;border:1px solid var(--border);}';

  /* Stock card */
  css += '.stock-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:all var(--transition);cursor:pointer;}';
  css += '.stock-card:hover{border-color:var(--accent);box-shadow:var(--shadow);transform:translateY(-2px);}';
  css += '.stock-card.low{border-left:4px solid var(--warning);}';
  css += '.stock-card.zero{border-left:4px solid var(--danger);background:rgba(239,68,68,0.03);}';

  /* Stock name */
  css += '.stock-name{font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}';
  css += '.stock-name-text{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}';
  css += '.stock-name-icon{font-size:24px;}';
  css += '.stock-cat-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;background:var(--glass);color:var(--text-muted);}';

  /* Stock quantity */
  css += '.stock-qty-wrapper{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:12px;}';
  css += '.stock-qty-number{font-size:32px;font-weight:800;color:var(--accent);line-height:1;}';
  css += '.stock-qty-sub{font-size:14px;font-weight:600;color:var(--text-muted);margin-left:2px;}';
  css += '.stock-qty-total{font-size:13px;font-weight:600;color:var(--accent2);margin-left:8px;}';
  css += '.stock-qty-min{font-size:12px;color:var(--text-muted);margin-left:8px;}';

  /* Progress bar */
  css += '.stock-progress{width:100%;height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin:12px 0;}';
  css += '.stock-progress-fill{height:100%;border-radius:4px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);}';

  /* Stock footer */
  css += '.stock-footer{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:8px;border-top:1px solid var(--border);font-size:12px;}';
  css += '.stock-cost{color:var(--text-muted);}';
  css += '.stock-cost .amount{color:var(--accent);font-weight:700;}';
  css += '.stock-value{color:var(--text-muted);}';
  css += '.stock-value .amount{color:var(--accent);font-weight:700;}';
  css += '.stock-updated{font-size:10px;color:var(--text-muted);margin-top:8px;text-align:right;}';

  /* Stock actions */
  css += '.stock-actions{display:flex;gap:6px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border);margin-top:10px;}';
  css += '.stock-actions .btn{flex:1;min-width:0;justify-content:center;}';

  /* List view */
  css += '.stock-list{display:flex;flex-direction:column;gap:8px;}';
  css += '.stock-list-header{display:flex;align-items:center;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);font-weight:700;font-size:12px;color:var(--text-muted);}';
  css += '.stock-list-item{display:flex;align-items:center;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:all var(--transition);}';
  css += '.stock-list-item:hover{border-color:var(--accent);}';
  css += '.stock-list-col-name{flex:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
  css += '.stock-list-col-cat{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
  css += '.stock-list-col-qty{flex:1;text-align:right;}';
  css += '.stock-list-col-cost{flex:0.8;text-align:right;}';
  css += '.stock-list-col-value{flex:0.8;text-align:right;}';
  css += '.stock-list-col-status{flex:0.6;text-align:center;}';
  css += '.stock-list-col-actions{flex:0.5;text-align:center;display:flex;gap:4px;justify-content:center;}';

  /* Stock category list */
  css += '.stock-cat-list{display:flex;flex-direction:column;gap:12px;}';
  css += '.stock-cat-item{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px;}';

  /* Log styles */
  css += '.log-date-header{display:flex;align-items:center;justify-content:space-between;padding:10px 0 6px;margin-top:8px;border-bottom:1px solid var(--border);}';
  css += '.log-list{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;}';
  css += '.log-item{padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all var(--transition);}';
  css += '.log-item:hover{border-color:var(--accent);}';
  css += '.log-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);font-size:18px;flex-shrink:0;}';
  css += '.log-icon.add{background:rgba(34,197,94,0.1);}';
  css += '.log-icon.use{background:rgba(239,68,68,0.1);}';

  /* Pagination */
  css += '.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;}';

  /* Mobile */
  css += '@media(max-width:768px){';
  css += '.stock-grid{grid-template-columns:1fr;}';
  css += '.stock-alert-item{flex-direction:column;align-items:flex-start;gap:8px;}';
  css += '.stock-alert-item .btn{width:100%;}';
  css += '.stock-qty-number{font-size:28px;}';
  css += '.stock-name{font-size:16px;}';
  css += '.stock-list-header{display:none;}';
  css += '.stock-list-item{flex-wrap:wrap;gap:8px;}';
  css += '.stock-list-col-name{flex:100%;}';
  css += '.stock-list-col-qty,.stock-list-col-cost,.stock-list-col-value,.stock-list-col-status{flex:auto;text-align:left;}';
  css += '}';

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* Initialize stock categories */
if (typeof ST !== 'undefined' && ST.initStockCategories) {
  ST.initStockCategories();
}

console.log('[views-stock.js] loaded');