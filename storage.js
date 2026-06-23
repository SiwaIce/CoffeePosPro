/* ============================================
   COFFEE POS — STORAGE.JS
   localStorage CRUD + Firebase sync hook
   ============================================ */

var ST = {};

/* === CONFIG === */
ST.PREFIX = 'v1_coffee_';

/* === ALL KEYS (for sync) === */
ST._keys = [
  'config',
  'categories',
  'menu',
  'toppings',
  'sizes',
  'sweetLevels',
  'drinkTypes',
  'orders',
  'stock',
  'stockLogs',
  'staff',
  'shifts',
  'favorites',
  'channels',
  'promptpayAccounts',
  'feature_overrides',
  'super_admin',
  'recipes',
  'memberTransactions'
];

/* === LOW-LEVEL === */
ST.get = function(key) {
  try {
    return localStorage.getItem(ST.PREFIX + key);
  } catch (e) {
    console.error('[ST.get]', e);
    return null;
  }
};

ST.set = function(key, val) {
  try {
    localStorage.setItem(ST.PREFIX + key, val);
    /* Hook for Firebase sync */
    if (ST._onSet) ST._onSet(key, val);
  } catch (e) {
    console.error('[ST.set]', e);
    if (e.name === 'QuotaExceededError') {
      toast('พื้นที่จัดเก็บเต็ม!', 'error');
    }
  }
};

ST.remove = function(key) {
  try {
    localStorage.removeItem(ST.PREFIX + key);
  } catch (e) {
    console.error('[ST.remove]', e);
  }
};

ST.getObj = function(key, fallback) {
  var raw = ST.get(key);
  if (!raw) return fallback !== undefined ? fallback : null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback !== undefined ? fallback : null;
  }
};

ST.setObj = function(key, obj) {
  ST.set(key, JSON.stringify(obj));
};

/* === Firebase sync hook (override from firebase-sync.js) === */
ST._onSet = null;

/* ============================================
   CONFIG
   ============================================ */
ST.getConfig = function() {
  var defaults = {
    lineNotifyToken: '',
    shopName: 'Coffee POS',
    currency: '฿',
    vatEnabled: false,
    vatRate: 7,
    serviceChargeEnabled: false,
    serviceChargeRate: 10,
    theme: 'dark',
    receiptWidth: '80mm',
    receiptFooter: 'ขอบคุณที่ใช้บริการ',
    orderPrefix: '#',
    lastOrderDate: '',
    lastOrderNumber: 0,
    showStock: true,
    showStaff: true,
    quickCashAmounts: [20, 50, 100, 500, 1000],
    soundEnabled: true,
    promptPayId: '',
    promptPayName: '',
    promptPayEnabled: false,
    
    // ===== ดีไซน์การ์ดเมนู POS (ดีไซน์เดียว เรียบง่าย) =====
    menuCardDesign: {
      showName: true,
      showPrice: true,
      fontSize: 'medium',
      cardRadius: 16,
      showShadow: true,
      showBorder: false,
      textAlign: 'default',          // 'default' (ชื่อซ้าย-ราคาขวา) หรือ 'center' (กึ่งกลางทั้งหมด)
      
      // ===== หน้า Manage Menu (เก็บไว้ข้างใน) — ลดความซับซ้อน เหลือเฉพาะที่ใช้บ่อย =====
      manageCard: {
        imageSize: 70,
        showImageBorder: false,
        nameFontSize: 15,
        nameAlign: 'left',
        statusPosition: 'inline'
      }
    }
  };
  
  var cfg = ST.getObj('config', {});
  for (var k in defaults) {
    if (cfg[k] === undefined) cfg[k] = defaults[k];
  }
  
  // เผื่อ menuCardDesign ไม่มี
  if (!cfg.menuCardDesign) {
    cfg.menuCardDesign = defaults.menuCardDesign;
  }
  
  return cfg;
};
ST.saveConfig = function(cfg) {
  ST.setObj('config', cfg);
};

/* ============================================
   CATEGORIES
   ============================================ */
ST.getCategories = function() {
  var cats = ST.getObj('categories', null);
  if (!cats || cats.length === 0) {
    cats = ST._defaultCategories();
    ST.setObj('categories', cats);
  }
  return cats;
};

ST.saveCategories = function(cats) {
  ST.setObj('categories', cats);
};

ST.addCategory = function(cat) {
  var cats = ST.getCategories();
  cat.id = cat.id || genId('cat');
  cat.sort = cat.sort || cats.length + 1;
  cats.push(cat);
  ST.saveCategories(cats);
  return cat;
};

ST.updateCategory = function(id, data) {
  var cats = ST.getCategories();
  var idx = findIndexById(cats, id);
  if (idx === -1) return null;
  for (var k in data) {
    cats[idx][k] = data[k];
  }
  ST.saveCategories(cats);
  return cats[idx];
};

ST.deleteCategory = function(id) {
  var cats = ST.getCategories();
  removeById(cats, id);
  ST.saveCategories(cats);
};

ST._defaultCategories = function() {
  return [
    { id: 'cat_coffee', name: 'กาแฟ', icon: '☕', sort: 1 },
    { id: 'cat_tea', name: 'ชา', icon: '🍵', sort: 2 },
    { id: 'cat_blend', name: 'ปั่น', icon: '🧋', sort: 3 },
    { id: 'cat_bakery', name: 'เบเกอรี่', icon: '🍰', sort: 4 },
    { id: 'cat_other', name: 'อื่นๆ', icon: '🥤', sort: 5 }
  ];
};

/* ============================================
   SIZES
   ============================================ */
ST.getSizes = function() {
  var sizes = ST.getObj('sizes', null);
  if (!sizes || sizes.length === 0) {
    sizes = ST._defaultSizes();
    ST.setObj('sizes', sizes);
  }
  return sizes;
};

ST.saveSizes = function(sizes) {
  ST.setObj('sizes', sizes);
};

ST._defaultSizes = function() {
  return [
    { id: 'size_s', name: 'S', addPrice: 0 },
    { id: 'size_m', name: 'M', addPrice: 10 },
    { id: 'size_l', name: 'L', addPrice: 20 }
  ];
};

/* ============================================
   TOPPINGS
   ============================================ */
ST.getToppings = function() {
  var tops = ST.getObj('toppings', null);
  if (!tops || tops.length === 0) {
    tops = ST._defaultToppings();
    ST.setObj('toppings', tops);
  }
  return tops;
};

ST.saveToppings = function(tops) {
  ST.setObj('toppings', tops);
};

ST.addTopping = function(tp) {
  var tops = ST.getToppings();
  tp.id = tp.id || genId('tp');
  tp.active = tp.active !== undefined ? tp.active : true;
  tops.push(tp);
  ST.saveToppings(tops);
  return tp;
};

ST.updateTopping = function(id, data) {
  var tops = ST.getToppings();
  var idx = findIndexById(tops, id);
  if (idx === -1) return null;
  for (var k in data) {
    tops[idx][k] = data[k];
  }
  ST.saveToppings(tops);
  return tops[idx];
};

ST.deleteTopping = function(id) {
  var tops = ST.getToppings();
  removeById(tops, id);
  ST.saveToppings(tops);
};

ST._defaultToppings = function() {
  return [
    { id: 'tp_whip', name: 'วิปครีม', price: 15, active: true },
    { id: 'tp_shot', name: 'เพิ่มช็อต', price: 20, active: true },
    { id: 'tp_milk', name: 'นมข้น', price: 10, active: true },
    { id: 'tp_pearl', name: 'ไข่มุก', price: 15, active: true }
  ];
};

/* ============================================
   MENU
   ============================================ */
ST.getMenu = function() {
  return ST.getObj('menu', []);
};

ST.saveMenu = function(items) {
  ST.setObj('menu', items);
};

ST.addMenuItem = function(item) {
  var items = ST.getMenu();
  item.id = item.id || genId('m');
  item.active = item.active !== undefined ? item.active : true;
  item.created = item.created || todayStr();
  item.sort = item.sort || items.length + 1;
  items.push(item);
  ST.saveMenu(items);
  return item;
};

ST.updateMenuItem = function(id, data) {
  var items = ST.getMenu();
  var idx = findIndexById(items, id);
  if (idx === -1) return null;
  for (var k in data) {
    items[idx][k] = data[k];
  }
  ST.saveMenu(items);
  return items[idx];
};

ST.deleteMenuItem = function(id) {
  var items = ST.getMenu();
  removeById(items, id);
  ST.saveMenu(items);
};

