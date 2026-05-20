/* ============================================
   COFFEE POS — VIEWS-REPORT.JS
   รายงาน / Dashboard / กราฟ
   ============================================ */

/* === REPORT VIEW STATE === */
var RPT = {
  range: 'today',     /* 'today' | 'week' | 'month' | 'custom' */
  customFrom: '',
  customTo: '',
  tab: 'dashboard'     /* 'dashboard' | 'products' | 'hourly' | 'daily' */
};

/* ============================================
   RENDER REPORT VIEW
   ============================================ */
function renderReportView() {
  var main = $('mainContent');
  if (!main) return;

  var html = '';
  html += '<div class="page-pad anim-fadeUp">';

  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">📊 รายงาน</div>';
  html += '<div class="section-tools">';
  html += '<button class="btn btn-secondary btn-sm" onclick="renderReportView()">🔄</button>';
  html += '</div>';
  html += '</div>';

  /* Date range */
  html += renderReportRange();

  /* Sub-tabs */
  html += '<div class="cat-tabs mb-16">';
  html += rptSubTab('dashboard', '📈 ภาพรวม');
  html += rptSubTab('products', '☕ สินค้าขายดี');
  html += rptSubTab('hourly', '🕐 รายชั่วโมง');
  html += rptSubTab('daily', '📅 รายวัน');
  html += rptSubTab('compare', '📈 เปรียบเทียบ');
  html += rptSubTab('advanced', '💰 กำไรสุทธิ');
  html += rptSubTab('stock', '📦 สต็อก');
  html += rptSubTab('staff', '👥 พนักงาน');
  html += '</div>';

  /* Content */
  html += '<div id="rptContent">';
  html += renderReportContent();
  html += '</div>';

  html += '</div>';
  main.innerHTML = html;
}

function rptSubTab(key, label) {
  var active = RPT.tab === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="switchRptTab(\'' + key + '\')">' + label + '</button>';
}

function switchRptTab(tab) {
  RPT.tab = tab;
  vibrate(20);
  renderReportView();
}

/* ============================================
   DATE RANGE
   ============================================ */
function renderReportRange() {
  var html = '<div class="flex gap-8 mb-16 flex-wrap">';
  html += rptRangeBtn('today', '📅 วันนี้');
  html += rptRangeBtn('week', '📆 สัปดาห์นี้');
  html += rptRangeBtn('month', '🗓️ เดือนนี้');
  html += rptRangeBtn('custom', '📌 กำหนดเอง');
  html += '</div>';

  if (RPT.range === 'custom') {
    html += '<div class="form-row mb-16">';
    html += '<div class="form-group">';
    html += '<label class="form-label">จาก</label>';
    html += '<input type="date" id="rptFrom" value="' + toInputDate(RPT.customFrom) + '" onchange="onRptCustomDate()">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label class="form-label">ถึง</label>';
    html += '<input type="date" id="rptTo" value="' + toInputDate(RPT.customTo) + '" onchange="onRptCustomDate()">';
    html += '</div>';
    html += '</div>';
  }

  return html;
}

function rptRangeBtn(key, label) {
  var active = RPT.range === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="setRptRange(\'' + key + '\')">' + label + '</button>';
}

function setRptRange(range) {
  RPT.range = range;
  if (range === 'custom' && !RPT.customFrom) {
    RPT.customFrom = todayStr();
    RPT.customTo = todayStr();
  }
  vibrate(20);
  renderReportView();
}

function onRptCustomDate() {
  var f = $('rptFrom');
  var t = $('rptTo');
  if (f) RPT.customFrom = fromInputDate(f.value);
  if (t) RPT.customTo = fromInputDate(t.value);
  setHTML('rptContent', renderReportContent());
}

function getRptDateRange() {
  var now = new Date();
  switch (RPT.range) {
    case 'today':
      return { from: todayStr(), to: todayStr() };
    case 'week':
      return { from: formatDate(startOfWeek(now)), to: todayStr() };
    case 'month':
      return { from: formatDate(startOfMonth(now)), to: todayStr() };
    case 'custom':
      return { from: RPT.customFrom || todayStr(), to: RPT.customTo || todayStr() };
    default:
      return { from: todayStr(), to: todayStr() };
  }
}

function getRptOrders() {
  var range = getRptDateRange();
  var orders = ST.getOrdersByRange(range.from, range.to);
  /* Only completed */
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status !== 'cancelled') result.push(orders[i]);
  }
  return result;
}

/* ============================================
   CONTENT ROUTER
   ============================================ */
function renderReportContent() {
  switch (RPT.tab) {
    case 'dashboard': return renderDashboard();
    case 'products': return renderProductReport();
    case 'hourly': return renderHourlyReport();
    case 'daily': return renderDailyReport();
    case 'compare': return renderCompareReport();
    case 'advanced': return renderAdvancedReport();
    case 'stock': return renderStockSummaryReport(); 
    case 'staff': return renderStaffSalesReport();   
    default: return '';
  }
}

/* ============================================
   TAB: DASHBOARD (ภาพรวม)
   ============================================ */
