/* ============================================
   COFFEE POS — VIEWS-MENU.JS
   จัดการเมนู / หมวดหมู่ / Topping / Size
   ============================================ */

/* === MENU VIEW STATE === */
var MENUVIEW = {
  tab: 'menu',          /* 'menu' | 'category' | 'topping' | 'size' */
  selectedCat: 'all',
  searchQuery: '',
  sortKey: 'sort',
  sortDesc: false
};

/* ============================================
   RENDER MENU VIEW
   ============================================ */
function renderMenuView() {
  var main = $('mainContent');
  if (!main) return;

  var html = '';
  html += '<div class="page-pad anim-fadeUp">';

  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">📋 จัดการเมนู</div>';
  html += '</div>';

  /* Sub-tabs */
  html += '<div class="cat-tabs mb-16" id="menuSubTabs">';
  html += menuSubTab('menu', '🍽️ เมนู');
  html += menuSubTab('category', '📁 หมวดหมู่');
  html += menuSubTab('options', '🍯 ตัวเลือก');
  html += menuSubTab('topping', '🧁 Topping');
  html += menuSubTab('size', '📏 Size');
  html += '</div>';

  /* Content area */
  html += '<div id="menuTabContent">';
  html += renderMenuTabContent();
  html += '</div>';

  html += '</div>';
  main.innerHTML = html;
}

function menuSubTab(key, label) {
  var active = MENUVIEW.tab === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="switchMenuTab(\'' + key + '\')">' + label + '</button>';
}

function switchMenuTab(tab) {
  MENUVIEW.tab = tab;
  vibrate(20);

  /* Update tabs */
  var tabs = qsa('#menuSubTabs .cat-tab');
  for (var i = 0; i < tabs.length; i++) {
    var onclick = tabs[i].getAttribute('onclick') || '';
    if (onclick.indexOf("'" + tab + "'") !== -1) {
      addClass(tabs[i], 'active');
    } else {
      removeClass(tabs[i], 'active');
    }
  }

  setHTML('menuTabContent', renderMenuTabContent());
}

function renderMenuTabContent() {
  switch (MENUVIEW.tab) {
    case 'menu': return renderMenuList();
    case 'category': return renderCategoryList();
        case 'options': return renderOptionsTab();
    case 'topping': return renderToppingList();
    case 'size': return renderSizeList();
    default: return '';
  }
}

/* ============================================
   TAB: MENU LIST
   ============================================ */
function renderMenuList() {
  var cats = ST.getCategories();
  var allItems = ST.getMenu();

  var html = '';

  /* Toolbar */
  html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">';

  /* Search */
  html += '<div class="pos-search" style="flex:1;min-width:200px;max-width:400px;">';
  html += '<span class="pos-search-icon">🔍</span>';
  html += '<input type="text" id="menuListSearch" placeholder="ค้นหาเมนู..." value="' + sanitize(MENUVIEW.searchQuery) + '" oninput="menuListSearch(this.value)">';
  html += '</div>';

  /* Filter + Add */
  html += '<div class="flex gap-8">';
  html += '<select id="menuListCat" onchange="menuListFilterCat(this.value)" style="width:auto;">';
  html += '<option value="all"' + (MENUVIEW.selectedCat === 'all' ? ' selected' : '') + '>ทุกหมวด</option>';
  for (var c = 0; c < cats.length; c++) {
    var sel = MENUVIEW.selectedCat === cats[c].id ? ' selected' : '';
    html += '<option value="' + sanitize(cats[c].id) + '"' + sel + '>' + cats[c].icon + ' ' + sanitize(cats[c].name) + '</option>';
  }
  html += '</select>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditMenu(null)">➕ เพิ่มเมนู</button>';
  html += '</div>';

  html += '</div>';

  /* Get filtered items */
  var items = filterMenuItems(allItems);

  /* Stats */
  html += '<div class="flex gap-12 mb-16 flex-wrap">';
  html += '<span class="badge badge-accent">ทั้งหมด ' + allItems.length + ' เมนู</span>';
  var activeCount = 0;
  for (var a = 0; a < allItems.length; a++) {
    if (allItems[a].active !== false) activeCount++;
  }
  html += '<span class="badge badge-success">เปิดขาย ' + activeCount + '</span>';
  html += '<span class="badge badge-danger">ปิด ' + (allItems.length - activeCount) + '</span>';
  html += '</div>';

  if (items.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📋</div>';
    html += '<div class="empty-text">' + (MENUVIEW.searchQuery ? 'ไม่พบเมนู' : 'ยังไม่มีเมนู — กด "เพิ่มเมนู" เพื่อเริ่มต้น') + '</div>';
    html += '</div>';
    return html;
  }

  /* Menu cards grid */
  html += '<div class="menu-manage-grid stagger" id="menuManageGrid">';
  for (var m = 0; m < items.length; m++) {
    html += renderMenuManageCard(items[m], cats);
  }
  html += '</div>';

  return html;
}

