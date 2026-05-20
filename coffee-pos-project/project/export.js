/* ============================================
   COFFEE POS — EXPORT.JS
   Export CSV / JSON / Copy
   ============================================ */

/* ============================================
   JSON BACKUP
   ============================================ */
function exportJSON() {
  var data = ST.exportAll();
  var json = JSON.stringify(data, null, 2);
  var cfg = ST.getConfig();
  var filename = (cfg.shopName || 'coffee-pos') + '_backup_' + todayStr().replace(/\//g, '-') + '.json';
  downloadFile(filename, json, 'application/json');
}

/* ============================================
   CSV: ORDERS
   ============================================ */
function exportCSVOrders() {
  var orders = ST.getOrders();
  if (orders.length === 0) {
    toast('ไม่มีออเดอร์', 'warning');
    return;
  }

  var cfg = ST.getConfig();
  var rows = [];

  /* Header */
  rows.push([
    'Order#',
    'Date',
    'Time',
    'Status',
    'Items',
    'Item Details',
    'Subtotal',
    'Discount',
    'VAT',
    'Service Charge',
    'Total',
    'Payment',
    'Received',
    'Change',
    'Staff'
  ]);

  /* Data */
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var items = o.items || [];

    /* Build items summary */
    var itemNames = [];
    var itemDetails = [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var name = it.name || '';
      if (it.size) name += ' (' + it.size + ')';
      name += ' x' + it.qty;
      itemNames.push(name);

      var detail = name + ' = ' + it.lineTotal;
      if (it.toppingNames && it.toppingNames.length > 0) {
        detail += ' [+' + it.toppingNames.join(', ') + ']';
      }
      itemDetails.push(detail);
    }

    var payLabels = { cash: 'เงินสด', transfer: 'โอน', qr: 'QR' };

    rows.push([
      cfg.orderPrefix + padZ(o.number || 0),
      o.date || '',
      o.time || '',
      o.status === 'cancelled' ? 'ยกเลิก' : 'สำเร็จ',
      itemNames.join('; '),
      itemDetails.join('; '),
      o.subtotal || 0,
      o.discount || 0,
      o.vat || 0,
      o.serviceCharge || 0,
      o.total || 0,
      payLabels[o.payment] || o.payment || '',
      o.received || 0,
      o.change || 0,
      o.staffName || ''
    ]);
  }

  var csv = rowsToCSV(rows);
  var filename = (cfg.shopName || 'coffee-pos') + '_orders_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
}

/* ============================================
   CSV: MENU
   ============================================ */
function exportCSVMenu() {
  var items = ST.getMenu();
  if (items.length === 0) {
    toast('ไม่มีเมนู', 'warning');
    return;
  }

  var cats = ST.getCategories();
  var sizes = ST.getSizes();
  var cfg = ST.getConfig();

  var rows = [];

  /* Header */
  var header = ['ID', 'Name', 'Category', 'Emoji', 'Active'];
  for (var s = 0; s < sizes.length; s++) {
    header.push('Price_' + sizes[s].name);
  }
  header.push('Cost');
  header.push('Created');
  rows.push(header);

  /* Data */
  for (var i = 0; i < items.length; i++) {
    var m = items[i];
    var cat = findById(cats, m.catId);
    var catName = cat ? cat.name : '';

    var row = [
      m.id || '',
      m.name || '',
      catName,
      m.emoji || '',
      m.active !== false ? 'Yes' : 'No'
    ];

    for (var p = 0; p < sizes.length; p++) {
      row.push(m.prices ? (m.prices[sizes[p].name] || 0) : 0);
    }

    row.push(m.cost || 0);
    row.push(m.created || '');
    rows.push(row);
  }

  var csv = rowsToCSV(rows);
  var filename = (cfg.shopName || 'coffee-pos') + '_menu_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
}

/* ============================================
   CSV: STOCK
   ============================================ */
function exportCSVStock() {
  var items = ST.getStock();
  if (items.length === 0) {
    toast('ไม่มีวัตถุดิบ', 'warning');
    return;
  }

  var cfg = ST.getConfig();
  var rows = [];

  rows.push(['ID', 'Name', 'Unit', 'Qty', 'Min Qty', 'Cost/Unit', 'Value', 'Last Update']);

  for (var i = 0; i < items.length; i++) {
    var s = items[i];
    var value = roundTo((s.qty || 0) * (s.costPerUnit || 0), 2);
    rows.push([
      s.id || '',
      s.name || '',
      s.unit || '',
      s.qty || 0,
      s.minQty || 0,
      s.costPerUnit || 0,
      value,
      s.lastUpdate || ''
    ]);
  }

  var csv = rowsToCSV(rows);
  var filename = (cfg.shopName || 'coffee-pos') + '_stock_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
}

/* ============================================
   COPY: TODAY SALES REPORT
   ============================================ */