ST.getMenuByCat = function(catId) {
  var items = ST.getMenu();
  if (!catId || catId === 'all') return items;
  var result = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].catId === catId) result.push(items[i]);
  }
  return result;
};

ST.getActiveMenu = function() {
  var items = ST.getMenu();
  var result = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].active !== false) result.push(items[i]);
  }
  return result;
};

/* Get base price (smallest size) */
ST.getMenuBasePrice = function(item) {
  if (!item || !item.prices) return 0;
  var sizes = ST.getSizes();
  for (var i = 0; i < sizes.length; i++) {
    var p = item.prices[sizes[i].name];
    if (p !== undefined) return p;
  }
  /* fallback: first key */
  for (var k in item.prices) {
    return item.prices[k];
  }
  return 0;
};

/* ============================================
   ORDERS
   ============================================ */
ST.getOrders = function() {
  return ST.getObj('orders', []);
};

ST.saveOrders = function(orders) {
  ST.setObj('orders', orders);
};

ST.addOrder = function(order) {
  var orders = ST.getOrders();
  order.id = order.id || genId('ord');
  order.timestamp = order.timestamp || nowTimestamp();
  order.date = order.date || todayStr();
  order.time = order.time || nowTimeStr();
  order.status = order.status || 'completed';

  /* Auto order number */
  order.number = order.number || getNextOrderNumber(orders);

  orders.push(order);
  ST.saveOrders(orders);
  return order;
};

ST.updateOrder = function(id, data) {
  var orders = ST.getOrders();
  var idx = findIndexById(orders, id);
  if (idx === -1) return null;
  for (var k in data) {
    orders[idx][k] = data[k];
  }
  ST.saveOrders(orders);
  return orders[idx];
};

ST.cancelOrder = function(id) {
  return ST.updateOrder(id, { status: 'cancelled' });
};

ST.getOrdersByDate = function(dateStr) {
  var orders = ST.getOrders();
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].date === dateStr) result.push(orders[i]);
  }
  return result;
};

ST.getOrdersByRange = function(fromDate, toDate) {
  var orders = ST.getOrders();
  var from = parseDate(fromDate);
  var to = parseDate(toDate);
  if (!from || !to) return orders;
  from = startOfDay(from);
  to = endOfDay(to);
  var result = [];
  for (var i = 0; i < orders.length; i++) {
    var d = parseDate(orders[i].date);
    if (d && d >= from && d <= to) {
      result.push(orders[i]);
    }
  }
  return result;
};

ST.getTodayOrders = function() {
  return ST.getOrdersByDate(todayStr());
};

ST.getTodaySales = function() {
  var orders = ST.getTodayOrders();
  var total = 0;
  var count = 0;
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].status !== 'cancelled') {
      total += (orders[i].total || 0);
      count++;
    }
  }
  return { total: total, count: count };
};

/* ============================================
   STOCK
   ============================================ */
ST.getStock = function() {
  return ST.getObj('stock', []);
};

ST.saveStock = function(items) {
  ST.setObj('stock', items);
};

ST.addStockItem = function(item) {
  var items = ST.getStock();
  item.id = item.id || genId('stk');
  item.qty = item.qty || 0;
  item.minQty = item.minQty || 0;
  item.costPerUnit = item.costPerUnit || 0;
  item.lastUpdate = todayStr();
  items.push(item);
  ST.saveStock(items);
  return item;
};

ST.updateStockItem = function(id, data) {
  var items = ST.getStock();
  var idx = findIndexById(items, id);
  if (idx === -1) return null;
  for (var k in data) {
    items[idx][k] = data[k];
  }
  items[idx].lastUpdate = todayStr();
  ST.saveStock(items);
  return items[idx];
};

ST.deleteStockItem = function(id) {
  var items = ST.getStock();
  removeById(items, id);
  ST.saveStock(items);
};

ST.adjustStock = function(id, qty, reason) {
  var items = ST.getStock();
  var idx = findIndexById(items, id);
  if (idx === -1) return null;
  items[idx].qty = (items[idx].qty || 0) + qty;
  if (items[idx].qty < 0) items[idx].qty = 0;
  items[idx].lastUpdate = todayStr();
  ST.saveStock(items);

  /* Log */
  ST.addStockLog({
    stockId: id,
    stockName: items[idx].name,
    qty: qty,
    reason: reason || (qty > 0 ? 'รับเข้า' : 'ใช้ไป'),
    balance: items[idx].qty
  });

  return items[idx];
};

/* === LOW STOCK CHECK === */
ST.getLowStock = function() {
  var items = ST.getStock();
  var result = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].minQty > 0 && items[i].qty <= items[i].minQty) {
      result.push(items[i]);
    }
  }
  return result;
};

/* === STOCK LOGS === */
ST.getStockLogs = function() {
  return ST.getObj('stockLogs', []);
};

ST.saveStockLogs = function(logs) {
  ST.setObj('stockLogs', logs);
};

ST.addStockLog = function(log) {
  var logs = ST.getStockLogs();
  log.id = log.id || genId('slog');
  log.date = log.date || todayStr();
  log.time = log.time || nowTimeStr();
  log.timestamp = log.timestamp || nowTimestamp();
  logs.push(log);

  /* Keep max 5000 logs */
  if (logs.length > 5000) {
    logs = logs.slice(logs.length - 5000);
  }
  ST.saveStockLogs(logs);
  return log;
};

/* ============================================
   STAFF
   ============================================ */
ST.getStaff = function() {
  return ST.getObj('staff', []);
};

ST.saveStaff = function(list) {
  ST.setObj('staff', list);
};

ST.addStaff = function(s) {
  var list = ST.getStaff();
  s.id = s.id || genId('staff');
  s.role = s.role || 'cashier';
  s.active = s.active !== undefined ? s.active : true;
  list.push(s);
  ST.saveStaff(list);
  return s;
};

ST.updateStaff = function(id, data) {
  var list = ST.getStaff();
  var idx = findIndexById(list, id);
  if (idx === -1) return null;
  for (var k in data) {
    list[idx][k] = data[k];
  }
  ST.saveStaff(list);
  return list[idx];
};

ST.deleteStaff = function(id) {
  var list = ST.getStaff();
  removeById(list, id);
  ST.saveStaff(list);
};

ST.verifyPin = function(pin) {
  var list = ST.getStaff();
  for (var i = 0; i < list.length; i++) {
    if (list[i].pin === pin && list[i].active !== false) {
      return list[i];
    }
  }
  return null;
};

/* ============================================
   SHIFTS
   ============================================ */
ST.getShifts = function() {
  return ST.getObj('shifts', []);
};

ST.saveShifts = function(list) {
  ST.setObj('shifts', list);
};

ST.clockIn = function(staffId) {
  var shifts = ST.getShifts();
  var shift = {
    id: genId('sh'),
    staffId: staffId,
    date: todayStr(),
    clockIn: nowTimeStr(),
    clockOut: '',
    timestamp: nowTimestamp()
  };
  shifts.push(shift);
  ST.saveShifts(shifts);
  return shift;
};

ST.clockOut = function(shiftId) {
  var shifts = ST.getShifts();
  var idx = findIndexById(shifts, shiftId);
  if (idx === -1) return null;
  shifts[idx].clockOut = nowTimeStr();
  ST.saveShifts(shifts);
  return shifts[idx];
};

ST.getActiveShift = function(staffId) {
  var shifts = ST.getShifts();
  var today = todayStr();
  for (var i = shifts.length - 1; i >= 0; i--) {
    if (shifts[i].staffId === staffId &&
        shifts[i].date === today &&
        !shifts[i].clockOut) {
      return shifts[i];
    }
  }
  return null;
};

/* ============================================
   SEED / SAMPLE DATA (อัปเดต)
   ============================================ */
ST.hasSampleData = function() {
  return ST.getMenu().length > 0;
};