function filterMenuItems(allItems) {
  var items = [];

  for (var i = 0; i < allItems.length; i++) {
    var it = allItems[i];
    /* Category filter */
    if (MENUVIEW.selectedCat !== 'all' && it.catId !== MENUVIEW.selectedCat) continue;
    /* Search filter */
    if (MENUVIEW.searchQuery && !searchMatch(it.name, MENUVIEW.searchQuery)) continue;
    items.push(it);
  }

  return sortBy(items, MENUVIEW.sortKey, MENUVIEW.sortDesc);
}

function renderMenuManageCard(item, cats) {
  var cat = findById(cats, item.catId);
  var catName = cat ? (cat.icon + ' ' + cat.name) : '';
  var basePrice = ST.getMenuBasePrice(item);
  var sizes = ST.getSizes();
  var isActive = item.active !== false;

  var html = '';
  html += '<div class="menu-manage-card anim-fadeUp' + (isActive ? '' : ' inactive') + '" onclick="modalEditMenu(findById(ST.getMenu(),\'' + sanitize(item.id) + '\'))">';

  /* Top row: emoji + info */
  html += '<div class="flex gap-12" style="align-items:flex-start;">';

  /* Emoji / Image */
  html += '<div class="menu-manage-icon">';
  if (item.image) {
    html += '<img src="' + item.image + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">';
  } else {
    html += '<span style="font-size:36px;">' + (item.emoji || '☕') + '</span>';
  }
  html += '</div>';

  /* Info */
  html += '<div style="flex:1;min-width:0;">';
  html += '<div class="flex-between">';
  html += '<div class="fw-700 truncate">' + sanitize(item.name) + '</div>';
  if (!isActive) {
    html += '<span class="badge badge-danger">ปิด</span>';
  }
  html += '</div>';
  html += '<div class="text-muted fs-sm">' + catName + '</div>';

  /* Prices */
  html += '<div class="flex gap-8 mt-8 flex-wrap">';
  for (var s = 0; s < sizes.length; s++) {
    var p = item.prices ? item.prices[sizes[s].name] : null;
    if (p && p > 0) {
      html += '<span class="badge badge-accent">' + sizes[s].name + ': ' + formatMoneySign(p) + '</span>';
    }
  }
  html += '</div>';

  /* Cost */
  if (item.cost > 0) {
    html += '<div class="text-muted fs-sm mt-8">ต้นทุน: ' + formatMoneySign(item.cost) + ' | กำไร: ' + formatMoneySign(basePrice - item.cost) + '</div>';
  }

/* Options badges */
  html += '<div class="flex gap-4 mt-4 flex-wrap">';
  if (item.allowDrinkType !== false) {
    var dtCount = item.availableDrinkTypes ? item.availableDrinkTypes.length : ST.getDrinkTypes().length;
    html += '<span class="badge badge-info" style="font-size:10px;">🔥 ' + dtCount + ' ประเภท</span>';
  }
  if (item.allowSweetLevel !== false) {
    html += '<span class="badge badge-warning" style="font-size:10px;">🍯 เลือกหวาน</span>';
  }
  html += '</div>';

  html += '</div>'; /* end info */
  html += '</div>'; /* end top row */

  html += '</div>'; /* end card */
  return html;
}