function renderDashboard() {
  var orders = getRptOrders();
  var cfg = ST.getConfig();

  var totalSales = sumBy(orders, 'total');
  var totalDiscount = sumBy(orders, 'discount');
  var totalVat = sumBy(orders, 'vat');
  var orderCount = orders.length;
  var avgBill = orderCount > 0 ? roundTo(totalSales / orderCount, 0) : 0;

  /* Items sold */
  var itemsSold = 0;
  var totalCost = 0;
  var menuItems = ST.getMenu();

  for (var i = 0; i < orders.length; i++) {
    var items = orders[i].items || [];
    for (var j = 0; j < items.length; j++) {
      itemsSold += items[j].qty || 0;
      /* Estimate cost */
      var mi = findById(menuItems, items[j].menuId);
      if (mi && mi.cost) {
        totalCost += (mi.cost * items[j].qty);
      }
    }
  }

  var grossProfit = totalSales - totalCost;
  var profitMargin = totalSales > 0 ? pct(grossProfit, totalSales) : 0;

  /* Payment breakdown */
  var payCash = 0, payTransfer = 0, payQr = 0;
  for (var p = 0; p < orders.length; p++) {
    var amt = orders[p].total || 0;
    if (orders[p].payment === 'cash') payCash += amt;
    else if (orders[p].payment === 'transfer') payTransfer += amt;
    else payQr += amt;
  }

  var html = '';

  /* KPI Cards */
  html += '<div class="kpi-grid mb-20">';
  html += kpiCard('💰', formatMoneySign(totalSales), 'ยอดขาย', 'accent');
  html += kpiCard('🧾', orderCount, 'ออเดอร์', 'info');
  html += kpiCard('📊', formatMoneySign(avgBill), 'เฉลี่ย/บิล', 'accent2');
  html += kpiCard('☕', itemsSold, 'แก้ว/ชิ้น', 'success');
  html += kpiCard('💵', formatMoneySign(grossProfit), 'กำไรเบื้องต้น', 'success');
  html += kpiCard('📉', profitMargin + '%', 'อัตรากำไร', profitMargin > 30 ? 'success' : 'warning');
  if (totalDiscount > 0) {
    html += kpiCard('🏷️', formatMoneySign(totalDiscount), 'ส่วนลดรวม', 'danger');
  }
  if (totalVat > 0) {
    html += kpiCard('📋', formatMoneySign(totalVat), 'VAT', 'info');
  }
  html += '</div>';

  /* Charts row */
  html += '<div class="report-grid">';

  /* Payment Pie Chart */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">💳 สัดส่วนการชำระ</div></div>';
  if (orderCount > 0) {
    html += renderPieChart([
      { label: '💵 เงินสด', value: payCash, color: '#22c55e' },
      { label: '📱 โอน', value: payTransfer, color: '#3b82f6' },
      { label: '📷 QR', value: payQr, color: '#f97316' }
    ]);
  } else {
    html += '<div class="text-muted text-center p-20">ยังไม่มีข้อมูล</div>';
  }
  html += '</div>';

/* [Standard Version] Channel Pie Chart */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">🛵 ช่องทางการขาย</div></div>';
  if (orderCount > 0) {
    html += renderChannelPie(orders);
  } else {
    html += '<div class="text-muted text-center p-20">ยังไม่มีข้อมูล</div>';
  }
  html += '</div>';

  /* Category Pie Chart */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📁 สัดส่วนหมวดหมู่</div></div>';
  if (orderCount > 0) {
    html += renderCategoryPie(orders);
  } else {
    html += '<div class="text-muted text-center p-20">ยังไม่มีข้อมูล</div>';
  }
  html += '</div>';

  html += '</div>';

  /* Top 5 Quick */
  if (orderCount > 0) {
    html += '<div class="card mt-16">';
    html += '<div class="card-header"><div class="card-title">🏆 เมนูขายดี Top 5</div></div>';
    html += renderTopProducts(orders, 5);
    html += '</div>';
  }

  return html;
}

/* ============================================
   TAB: PRODUCT REPORT (สินค้าขายดี)
   ============================================ */
function renderProductReport() {
  var orders = getRptOrders();

  if (orders.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">☕</div><div class="empty-text">ยังไม่มีข้อมูลในช่วงนี้</div></div>';
  }

  var html = '';

  /* Top 10 Bar Chart */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">🏆 เมนูขายดี Top 10</div></div>';
  html += renderTopProductsBar(orders, 10);
  html += '</div>';

  /* Full table */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📋 รายละเอียดทุกเมนู</div></div>';
  html += renderProductTable(orders);
  html += '</div>';

  return html;
}

/* ============================================
   TAB: HOURLY REPORT
   ============================================ */