ST.seedSampleData = function() {
  /* 1. ตั้งค่าหมวดหมู่ */
  ST.getCategories();
  ST.getSizes();
  ST.getToppings();
  ST.getSweetLevels();
  ST.getDrinkTypes();
  
  /* 2. ตั้งค่าหมวดหมู่ Stock */
  ST.initStockCategories();
  
  /* 3. สร้าง Stock */
  var sampleStock = [
    /* วัตถุดิบ */
    { id: 'stk_coffee', name: 'เมล็ดกาแฟ', unit: 'g', qty: 5000, minQty: 500, costPerUnit: 0.80, categoryId: 'stkcat_beverage', bigUnit: 'กิโลกรัม', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_milk', name: 'นมสด', unit: 'ml', qty: 10000, minQty: 2000, costPerUnit: 0.05, categoryId: 'stkcat_beverage', bigUnit: 'แกลลอน', bigUnitSize: 3785, lastUpdate: todayStr() },
    { id: 'stk_soymilk', name: 'นมถั่วเหลือง', unit: 'ml', qty: 5000, minQty: 1000, costPerUnit: 0.08, categoryId: 'stkcat_beverage', bigUnit: 'กล่อง', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_cream', name: 'ครีมเทียม', unit: 'g', qty: 3000, minQty: 500, costPerUnit: 0.10, categoryId: 'stkcat_beverage', bigUnit: 'กระป๋อง', bigUnitSize: 500, lastUpdate: todayStr() },
    { id: 'stk_cocoa', name: 'ผงโกโก้', unit: 'g', qty: 2000, minQty: 300, costPerUnit: 0.15, categoryId: 'stkcat_beverage', bigUnit: 'กระป๋อง', bigUnitSize: 500, lastUpdate: todayStr() },
    { id: 'stk_matcha', name: 'ผงมัทฉะ', unit: 'g', qty: 1000, minQty: 200, costPerUnit: 0.30, categoryId: 'stkcat_beverage', bigUnit: 'กระป๋อง', bigUnitSize: 200, lastUpdate: todayStr() },
    { id: 'stk_syrup', name: 'น้ำเชื่อม', unit: 'ml', qty: 3000, minQty: 500, costPerUnit: 0.10, categoryId: 'stkcat_beverage', bigUnit: 'ขวด', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_caramel', name: 'น้ำเชื่อมคาราเมล', unit: 'ml', qty: 2000, minQty: 300, costPerUnit: 0.12, categoryId: 'stkcat_beverage', bigUnit: 'ขวด', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_vanilla', name: 'น้ำเชื่อมวนิลา', unit: 'ml', qty: 2000, minQty: 300, costPerUnit: 0.12, categoryId: 'stkcat_beverage', bigUnit: 'ขวด', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_hazelnut', name: 'น้ำเชื่อมเฮเซลนัท', unit: 'ml', qty: 2000, minQty: 300, costPerUnit: 0.12, categoryId: 'stkcat_beverage', bigUnit: 'ขวด', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_sugar', name: 'น้ำตาลทราย', unit: 'g', qty: 5000, minQty: 1000, costPerUnit: 0.03, categoryId: 'stkcat_beverage', bigUnit: 'กิโลกรัม', bigUnitSize: 1000, lastUpdate: todayStr() },
    { id: 'stk_ice', name: 'น้ำแข็ง', unit: 'ถุง', qty: 50, minQty: 10, costPerUnit: 10.00, categoryId: 'stkcat_beverage', bigUnit: 'ถุง', bigUnitSize: 1, lastUpdate: todayStr() },
    { id: 'stk_water', name: 'น้ำกรอง', unit: 'L', qty: 500, minQty: 50, costPerUnit: 0.50, categoryId: 'stkcat_beverage', bigUnit: 'แกลลอน', bigUnitSize: 19, lastUpdate: todayStr() },
    /* บรรจุภัณฑ์ */
    { id: 'stk_cup_hot_8', name: 'แก้วร้อน 8oz', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 2.50, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 50, lastUpdate: todayStr() },
    { id: 'stk_cup_hot_12', name: 'แก้วร้อน 12oz', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 3.00, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 50, lastUpdate: todayStr() },
    { id: 'stk_cup_cold_16', name: 'แก้วเย็น 16oz', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 3.00, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 50, lastUpdate: todayStr() },
    { id: 'stk_cup_cold_22', name: 'แก้วเย็น 22oz', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 3.50, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 50, lastUpdate: todayStr() },
    { id: 'stk_lid_hot', name: 'ฝาปิดแก้วร้อน', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 0.50, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 100, lastUpdate: todayStr() },
    { id: 'stk_lid_cold', name: 'ฝาปิดแก้วเย็น', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 0.50, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 100, lastUpdate: todayStr() },
    { id: 'stk_straw', name: 'หลอด', unit: 'ชิ้น', qty: 1000, minQty: 200, costPerUnit: 0.20, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 100, lastUpdate: todayStr() },
    { id: 'stk_bag', name: 'ถุงพลาสติก', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 0.50, categoryId: 'stkcat_packaging', bigUnit: 'ม้วน', bigUnitSize: 100, lastUpdate: todayStr() },
    { id: 'stk_cake_box', name: 'กล่องใส่เค้ก', unit: 'ชิ้น', qty: 200, minQty: 50, costPerUnit: 5.00, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 50, lastUpdate: todayStr() },
    { id: 'stk_bread_bag', name: 'ถุงขนมปัง', unit: 'ชิ้น', qty: 300, minQty: 50, costPerUnit: 1.00, categoryId: 'stkcat_packaging', bigUnit: 'กล่อง', bigUnitSize: 100, lastUpdate: todayStr() },
    { id: 'stk_sticker', name: 'สติกเกอร์ปิดแก้ว', unit: 'ชิ้น', qty: 500, minQty: 100, costPerUnit: 0.30, categoryId: 'stkcat_packaging', bigUnit: 'ม้วน', bigUnitSize: 500, lastUpdate: todayStr() }
  ];
  
  ST.saveStock(sampleStock);
  
  /* 4. สร้างเมนู */
  var sampleMenu = [
    /* กาแฟ */
    { id: 'm_americano', name: 'อเมริกาโน่', catId: 'cat_coffee', emoji: '☕', prices: { S: 60, M: 70, L: 80 }, cost: 18, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 1, created: todayStr() },
    { id: 'm_latte', name: 'ลาเต้', catId: 'cat_coffee', emoji: '🥛', prices: { S: 70, M: 80, L: 90 }, cost: 22, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 2, created: todayStr() },
    { id: 'm_cappuccino', name: 'คาปูชิโน่', catId: 'cat_coffee', emoji: '☕', prices: { S: 70, M: 80, L: 90 }, cost: 22, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 3, created: todayStr() },
    { id: 'm_mocha', name: 'มอคค่า', catId: 'cat_coffee', emoji: '🍫', prices: { S: 80, M: 90, L: 100 }, cost: 28, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 4, created: todayStr() },
    { id: 'm_caramel_macchiato', name: 'คาราเมล มัคคิอาโต้', catId: 'cat_coffee', emoji: '🍯', prices: { S: 85, M: 95, L: 105 }, cost: 30, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 5, created: todayStr() },
    { id: 'm_white_mocha', name: 'ไวท์ช็อคโกแลต มอคค่า', catId: 'cat_coffee', emoji: '🤍', prices: { S: 90, M: 100, L: 110 }, cost: 32, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 6, created: todayStr() },
    { id: 'm_espresso', name: 'เอสเพรสโซ่', catId: 'cat_coffee', emoji: '☕', prices: { S: 50 }, cost: 12, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot'], allowSweetLevel: false, sort: 7, created: todayStr() },
    { id: 'm_iced_americano', name: 'อเมริกาโน่เย็น', catId: 'cat_coffee', emoji: '🧊', prices: { S: 65, M: 75, L: 85 }, cost: 18, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_iced'], allowSweetLevel: true, sort: 8, created: todayStr() },
    /* ชา */
    { id: 'm_greentea', name: 'ชาเขียว', catId: 'cat_tea', emoji: '🍵', prices: { S: 65, M: 75, L: 85 }, cost: 18, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 9, created: todayStr() },
    { id: 'm_thaitea', name: 'ชาไทย', catId: 'cat_tea', emoji: '🧋', prices: { S: 55, M: 65, L: 75 }, cost: 15, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 10, created: todayStr() },
    { id: 'm_lemontea', name: 'ชามะนาว', catId: 'cat_tea', emoji: '🍋', prices: { S: 50, M: 60, L: 70 }, cost: 12, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_iced'], allowSweetLevel: true, sort: 11, created: todayStr() },
    { id: 'm_blacktea', name: 'ชาดำ', catId: 'cat_tea', emoji: '🫖', prices: { S: 45, M: 55, L: 65 }, cost: 10, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 12, created: todayStr() },
    { id: 'm_milktea', name: 'ชานม', catId: 'cat_tea', emoji: '🥛', prices: { S: 55, M: 65, L: 75 }, cost: 15, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 13, created: todayStr() },
    { id: 'm_matcha_latte', name: 'มัทฉะ ลาเต้', catId: 'cat_tea', emoji: '🍵', prices: { S: 80, M: 90, L: 100 }, cost: 25, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced'], allowSweetLevel: true, sort: 14, created: todayStr() },
    { id: 'm_greentea_latte', name: 'ชาเขียวนม', catId: 'cat_tea', emoji: '🍵🥛', prices: { S: 70, M: 80, L: 90 }, cost: 20, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 15, created: todayStr() },
    /* ปั่น */
    { id: 'm_cocoa', name: 'โกโก้', catId: 'cat_blend', emoji: '🍫', prices: { S: 75, M: 85, L: 95 }, cost: 20, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot', 'dt_iced', 'dt_blend'], allowSweetLevel: true, sort: 16, created: todayStr() },
    { id: 'm_hot_chocolate', name: 'ฮ็อตช็อคโกแลต', catId: 'cat_blend', emoji: '☕', prices: { S: 80, M: 90, L: 100 }, cost: 25, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_hot'], allowSweetLevel: true, sort: 17, created: todayStr() },
    { id: 'm_strawberry_smoothie', name: 'สมูทตี้สตรอเบอร์รี่', catId: 'cat_blend', emoji: '🍓', prices: { S: 85, M: 95, L: 105 }, cost: 25, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_blend'], allowSweetLevel: true, sort: 18, created: todayStr() },
    { id: 'm_blueberry_smoothie', name: 'สมูทตี้บลูเบอร์รี่', catId: 'cat_blend', emoji: '🫐', prices: { S: 85, M: 95, L: 105 }, cost: 25, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_blend'], allowSweetLevel: true, sort: 19, created: todayStr() },
    { id: 'm_mango_smoothie', name: 'สมูทตี้มะม่วง', catId: 'cat_blend', emoji: '🥭', prices: { S: 85, M: 95, L: 105 }, cost: 25, active: true, allowDrinkType: true, availableDrinkTypes: ['dt_blend'], allowSweetLevel: true, sort: 20, created: todayStr() },
    /* เบเกอรี่ */
    { id: 'm_croissant', name: 'ครัวซองค์', catId: 'cat_bakery', emoji: '🥐', prices: { S: 65 }, cost: 25, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 21, created: todayStr() },
    { id: 'm_chocolate_cake', name: 'เค้กช็อกโกแลต', catId: 'cat_bakery', emoji: '🍰', prices: { S: 120 }, cost: 40, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 22, created: todayStr() },
    { id: 'm_cookie', name: 'คุกกี้', catId: 'cat_bakery', emoji: '🍪', prices: { S: 45 }, cost: 15, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 23, created: todayStr() },
    { id: 'm_brownie', name: 'บราวนี่', catId: 'cat_bakery', emoji: '🍫', prices: { S: 55 }, cost: 20, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 24, created: todayStr() },
    { id: 'm_cheesecake', name: 'ชีสเค้ก', catId: 'cat_bakery', emoji: '🧀', prices: { S: 110 }, cost: 35, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 25, created: todayStr() },
    /* อื่นๆ */
    { id: 'm_water', name: 'น้ำเปล่า', catId: 'cat_other', emoji: '💧', prices: { S: 20 }, cost: 5, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 26, created: todayStr() },
    { id: 'm_soda', name: 'น้ำอัดลม', catId: 'cat_other', emoji: '🥤', prices: { S: 35, M: 45 }, cost: 10, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 27, created: todayStr() },
    { id: 'm_juice', name: 'น้ำผลไม้', catId: 'cat_other', emoji: '🧃', prices: { S: 45, M: 55 }, cost: 15, active: true, allowDrinkType: false, allowSweetLevel: false, sort: 28, created: todayStr() }
  ];
  
  ST.saveMenu(sampleMenu);
  
  /* 5. สร้างสูตรวัตถุดิบ (Recipe) สำหรับเมนูที่ต้องการ */
  var sampleRecipes = [
    /* อเมริกาโน่ */
    { id: 'recipe_americano_m', menuId: 'm_americano', size: 'M', ingredients: [{ stockId: 'stk_coffee', stockName: 'เมล็ดกาแฟ', qty: 18, unit: 'g' }, { stockId: 'stk_water', stockName: 'น้ำกรอง', qty: 200, unit: 'ml' }] },
    /* ลาเต้ */
    { id: 'recipe_latte_m', menuId: 'm_latte', size: 'M', ingredients: [{ stockId: 'stk_coffee', stockName: 'เมล็ดกาแฟ', qty: 18, unit: 'g' }, { stockId: 'stk_milk', stockName: 'นมสด', qty: 200, unit: 'ml' }, { stockId: 'stk_water', stockName: 'น้ำกรอง', qty: 50, unit: 'ml' }] },
    /* มอคค่า */
    { id: 'recipe_mocha_m', menuId: 'm_mocha', size: 'M', ingredients: [{ stockId: 'stk_coffee', stockName: 'เมล็ดกาแฟ', qty: 18, unit: 'g' }, { stockId: 'stk_milk', stockName: 'นมสด', qty: 200, unit: 'ml' }, { stockId: 'stk_cocoa', stockName: 'ผงโกโก้', qty: 15, unit: 'g' }, { stockId: 'stk_syrup', stockName: 'น้ำเชื่อม', qty: 15, unit: 'ml' }] },
    /* ชาเขียวนม */
    { id: 'recipe_greentea_latte_m', menuId: 'm_greentea_latte', size: 'M', ingredients: [{ stockId: 'stk_matcha', stockName: 'ผงมัทฉะ', qty: 10, unit: 'g' }, { stockId: 'stk_milk', stockName: 'นมสด', qty: 250, unit: 'ml' }, { stockId: 'stk_syrup', stockName: 'น้ำเชื่อม', qty: 20, unit: 'ml' }] },
    /* คาปูชิโน่ */
    { id: 'recipe_cappuccino_m', menuId: 'm_cappuccino', size: 'M', ingredients: [{ stockId: 'stk_coffee', stockName: 'เมล็ดกาแฟ', qty: 18, unit: 'g' }, { stockId: 'stk_milk', stockName: 'นมสด', qty: 150, unit: 'ml' }, { stockId: 'stk_water', stockName: 'น้ำกรอง', qty: 50, unit: 'ml' }] },
    /* ชาไทย */
    { id: 'recipe_thaitea_m', menuId: 'm_thaitea', size: 'M', ingredients: [{ stockId: 'stk_syrup', stockName: 'น้ำเชื่อม', qty: 20, unit: 'ml' }, { stockId: 'stk_milk', stockName: 'นมสด', qty: 100, unit: 'ml' }] }
  ];
  
  ST.saveRecipes(sampleRecipes);
  
  toast('เพิ่มข้อมูลตัวอย่างแล้ว (เมนู ' + sampleMenu.length + ' รายการ, สต็อก ' + sampleStock.length + ' รายการ, สูตร ' + sampleRecipes.length + ' รายการ)', 'success');
};

/* ============================================
   CLEAR ALL DATA
   ============================================ */
ST.clearAll = function() {
  for (var i = 0; i < ST._keys.length; i++) {
    ST.remove(ST._keys[i]);
  }
  toast('ล้างข้อมูลทั้งหมดแล้ว', 'warning');
};

/* ============================================
   EXPORT / IMPORT (Full backup)
   ============================================ */
ST.exportAll = function() {
  var data = {};
  for (var i = 0; i < ST._keys.length; i++) {
    data[ST._keys[i]] = ST.getObj(ST._keys[i], null);
  }
  data._exportDate = todayStr();
  data._exportTime = nowTimeStr();
  data._version = 'v1_coffee';
  return data;
};

ST.importAll = function(data) {
  if (!data || typeof data !== 'object') {
    toast('ข้อมูลไม่ถูกต้อง', 'error');
    return false;
  }
  var count = 0;
  for (var i = 0; i < ST._keys.length; i++) {
    var key = ST._keys[i];
    if (data[key] !== undefined && data[key] !== null) {
      ST.setObj(key, data[key]);
      count++;
    }
  }
  toast('นำเข้า ' + count + ' รายการสำเร็จ', 'success');
  return true;
};

/* ============================================
   STORAGE INFO
   ============================================ */
ST.getStorageInfo = function() {
  var total = 0;
  var details = {};
  for (var i = 0; i < ST._keys.length; i++) {
    var raw = ST.get(ST._keys[i]) || '';
    var size = raw.length * 2; /* UTF-16 estimate */
    details[ST._keys[i]] = size;
    total += size;
  }
  return {
    total: total,
    totalFormatted: formatSize(total),
    details: details
  };
};

/* ============================================
   SWEET LEVELS
   ============================================ */
ST.getSweetLevels = function() {
  var levels = ST.getObj('sweetLevels', null);
  if (!levels || levels.length === 0) {
    levels = ST._defaultSweetLevels();
    ST.setObj('sweetLevels', levels);
  }
  return levels;
};

ST.saveSweetLevels = function(levels) {
  ST.setObj('sweetLevels', levels);
};

ST._defaultSweetLevels = function() {
  return [
    { id: 'sw_none', name: 'ไม่หวาน', nameEn: 'No Sugar', emoji: '⬜', addPrice: 0, sort: 1, active: true },
    { id: 'sw_less', name: 'หวานน้อย', nameEn: 'Less Sweet', emoji: '🟨', addPrice: 0, sort: 2, active: true },
    { id: 'sw_normal', name: 'หวานปกติ', nameEn: 'Normal', emoji: '🟧', addPrice: 0, sort: 3, active: true },
    { id: 'sw_more', name: 'หวานมาก', nameEn: 'Extra Sweet', emoji: '🟥', addPrice: 0, sort: 4, active: true }
  ];
};

ST.addSweetLevel = function(item) {
  var levels = ST.getSweetLevels();
  item.id = item.id || genId('sw');
  item.sort = item.sort || levels.length + 1;
  item.active = item.active !== undefined ? item.active : true;
  levels.push(item);
  ST.saveSweetLevels(levels);
  return item;
};

ST.updateSweetLevel = function(id, data) {
  var levels = ST.getSweetLevels();
  var idx = findIndexById(levels, id);
  if (idx === -1) return null;
  for (var k in data) levels[idx][k] = data[k];
  ST.saveSweetLevels(levels);
  return levels[idx];
};

ST.deleteSweetLevel = function(id) {
  var levels = ST.getSweetLevels();
  removeById(levels, id);
  ST.saveSweetLevels(levels);
};

/* ============================================
   DRINK TYPES (ร้อน / เย็น / ปั่น)
   ============================================ */
ST.getDrinkTypes = function() {
  var types = ST.getObj('drinkTypes', null);
  if (!types || types.length === 0) {
    types = ST._defaultDrinkTypes();
    ST.setObj('drinkTypes', types);
  }
  return types;
};

ST.saveDrinkTypes = function(types) {
  ST.setObj('drinkTypes', types);
};

ST._defaultDrinkTypes = function() {
  return [
    { id: 'dt_hot', name: 'ร้อน', nameEn: 'Hot', emoji: '🔥', addPrice: 0, sort: 1, active: true },
    { id: 'dt_iced', name: 'เย็น', nameEn: 'Iced', emoji: '🧊', addPrice: 0, sort: 2, active: true },
    { id: 'dt_blend', name: 'ปั่น', nameEn: 'Blended', emoji: '🌀', addPrice: 10, sort: 3, active: true }
  ];
};

ST.addDrinkType = function(item) {
  var types = ST.getDrinkTypes();
  item.id = item.id || genId('dt');
  item.sort = item.sort || types.length + 1;
  item.active = item.active !== undefined ? item.active : true;
  types.push(item);
  ST.saveDrinkTypes(types);
  return item;
};

ST.updateDrinkType = function(id, data) {
  var types = ST.getDrinkTypes();
  var idx = findIndexById(types, id);
  if (idx === -1) return null;
  for (var k in data) types[idx][k] = data[k];
  ST.saveDrinkTypes(types);
  return types[idx];
};

ST.deleteDrinkType = function(id) {
  var types = ST.getDrinkTypes();
  removeById(types, id);
  ST.saveDrinkTypes(types);
};

/* ============================================
   [Standard Version] FAVORITES
   ============================================ */
ST.getFavorites = function() {
  return ST.getObj('favorites', []);
};

ST.saveFavorites = function(favs) {
  ST.setObj('favorites', favs);
};

ST.toggleFavorite = function(menuId) {
  var favs = ST.getFavorites();
  var idx = favs.indexOf(menuId);
  if (idx === -1) {
    favs.push(menuId);
  } else {
    favs.splice(idx, 1);
  }
  ST.saveFavorites(favs);
  return idx === -1;
};

ST.isFavorite = function(menuId) {
  return ST.getFavorites().indexOf(menuId) !== -1;
};

/* ============================================
   [Standard Version] SALES CHANNELS
   ============================================ */
ST.getChannels = function() {
  var channels = ST.getObj('channels', null);
  if (!channels || channels.length === 0) {
    channels = ST._defaultChannels();
    ST.setObj('channels', channels);
  }
  return channels;
};

ST.saveChannels = function(channels) {
  ST.setObj('channels', channels);
};

ST.addChannel = function(ch) {
  var channels = ST.getChannels();
  ch.id = ch.id || genId('ch');
  ch.active = ch.active !== undefined ? ch.active : true;
  channels.push(ch);
  ST.saveChannels(channels);
  return ch;
};

ST.updateChannel = function(id, data) {
  var channels = ST.getChannels();
  var idx = findIndexById(channels, id);
  if (idx === -1) return null;
  for (var k in data) channels[idx][k] = data[k];
  ST.saveChannels(channels);
  return channels[idx];
};

ST.deleteChannel = function(id) {
  var channels = ST.getChannels();
  removeById(channels, id);
  ST.saveChannels(channels);
};

ST._defaultChannels = function() {
  return [
    { id: 'ch_walkin', name: 'Walk-in', emoji: '🚶', active: true },
    { id: 'ch_grab', name: 'Grab', emoji: '🟢', active: true },
    { id: 'ch_lineman', name: 'LINE MAN', emoji: '🟡', active: true },
    { id: 'ch_robin', name: 'Robinhood', emoji: '🔴', active: false },
    { id: 'ch_online', name: 'Online', emoji: '📱', active: false },
    { id: 'ch_phone', name: 'โทรสั่ง', emoji: '📞', active: false }
  ];
};

ST.getActiveChannels = function() {
  var channels = ST.getChannels();
  var result = [];
  for (var i = 0; i < channels.length; i++) {
    if (channels[i].active !== false) result.push(channels[i]);
  }
  return result;
};

/* ============================================
   [Pro] PROMPTPAY MULTIPLE ACCOUNTS
   ============================================ */
ST.getPromptPayAccounts = function() {
  return ST.getObj('promptpayAccounts', []);
};

ST.savePromptPayAccounts = function(list) {
  ST.setObj('promptpayAccounts', list);
};

ST.addPromptPayAccount = function(acc) {
  var list = ST.getPromptPayAccounts();
  acc.id = acc.id || genId('pp');
  acc.isDefault = list.length === 0 ? true : !!acc.isDefault;
  list.push(acc);
  ST.savePromptPayAccounts(list);
  return acc;
};

ST.updatePromptPayAccount = function(id, data) {
  var list = ST.getPromptPayAccounts();
  var idx = findIndexById(list, id);
  if (idx === -1) return null;
  for (var k in data) list[idx][k] = data[k];
  ST.savePromptPayAccounts(list);
  return list[idx];
};

ST.deletePromptPayAccount = function(id) {
  var list = ST.getPromptPayAccounts();
  removeById(list, id);
  /* If deleted was default, set first as default */
  if (list.length > 0) {
    var hasDefault = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].isDefault) { hasDefault = true; break; }
    }
    if (!hasDefault) list[0].isDefault = true;
  }
  ST.savePromptPayAccounts(list);
};

ST.setDefaultPromptPay = function(id) {
  var list = ST.getPromptPayAccounts();
  for (var i = 0; i < list.length; i++) {
    list[i].isDefault = list[i].id === id;
  }
  ST.savePromptPayAccounts(list);
};

ST.getDefaultPromptPay = function() {
  var list = ST.getPromptPayAccounts();
  for (var i = 0; i < list.length; i++) {
    if (list[i].isDefault) return list[i];
  }
  return list.length > 0 ? list[0] : null;
};

/* Migrate old single config to multi */
ST.migratePromptPay = function() {
  var cfg = ST.getConfig();
  var list = ST.getPromptPayAccounts();
  if (list.length === 0 && cfg.promptPayId) {
    ST.addPromptPayAccount({
      name: cfg.promptPayName || 'บัญชีหลัก',
      ppId: cfg.promptPayId,
      isDefault: true
    });
  }
};

/* ============================================
   [Pro] RECIPE MANAGEMENT
   ============================================ */

/* Get all recipes */
ST.getRecipes = function() {
  return ST.getObj('recipes', []);
};

/* Save all recipes */
ST.saveRecipes = function(recipes) {
  ST.setObj('recipes', recipes);
};

/* Get recipe by menuId and size */
ST.getRecipe = function(menuId, size) {
  var recipes = ST.getRecipes();
  for (var i = 0; i < recipes.length; i++) {
    if (recipes[i].menuId === menuId && recipes[i].size === size) {
      return recipes[i];
    }
  }
  return null;
};

/* Add or update recipe */
ST.setRecipe = function(recipe) {
  var recipes = ST.getRecipes();
  var existingIdx = -1;
  for (var i = 0; i < recipes.length; i++) {
    if (recipes[i].menuId === recipe.menuId && recipes[i].size === recipe.size) {
      existingIdx = i;
      break;
    }
  }
  
  recipe.id = recipe.id || genId('recipe');
  recipe.updatedAt = Date.now();
  
  if (existingIdx !== -1) {
    recipes[existingIdx] = recipe;
  } else {
    recipes.push(recipe);
  }
  
  ST.saveRecipes(recipes);
  return recipe;
};

/* Delete recipe */
ST.deleteRecipe = function(menuId, size) {
  var recipes = ST.getRecipes();
  var newRecipes = [];
  for (var i = 0; i < recipes.length; i++) {
    if (!(recipes[i].menuId === menuId && recipes[i].size === size)) {
      newRecipes.push(recipes[i]);
    }
  }
  ST.saveRecipes(newRecipes);
};

/* แก้ไขฟังก์ชัน calculateRecipeCost ใน storage.js */
ST.calculateRecipeCost = function(recipe) {
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return 0;
  
  var stockItems = ST.getStock();
  var totalCost = 0;
  
  for (var i = 0; i < recipe.ingredients.length; i++) {
    var ing = recipe.ingredients[i];
    var stockItem = findById(stockItems, ing.stockId);
    if (stockItem && stockItem.costPerUnit) {
      totalCost += (ing.qty * stockItem.costPerUnit);
    } else if (ing.unitCost) {
      totalCost += (ing.qty * ing.unitCost);
    }
  }
  
  return Math.round(totalCost * 100) / 100;
};

/* Auto deduct stock when order is placed */
ST.autoDeductStock = function(orderItems) {
  if (!FeatureManager.isEnabled('pro_autostock')) {
    console.log('[AutoStock] Feature disabled');
    return false;
  }
  
  var deducted = [];
  var errors = [];
  
  for (var i = 0; i < orderItems.length; i++) {
    var item = orderItems[i];
    var recipe = ST.getRecipe(item.menuId, item.size);
    
    if (!recipe || !recipe.ingredients) {
      console.log('[AutoStock] No recipe for:', item.name, item.size);
      continue;
    }
    
    for (var j = 0; j < recipe.ingredients.length; j++) {
      var ing = recipe.ingredients[j];
      var requiredQty = ing.qty * (item.qty || 1);
      
      try {
        ST.adjustStock(ing.stockId, -requiredQty, 'ขาย: ' + item.name + ' x' + item.qty);
        deducted.push({
          stockId: ing.stockId,
          stockName: ing.stockName || ing.stockId,
          qty: requiredQty,
          menuItem: item.name
        });
      } catch(e) {
        errors.push({
          stockName: ing.stockName || ing.stockId,
          required: requiredQty,
          error: e.message
        });
      }
    }
  }
  
  if (errors.length > 0) {
    console.warn('[AutoStock] Some deductions failed:', errors);
    toast('⚠️ ตัดสต็อกบางรายการไม่สำเร็จ', 'warning');
  }
  
  return deducted;
};

/* ============================================
   [Pro] MEMBER MANAGEMENT
   ============================================ */

/* Get all members */
ST.getMembers = function() {
  return ST.getObj('members', []);
};

/* Save all members */
ST.saveMembers = function(members) {
  ST.setObj('members', members);
};

/* Get member by ID */
ST.getMemberById = function(id) {
  var members = ST.getMembers();
  return findById(members, id);
};

/* Get member by phone */
ST.getMemberByPhone = function(phone) {
  var members = ST.getMembers();
  var cleanPhone = phone.replace(/[^0-9]/g, '');
  for (var i = 0; i < members.length; i++) {
    var memberPhone = (members[i].phone || '').replace(/[^0-9]/g, '');
    if (memberPhone === cleanPhone) return members[i];
  }
  return null;
};

/* Add new member */
ST.addMember = function(member) {
  var members = ST.getMembers();
  member.id = member.id || genId('mem');
  member.points = member.points || 0;
  member.totalSpent = member.totalSpent || 0;
  member.createdAt = member.createdAt || todayStr();
  member.lastVisit = member.lastVisit || todayStr();
  members.push(member);
  ST.saveMembers(members);
  return member;
};

/* Update member */
ST.updateMember = function(id, data) {
  var members = ST.getMembers();
  var idx = findIndexById(members, id);
  if (idx === -1) return null;
  for (var k in data) {
    members[idx][k] = data[k];
  }
  ST.saveMembers(members);
  return members[idx];
};

/* Delete member */
ST.deleteMember = function(id) {
  var members = ST.getMembers();
  removeById(members, id);
  ST.saveMembers(members);
};

/* Add points to member */
ST.addMemberPoints = function(memberId, points, reason, orderId) {
  var member = ST.getMemberById(memberId);
  if (!member) return false;
  
  member.points = (member.points || 0) + points;
  member.totalSpent = (member.totalSpent || 0) + (reason === 'ซื้อสินค้า' ? (points * (ST.getConfig().pointRate || 100)) : 0);
  member.lastVisit = todayStr();
  ST.updateMember(memberId, member);
  
  /* Log transaction */
  ST.addMemberTransaction({
    memberId: memberId,
    points: points,
    type: points > 0 ? 'earn' : 'use',
    reason: reason || (points > 0 ? 'รับแต้ม' : 'ใช้แต้ม'),
    orderId: orderId,
    date: todayStr(),
    time: nowTimeStr(),
    timestamp: nowTimestamp()
  });
  
  return true;
};

/* Use member points for discount */
ST.useMemberPoints = function(memberId, points, reason, discountAmount) {
  var member = ST.getMemberById(memberId);
  if (!member || (member.points || 0) < points) return false;
  
  member.points = (member.points || 0) - points;
  ST.updateMember(memberId, member);
  
  ST.addMemberTransaction({
    memberId: memberId,
    points: -points,
    type: 'use',
    reason: reason || 'ใช้แต้มลดราคา',
    discountAmount: discountAmount,
    date: todayStr(),
    time: nowTimeStr(),
    timestamp: nowTimestamp()
  });
  
  return true;
};

/* Calculate points from purchase amount */
ST.calculatePoints = function(amount) {
  var cfg = ST.getConfig();
  var pointRate = cfg.pointRate || 100;
  return Math.floor(amount / pointRate);
};

/* Member Transactions */
ST.getMemberTransactions = function() {
  return ST.getObj('memberTransactions', []);
};

ST.saveMemberTransactions = function(transactions) {
  ST.setObj('memberTransactions', transactions);
};

ST.addMemberTransaction = function(transaction) {
  var transactions = ST.getMemberTransactions();
  transaction.id = transaction.id || genId('mt');
  transactions.push(transaction);
  
  /* Keep last 5000 */
  if (transactions.length > 5000) {
    transactions = transactions.slice(-5000);
  }
  ST.saveMemberTransactions(transactions);
  return transaction;
};

/* ============================================
   [Pro] HOLD ORDER FUNCTIONS
   ============================================ */

/* Get hold orders (ยังไม่จ่าย) */
ST.getHoldOrders = function() {
  return ST.getObj('hold_orders', []);
};

/* Save hold orders */
ST.saveHoldOrders = function(orders) {
  ST.setObj('hold_orders', orders);
};

/* Add hold order */
ST.addHoldOrder = function(order) {
  var holdOrders = ST.getHoldOrders();
  order.id = order.id || genId('hold');
  order.status = 'hold';
  order.createdAt = Date.now();
  holdOrders.unshift(order); // ใหม่สุดอยู่ข้างบน
  ST.saveHoldOrders(holdOrders);
  return order;
};

/* Remove hold order (เมื่อชำระเงินแล้ว) */
ST.removeHoldOrder = function(orderId) {
  var holdOrders = ST.getHoldOrders();
  var newHoldOrders = [];
  for (var i = 0; i < holdOrders.length; i++) {
    if (holdOrders[i].id !== orderId) {
      newHoldOrders.push(holdOrders[i]);
    }
  }
  ST.saveHoldOrders(newHoldOrders);
};

/* Get hold order by id */
ST.getHoldOrderById = function(orderId) {
  var holdOrders = ST.getHoldOrders();
  for (var i = 0; i < holdOrders.length; i++) {
    if (holdOrders[i].id === orderId) return holdOrders[i];
  }
  return null;
};

/* ============================================
   [Pro] STOCK WITH BIG UNIT
   ============================================ */

/* Update stock item with big unit support */
ST.updateStockItemWithBigUnit = function(id, data) {
  var items = ST.getStock();
  var idx = findIndexById(items, id);
  if (idx === -1) return null;
  
  for (var k in data) {
    items[idx][k] = data[k];
  }
  
  /* ถ้ามี bigUnit และ bigUnitSize ให้แปลง qty เป็นหน่วยย่อยอัตโนมัติ */
  if (data.bigUnitQty !== undefined && data.bigUnitSize) {
    items[idx].qty = data.bigUnitQty * data.bigUnitSize;
  }
  
  items[idx].lastUpdate = todayStr();
  ST.saveStock(items);
  return items[idx];
};

/* Add stock item with big unit */
ST.addStockItemWithBigUnit = function(item) {
  var items = ST.getStock();
  item.id = item.id || genId('stk');
  
  /* ถ้ามี bigUnit และ bigUnitSize ให้แปลง qty เป็นหน่วยย่อย */
  if (item.bigUnitQty && item.bigUnitSize) {
    item.qty = item.bigUnitQty * item.bigUnitSize;
  } else {
    item.qty = item.qty || 0;
  }
  
  item.minQty = item.minQty || 0;
  item.costPerUnit = item.costPerUnit || 0;
  item.lastUpdate = todayStr();
  items.push(item);
  ST.saveStock(items);
  return item;
};

/* Get stock usage summary */
ST.getStockUsageSummary = function(days) {
  var logs = ST.getStockLogs();
  var usage = {};
  var now = Date.now();
  var dayInMs = 86400000;
  
  for (var i = 0; i < logs.length; i++) {
    var log = logs[i];
    var logTime = parseDateTime(log.date, log.time);
    if (!logTime) continue;
    
    var diffDays = Math.floor((now - logTime.getTime()) / dayInMs);
    if (diffDays > days) continue;
    
    var dateKey = log.date;
    if (!usage[dateKey]) {
      usage[dateKey] = { usage: 0, receive: 0, date: log.date };
    }
    
    if (log.qty > 0) usage[dateKey].receive += log.qty;
    else usage[dateKey].usage += Math.abs(log.qty);
  }
  
  return usage;
};

/* ============================================
   STOCK CATEGORIES
   ============================================ */

/* Get all stock categories */
ST.getStockCategories = function() {
  return ST.getObj('stockCategories', []);
};

/* Save stock categories */
ST.saveStockCategories = function(cats) {
  ST.setObj('stockCategories', cats);
};

/* Add stock category */
ST.addStockCategory = function(cat) {
  var cats = ST.getStockCategories();
  cat.id = cat.id || genId('stkcat');
  cat.sort = cat.sort || cats.length + 1;
  cats.push(cat);
  ST.saveStockCategories(cats);
  return cat;
};

/* Update stock category */
ST.updateStockCategory = function(id, data) {
  var cats = ST.getStockCategories();
  var idx = findIndexById(cats, id);
  if (idx === -1) return null;
  for (var k in data) {
    cats[idx][k] = data[k];
  }
  ST.saveStockCategories(cats);
  return cats[idx];
};

/* Delete stock category */
ST.deleteStockCategory = function(id) {
  var cats = ST.getStockCategories();
  removeById(cats, id);
  ST.saveStockCategories(cats);
};

/* Get default stock categories */
ST._defaultStockCategories = function() {
  return [
    { id: 'stkcat_beverage', name: 'เครื่องดื่ม', icon: '🥤', sort: 1 },
    { id: 'stkcat_food', name: 'อาหาร', icon: '🍔', sort: 2 },
    { id: 'stkcat_packaging', name: 'บรรจุภัณฑ์', icon: '📦', sort: 3 },
    { id: 'stkcat_other', name: 'อื่นๆ', icon: '📎', sort: 4 }
  ];
};

/* Initialize stock categories if empty */
ST.initStockCategories = function() {
  var cats = ST.getStockCategories();
  if (cats.length === 0) {
    ST.saveStockCategories(ST._defaultStockCategories());
  }
};

/* ============================================
   STAFF SALES SUMMARY
   ============================================ */
ST.getStaffSalesSummary = function(dateFrom, dateTo) {
  var orders = ST.getOrdersByRange(dateFrom, dateTo);
  var staffMap = {};
  
  for (var i = 0; i < orders.length; i++) {
    var order = orders[i];
    if (order.status === 'cancelled') continue;
    
    var staffId = order.staffId || '';
    var staffName = order.staffName || 'ไม่ระบุ';
    var key = staffId || staffName;
    
    if (!staffMap[key]) {
      staffMap[key] = {
        staffId: staffId,
        staffName: staffName,
        orderCount: 0,
        totalSales: 0,
        itemCount: 0
      };
    }
    
    staffMap[key].orderCount++;
    staffMap[key].totalSales += order.total || 0;
    
    var items = order.items || [];
    for (var j = 0; j < items.length; j++) {
      staffMap[key].itemCount += items[j].qty || 0;
    }
  }
  
  var result = [];
  for (var k in staffMap) {
    result.push(staffMap[k]);
  }
  
  return sortBy(result, 'totalSales', true);
};

/* ============================================
   STAFF PERMISSIONS (Role-Based)
   ============================================ */

/* กำหนดสิทธิ์ตามบทบาท */
ST.getRolePermissions = function(role) {
  var permissions = {
    cashier: {
      canAccess: ['pos', 'orders'],
      canEdit: false,
      canDelete: false,
      maxDiscount: 10
    },
    barista: {
      canAccess: ['pos', 'orders'],
      canEdit: false,
      canDelete: false,
      maxDiscount: 10
    },
    manager: {
      canAccess: ['pos', 'menu', 'orders', 'report', 'stock', 'staff', 'members', 'recipe', 'admin'],
      canEdit: true,
      canDelete: true,
      maxDiscount: 30
    }
  };
  
  return permissions[role] || permissions.cashier;
};

ST.canAccessView = function(staff, view) {
  if (!staff) return false;
  
  /* Manager เข้าถึงทุกอย่าง */
  if (staff.role === 'manager') return true;
  
  /* cashier / barista */
  var allowedViews = {
    cashier: ['pos', 'orders'],
    barista: ['pos', 'orders']
  };
  
  var allowed = allowedViews[staff.role] || ['pos'];
  return allowed.indexOf(view) !== -1;
};

/* เช็คว่าพนักงานสามารถแก้ไขข้อมูลได้หรือไม่ */
ST.canEdit = function(staff) {
  if (!staff) return false;
  var perms = ST.getRolePermissions(staff.role);
  return perms.canEdit;
};

/* เช็คว่าพนักงานสามารถให้ส่วนลดได้สูงสุดกี่ % */
ST.getMaxDiscountPercent = function(staff) {
  if (!staff) return 0;
  var perms = ST.getRolePermissions(staff.role);
  return perms.maxDiscount || 0;
};

/* ============================================
   CUSTOM PERMISSIONS PER STAFF
   ============================================ */

/* เช็คสิทธิ์แบบรายบุคคล (ถ้ามีการตั้งค่า) */
ST.canAccessViewCustom = function(staff, view) {
  if (!staff) return false;
  
  /* Manager เข้าถึงทุกอย่าง */
  if (staff.role === 'manager') return true;
  
  /* ถ้ามี custom permissions ให้ใช้ */
  if (staff.customPermissions && staff.customPermissions[view] !== undefined) {
    return staff.customPermissions[view];
  }
  
  /* ใช้ค่าตาม role */
  var perms = ST.getRolePermissions(staff.role);
  return perms.canAccess.indexOf(view) !== -1;
};

/* ============================================
   STAFF WORK LOG (SHIFTS)
   ============================================ */

/* Get shifts by staff and month */
ST.getShiftsByStaffAndMonth = function(staffId, month, year) {
  var allShifts = ST.getShifts();
  var result = [];
  for (var i = 0; i < allShifts.length; i++) {
    var shift = allShifts[i];
    if (shift.staffId !== staffId) continue;
    
    var shiftDate = parseDate(shift.date);
    if (!shiftDate) continue;
    
    if (shiftDate.getMonth() === month && shiftDate.getFullYear() === year) {
      result.push(shift);
    }
  }
  return sortBy(result, 'timestamp', true);
};

/* Calculate total hours worked in a month */
ST.getStaffWorkHours = function(staffId, month, year) {
  var shifts = ST.getShiftsByStaffAndMonth(staffId, month, year);
  var totalHours = 0;
  for (var i = 0; i < shifts.length; i++) {
    var shift = shifts[i];
    if (shift.clockIn && shift.clockOut) {
      var hours = calcShiftHours(shift);
      totalHours += parseFloat(hours) || 0;
    }
  }
  return roundTo(totalHours, 1);
};

/* Get staff work summary for display */
ST.getStaffWorkSummary = function(staffId) {
  var allShifts = ST.getShifts();
  var summary = {
    totalDays: 0,
    totalHours: 0,
    avgHoursPerDay: 0,
    lastWorkDate: null,
    shifts: []
  };
  
  var shiftMap = {};
  for (var i = 0; i < allShifts.length; i++) {
    var shift = allShifts[i];
    if (shift.staffId !== staffId) continue;
    
    var date = shift.date;
    if (!shiftMap[date]) {
      shiftMap[date] = [];
    }
    shiftMap[date].push(shift);
    summary.shifts.push(shift);
  }
  
  summary.totalDays = Object.keys(shiftMap).length;
  
  for (var dateKey in shiftMap) {
    var dayShifts = shiftMap[dateKey];
    for (var j = 0; j < dayShifts.length; j++) {
      var s = dayShifts[j];
      if (s.clockIn && s.clockOut) {
        var hours = calcShiftHours(s);
        summary.totalHours += parseFloat(hours) || 0;
      }
    }
  }
  
  if (summary.totalDays > 0) {
    summary.avgHoursPerDay = roundTo(summary.totalHours / summary.totalDays, 1);
  }
  
  if (summary.shifts.length > 0) {
    var latest = sortBy(summary.shifts, 'timestamp', true)[0];
    summary.lastWorkDate = latest.date;
  }
  
  return summary;
};

/* ============================================
   STAFF WORK DETAILS WITH SALES
   ============================================ */

/* Get shifts with sales by date range */
ST.getStaffWorkDetails = function(staffId, month, year) {
  var shifts = ST.getShiftsByStaffAndMonth(staffId, month, year);
  var orders = ST.getOrders();
  
  var details = [];
  for (var i = 0; i < shifts.length; i++) {
    var shift = shifts[i];
    var shiftDate = shift.date;
    
    /* คำนวณยอดขายของวันนั้น */
    var dailySales = 0;
    var orderCount = 0;
    for (var j = 0; j < orders.length; j++) {
      var order = orders[j];
      if (order.staffId === staffId && order.date === shiftDate && order.status !== 'cancelled') {
        dailySales += order.total || 0;
        orderCount++;
      }
    }
    
    var hours = shift.clockOut ? calcShiftHours(shift) : 0;
    var salesPerHour = hours > 0 ? roundTo(dailySales / hours, 0) : 0;
    
    details.push({
      date: shift.date,
      clockIn: shift.clockIn,
      clockOut: shift.clockOut || '-',
      hours: hours,
      dailySales: dailySales,
      orderCount: orderCount,
      salesPerHour: salesPerHour,
      isActive: !shift.clockOut
    });
  }
  
  return sortBy(details, 'date', false);
};

/* Get staff performance summary */
ST.getStaffPerformance = function(staffId, month, year) {
  var details = ST.getStaffWorkDetails(staffId, month, year);
  var totalHours = 0;
  var totalSales = 0;
  var totalOrders = 0;
  var totalDays = 0;
  
  for (var i = 0; i < details.length; i++) {
    var d = details[i];
    if (!d.isActive) {
      totalHours += d.hours;
      totalSales += d.dailySales;
      totalOrders += d.orderCount;
      totalDays++;
    }
  }
  
  var avgSalesPerDay = totalDays > 0 ? roundTo(totalSales / totalDays, 0) : 0;
  var avgSalesPerHour = totalHours > 0 ? roundTo(totalSales / totalHours, 0) : 0;
  var avgOrdersPerDay = totalDays > 0 ? roundTo(totalOrders / totalDays, 1) : 0;
  
  var rating = '🟢 ดีมาก';
  if (avgSalesPerHour < 300) rating = '🟡 พอใช้';
  if (avgSalesPerHour < 150) rating = '🔴 ควรปรับปรุง';
  
  return {
    totalDays: totalDays,
    totalHours: totalHours,
    totalSales: totalSales,
    totalOrders: totalOrders,
    avgSalesPerDay: avgSalesPerDay,
    avgSalesPerHour: avgSalesPerHour,
    avgOrdersPerDay: avgOrdersPerDay,
    rating: rating
  };
};
/* ============================================
   DEFAULT ADMIN SETUP
   ============================================ */
ST.ensureDefaultAdmin = function() {
  var staff = ST.getStaff();
  console.log('[ensureDefaultAdmin] Current staff count:', staff.length);
  
  if (staff.length === 0) {
    var defaultStaff = {
      id: genId('staff'),
      name: 'ผู้ดูแลระบบ',
      pin: '0000',
      role: 'manager',
      active: true,
      isDefault: true
    };
    ST.addStaff(defaultStaff);
    console.log('[ensureDefaultAdmin] Created default admin account (PIN: 0000)');
    return true;
  }
  return false;
};

/* ตรวจสอบสต็อกและส่ง LINE แจ้งเตือน */
ST.checkAndNotifyLowStock = function() {
  var lowStock = ST.getLowStock();
  if (lowStock.length === 0) return false;
  
  var cfg = ST.getConfig();
  var token = cfg.lineNotifyToken;
  if (!token) return false;
  
  var msg = '⚠️ แจ้งเตือนสต็อกใกล้หมด\n';
  msg += '📅 ' + todayStr() + ' ' + nowTimeStr() + '\n';
  msg += '━━━━━━━━━━━━\n';
  
  for (var i = 0; i < lowStock.length && i < 10; i++) {
    var s = lowStock[i];
    var displayQty = formatStockQty(s.qty, s.unit, s.bigUnit, s.bigUnitSize);
    var minDisplay = formatStockQty(s.minQty, s.unit, s.bigUnit, s.bigUnitSize);
    msg += '📦 ' + s.name + '\n';
    msg += '   เหลือ: ' + displayQty + ' (ขั้นต่ำ ' + minDisplay + ')\n';
  }
  
  if (lowStock.length > 10) {
    msg += '\n... และอีก ' + (lowStock.length - 10) + ' รายการ';
  }
  
  sendLineNotify(token, msg, function(ok) {
    if (ok) console.log('[Notify] Sent low stock alert');
  });
  
  return true;
};

/* ตั้งเวลาเช็คสต็อกทุกวัน (ตอน 08:00) */
ST.startStockMonitor = function() {
  /* เช็คตอนเปิดหน้าเว็บ */
  setTimeout(function() {
    ST.checkAndNotifyLowStock();
  }, 5000);
  
  /* ตั้งเวลาเช็คทุก 24 ชั่วโมง */
  setInterval(function() {
    ST.checkAndNotifyLowStock();
  }, 24 * 60 * 60 * 1000);
};

/* Auto Backup อัตโนมัติ */
ST.autoBackup = function() {
  var lastBackup = localStorage.getItem('v1_coffee_last_backup');
  var today = todayStr();
  
  /* ถ้ายังไม่มี backup วันนี้ */
  if (lastBackup !== today) {
    var data = ST.exportAll();
    var json = JSON.stringify(data, null, 2);
    
    /* บันทึก backup ลง localStorage */
    localStorage.setItem('v1_coffee_backup_' + today, json);
    localStorage.setItem('v1_coffee_last_backup', today);
    
    /* เก็บแค่ 7 วันล่าสุด */
    ST.cleanOldBackups();
    
    console.log('[AutoBackup] Backup created for', today);
    return true;
  }
  return false;
};

/* ล้าง backup เก่า (เก็บแค่ 7 วัน) */
ST.cleanOldBackups = function() {
  var sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('v1_coffee_backup_') === 0) {
      var dateStr = key.replace('v1_coffee_backup_', '');
      var backupDate = parseDate(dateStr);
      if (backupDate && backupDate < sevenDaysAgo) {
        localStorage.removeItem(key);
        console.log('[AutoBackup] Removed old backup:', key);
      }
    }
  }
};

/* เรียก autoBackup ทุกวัน */
ST.startAutoBackup = function() {
  /* เช็คตอนเปิดหน้า */
  ST.autoBackup();
  
  /* ตั้งเวลาเช็คทุก 1 ชั่วโมง */
  setInterval(function() {
    ST.autoBackup();
  }, 60 * 60 * 1000);
};

console.log('[storage.js] loaded');