/* Search */
var _menuListSearchDebounce = debounce(function(val) {
  MENUVIEW.searchQuery = val;
  setHTML('menuManageGrid', '');
  var items = filterMenuItems(ST.getMenu());
  var cats = ST.getCategories();
  var h = '';
  for (var i = 0; i < items.length; i++) {
    h += renderMenuManageCard(items[i], cats);
  }
  if (items.length === 0) {
    h = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><div class="empty-text">ไม่พบเมนู</div></div>';
  }
  setHTML('menuManageGrid', h);
}, 250);

function menuListSearch(val) {
  _menuListSearchDebounce(val);
}

function menuListFilterCat(catId) {
  MENUVIEW.selectedCat = catId;
  setHTML('menuTabContent', renderMenuList());
}

/* ============================================
   TAB: CATEGORY LIST
   ============================================ */
function renderCategoryList() {
  var cats = ST.getCategories();
  var menuItems = ST.getMenu();

  var html = '';

  /* Header */
  html += '<div class="flex-between mb-16">';
  html += '<div class="text-muted">หมวดหมู่ทั้งหมด ' + cats.length + ' รายการ</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditCategory(null)">➕ เพิ่มหมวดหมู่</button>';
  html += '</div>';

  if (cats.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📁</div>';
    html += '<div class="empty-text">ยังไม่มีหมวดหมู่</div>';
    html += '</div>';
    return html;
  }

  /* Category cards */
  html += '<div class="cat-manage-list stagger">';
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    /* Count menus in this category */
    var count = 0;
    for (var m = 0; m < menuItems.length; m++) {
      if (menuItems[m].catId === c.id) count++;
    }

    html += '<div class="cat-manage-card anim-fadeUp" onclick="modalEditCategory(findById(ST.getCategories(),\'' + sanitize(c.id) + '\'))">';
    html += '<div class="flex gap-12" style="align-items:center;">';

    /* Drag handle (visual) */
    html += '<span class="text-muted" style="cursor:grab;">⠿</span>';

    /* Icon */
    html += '<span style="font-size:32px;">' + (c.icon || '📦') + '</span>';

    /* Info */
    html += '<div style="flex:1;">';
    html += '<div class="fw-700">' + sanitize(c.name) + '</div>';
    html += '<div class="text-muted fs-sm">' + count + ' เมนู</div>';
    html += '</div>';

    /* Sort badge */
    html += '<span class="badge badge-info">ลำดับ ' + (c.sort || i + 1) + '</span>';

    /* Edit icon */
    html += '<span class="text-muted">✏️</span>';

    html += '</div>'; /* end flex */
    html += '</div>'; /* end card */
  }
  html += '</div>';

  /* Hint */
  html += '<div class="text-muted fs-sm mt-16 text-center">💡 กดที่หมวดหมู่เพื่อแก้ไข</div>';

  return html;
}

/* ============================================
   TAB: TOPPING LIST
   ============================================ */