function renderHourlyReport() {
  var orders = getRptOrders();

  if (orders.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">🕐</div><div class="empty-text">ยังไม่มีข้อมูลในช่วงนี้</div></div>';
  }

  /* Group by hour */
  var hourData = {};
  for (var h = 6; h <= 22; h++) {
    hourData[h] = { count: 0, sales: 0 };
  }

  for (var i = 0; i < orders.length; i++) {
    var t = orders[i].time || '00:00';
    var hour = parseInt(t.split(':')[0], 10) || 0;
    if (!hourData[hour]) hourData[hour] = { count: 0, sales: 0 };
    hourData[hour].count++;
    hourData[hour].sales += orders[i].total || 0;
  }

  var maxSales = 0;
  var maxCount = 0;
  for (var hk in hourData) {
    if (hourData[hk].sales > maxSales) maxSales = hourData[hk].sales;
    if (hourData[hk].count > maxCount) maxCount = hourData[hk].count;
  }

  var html = '';

  /* Sales by hour */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">💰 ยอดขายรายชั่วโมง</div></div>';
  html += '<div class="chart-scroll">';
  html += '<div class="hbar-chart">';

  for (var bh = 6; bh <= 22; bh++) {
    var d = hourData[bh] || { count: 0, sales: 0 };
    var pctW = maxSales > 0 ? (d.sales / maxSales) * 100 : 0;

    html += '<div class="hbar-row">';
    html += '<div class="hbar-label-fixed">' + padZ(bh) + ':00</div>';
    html += '<div class="hbar-bar-wrap">';
    if (d.sales > 0) {
      html += '<div class="hbar-bar" style="width:' + Math.max(3, pctW) + '%;"></div>';
      html += '<span class="hbar-value">' + formatMoneySign(d.sales) + ' (' + d.count + ' บิล)</span>';
    } else {
      html += '<span class="hbar-value text-muted">-</span>';
    }
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  html += '</div>';
  html += '</div>';

  /* Peak hour info */
  var peakHour = 0;
  var peakSales = 0;
  for (var pk in hourData) {
    if (hourData[pk].sales > peakSales) {
      peakSales = hourData[pk].sales;
      peakHour = parseInt(pk, 10);
    }
  }

  html += '<div class="kpi-grid">';
  html += kpiCard('⏰', padZ(peakHour) + ':00-' + padZ(peakHour + 1) + ':00', 'ชั่วโมงขายดีสุด', 'accent');
  html += kpiCard('💰', formatMoneySign(peakSales), 'ยอดขายช่วงนั้น', 'success');
  html += kpiCard('🧾', (hourData[peakHour] ? hourData[peakHour].count : 0) + ' บิล', 'ออเดอร์ช่วงนั้น', 'info');
  html += '</div>';

  return html;
}

/* ============================================
   TAB: DAILY REPORT
   ============================================ */
function renderDailyReport() {
  var orders = getRptOrders();

  if (orders.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">ยังไม่มีข้อมูลในช่วงนี้</div></div>';
  }

  /* Group by date */
  var dayData = {};
  for (var i = 0; i < orders.length; i++) {
    var d = orders[i].date || 'ไม่ระบุ';
    if (!dayData[d]) dayData[d] = { count: 0, sales: 0, items: 0 };
    dayData[d].count++;
    dayData[d].sales += orders[i].total || 0;
    var items = orders[i].items || [];
    for (var j = 0; j < items.length; j++) {
      dayData[d].items += items[j].qty || 0;
    }
  }

  var dateKeys = Object.keys(dayData).sort(function(a, b) {
    var da = parseDate(a);
    var db = parseDate(b);
    if (!da || !db) return 0;
    return da.getTime() - db.getTime();
  });

  var maxDaySales = 0;
  for (var mk = 0; mk < dateKeys.length; mk++) {
    if (dayData[dateKeys[mk]].sales > maxDaySales) {
      maxDaySales = dayData[dateKeys[mk]].sales;
    }
  }

  var html = '';

  /* Daily horizontal bar chart */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">💰 ยอดขายรายวัน</div></div>';
  html += '<div class="hbar-chart">';

  for (var b = 0; b < dateKeys.length; b++) {
    var dk = dateKeys[b];
    var dd = dayData[dk];
    var pctD = maxDaySales > 0 ? (dd.sales / maxDaySales) * 100 : 0;
    var parts = dk.split('/');
    var shortLabel = parts[0] + '/' + parts[1];

    html += '<div class="hbar-row">';
    html += '<div class="hbar-label-fixed">' + shortLabel + '</div>';
    html += '<div class="hbar-bar-wrap">';
    html += '<div class="hbar-bar" style="width:' + Math.max(3, pctD) + '%;"></div>';
    html += '<span class="hbar-value">' + formatMoneySign(dd.sales) + ' (' + dd.count + ' บิล)</span>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  html += '</div>';

  /* Daily table */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📋 สรุปรายวัน</div></div>';
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><tr>';
  html += '<th>วันที่</th>';
  html += '<th class="text-right">ออเดอร์</th>';
  html += '<th class="text-right">แก้ว</th>';
  html += '<th class="text-right">ยอดขาย</th>';
  html += '<th class="text-right">เฉลี่ย</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  var grandTotal = 0;
  var grandCount = 0;
  var grandItems = 0;

  for (var t = dateKeys.length - 1; t >= 0; t--) {
    var tk = dateKeys[t];
    var td = dayData[tk];
    var avg = td.count > 0 ? roundTo(td.sales / td.count, 0) : 0;
    grandTotal += td.sales;
    grandCount += td.count;
    grandItems += td.items;

    html += '<tr>';
    html += '<td><div class="fw-600">' + relativeDay(tk) + '</div><div class="text-muted" style="font-size:11px;">' + sanitize(tk) + '</div></td>';
    html += '<td class="text-right">' + td.count + '</td>';
    html += '<td class="text-right">' + td.items + '</td>';
    html += '<td class="text-right fw-700 text-accent">' + formatMoneySign(td.sales) + '</td>';
    html += '<td class="text-right text-muted">' + formatMoneySign(avg) + '</td>';
    html += '</tr>';
  }

  var grandAvg = grandCount > 0 ? roundTo(grandTotal / grandCount, 0) : 0;
  html += '</tbody>';
  html += '<tfoot><tr style="border-top:2px solid var(--border);">';
  html += '<td class="fw-800">รวม</td>';
  html += '<td class="text-right fw-800">' + grandCount + '</td>';
  html += '<td class="text-right fw-800">' + grandItems + '</td>';
  html += '<td class="text-right fw-800 text-accent">' + formatMoneySign(grandTotal) + '</td>';
  html += '<td class="text-right fw-700">' + formatMoneySign(grandAvg) + '</td>';
  html += '</tr></tfoot>';

  html += '</table>';
  html += '</div>';
  html += '</div>';

  return html;
}

/* ============================================
   HELPER: TOP PRODUCTS (List)
   ============================================ */
function renderTopProducts(orders, limit) {
  var productData = aggregateProducts(orders);
  var sorted = sortBy(productData, 'qty', true);
  var top = sorted.slice(0, limit || 10);

  if (top.length === 0) {
    return '<div class="text-muted text-center p-16">ไม่มีข้อมูล</div>';
  }

  var html = '<div class="top-product-list">';
  for (var i = 0; i < top.length; i++) {
    var p = top[i];
    var rank = i + 1;
    var rankClass = rank <= 3 ? ' top-rank' : '';
    var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';

    html += '<div class="top-product-item' + rankClass + '">';
    html += '<div class="top-product-rank">' + medal + '</div>';
    html += '<div class="top-product-info">';
    html += '<div class="fw-600">' + sanitize(p.name) + '</div>';
    html += '<div class="text-muted fs-sm">' + p.qty + ' แก้ว/ชิ้น</div>';
    html += '</div>';
    html += '<div class="text-right">';
    html += '<div class="fw-700 text-accent">' + formatMoneySign(p.sales) + '</div>';
    html += '<div class="text-muted fs-sm">' + pct(p.sales, sumBy(top, 'sales')) + '%</div>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  return html;
}

/* ============================================
   HELPER: TOP PRODUCTS (Horizontal Bar)
   ============================================ */
function renderTopProductsBar(orders, limit) {
  var productData = aggregateProducts(orders);
  var sorted = sortBy(productData, 'qty', true);
  var top = sorted.slice(0, limit || 10);

  if (top.length === 0) {
    return '<div class="text-muted text-center p-16">ไม่มีข้อมูล</div>';
  }

  var maxQty = top.length > 0 ? top[0].qty : 1;

  var html = '<div class="hbar-chart">';
  for (var i = 0; i < top.length; i++) {
    var p = top[i];
    var pctW = maxQty > 0 ? (p.qty / maxQty) * 100 : 0;
    var rank = i + 1;
    var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    html += '<div class="hbar-row">';
    html += '<div class="hbar-label">';
    html += '<span class="hbar-rank">' + rank + '</span>';
    html += '<span class="fw-600">' + medal + ' ' + sanitize(p.name) + '</span>';
    html += '</div>';
    html += '<div class="hbar-bar-wrap">';
    html += '<div class="hbar-bar" style="width:' + Math.max(2, pctW) + '%;"></div>';
    html += '<span class="hbar-value">' + p.qty + ' (' + formatMoneySign(p.sales) + ')</span>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  return html;
}

/* ============================================
   HELPER: PRODUCT TABLE (Full)
   ============================================ */
function renderProductTable(orders) {
  var productData = aggregateProducts(orders);
  var sorted = sortBy(productData, 'qty', true);

  if (sorted.length === 0) {
    return '<div class="text-muted text-center p-16">ไม่มีข้อมูล</div>';
  }

  var totalQty = sumBy(sorted, 'qty');
  var totalSales = sumBy(sorted, 'sales');

  var html = '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><tr>';
  html += '<th>#</th>';
  html += '<th>เมนู</th>';
  html += '<th class="text-right">จำนวน</th>';
  html += '<th class="text-right">%</th>';
  html += '<th class="text-right">ยอดขาย</th>';
  html += '<th class="text-right">เฉลี่ย/ชิ้น</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  for (var i = 0; i < sorted.length; i++) {
    var p = sorted[i];
    var avg = p.qty > 0 ? roundTo(p.sales / p.qty, 0) : 0;
    html += '<tr>';
    html += '<td class="fw-600">' + (i + 1) + '</td>';
    html += '<td class="fw-600">' + sanitize(p.name) + '</td>';
    html += '<td class="text-right">' + p.qty + '</td>';
    html += '<td class="text-right text-muted">' + pct(p.qty, totalQty) + '%</td>';
    html += '<td class="text-right fw-700 text-accent">' + formatMoneySign(p.sales) + '</td>';
    html += '<td class="text-right">' + formatMoneySign(avg) + '</td>';
    html += '</tr>';
  }

  /* Footer */
  html += '<tr style="border-top:2px solid var(--border);font-weight:800;">';
  html += '<td></td>';
  html += '<td>รวม</td>';
  html += '<td class="text-right">' + totalQty + '</td>';
  html += '<td class="text-right">100%</td>';
  html += '<td class="text-right text-accent">' + formatMoneySign(totalSales) + '</td>';
  html += '<td></td>';
  html += '</tr>';

  html += '</tbody></table>';
  html += '</div>';
  return html;
}

/* ============================================
   HELPER: AGGREGATE PRODUCTS
   ============================================ */
function aggregateProducts(orders) {
  var map = {};
  for (var i = 0; i < orders.length; i++) {
    var items = orders[i].items || [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var key = it.menuId || it.name;
      if (!map[key]) {
        map[key] = { menuId: it.menuId, name: it.name, qty: 0, sales: 0 };
      }
      map[key].qty += it.qty || 0;
      map[key].sales += it.lineTotal || 0;
    }
  }

  var result = [];
  for (var k in map) {
    result.push(map[k]);
  }
  return result;
}

/* ============================================
   PIE CHART (Pure SVG)
   ============================================ */
function renderPieChart(data) {
  /* Filter zero values */
  var items = [];
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].value > 0) {
      items.push(data[i]);
      total += data[i].value;
    }
  }

  if (items.length === 0 || total === 0) {
    return '<div class="text-muted text-center p-16">ไม่มีข้อมูล</div>';
  }

  var size = 160;
  var cx = size / 2;
  var cy = size / 2;
  var r = 60;

  var html = '<div class="pie-chart-wrap">';
  html += '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';

  var startAngle = -90;
  for (var p = 0; p < items.length; p++) {
    var slice = items[p];
    var slicePct = slice.value / total;
    var angle = slicePct * 360;

    if (items.length === 1) {
      /* Full circle */
      html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + slice.color + '" opacity="0.85"/>';
    } else {
      var endAngle = startAngle + angle;
      var x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
      var y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
      var x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
      var y2 = cy + r * Math.sin(endAngle * Math.PI / 180);
      var largeArc = angle > 180 ? 1 : 0;

      var path = 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z';
      html += '<path d="' + path + '" fill="' + slice.color + '" opacity="0.85">';
      html += '<title>' + slice.label + ': ' + formatMoneySign(slice.value) + ' (' + pct(slice.value, total) + '%)</title>';
      html += '</path>';

      startAngle = endAngle;
    }
  }

  /* Center hole (donut) */
  html += '<circle cx="' + cx + '" cy="' + cy + '" r="35" fill="var(--bg-card)"/>';
  html += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" fill="var(--text-primary)" font-size="12" font-weight="700">' + formatMoney(total) + '</text>';

  html += '</svg>';

  /* Legend */
  html += '<div class="pie-legend">';
  for (var l = 0; l < items.length; l++) {
    var li = items[l];
    html += '<div class="pie-legend-item">';
    html += '<span class="pie-legend-dot" style="background:' + li.color + ';"></span>';
    html += '<span class="fs-sm">' + li.label + '</span>';
    html += '<span class="fw-600 fs-sm">' + formatMoneySign(li.value) + ' (' + pct(li.value, total) + '%)</span>';
    html += '</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

/* ============================================
   CATEGORY PIE CHART
   ============================================ */
function renderCategoryPie(orders) {
  var cats = ST.getCategories();
  var menuItems = ST.getMenu();
  var catColors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

  /* Aggregate by category */
  var catSales = {};
  for (var i = 0; i < orders.length; i++) {
    var items = orders[i].items || [];
    for (var j = 0; j < items.length; j++) {
      var mi = findById(menuItems, items[j].menuId);
      var catId = mi ? mi.catId : 'other';
      if (!catSales[catId]) catSales[catId] = 0;
      catSales[catId] += items[j].lineTotal || 0;
    }
  }

  var pieData = [];
  for (var c = 0; c < cats.length; c++) {
    var sales = catSales[cats[c].id] || 0;
    if (sales > 0) {
      pieData.push({
        label: cats[c].icon + ' ' + cats[c].name,
        value: sales,
        color: catColors[c % catColors.length]
      });
    }
  }

  return renderPieChart(pieData);
}

function renderChannelPie(orders) {
  var channels = ST.getChannels();
  var chColors = ['#22c55e', '#f97316', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];

  var chSales = {};
  for (var i = 0; i < orders.length; i++) {
    var chId = orders[i].channel || 'ch_walkin';
    if (!chSales[chId]) chSales[chId] = 0;
    chSales[chId] += orders[i].total || 0;
  }

  var pieData = [];
  for (var c = 0; c < channels.length; c++) {
    var sales = chSales[channels[c].id] || 0;
    if (sales > 0) {
      pieData.push({
        label: channels[c].emoji + ' ' + channels[c].name,
        value: sales,
        color: chColors[c % chColors.length]
      });
    }
  }
  /* Include unknown channel */
  if (chSales['ch_walkin'] === undefined) {
    var unknownSales = 0;
    for (var k in chSales) {
      var found = false;
      for (var j = 0; j < channels.length; j++) {
        if (channels[j].id === k) { found = true; break; }
      }
      if (!found) unknownSales += chSales[k];
    }
    if (unknownSales > 0) {
      pieData.push({ label: '🏪 อื่นๆ', value: unknownSales, color: '#6b7280' });
    }
  }

  if (pieData.length === 0) {
    return '<div class="text-muted text-center p-16">ไม่มีข้อมูล</div>';
  }

  return renderPieChart(pieData);
}

/* ============================================
   [Pro] COMPARE REPORT
   ============================================ */
function renderCompareReport() {
  var today = new Date();
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  var lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  var lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  var thisWeekStart = startOfWeek(today);

  var html = '';

  /* === วันนี้ vs เมื่อวาน === */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📅 วันนี้ vs เมื่อวาน</div></div>';

  var todayOrders = getCompletedByDate(todayStr());
  var yestOrders = getCompletedByDate(formatDate(yesterday));

  var todaySales = sumBy(todayOrders, 'total');
  var yestSales = sumBy(yestOrders, 'total');
  var todayCount = todayOrders.length;
  var yestCount = yestOrders.length;

  html += '<div class="compare-grid">';
  html += compareCard('💰 ยอดขาย', todaySales, yestSales, true);
  html += compareCard('🧾 ออเดอร์', todayCount, yestCount, false);
  html += compareCard('📊 เฉลี่ย/บิล', todayCount > 0 ? roundTo(todaySales / todayCount, 0) : 0, yestCount > 0 ? roundTo(yestSales / yestCount, 0) : 0, true);
  html += compareCard('☕ แก้ว/ชิ้น', countItems(todayOrders), countItems(yestOrders), false);
  html += '</div>';

  html += '</div>';

  /* === สัปดาห์นี้ vs สัปดาห์ที่แล้ว === */
/* ใน renderCompareReport() - ส่วนตารางเปรียบเทียบเมนู */
html += '<div class="card mb-16">';
html += '<div class="card-header"><div class="card-title">🏆 เมนูขายดี: วันนี้ vs เมื่อวาน</div></div>';
html += '<div class="table-wrap">';
html += '<table>';
html += '<thead>';
html += '<tr>';
html += '<th class="text-center">#</th>';
html += '<th>เมนู</th>';
html += '<th class="text-right">วันนี้</th>';
html += '<th class="text-right">เมื่อวาน</th>';
html += '<th class="text-right">เปลี่ยน</th>';
html += '<th class="text-right">% เปลี่ยน</th>';
html += '</tr>';
html += '</thead>';
html += '<tbody>';

var todayProducts = aggregateProducts(todayOrders);
var yestProducts = aggregateProducts(yestOrders);
var yestMap = {};
for (var yp = 0; yp < yestProducts.length; yp++) {
  yestMap[yestProducts[yp].menuId] = yestProducts[yp];
}

todayProducts = sortBy(todayProducts, 'qty', true);

for (var tp = 0; tp < todayProducts.length && tp < 10; tp++) {
  var p = todayProducts[tp];
  var yData = yestMap[p.menuId] || { qty: 0 };
  var diff = p.qty - yData.qty;
  var pctChange = yData.qty > 0 ? roundTo((diff / yData.qty) * 100, 1) : (p.qty > 0 ? 100 : 0);
  var diffClass = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted');
  var diffSign = diff > 0 ? '+' : '';
  var arrowIcon = diff > 0 ? '▲' : (diff < 0 ? '▼' : '—');
  
  html += '<tr>';
  html += '<td class="text-center fw-600">' + (tp + 1) + '</td>';
  html += '<td class="fw-600">' + sanitize(p.name) + '</td>';
  html += '<td class="text-right fw-700">' + p.qty + '</td>';
  html += '<td class="text-right text-muted">' + yData.qty + '</td>';
  html += '<td class="text-right fw-700 ' + diffClass + '">' + arrowIcon + ' ' + diffSign + diff + '</td>';
  html += '<td class="text-right ' + diffClass + ' fw-600">' + (pctChange > 0 ? '+' : '') + pctChange + '%' + '</td>';
  html += '</tr>';
}

html += '</tbody>';
html += '</table>';
html += '</div>';
html += '</div>';

  /* === Channel เปรียบเทียบ === */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">🛵 ช่องทาง: วันนี้ vs เมื่อวาน</div></div>';

  var channels = ST.getChannels();
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><tr><th>ช่องทาง</th><th class="text-right">วันนี้</th><th class="text-right">เมื่อวาน</th><th class="text-right">เปลี่ยน</th></tr></thead>';
  html += '<tbody>';

  for (var ci = 0; ci < channels.length; ci++) {
    var ch = channels[ci];
    var tChSales = sumByChannel(todayOrders, ch.id);
    var yChSales = sumByChannel(yestOrders, ch.id);
    if (tChSales === 0 && yChSales === 0) continue;

    var chDiff = tChSales - yChSales;
    var chDiffClass = chDiff > 0 ? 'text-success' : chDiff < 0 ? 'text-danger' : 'text-muted';
    var chSign = chDiff > 0 ? '+' : '';

    html += '<tr>';
    html += '<td>' + (ch.emoji || '') + ' ' + sanitize(ch.name) + '</td>';
    html += '<td class="text-right fw-700">' + formatMoneySign(tChSales) + '</td>';
    html += '<td class="text-right text-muted">' + formatMoneySign(yChSales) + '</td>';
    html += '<td class="text-right fw-600 ' + chDiffClass + '">' + chSign + formatMoneySign(chDiff) + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += '</div>';
  html += '</div>';

  return html;
}

/* Helper functions */
function getCompletedByDate(dateStr) {
  var orders = ST.getOrdersByDate(dateStr);
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status !== 'cancelled') result.push(orders[i]);
  }
  return result;
}

function getCompletedByRange(from, to) {
  var orders = ST.getOrdersByRange(from, to);
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status !== 'cancelled') result.push(orders[i]);
  }
  return result;
}