function copySalesReport() {
  var cfg = ST.getConfig();
  var sales = ST.getTodaySales();
  var orders = ST.getTodayOrders();
  var completed = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status !== 'cancelled') completed.push(orders[i]);
  }

  /* Payment breakdown */
  var payCash = 0, payTransfer = 0, payQr = 0;
  for (var p = 0; p < completed.length; p++) {
    var amt = completed[p].total || 0;
    if (completed[p].payment === 'cash') payCash += amt;
    else if (completed[p].payment === 'transfer') payTransfer += amt;
    else payQr += amt;
  }

  /* Top 5 */
  var productData = aggregateProducts(completed);
  var sorted = sortBy(productData, 'qty', true);
  var top5 = sorted.slice(0, 5);

  /* Build text */
  var lines = [];
  lines.push('=========================');
  lines.push(cfg.shopName + ' - สรุปยอดวันนี้');
  lines.push(todayStr() + ' ' + nowTimeStr());
  lines.push('=========================');
  lines.push('');
  lines.push('💰 ยอดขายรวม: ' + formatMoneySign(sales.total));
  lines.push('🧾 ออเดอร์: ' + sales.count + ' บิล');
  lines.push('📊 เฉลี่ย/บิล: ' + formatMoneySign(sales.count > 0 ? roundTo(sales.total / sales.count, 0) : 0));
  lines.push('');
  lines.push('--- วิธีชำระ ---');
  if (payCash > 0) lines.push('💵 เงินสด: ' + formatMoneySign(payCash));
  if (payTransfer > 0) lines.push('📱 โอน: ' + formatMoneySign(payTransfer));
  if (payQr > 0) lines.push('📷 QR: ' + formatMoneySign(payQr));
  lines.push('');

  if (top5.length > 0) {
    lines.push('--- เมนูขายดี ---');
    for (var t = 0; t < top5.length; t++) {
      var rank = t + 1;
      lines.push(rank + '. ' + top5[t].name + ' x' + top5[t].qty + ' (' + formatMoneySign(top5[t].sales) + ')');
    }
  }

  lines.push('');
  lines.push('=========================');

  var text = lines.join('\n');
  copyText(text);
}

/* ============================================
   COPY: ORDERS TABLE (for Google Sheets)
   ============================================ */
function copySheetsOrders() {
  var orders = ST.getTodayOrders();
  var cfg = ST.getConfig();

  if (orders.length === 0) {
    toast('ไม่มีออเดอร์วันนี้', 'warning');
    return;
  }

  var lines = [];
  /* Header (tab separated) */
  lines.push(['Order', 'Time', 'Items', 'Total', 'Payment', 'Staff'].join('\t'));

  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (o.status === 'cancelled') continue;

    var items = o.items || [];
    var itemStr = [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var s = it.name;
      if (it.size) s += '(' + it.size + ')';
      s += 'x' + it.qty;
      itemStr.push(s);
    }

    var payLabels = { cash: 'Cash', transfer: 'Transfer', qr: 'QR' };

    lines.push([
      cfg.orderPrefix + padZ(o.number || 0),
      o.time || '',
      itemStr.join(', '),
      o.total || 0,
      payLabels[o.payment] || '',
      o.staffName || ''
    ].join('\t'));
  }

  copyText(lines.join('\n'));
}

/* ============================================
   CSV HELPER
   ============================================ */
function rowsToCSV(rows) {
  var lines = [];
  for (var i = 0; i < rows.length; i++) {
    var cells = [];
    for (var j = 0; j < rows[i].length; j++) {
      var cell = String(rows[i][j]);
      /* Escape quotes and wrap if contains comma/quote/newline */
      if (cell.indexOf(',') !== -1 || cell.indexOf('"') !== -1 || cell.indexOf('\n') !== -1) {
        cell = '"' + cell.replace(/"/g, '""') + '"';
      }
      cells.push(cell);
    }
    lines.push(cells.join(','));
  }
  /* เพิ่ม BOM สำหรับ UTF-8 ที่บรรทัดแรก */
  return '\uFEFF' + lines.join('\n');
}

/* ============================================
   AGGREGATE PRODUCTS (reuse from report, ensure available)
   ============================================ */
if (typeof aggregateProducts !== 'function') {
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
    for (var k in map) { result.push(map[k]); }
    return result;
  }
}
function exportProfitReport() {
  var orders = getRptOrders();
  var menuItems = ST.getMenu();
  
  function getMenuItemCost(menuId, size, menuItem) {
    if (!menuItem) {
      menuItem = findById(menuItems, menuId);
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
  var rows = [];
  rows.push(['เมนู', 'ขนาด', 'จำนวน', 'ยอดขาย', 'ต้นทุน/ชิ้น', 'ต้นทุนรวม', 'กำไรรวม', '% กำไร']);
  
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
    
    rows.push([
      p.name,
      actualSize,
      p.qty,
      p.sales,
      costPerUnit,
      totalCost,
      profit,
      profitMargin + '%'
    ]);
  }
  
  var csv = rowsToCSV(rows);
  var filename = 'profit_report_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
}
console.log('[export.js] loaded');