function renderToppingList() {
  var toppings = ST.getToppings();

  var html = '';

  /* Header */
  html += '<div class="flex-between mb-16">';
  html += '<div class="text-muted">Topping ทั้งหมด ' + toppings.length + ' รายการ</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditTopping(null)">➕ เพิ่ม Topping</button>';
  html += '</div>';

  if (toppings.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">🧁</div>';
    html += '<div class="empty-text">ยังไม่มี Topping</div>';
    html += '</div>';
    return html;
  }

  /* Topping cards */
  html += '<div class="topping-manage-list stagger">';
  for (var i = 0; i < toppings.length; i++) {
    var tp = toppings[i];
    var isActive = tp.active !== false;

    html += '<div class="topping-manage-card anim-fadeUp' + (isActive ? '' : ' inactive') + '" onclick="modalEditTopping(findById(ST.getToppings(),\'' + sanitize(tp.id) + '\'))">';
    html += '<div class="flex-between" style="align-items:center;">';

    html += '<div class="flex gap-12" style="align-items:center;">';
    html += '<span style="font-size:24px;">🧁</span>';
    html += '<div>';
    html += '<div class="fw-600">' + sanitize(tp.name) + '</div>';
    html += '<div class="text-accent fw-700">+' + formatMoneySign(tp.price) + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="flex gap-8" style="align-items:center;">';
    if (!isActive) {
      html += '<span class="badge badge-danger">ปิด</span>';
    } else {
      html += '<span class="badge badge-success">เปิด</span>';
    }
    html += '<span class="text-muted">✏️</span>';
    html += '</div>';

    html += '</div>'; /* end flex-between */
    html += '</div>'; /* end card */
  }
  html += '</div>';

  return html;
}

/* ============================================
   TAB: SIZE LIST
   ============================================ */