function countItems(orders) {
  var total = 0;
  for (var i = 0; i < orders.length; i++) {
    var items = orders[i].items || [];
    for (var j = 0; j < items.length; j++) {
      total += items[j].qty || 0;
    }
  }
  return total;
}

function sumByChannel(orders, chId) {
  var total = 0;
  for (var i = 0; i < orders.length; i++) {
    if ((orders[i].channel || 'ch_walkin') === chId) {
      total += orders[i].total || 0;
    }
  }
  return total;
}

function compareCard(label, current, previous, isMoney) {
  var diff = current - previous;
  var pctChange = previous > 0 ? roundTo((diff / previous) * 100, 1) : (current > 0 ? 100 : 0);
  var isUp = diff > 0;
  var isDown = diff < 0;
  var arrow = isUp ? '▲' : isDown ? '▼' : '—';
  var changeClass = isUp ? 'up' : (isDown ? 'down' : 'equal');
  var sign = isUp ? '+' : (isDown ? '' : '');
  
  var html = '<div class="compare-card">';
  html += '<div class="compare-label">' + label + '</div>';
  html += '<div class="compare-current">' + (isMoney ? formatMoneySign(current) : formatNumber(current)) + '</div>';
  html += '<div class="compare-prev">ก่อนหน้า: ' + (isMoney ? formatMoneySign(previous) : formatNumber(previous)) + '</div>';
  html += '<div class="compare-change ' + changeClass + '">';
  html += '<span class="change-arrow">' + arrow + '</span> ';
  html += '<span class="change-value">' + sign + pctChange + '%</span>';
  html += ' <span class="change-diff">(' + (isMoney ? formatMoneySign(Math.abs(diff)) : Math.abs(diff)) + ')</span>';
  html += '</div>';
  html += '</div>';
  
  return html;
}