function renderSizeList() {
  var sizes = ST.getSizes();

  var html = '';

  /* Header */
  html += '<div class="flex-between mb-16">';
  html += '<div class="text-muted">ขนาดทั้งหมด ' + sizes.length + ' รายการ</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditSize(null)">➕ เพิ่มขนาด</button>';
  html += '</div>';

  if (sizes.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📏</div>';
    html += '<div class="empty-text">ยังไม่มีขนาด</div>';
    html += '</div>';
    return html;
  }

  /* Size cards */
  html += '<div class="size-manage-list stagger">';
  for (var i = 0; i < sizes.length; i++) {
    var sz = sizes[i];

    html += '<div class="size-manage-card anim-fadeUp" onclick="modalEditSize(ST.getSizes()[' + i + '])">';
    html += '<div class="flex-between" style="align-items:center;">';

    html += '<div class="flex gap-12" style="align-items:center;">';
    html += '<div class="size-manage-icon">' + sanitize(sz.name) + '</div>';
    html += '<div>';
    html += '<div class="fw-600">Size ' + sanitize(sz.name) + '</div>';
    if (sz.addPrice > 0) {
      html += '<div class="text-accent fs-sm">+' + formatMoneySign(sz.addPrice) + ' จากราคาปกติ</div>';
    } else {
      html += '<div class="text-muted fs-sm">ราคาเริ่มต้น</div>';
    }
    html += '</div>';
    html += '</div>';

    html += '<span class="text-muted">✏️</span>';

    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  /* Note */
  html += '<div class="card-glass p-16 mt-16">';
  html += '<div class="fw-600 mb-8">💡 วิธีตั้งราคา Size</div>';
  html += '<div class="text-muted fs-sm">ราคา Size ถูกกำหนดในแต่ละเมนู ไม่ใช่บวกจาก "ราคาเพิ่ม" ที่ตั้งไว้ตรงนี้</div>';
  html += '<div class="text-muted fs-sm mt-8">ตัวอย่าง: อเมริกาโน่ S=60, M=70, L=80 — กำหนดในหน้าแก้ไขเมนู</div>';
  html += '</div>';

  return html;
}

/* ============================================
   MODAL: EDIT SIZE
   ============================================ */
function modalEditSize(sz) {
  var isNew = !sz;
  var s = sz || {};

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อขนาด *</label>';
  html += '<input type="text" id="fSizeName" value="' + sanitize(s.name || '') + '" placeholder="เช่น S, M, L, XL" style="font-size:24px;text-align:center;font-weight:800;">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">ราคาเพิ่มจาก Size แรก (฿)</label>';
  html += '<input type="number" id="fSizeAdd" value="' + (s.addPrice || 0) + '" placeholder="0" inputmode="numeric">';
  html += '<div class="form-hint">ใช้เป็น reference เท่านั้น — ราคาจริงกำหนดในแต่ละเมนู</div>';
  html += '</div>';

  html += '<input type="hidden" id="fSizeId" value="' + sanitize(s.id || '') + '">';
  html += '<input type="hidden" id="fSizeIdx" value="' + (sz ? ST.getSizes().indexOf(sz) : -1) + '">';

  var footer = '';
  if (!isNew) {
    footer += '<button class="btn btn-danger btn-sm" onclick="deleteSizeFromModal()">🗑 ลบ</button>';
  }
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveSizeFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มขนาด' : '✏️ แก้ไขขนาด', html, footer);
}

function saveSizeFromModal() {
  var id = ($('fSizeId') || {}).value;
  var name = ($('fSizeName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อขนาด', 'error'); return; }

  var addPrice = parseFloat(($('fSizeAdd') || {}).value) || 0;
  var sizes = ST.getSizes();

  if (id) {
    /* Edit existing */
    var idx = findIndexById(sizes, id);
    if (idx !== -1) {
      sizes[idx].name = name;
      sizes[idx].addPrice = addPrice;
    }
  } else {
    /* Add new */
    sizes.push({
      id: genId('size'),
      name: name,
      addPrice: addPrice
    });
  }

  ST.saveSizes(sizes);
  closeMForce();
  toast(id ? 'อัพเดตขนาดแล้ว' : 'เพิ่มขนาดแล้ว', 'success');
  switchMenuTab('size');
}

function deleteSizeFromModal() {
  var id = ($('fSizeId') || {}).value;
  if (!id) return;
  confirmDialog('ต้องการลบขนาดนี้? เมนูที่มีราคาขนาดนี้จะไม่แสดง', function() {
    var sizes = ST.getSizes();
    removeById(sizes, id);
    ST.saveSizes(sizes);
    closeMForce();
    toast('ลบขนาดแล้ว', 'warning');
    switchMenuTab('size');
  });
}

/* ============================================
   TAB: OPTIONS (Sweet Level + Drink Type)
   ============================================ */
function renderOptionsTab() {
  var html = '';

  /* === DRINK TYPES === */
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">🔥 ประเภทเครื่องดื่ม</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditDrinkType(null)">➕ เพิ่ม</button>';
  html += '</div>';

  var drinkTypes = ST.getDrinkTypes();
  if (drinkTypes.length === 0) {
    html += '<div class="text-muted text-center p-16">ยังไม่มีประเภท</div>';
  } else {
    for (var d = 0; d < drinkTypes.length; d++) {
      var dt = drinkTypes[d];
      html += '<div class="topping-manage-card" onclick="modalEditDrinkType(findById(ST.getDrinkTypes(),\'' + sanitize(dt.id) + '\'))">';
      html += '<div class="flex-between" style="align-items:center;">';
      html += '<div class="flex gap-8" style="align-items:center;">';
      html += '<span style="font-size:24px;">' + (dt.emoji || '🔥') + '</span>';
      html += '<div>';
      html += '<div class="fw-600">' + sanitize(dt.name) + '</div>';
      if (dt.addPrice > 0) {
        html += '<div class="text-accent fs-sm">+' + formatMoneySign(dt.addPrice) + '</div>';
      } else {
        html += '<div class="text-muted fs-sm">ไม่มีราคาเพิ่ม</div>';
      }
      html += '</div></div>';
      html += '<div class="flex gap-6" style="align-items:center;">';
      html += dt.active !== false ? '<span class="badge badge-success">เปิด</span>' : '<span class="badge badge-danger">ปิด</span>';
      html += '<span class="text-muted">✏️</span>';
      html += '</div>';
      html += '</div></div>';
    }
  }
  html += '</div>';

  /* === SWEET LEVELS === */
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">🍯 ระดับความหวาน</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditSweetLevel(null)">➕ เพิ่ม</button>';
  html += '</div>';

  var sweetLevels = ST.getSweetLevels();
  if (sweetLevels.length === 0) {
    html += '<div class="text-muted text-center p-16">ยังไม่มีระดับหวาน</div>';
  } else {
    for (var s = 0; s < sweetLevels.length; s++) {
      var sl = sweetLevels[s];
      html += '<div class="topping-manage-card" onclick="modalEditSweetLevel(findById(ST.getSweetLevels(),\'' + sanitize(sl.id) + '\'))">';
      html += '<div class="flex-between" style="align-items:center;">';
      html += '<div class="flex gap-8" style="align-items:center;">';
      html += '<span style="font-size:24px;">' + (sl.emoji || '🍯') + '</span>';
      html += '<div>';
      html += '<div class="fw-600">' + sanitize(sl.name) + '</div>';
      if (sl.addPrice > 0) {
        html += '<div class="text-accent fs-sm">+' + formatMoneySign(sl.addPrice) + '</div>';
      }
      html += '</div></div>';
      html += '<div class="flex gap-6" style="align-items:center;">';
      html += sl.active !== false ? '<span class="badge badge-success">เปิด</span>' : '<span class="badge badge-danger">ปิด</span>';
      html += '<span class="text-muted">✏️</span>';
      html += '</div>';
      html += '</div></div>';
    }
  }
  html += '</div>';

  /* Note */
  html += '<div class="card-glass p-16">';
  html += '<div class="fw-600 mb-8">💡 วิธีใช้</div>';
  html += '<div class="text-muted fs-sm" style="line-height:1.6;">';
  html += '• แต่ละเมนูสามารถเปิด/ปิดตัวเลือกได้ในหน้า <b>แก้ไขเมนู</b><br>';
  html += '• เมนูเบเกอรี่อาจปิด "ประเภทเครื่องดื่ม" และ "ระดับหวาน" ได้<br>';
  html += '• ราคาเพิ่มจะบวกเข้ากับราคา Size อัตโนมัติ';
  html += '</div>';
  html += '</div>';

  return html;
}

/* ============================================
   MODAL: EDIT DRINK TYPE
   ============================================ */
function modalEditDrinkType(item) {
  var isNew = !item;
  var d = item || {};

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อ *</label>';
  html += '<input type="text" id="fDTName" value="' + sanitize(d.name || '') + '" placeholder="เช่น ร้อน, เย็น, ปั่น">';
  html += '</div>';

  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">Emoji</label>';
  html += '<input type="text" id="fDTEmoji" value="' + sanitize(d.emoji || '🔥') + '" style="font-size:24px;text-align:center;">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ราคาเพิ่ม (฿)</label>';
  html += '<input type="number" id="fDTPrice" value="' + (d.addPrice || '') + '" placeholder="0" inputmode="numeric">';
  html += '</div>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (d.active !== false ? ' on' : '') + '" id="fDTActive"></div>';
  html += '<span>เปิดใช้งาน</span>';
  html += '</label>';
  html += '</div>';

  html += '<input type="hidden" id="fDTId" value="' + sanitize(d.id || '') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteDTFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveDTFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มประเภทเครื่องดื่ม' : '✏️ แก้ไขประเภท', html, footer);
}

function saveDTFromModal() {
  var id = ($('fDTId') || {}).value;
  var name = ($('fDTName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  var data = {
    name: name,
    emoji: ($('fDTEmoji') || {}).value || '🔥',
    addPrice: parseFloat(($('fDTPrice') || {}).value) || 0,
    active: hasClass($('fDTActive'), 'on')
  };
  if (id) { ST.updateDrinkType(id, data); toast('อัพเดตแล้ว', 'success'); }
  else { ST.addDrinkType(data); toast('เพิ่มแล้ว', 'success'); }
  closeMForce();
  switchMenuTab('options');
}

function deleteDTFromModal() {
  var id = ($('fDTId') || {}).value;
  if (!id) return;
  confirmDialog('ลบประเภทนี้?', function() {
    ST.deleteDrinkType(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    switchMenuTab('options');
  });
}

/* ============================================
   MODAL: EDIT SWEET LEVEL
   ============================================ */
function modalEditSweetLevel(item) {
  var isNew = !item;
  var s = item || {};

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อ *</label>';
  html += '<input type="text" id="fSWName" value="' + sanitize(s.name || '') + '" placeholder="เช่น หวานน้อย">';
  html += '</div>';

  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">Emoji</label>';
  html += '<input type="text" id="fSWEmoji" value="' + sanitize(s.emoji || '🍯') + '" style="font-size:24px;text-align:center;">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ราคาเพิ่ม (฿)</label>';
  html += '<input type="number" id="fSWPrice" value="' + (s.addPrice || '') + '" placeholder="0" inputmode="numeric">';
  html += '</div>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (s.active !== false ? ' on' : '') + '" id="fSWActive"></div>';
  html += '<span>เปิดใช้งาน</span>';
  html += '</label>';
  html += '</div>';

  html += '<input type="hidden" id="fSWId" value="' + sanitize(s.id || '') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteSWFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveSWFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มระดับหวาน' : '✏️ แก้ไขระดับหวาน', html, footer);
}

function saveSWFromModal() {
  var id = ($('fSWId') || {}).value;
  var name = ($('fSWName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  var data = {
    name: name,
    emoji: ($('fSWEmoji') || {}).value || '🍯',
    addPrice: parseFloat(($('fSWPrice') || {}).value) || 0,
    active: hasClass($('fSWActive'), 'on')
  };
  if (id) { ST.updateSweetLevel(id, data); toast('อัพเดตแล้ว', 'success'); }
  else { ST.addSweetLevel(data); toast('เพิ่มแล้ว', 'success'); }
  closeMForce();
  switchMenuTab('options');
}

function deleteSWFromModal() {
  var id = ($('fSWId') || {}).value;
  if (!id) return;
  confirmDialog('ลบระดับหวานนี้?', function() {
    ST.deleteSweetLevel(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    switchMenuTab('options');
  });
}

/* ============================================
   ADDITIONAL CSS (inject once)
   ============================================ */
(function() {
  var styleId = 'menuViewStyle';
  if (document.getElementById(styleId)) return;

  var css = '';

  /* Menu manage grid */
  css += '.menu-manage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}';
  css += '.menu-manage-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;cursor:pointer;transition:all var(--transition);}';
  css += '.menu-manage-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow);}';
  css += '.menu-manage-card.inactive{opacity:0.5;}';
  css += '.menu-manage-card.inactive:hover{opacity:0.7;}';
  css += '.menu-manage-icon{width:56px;height:56px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}';

  /* Category manage */
  css += '.cat-manage-list{display:flex;flex-direction:column;gap:8px;}';
  css += '.cat-manage-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;cursor:pointer;transition:all var(--transition);}';
  css += '.cat-manage-card:hover{border-color:var(--accent);box-shadow:var(--shadow);}';

  /* Topping manage */
  css += '.topping-manage-list{display:flex;flex-direction:column;gap:8px;}';
  css += '.topping-manage-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;cursor:pointer;transition:all var(--transition);}';
  css += '.topping-manage-card:hover{border-color:var(--accent);}';
  css += '.topping-manage-card.inactive{opacity:0.5;}';

  /* Size manage */
  css += '.size-manage-list{display:flex;flex-direction:column;gap:8px;}';
  css += '.size-manage-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;cursor:pointer;transition:all var(--transition);}';
  css += '.size-manage-card:hover{border-color:var(--accent);}';
  css += '.size-manage-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-radius:var(--radius-sm);font-size:18px;font-weight:800;flex-shrink:0;}';

  /* Mobile responsive */
  css += '@media(max-width:768px){';
  css += '.menu-manage-grid{grid-template-columns:1fr;}';
  css += '}';

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

console.log('[views-menu.js] loaded');