/* ============================================
   ADDITIONAL CSS (inject once)
   ============================================ */
(function() {
  var styleId = 'reportViewStyle';
  if (document.getElementById(styleId)) return;

  var css = '';
  
  css += '.report-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;}';
  css += '.pie-chart-wrap{display:flex;align-items:center;gap:20px;padding:16px;flex-wrap:wrap;justify-content:center;}';
  css += '.pie-legend{display:flex;flex-direction:column;gap:6px;}';
  css += '.pie-legend-item{display:flex;align-items:center;gap:8px;}';
  css += '.pie-legend-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0;}';
  css += '.top-product-list{display:flex;flex-direction:column;gap:4px;padding:0 16px 16px;}';
  css += '.top-product-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}';
  css += '.top-product-item.top-rank .top-product-info .fw-600{color:var(--accent);}';
  css += '.top-product-rank{width:32px;text-align:center;font-size:18px;}';
  css += '.top-product-info{flex:1;min-width:0;}';
  css += '.hbar-chart{padding:16px;}';
  css += '.hbar-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;}';
  css += '.hbar-label{width:160px;display:flex;align-items:center;gap:8px;flex-shrink:0;overflow:hidden;}';
  css += '.hbar-rank{width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;flex-shrink:0;}';
  css += '.hbar-bar-wrap{flex:1;display:flex;align-items:center;gap:8px;min-width:0;}';
  css += '.hbar-bar{height:28px;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:4px;transition:width 0.8s cubic-bezier(0.4,0,0.2,1);min-width:2px;}';
  css += '.hbar-value{font-size:12px;color:var(--text-secondary);white-space:nowrap;font-weight:600;}';
  css += '.compare-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;padding:8px 0;}';
  css += '.compare-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center;}';
  css += '.compare-values{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:8px;}';
  css += '.compare-current{text-align:center;}';
  css += '.compare-prev{text-align:center;opacity:0.7;}';
  css += '.compare-arrow{display:flex;flex-direction:column;align-items:center;min-width:50px;}';
  css += '@media(max-width:768px){';
  css += '.report-grid{grid-template-columns:1fr;}';
  css += '.pie-chart-wrap{flex-direction:column;}';
  css += '.hbar-label{width:100px;font-size:12px;}';
  css += '.hbar-bar{height:22px;}';
  css += '.hbar-value{font-size:10px;}';
  css += '.compare-grid{grid-template-columns:1fr;}';
  css += '}';

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ============================================
   [Pro] ADVANCED REPORT (COGS + Profit)
   ============================================ */
function renderAdvancedReport() {
  var orders = getRptOrders();
  var menuItems = ST.getMenu();
  var recipes = ST.getRecipes();
  
  if (!FeatureManager.isEnabled('pro_advanced_report')) {
    return renderFeatureLockedReport('pro_advanced_report', '📈 รายงานขั้นสูง (COGS + กำไรสุทธิ)');
  }
  
  if (orders.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">ไม่มีข้อมูลในช่วงนี้</div></div>';
  }
  
  function getMenuItemCost(menuId, size, menuItem) {
    if (!menuItem) {
      var allMenus = ST.getMenu();
      menuItem = findById(allMenus, menuId);
    }
    if (!menuItem) return 0;
    
    if (menuItem.useAutoCost && typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_recipe')) {
      var recipe = ST.getRecipe(menuId, size);
      if (recipe) {
        return ST.calculateRecipeCost(recipe);
      }
    }
    if (menuItem.costs && menuItem.costs[size]) {
      return menuItem.costs[size];
    }
    return menuItem.cost || 0;
  }
  
  var productData = aggregateProducts(orders);
  var productWithCost = [];
  var totalSales = 0;
  var totalCOGS = 0;
  
  for (var i = 0; i < productData.length; i++) {
    var p = productData[i];
    var menu = findById(menuItems, p.menuId);
    
    var actualSize = '';
    for (var o = 0; o < orders.length; o++) {
      var items = orders[o].items || [];
      for (var it = 0; it < items.length; it++) {
        if (items[it].menuId === p.menuId && items[it].size) {
          actualSize = items[it].size;
          break;
        }
      }
      if (actualSize) break;
    }
    
    var costPerUnit = getMenuItemCost(p.menuId, actualSize, menu);
    var totalCost = costPerUnit * p.qty;
    var profit = p.sales - totalCost;
    var profitMargin = p.sales > 0 ? roundTo((profit / p.sales) * 100, 1) : 0;
    
    productWithCost.push({
      name: p.name,
      qty: p.qty,
      sales: p.sales,
      costPerUnit: costPerUnit,
      totalCost: totalCost,
      profit: profit,
      profitMargin: profitMargin,
      size: actualSize,
      useAutoCost: menu ? menu.useAutoCost : false
    });
    
    totalSales += p.sales;
    totalCOGS += totalCost;
  }
  
  var totalProfit = totalSales - totalCOGS;
  var overallMargin = totalSales > 0 ? roundTo((totalProfit / totalSales) * 100, 1) : 0;
  
  var html = '';
  html += '<div class="kpi-grid mb-16">';
  html += kpiCard('💰', formatMoneySign(totalSales), 'ยอดขายรวม', 'accent');
  html += kpiCard('📦', formatMoneySign(totalCOGS), 'ต้นทุนสินค้า (COGS)', 'danger');
  html += kpiCard('📈', formatMoneySign(totalProfit), 'กำไรสุทธิ', 'success');
  html += kpiCard('📊', overallMargin + '%', 'อัตรากำไร', overallMargin >= 50 ? 'success' : 'warning');
  html += '</div>';
  
  var sortedByProfit = sortBy(productWithCost, 'profit', true);
  var topProfit = sortedByProfit.slice(0, 10);
  
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">🏆 เมนูทำกำไรสูงสุด Top 10</div>';
  html += '</div>';
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead>';
  html += '<tr><th>เมนู</th><th class="text-right">จำนวน</th><th class="text-right">ยอดขาย</th><th class="text-right">ต้นทุน/ชิ้น</th><th class="text-right">กำไร/ชิ้น</th><th class="text-right">กำไรรวม</th><th class="text-right">% กำไร</th></tr>';
  html += '</thead>';
  html += '<tbody>';
  
  for (var t = 0; t < topProfit.length; t++) {
    var pp = topProfit[t];
    var profitPerUnit = pp.costPerUnit > 0 ? pp.sales / pp.qty - pp.costPerUnit : 0;
    var marginClass = pp.profitMargin >= 50 ? 'text-success' : (pp.profitMargin >= 30 ? 'text-warning' : 'text-danger');
    
    html += '<tr>';
    html += '<td class="fw-600">' + sanitize(pp.name) + (pp.size ? ' (' + pp.size + ')' : '') + '</td>';
    html += '<td class="text-right">' + pp.qty + '</td>';
    html += '<td class="text-right">' + formatMoneySign(pp.sales) + '</td>';
    html += '<td class="text-right">' + formatMoneySign(pp.costPerUnit) + '</td>';
    html += '<td class="text-right text-success">' + formatMoneySign(profitPerUnit) + '</td>';
    html += '<td class="text-right text-success fw-700">' + formatMoneySign(pp.profit) + '</td>';
    html += '<td class="text-right ' + marginClass + ' fw-700">' + pp.profitMargin + '%' + '</td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  var sortedByName = sortBy(productWithCost, 'name', false);
  
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">📋 สรุปกำไรทุกเมนู</div>';
  html += '<button class="btn btn-secondary btn-sm" onclick="exportProfitReport()">📥 Export CSV</button>';
  html += '</div>';
  html += '<div class="table-wrap" style="max-height:500px;overflow-y:auto;">';
  html += '<table>';
  html += '<thead style="position:sticky;top:0;background:var(--bg-card);">';
  html += '<tr>';
  html += '<th>เมนู</th>';
  html += '<th class="text-right">จำนวน</th>';
  html += '<th class="text-right">ยอดขาย</th>';
  html += '<th class="text-right">ต้นทุน/ชิ้น</th>';
  html += '<th class="text-right">กำไร/ชิ้น</th>';
  html += '<th class="text-right">ต้นทุนรวม</th>';
  html += '<th class="text-right">กำไรรวม</th>';
  html += '<th class="text-right">% กำไร</th>';
  html += '<th class="text-center">ต้นทาง</th>';
  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';
  
  for (var a = 0; a < sortedByName.length; a++) {
    var item = sortedByName[a];
    var profitPerUnit = item.costPerUnit > 0 ? (item.sales / item.qty) - item.costPerUnit : 0;
    var marginClass = item.profitMargin >= 50 ? 'text-success' : (item.profitMargin >= 30 ? 'text-warning' : 'text-danger');
    var costSource = item.useAutoCost ? '🧪 Auto' : '✏️ Manual';
    
    html += '<tr>';
    html += '<td class="fw-600">' + sanitize(item.name) + (item.size ? ' (' + item.size + ')' : '') + '</td>';
    html += '<td class="text-right">' + item.qty + '</td>';
    html += '<td class="text-right">' + formatMoneySign(item.sales) + '</td>';
    html += '<td class="text-right">' + formatMoneySign(item.costPerUnit) + '</td>';
    html += '<td class="text-right text-success fw-600">' + formatMoneySign(profitPerUnit) + '</td>';
    html += '<td class="text-right text-danger">' + formatMoneySign(item.totalCost) + '</td>';
    html += '<td class="text-right text-success fw-700">' + formatMoneySign(item.profit) + '</td>';
    html += '<td class="text-right ' + marginClass + ' fw-700">' + item.profitMargin + '%' + '</td>';
    html += '<td class="text-center"><span class="badge badge-info">' + costSource + '</span></td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  var lowMargin = productWithCost.filter(function(p) { return p.profitMargin < 30 && p.sales > 1000; });
  if (lowMargin.length > 0) {
    html += '<div class="card" style="border-color:var(--warning);">';
    html += '<div class="card-header"><div class="card-title text-warning">⚠️ เมนูที่มีกำไรต่ำ (&lt;30%)</div></div>';
    html += '<div class="table-wrap">';
    html += '<table>';
    html += '<thead><tr><th>เมนู</th><th class="text-right">ยอดขาย</th><th class="text-right">กำไร</th><th class="text-right">% กำไร</th></tr></thead>';
    html += '<tbody>';
    
    for (var l = 0; l < lowMargin.length; l++) {
      var lm = lowMargin[l];
      html += '<tr>';
      html += '<td class="fw-600">' + sanitize(lm.name) + (lm.size ? ' (' + lm.size + ')' : '') + '</td>';
      html += '<td class="text-right">' + formatMoneySign(lm.sales) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(lm.profit) + '</td>';
      html += '<td class="text-right text-danger">' + lm.profitMargin + '%' + '</td>';
      html += '</tr>';
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    html += '</div>';
  }
  
  return html;
}

/* ============================================
   STOCK SUMMARY REPORT
   ============================================ */
function renderStockSummaryReport() {
  if (!FeatureManager.isEnabled('pro_advanced_report')) {
    return '<div class="card p-20 text-center">🔒 ต้องมี Pro License</div>';
  }
  
  var stockItems = ST.getStock();
  var logs = ST.getStockLogs();
  var today = todayStr();
  var usageSummary = ST.getStockUsageSummary(30);
  
  var todayUsage = getStockUsageByDate(logs, today, 'usage');
  var todayReceive = getStockUsageByDate(logs, today, 'receive');
  
  var totalValue = calculateTotalStockValue(stockItems);
  var lowStock = ST.getLowStock();
  
  var html = '';
  
  /* KPI Cards */
  html += '<div class="kpi-grid mb-16">';
  html += '<div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-value">' + formatNumber(todayUsage) + '</div><div class="kpi-label">ใช้ไปวันนี้</div></div>';
  html += '<div class="kpi-card"><div class="kpi-icon">📥</div><div class="kpi-value">' + formatNumber(todayReceive) + '</div><div class="kpi-label">รับเข้าวันนี้</div></div>';
  html += '<div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value">' + formatMoneySign(totalValue) + '</div><div class="kpi-label">มูลค่าคงเหลือ</div></div>';
  html += '<div class="kpi-card"><div class="kpi-icon">⚠️</div><div class="kpi-value">' + lowStock.length + '</div><div class="kpi-label">รายการใกล้หมด</div></div>';
  html += '</div>';
  
  /* Low Stock Alert */
  if (lowStock.length > 0) {
    html += '<div class="card mb-16" style="border-color:var(--warning);">';
    html += '<div class="card-header"><div class="card-title text-warning">⚠️ วัตถุดิบใกล้หมด</div></div>';
    for (var l = 0; l < lowStock.length; l++) {
      var displayQty = formatStockQty(lowStock[l].qty, lowStock[l].unit, lowStock[l].bigUnit, lowStock[l].bigUnitSize);
      var minDisplay = formatStockQty(lowStock[l].minQty, lowStock[l].unit, lowStock[l].bigUnit, lowStock[l].bigUnitSize);
      html += '<div class="flex-between p-12" style="border-bottom:1px solid var(--border);">';
      html += '<span class="fw-600">' + sanitize(lowStock[l].name) + '</span>';
      html += '<span class="text-warning">เหลือ ' + displayQty + ' (ขั้นต่ำ ' + minDisplay + ')</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  
  /* Stock List Table */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📋 สต็อกปัจจุบัน</div></div>';
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><tr><th>วัตถุดิบ</th><th class="text-right">คงเหลือ</th><th class="text-right">ต้นทุน/หน่วย</th><th class="text-right">มูลค่า</th><th class="text-right">สถานะ</th></thead>';
  html += '<tbody>';
  
  for (var i = 0; i < stockItems.length; i++) {
    var s = stockItems[i];
    var displayQty = formatStockQty(s.qty, s.unit, s.bigUnit, s.bigUnitSize);
    var value = (s.qty || 0) * (s.costPerUnit || 0);
    var isLowStock = s.minQty > 0 && s.qty <= s.minQty;
    var statusClass = isLowStock ? 'text-warning' : 'text-success';
    var statusText = isLowStock ? '⚠️ ใกล้หมด' : '✅ ปกติ';
    
    html += '<tr>';
    html += '<td class="fw-600">' + sanitize(s.name) + '</td>';
    html += '<td class="text-right">' + displayQty + '</td>';
    html += '<td class="text-right">' + formatMoneySign(s.costPerUnit || 0) + '</td>';
    html += '<td class="text-right">' + formatMoneySign(value) + '</td>';
    html += '<td class="text-right ' + statusClass + '">' + statusText + '</td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  return html;
}

function renderFeatureLockedReport(featureId, featureName) {
  return '<div class="card p-20 text-center">' +
    '<div style="font-size:48px;margin-bottom:12px;">🔒</div>' +
    '<div class="fw-700 fs-lg mb-4">' + featureName + '</div>' +
    '<div class="text-muted mb-16">ฟีเจอร์นี้ต้องมี Pro License</div>' +
    '<button class="btn btn-primary" onclick="LicenseManager.showLicenseModal()">🔑 อัปเกรดเป็น Pro</button>' +
    '</div>';
}

/* ============================================
   STAFF SALES REPORT
   ============================================ */
function renderStaffSalesReport() {
  var range = getRptDateRange();
  var staffSummary = ST.getStaffSalesSummary(range.from, range.to);
  
  if (staffSummary.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">ไม่มีข้อมูลในช่วงนี้</div></div>';
  }
  
  var totalOrders = 0;
  var totalSales = 0;
  var totalItems = 0;
  
  for (var i = 0; i < staffSummary.length; i++) {
    totalOrders += staffSummary[i].orderCount;
    totalSales += staffSummary[i].totalSales;
    totalItems += staffSummary[i].itemCount;
  }
  
  var html = '';
  
  /* Summary Cards */
  html += '<div class="kpi-grid mb-16">';
  html += kpiCard('👥', staffSummary.length, 'พนักงาน', 'info');
  html += kpiCard('🧾', totalOrders, 'ออเดอร์รวม', 'accent');
  html += kpiCard('💰', formatMoneySign(totalSales), 'ยอดขายรวม', 'success');
  html += kpiCard('☕', totalItems, 'สินค้าที่ขาย', 'accent2');
  html += '</div>';
  
  /* Staff Table */
  html += '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📊 สรุปยอดขายแยกพนักงาน</div></div>';
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead>';
  html += '<tr><th>พนักงาน</th><th class="text-right">ออเดอร์</th><th class="text-right">สินค้า</th><th class="text-right">ยอดขาย</th><th class="text-right">เฉลี่ย/ออเดอร์</th><th class="text-right">% ยอดขาย</th></tr>';
  html += '</thead>';
  html += '<tbody>';
  
  for (var i = 0; i < staffSummary.length; i++) {
    var s = staffSummary[i];
    var avgPerOrder = s.orderCount > 0 ? roundTo(s.totalSales / s.orderCount, 0) : 0;
    var percentOfTotal = totalSales > 0 ? pct(s.totalSales, totalSales) : 0;
    
    html += '<tr>';
    html += '<td class="fw-600">👤 ' + sanitize(s.staffName) + '</td>';
    html += '<td class="text-right">' + s.orderCount + '  บิล</td>';
    html += '<td class="text-right">' + s.itemCount + '  ชิ้น</td>';
    html += '<td class="text-right fw-700 text-accent">' + formatMoneySign(s.totalSales) + '</td>';
    html += '<td class="text-right">' + formatMoneySign(avgPerOrder) + '</td>';
    html += '<td class="text-right">' + percentOfTotal + '%</td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  return html;
}

console.log('[views-report.js] loaded');