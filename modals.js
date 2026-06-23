/* ============================================
   COFFEE POS — MODALS.JS
   Modal system + All modal forms
   Version: 3.0 (Compact + Collapsible Topping)
   ============================================ */

/* === MODAL STATE === */
var _modalStack = [];
var _modalOpen = false;

function openModal(title, bodyHTML, footerHTML, opts) {
  var o = opts || {};
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  var mTitle = document.getElementById('modalTitle');
  var mBody = document.getElementById('modalBody');
  var mFooter = document.getElementById('modalFooter');

  if (!overlay || !box) return;

  mTitle.innerHTML = sanitize(title);
  mBody.innerHTML = bodyHTML || '';
  mFooter.innerHTML = footerHTML || '';

  if (o.wide) {
    addClass(box, 'wide');
  } else {
    removeClass(box, 'wide');
  }

  /* เพิ่ม option ป้องกันปิดเมื่อคลิกพื้นหลัง */
  if (o.disableCloseOnOverlay) {
    overlay.setAttribute('data-disable-close', 'true');
  } else {
    overlay.removeAttribute('data-disable-close');
  }

  addClass(overlay, 'show');
  addClass(box, 'show');
  _modalOpen = true;

  if (!o.noAutoFocus) {
    setTimeout(function() {
      var firstInput = mBody.querySelector('input:not([type=hidden]),select,textarea');
      if (firstInput) firstInput.focus();
    }, 350);
  }
}
/* === CLOSE MODAL === */
function closeM() {
  var overlay = $('modalOverlay');
  var box = $('modalBox');
  if (overlay) removeClass(overlay, 'show');
  if (box) removeClass(box, 'show');
  _modalOpen = false;
}

function closeMForce() {
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  if (overlay) {
    overlay.className = 'modal-overlay';
  }
  if (box) {
    box.className = 'modal-box';
  }
  _modalOpen = false;
}

/* จัดการปุ่ม ESC */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _modalOpen) {
    /* ตรวจสอบว่าเป็นหน้า POS หรือไม่ */
    var isPOS = false;
    if (typeof APP !== 'undefined' && APP && APP.currentView === 'pos') {
      isPOS = true;
    }
    if (window.location.hash && window.location.hash.indexOf('pos') !== -1) {
      isPOS = true;
    }
    
    if (isPOS) {
      closeMForce();
      return;
    }
    
    var modalBody = document.getElementById('modalBody');
    var hasUnsavedData = false;
    
    if (modalBody) {
      var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        if (el.value && el.value.trim() !== '') {
          hasUnsavedData = true;
          break;
        }
      }
    }
    
    if (hasUnsavedData) {
      confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
    } else {
      closeMForce();
    }
  }
});

/* ============================================
   MODAL: ADD TO CART
   v3 — Compact + Collapsible Topping
   ============================================ */
function modalAddToCart(menuItem) {
  if (!menuItem) return;

  var sizes = ST.getSizes();
  var toppings = ST.getToppings().filter(function(t) { return t.active !== false; });
  var sweetLevels = ST.getSweetLevels().filter(function(s) { return s.active !== false; });
  var drinkTypes = ST.getDrinkTypes().filter(function(d) { return d.active !== false; });
  var prices = menuItem.prices || {};
  var sizeActive = menuItem.sizeActive || {};

  /* กรองเฉพาะขนาดที่เปิดใช้งาน */
  var availSizes = [];
  for (var i = 0; i < sizes.length; i++) {
    var sizeName = sizes[i].name;
    var isActive = sizeActive[sizeName] !== false;
    var p = prices[sizeName];
    if (isActive && p !== undefined && p > 0) {
      availSizes.push(sizes[i]);
    }
  }

  var singleSize = availSizes.length <= 1;
  var defaultSize = availSizes.length > 0 ? availSizes[0].name : 'S';

  var allowSweet = menuItem.allowSweetLevel !== false;
  var allowDrinkType = menuItem.allowDrinkType !== false;
  var availDrinkTypes = menuItem.availableDrinkTypes || null;

  var menuDrinkTypes = [];
  if (allowDrinkType) {
    for (var dt = 0; dt < drinkTypes.length; dt++) {
      if (!availDrinkTypes || availDrinkTypes.indexOf(drinkTypes[dt].id) !== -1) {
        menuDrinkTypes.push(drinkTypes[dt]);
      }
    }
  }

  var html = '';

  /* === Menu info (compact) === */
  html += '<div class="flex gap-12 mb-12" style="align-items:center;">';
  html += '<span style="font-size:36px;">' + (menuItem.emoji || '☕') + '</span>';
  html += '<div>';
  html += '<div class="fw-700 fs-lg">' + sanitize(menuItem.name) + '</div>';
  html += '<div class="text-accent fw-700">' + formatMoneySign(prices[defaultSize] || 0) + '+</div>';
  html += '</div>';
  html += '</div>';

  /* === 1. Drink Type (compact) === */
  if (allowDrinkType && menuDrinkTypes.length > 1) {
    html += '<div class="form-group">';
    html += '<label class="form-label">🔥 ประเภท</label>';
    html += '<div class="option-selector-sm" id="drinkTypeSelector">';
    for (var d = 0; d < menuDrinkTypes.length; d++) {
      var dType = menuDrinkTypes[d];
      var dActive = d === 0 ? ' active' : '';
      var dPriceLabel = dType.addPrice > 0 ? '+' + dType.addPrice : '';
      html += '<div class="opt-btn-sm' + dActive + '" data-id="' + sanitize(dType.id) + '" data-price="' + (dType.addPrice || 0) + '" onclick="selectOption(this,\'drinkTypeSelector\')">';
      html += '<span>' + (dType.emoji || '') + '</span>';
      html += '<span>' + sanitize(dType.name) + '</span>';
      if (dPriceLabel) html += '<span class="opt-price-sm">+' + dPriceLabel + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  } else if (allowDrinkType && menuDrinkTypes.length === 1) {
    html += '<input type="hidden" id="singleDrinkType" value="' + sanitize(menuDrinkTypes[0].id) + '" data-price="' + (menuDrinkTypes[0].addPrice || 0) + '">';
  }

  /* === 2. Size (compact) - แสดงเฉพาะขนาดที่เปิด === */
  if (!singleSize) {
    html += '<div class="form-group">';
    html += '<label class="form-label">📏 ขนาด</label>';
    html += '<div class="option-selector-sm" id="sizeSelector">';
    for (var s = 0; s < availSizes.length; s++) {
      var sz = availSizes[s];
      var pr = prices[sz.name] || 0;
      var isFirst = s === 0 ? ' active' : '';
      html += '<div class="opt-btn-sm' + isFirst + '" data-size="' + sanitize(sz.name) + '" data-price="' + pr + '" onclick="selectSize(this)">';
      html += '<span class="fw-800">' + sanitize(sz.name) + '</span>';
      html += '<span class="opt-price-sm">' + formatMoneySign(pr) + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  /* === 3. Sweet Level (compact) === */
  if (allowSweet && sweetLevels.length > 0) {
    html += '<div class="form-group">';
    html += '<label class="form-label">🍯 ความหวาน</label>';
    html += '<div class="option-selector-sm" id="sweetSelector">';
    for (var sw = 0; sw < sweetLevels.length; sw++) {
      var sl = sweetLevels[sw];
      var swActive = '';
      if (sl.id === 'sw_normal') {
        swActive = ' active';
      } else if (sw === 0 && !findById(sweetLevels, 'sw_normal')) {
        swActive = ' active';
      }
      html += '<div class="opt-btn-sm' + swActive + '" data-id="' + sanitize(sl.id) + '" data-price="' + (sl.addPrice || 0) + '" onclick="selectOption(this,\'sweetSelector\')">';
      html += '<span>' + (sl.emoji || '') + '</span>';
      html += '<span>' + sanitize(sl.name) + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  /* === 4. Topping (collapsible) === */
  if (toppings.length > 0) {
    html += '<div class="form-group">';
    html += '<div class="topping-toggle" onclick="toggleToppingSection()">';
    html += '<div class="flex gap-6" style="align-items:center;">';
    html += '<span class="form-label" style="margin:0;">🧁 Topping</span>';
    html += '<span class="badge badge-info" id="toppingCountBadge" style="display:none;">0</span>';
    html += '</div>';
    html += '<span id="toppingArrow" class="topping-arrow">▸ เลือก</span>';
    html += '</div>';
    html += '<div class="topping-list" id="toppingList" style="display:none;margin-top:6px;">';
    for (var t = 0; t < toppings.length; t++) {
      var tp = toppings[t];
      html += '<div class="topping-item-sm" data-id="' + sanitize(tp.id) + '" data-price="' + tp.price + '" onclick="toggleTopping(this)">';
      html += '<div class="flex gap-6" style="align-items:center;">';
      html += '<span class="tp-check">☐</span>';
      html += '<span>' + sanitize(tp.name) + '</span>';
      html += '</div>';
      html += '<span class="topping-price">+' + formatMoneySign(tp.price) + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  /* === 5. Quantity (compact inline) === */
  html += '<div class="form-group">';
  html += '<div class="flex-between" style="align-items:center;">';
  html += '<label class="form-label" style="margin:0;">🔢 จำนวน</label>';
  html += '<div class="flex gap-8" style="align-items:center;">';
  html += '<button class="qty-btn-sm danger" onclick="modalCartQty(-1)">−</button>';
  html += '<span id="modalCartQtyVal" class="fw-800" style="min-width:32px;text-align:center;font-size:18px;">1</span>';
  html += '<button class="qty-btn-sm" onclick="modalCartQty(1)">+</button>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  /* === 6. หมายเหตุ === */
  html += '<div class="form-group">';
  html += '<label class="form-label">📝 หมายเหตุ</label>';
  html += '<input type="text" id="modalCartNote" placeholder="เช่น ไม่ใส่น้ำแข็ง, ใส่นมเพิ่ม" style="height:38px;font-size:13px;">';
  html += '</div>';

  /* === Price preview (compact bar) === */
  html += '<div class="price-preview-bar">';
  html += '<span class="text-muted">ราคารวม</span>';
  html += '<span id="modalCartTotal" class="fw-800 text-accent" style="font-size:22px;">' + formatMoneySign(prices[defaultSize] || 0) + '</span>';
  html += '</div>';

  /* Hidden data */
  html += '<input type="hidden" id="modalCartMenuId" value="' + sanitize(menuItem.id) + '">';
  html += '<input type="hidden" id="modalCartMenuName" value="' + sanitize(menuItem.name) + '">';
  html += '<input type="hidden" id="modalCartSingleSize" value="' + (singleSize ? defaultSize : '') + '">';
  html += '<input type="hidden" id="modalCartAllowSweet" value="' + (allowSweet ? '1' : '0') + '">';
  html += '<input type="hidden" id="modalCartAllowDrinkType" value="' + (allowDrinkType ? '1' : '0') + '">';

  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="confirmAddToCart()" style="flex:1;">🛒 เพิ่มลงตะกร้า</button>';

  openModal(sanitize(menuItem.name), html, footer, { noAutoFocus: true });

  setTimeout(function() {
    updateCartModalTotal();
  }, 100);
}

/* === Generic Option Selector === */
function selectOption(el, parentId) {
  var parent = document.getElementById(parentId);
  if (!parent) return;
  var siblings = parent.querySelectorAll('.opt-btn-sm, .option-btn');
  for (var i = 0; i < siblings.length; i++) {
    removeClass(siblings[i], 'active');
  }
  addClass(el, 'active');
  vibrate(20);
  updateCartModalTotal();
}

/* Size selector click */
function selectSize(el) {
  var parent = el.parentNode;
  var siblings = parent.querySelectorAll('.opt-btn-sm, .size-option');
  for (var i = 0; i < siblings.length; i++) {
    removeClass(siblings[i], 'active');
  }
  addClass(el, 'active');
  vibrate(20);
  updateCartModalTotal();
}

/* Topping toggle */
function toggleTopping(el) {
  toggleClass(el, 'selected');
  var icon = el.querySelector('.tp-check');
  if (icon) {
    icon.textContent = hasClass(el, 'selected') ? '☑' : '☐';
  }
  vibrate(20);
  updateCartModalTotal();
  updateToppingBadge();
}

function updateToppingBadge() {
  var selected = qsa('.topping-item-sm.selected');
  var badge = $('toppingCountBadge');
  var arrow = $('toppingArrow');
  var count = selected ? selected.length : 0;

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  if (arrow) {
    arrow.textContent = count > 0 ? '▾ ' + count + ' รายการ' : '▸ เลือก';
  }
}

/* Toggle topping section */
function toggleToppingSection() {
  var list = $('toppingList');
  var arrow = $('toppingArrow');
  if (!list) return;

  var selected = qsa('.topping-item-sm.selected');
  var count = selected ? selected.length : 0;

  if (list.style.display === 'none') {
    list.style.display = '';
    if (arrow) arrow.textContent = count > 0 ? '▾ ' + count + ' รายการ' : '▾ ปิด';
  } else {
    list.style.display = 'none';
    if (arrow) arrow.textContent = count > 0 ? '▸ ' + count + ' รายการ' : '▸ เลือก';
  }
  vibrate(20);
}

/* Qty +/- */
var _modalCartQty = 1;

function modalCartQty(delta) {
  _modalCartQty = clamp(_modalCartQty + delta, 1, 99);
  setText('modalCartQtyVal', _modalCartQty);
  vibrate(20);
  updateCartModalTotal();
}

/* Update total preview */
function updateCartModalTotal() {
  var singleSize = ($('modalCartSingleSize') || {}).value;
  var sizePrice = 0;

  if (singleSize) {
    var menuId = ($('modalCartMenuId') || {}).value;
    var menu = ST.getMenu();
    var item = findById(menu, menuId);
    sizePrice = item && item.prices ? (item.prices[singleSize] || 0) : 0;
  } else {
    var activeSize = qs('.opt-btn-sm.active[data-size], .size-option.active');
    if (activeSize) sizePrice = parseFloat(activeSize.getAttribute('data-price')) || 0;
  }

  var drinkTypePrice = 0;
  var singleDT = $('singleDrinkType');
  if (singleDT) {
    drinkTypePrice = parseFloat(singleDT.getAttribute('data-price')) || 0;
  } else {
    var activeDT = qs('#drinkTypeSelector .opt-btn-sm.active');
    if (activeDT) drinkTypePrice = parseFloat(activeDT.getAttribute('data-price')) || 0;
  }

  var sweetPrice = 0;
  var activeSW = qs('#sweetSelector .opt-btn-sm.active');
  if (activeSW) sweetPrice = parseFloat(activeSW.getAttribute('data-price')) || 0;

  var toppingTotal = 0;
  var selectedTops = qsa('.topping-item-sm.selected');
  for (var i = 0; i < selectedTops.length; i++) {
    toppingTotal += parseFloat(selectedTops[i].getAttribute('data-price')) || 0;
  }

  var total = (sizePrice + drinkTypePrice + sweetPrice + toppingTotal) * _modalCartQty;
  setText('modalCartTotal', formatMoneySign(total));
}

/* Confirm add to cart */
function confirmAddToCart() {
  var menuId = ($('modalCartMenuId') || {}).value;
  var menuName = ($('modalCartMenuName') || {}).value;
  var singleSize = ($('modalCartSingleSize') || {}).value;
  var note = ($('modalCartNote') || {}).value || '';

  var selectedSizeName = singleSize;
  var sizePrice = 0;
  if (!singleSize) {
    var activeSize = qs('.opt-btn-sm.active[data-size], .size-option.active');
    if (activeSize) {
      selectedSizeName = activeSize.getAttribute('data-size');
      sizePrice = parseFloat(activeSize.getAttribute('data-price')) || 0;
    }
  } else {
    var menu = ST.getMenu();
    var mi = findById(menu, menuId);
    sizePrice = mi && mi.prices ? (mi.prices[singleSize] || 0) : 0;
  }

  var drinkTypeId = '';
  var drinkTypeName = '';
  var drinkTypePrice = 0;
  var singleDT = $('singleDrinkType');
  if (singleDT) {
    drinkTypeId = singleDT.value;
    drinkTypePrice = parseFloat(singleDT.getAttribute('data-price')) || 0;
    var dtObj = findById(ST.getDrinkTypes(), drinkTypeId);
    drinkTypeName = dtObj ? dtObj.name : '';
  } else {
    var activeDT = qs('#drinkTypeSelector .opt-btn-sm.active');
    if (activeDT) {
      drinkTypeId = activeDT.getAttribute('data-id');
      drinkTypePrice = parseFloat(activeDT.getAttribute('data-price')) || 0;
      var dtObj2 = findById(ST.getDrinkTypes(), drinkTypeId);
      drinkTypeName = dtObj2 ? dtObj2.name : '';
    }
  }

  var sweetId = '';
  var sweetName = '';
  var sweetPrice = 0;
  var activeSW = qs('#sweetSelector .opt-btn-sm.active');
  if (activeSW) {
    sweetId = activeSW.getAttribute('data-id');
    sweetPrice = parseFloat(activeSW.getAttribute('data-price')) || 0;
    var swObj = findById(ST.getSweetLevels(), sweetId);
    sweetName = swObj ? swObj.name : '';
  }

  var toppingIds = [];
  var toppingNames = [];
  var toppingTotal = 0;
  var selectedTops = qsa('.topping-item-sm.selected');
  var allToppings = ST.getToppings();
  for (var i = 0; i < selectedTops.length; i++) {
    var tid = selectedTops[i].getAttribute('data-id');
    var tprice = parseFloat(selectedTops[i].getAttribute('data-price')) || 0;
    toppingIds.push(tid);
    toppingTotal += tprice;
    var tObj = findById(allToppings, tid);
    if (tObj) toppingNames.push(tObj.name);
  }

  var unitTotal = sizePrice + drinkTypePrice + sweetPrice + toppingTotal;
  var lineTotal = unitTotal * _modalCartQty;

  var cartItem = {
    id: genId('ci'),
    menuId: menuId,
    name: menuName,
    size: selectedSizeName,
    drinkType: drinkTypeId,
    drinkTypeName: drinkTypeName,
    drinkTypePrice: drinkTypePrice,
    sweetLevel: sweetId,
    sweetName: sweetName,
    sweetPrice: sweetPrice,
    toppings: toppingIds,
    toppingNames: toppingNames,
    qty: _modalCartQty,
    unitPrice: sizePrice,
    toppingPrice: toppingTotal,
    lineTotal: lineTotal,
    note: note
  };

  if (typeof addToCart === 'function') addToCart(cartItem);

  _modalCartQty = 1;
  closeMForce();
  toast(menuName + ' x' + cartItem.qty + ' เพิ่มแล้ว', 'success', 1500);
  vibrate(50);
}

/* ============================================
   MODAL: PAYMENT
   ============================================ */
function modalPayment(cartItems, subtotal, discount, discountType) {
  if (!cartItems || cartItems.length === 0) return;

  var cfg = ST.getConfig();
  var disc = discount || 0;
  var dType = discountType || 'baht';

  var discountAmt = dType === 'percent' ? roundTo(subtotal * disc / 100, 2) : disc;
  var afterDiscount = subtotal - discountAmt;

  var vat = 0;
  var sc = 0;
  if (cfg.vatEnabled) vat = roundTo(afterDiscount * cfg.vatRate / 100, 2);
  if (cfg.serviceChargeEnabled) sc = roundTo(afterDiscount * cfg.serviceChargeRate / 100, 2);

  var grandTotal = roundTo(afterDiscount + vat + sc, 0);

  var html = '';

  /* Summary */
  html += '<div class="card-glass p-16 mb-16">';
  html += '<div class="cart-row"><span>ยอดรวม</span><span>' + formatMoneySign(subtotal) + '</span></div>';
  if (discountAmt > 0) html += '<div class="cart-row text-danger"><span>ส่วนลด</span><span>-' + formatMoneySign(discountAmt) + '</span></div>';
  if (vat > 0) html += '<div class="cart-row"><span>VAT ' + cfg.vatRate + '%</span><span>+' + formatMoneySign(vat) + '</span></div>';
  if (sc > 0) html += '<div class="cart-row"><span>SC ' + cfg.serviceChargeRate + '%</span><span>+' + formatMoneySign(sc) + '</span></div>';
  html += '<div class="cart-row total"><span>💰 ยอดชำระ</span><span>' + formatMoneySign(grandTotal) + '</span></div>';
  html += '</div>';

  /* Sales Channel */
  var channels = ST.getActiveChannels();
  if (channels.length > 0) {
    html += '<div class="form-group mb-16">';
    html += '<label class="form-label">🛵 ช่องทาง</label>';
    html += '<div class="option-selector-sm" id="modalChannelSelector">';
    for (var ch = 0; ch < channels.length; ch++) {
      var c = channels[ch];
      var chActive = (c.id === (typeof POS !== 'undefined' && POS.selectedChannel ? POS.selectedChannel : 'ch_walkin')) ? ' active' : '';
      html += '<div class="opt-btn-sm' + chActive + '" data-id="' + sanitize(c.id) + '" data-name="' + sanitize(c.name) + '" onclick="selectModalChannel(this)">';
      html += '<span>' + (c.emoji || '🏪') + '</span>';
      html += '<span>' + sanitize(c.name) + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  /* Payment method */
  html += '<div class="form-group">';
  html += '<label class="form-label">💵 วิธีชำระเงิน</label>';
  html += '<div class="payment-methods" id="payMethods">';
  html += '<div class="pay-method active" data-method="cash" onclick="selectPayMethod(this)">';
  html += '<div class="pay-method-icon">💵</div><div>เงินสด</div></div>';
  html += '<div class="pay-method" data-method="transfer" onclick="selectPayMethod(this)">';
  html += '<div class="pay-method-icon">📱</div><div>โอน</div></div>';
  html += '<div class="pay-method" data-method="promptpay" onclick="selectPayMethod(this)">';
  html += '<div class="pay-method-icon">📷</div><div>QR</div></div>';
  html += '</div>';
  html += '</div>';

  /* Cash section */
  html += '<div id="cashSection">';
  html += '<div class="form-group">';
  html += '<label class="form-label">เงินที่รับ</label>';
  html += '<input type="number" id="payReceived" inputmode="numeric" min="0" value="' + grandTotal + '" placeholder="0" oninput="calcChange()" style="font-size:24px;text-align:center;font-weight:800;">';
  html += '</div>';

  html += '<div class="flex flex-wrap gap-6 mb-16">';
  html += '<button class="btn btn-success btn-sm" onclick="setPayReceived(' + grandTotal + ')">💰 พอดี ' + formatMoneySign(grandTotal) + '</button>';
  var quickList = cfg.quickCashAmounts || [20, 50, 100, 500, 1000];
  for (var qa = 0; qa < quickList.length; qa++) {
    if (quickList[qa] <= 0 || quickList[qa] === grandTotal) continue;
    html += '<button class="btn btn-secondary btn-sm" onclick="setPayReceived(' + quickList[qa] + ')">' + formatMoneySign(quickList[qa]) + '</button>';
  }
  html += '</div>';

  html += '<div class="card-glass text-center p-16">';
  html += '<div class="text-muted fs-sm">เงินทอน</div>';
  html += '<div id="payChange" class="fw-800 text-success" style="font-size:36px;">฿0</div>';
  html += '</div>';
  html += '</div>';

  /* QR section (PromtPay) */
  var defPP = ST.getDefaultPromptPay();
  var ppEnabled = cfg.promptPayEnabled && defPP;

  if (ppEnabled) {
    var ppAccounts = ST.getPromptPayAccounts();

    html += '<div id="promptPaySection" style="display:none;">';
    html += '<div class="text-center p-16">';
    html += '<div class="fw-700 mb-8">📱 สแกนจ่ายเงิน</div>';

    if (ppAccounts.length > 1) {
      html += '<div class="option-selector-sm mb-8" id="ppAccountSelector">';
      for (var ppi = 0; ppi < ppAccounts.length; ppi++) {
        var ppAcc = ppAccounts[ppi];
        var ppActive = ppAcc.isDefault ? ' active' : '';
        html += '<div class="opt-btn-sm' + ppActive + '" data-ppid="' + sanitize(ppAcc.ppId) + '" data-ppname="' + sanitize(ppAcc.name) + '" onclick="switchPPAccount(this,' + grandTotal + ')">';
        html += '<span>' + sanitize(ppAcc.name) + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '<div class="qr-frame" id="ppQRFrame">';
    html += '<img id="promptPayQR" src="' + getPromptPayQRUrl(defPP.ppId, grandTotal, 220) + '" style="width:220px;height:220px;border-radius:8px;">';
    html += '</div>';
    html += '<div class="fw-800 text-accent mt-8" style="font-size:24px;">' + formatMoneySign(grandTotal) + '</div>';
    html += '<div id="ppNameDisplay" class="text-muted fs-sm mt-4">' + sanitize(defPP.name) + ' — ' + formatPromptPayId(defPP.ppId) + '</div>';
    html += '</div>';
    html += '</div>';
  }

  /* Transfer section (hidden by default) */
  html += '<div id="transferSection" style="display:none;">';
  html += '<div class="text-center p-16 text-muted">';
  html += '<div style="font-size:36px;margin-bottom:8px;">📱</div>';
  html += '<div>ยอดโอน: <span class="fw-800 text-accent">' + formatMoneySign(grandTotal) + '</span></div>';
  html += '<div class="fs-sm mt-4">กดยืนยันเมื่อรับเงินแล้ว</div>';
  html += '</div>';
  html += '</div>';

  /* Hidden data */
  html += '<input type="hidden" id="payGrandTotal" value="' + grandTotal + '">';
  html += '<input type="hidden" id="paySubtotal" value="' + subtotal + '">';
  html += '<input type="hidden" id="payDiscountAmt" value="' + discountAmt + '">';
  html += '<input type="hidden" id="payVat" value="' + vat + '">';
  html += '<input type="hidden" id="paySC" value="' + sc + '">';

  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-success btn-lg" onclick="confirmPayment()" style="flex:1;">✅ ยืนยันชำระเงิน</button>';

  openModal('💳 ชำระเงิน', html, footer);

  setTimeout(function() {
    calcChange();
  }, 200);
}

/* Format PromptPay ID for display */
function formatPromptPayId(id) {
  var clean = String(id).replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return clean.substring(0, 3) + '-' + clean.substring(3, 6) + '-' + clean.substring(6);
  }
  return clean;
}

function selectPayMethod(el) {
  var siblings = el.parentNode.querySelectorAll('.pay-method');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');
  vibrate(20);

  var method = el.getAttribute('data-method');
  var cashSection = $('cashSection');
  var ppSection = $('promptPaySection');
  var tfSection = $('transferSection');

  if (cashSection) cashSection.style.display = method === 'cash' ? '' : 'none';
  if (ppSection) ppSection.style.display = method === 'promptpay' ? '' : 'none';
  if (tfSection) tfSection.style.display = method === 'transfer' ? '' : 'none';
}

function selectModalChannel(el) {
  var parent = el.parentNode;
  var siblings = parent.querySelectorAll('.opt-btn-sm');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');

  var channelId = el.getAttribute('data-id');
  var channelName = el.getAttribute('data-name');
  if (typeof POS !== 'undefined') {
    POS.selectedChannel = channelId;
    POS.selectedChannelName = channelName;
  }
  vibrate(20);
}

function setPayReceived(amount) {
  var el = $('payReceived');
  if (el) {
    el.value = amount;
    calcChange();
  }
  vibrate(20);
}

function calcChange() {
  var total = parseFloat(($('payGrandTotal') || {}).value) || 0;
  var received = parseFloat(($('payReceived') || {}).value) || 0;
  var change = received - total;
  if (change < 0) change = 0;

  var el = $('payChange');
  if (el) {
    el.textContent = formatMoneySign(change);
  }
}

function switchPPAccount(el, amount) {
  var parent = el.parentNode;
  var siblings = parent.querySelectorAll('.opt-btn-sm');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');

  var ppId = el.getAttribute('data-ppid');
  var ppName = el.getAttribute('data-ppname');

  var qrImg = $('promptPayQR');
  if (qrImg && typeof getPromptPayQRUrl === 'function') {
    qrImg.src = getPromptPayQRUrl(ppId, amount, 220);
  }

  var nameDisplay = $('ppNameDisplay');
  if (nameDisplay && typeof formatPromptPayId === 'function') {
    nameDisplay.textContent = ppName + ' — ' + formatPromptPayId(ppId);
  }
  vibrate(20);
}

function confirmPayment() {
  var method = 'cash';
  var activeM = qs('.pay-method.active');
  if (activeM) method = activeM.getAttribute('data-method');

  var total = parseFloat(($('payGrandTotal') || {}).value) || 0;
  var received = 0;
  var change = 0;

  if (method === 'cash') {
    received = parseFloat(($('payReceived') || {}).value) || 0;
    if (received < total) { toast('เงินที่รับไม่เพียงพอ', 'error'); return; }
    change = roundTo(received - total, 2);
  } else {
    received = total;
    change = 0;
  }

  var paymentMethod = method === 'promptpay' ? 'qr' : method;

  var orderData = {
    subtotal: parseFloat(($('paySubtotal') || {}).value) || 0,
    discount: parseFloat(($('payDiscountAmt') || {}).value) || 0,
    vat: parseFloat(($('payVat') || {}).value) || 0,
    serviceCharge: parseFloat(($('paySC') || {}).value) || 0,
    total: total,
    payment: paymentMethod,
    received: received,
    change: change
  };

  closeMForce();
  if (typeof completeOrder === 'function') completeOrder(orderData);
}

/* ============================================
   MODAL: RECEIPT
   ============================================ */
function modalReceipt(order) {
  if (!order) return;
  var cfg = ST.getConfig();
  var html = '';

  html += '<div style="text-align:center;max-width:320px;margin:0 auto;font-family:monospace;">';

  html += '<div style="font-size:20px;font-weight:800;margin-bottom:4px;">' + sanitize(cfg.shopName) + '</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);">ใบเสร็จรับเงิน</div>';
  html += '<hr style="border:none;border-top:1px dashed var(--border);margin:10px 0;">';

  html += '<div class="flex-between fs-sm" style="margin-bottom:4px;">';
  html += '<span>ออเดอร์: ' + cfg.orderPrefix + padZ(order.number) + '</span>';
  html += '<span>' + sanitize(order.date) + '</span>';
  html += '</div>';
  /* Channel */
  if (order.channelName) {
    html += '<div class="flex-between fs-sm" style="margin-bottom:4px;">';
    html += '<span>ช่องทาง:</span>';
    html += '<span>' + sanitize(order.channelName) + '</span>';
    html += '</div>';
  }
  html += '<div class="flex-between fs-sm" style="margin-bottom:8px;">';
  html += '<span>เวลา: ' + sanitize(order.time) + '</span>';
  if (order.staffName) {
    html += '<span>พนง: ' + sanitize(order.staffName) + '</span>';
  }
  html += '</div>';

  html += '<hr style="border:none;border-top:1px dashed var(--border);margin:8px 0;">';

  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    html += '<div class="flex-between" style="margin-bottom:2px;">';
    html += '<span style="text-align:left;">';
    html += sanitize(it.name);
    if (it.drinkTypeName) html += ' [' + sanitize(it.drinkTypeName) + ']';
    if (it.size) html += ' (' + sanitize(it.size) + ')';
    html += ' x' + it.qty;
    html += '</span>';
    html += '<span>' + formatMoneySign(it.lineTotal) + '</span>';
    html += '</div>';
    if (it.sweetName) {
      html += '<div style="font-size:11px;color:var(--text-muted);text-align:left;padding-left:8px;margin-bottom:2px;">🍯 ' + sanitize(it.sweetName) + '</div>';
    }
    if (it.toppingNames && it.toppingNames.length > 0) {
      html += '<div style="font-size:11px;color:var(--text-muted);text-align:left;padding-left:8px;margin-bottom:2px;">+ ' + it.toppingNames.join(', ') + '</div>';
    }
    if (it.note) {
      html += '<div style="font-size:11px;color:var(--text-muted);text-align:left;padding-left:8px;margin-bottom:4px;">📝 ' + sanitize(it.note) + '</div>';
    }
  }

  html += '<hr style="border:none;border-top:1px dashed var(--border);margin:8px 0;">';

  html += '<div class="flex-between fs-sm"><span>ยอดรวม</span><span>' + formatMoneySign(order.subtotal) + '</span></div>';
  if (order.discount > 0) {
    html += '<div class="flex-between fs-sm text-danger"><span>ส่วนลด</span><span>-' + formatMoneySign(order.discount) + '</span></div>';
  }
  if (order.vat > 0) {
    html += '<div class="flex-between fs-sm"><span>VAT</span><span>+' + formatMoneySign(order.vat) + '</span></div>';
  }
  if (order.serviceCharge > 0) {
    html += '<div class="flex-between fs-sm"><span>SC</span><span>+' + formatMoneySign(order.serviceCharge) + '</span></div>';
  }

  html += '<hr style="border:none;border-top:2px solid var(--border);margin:8px 0;">';
  html += '<div class="flex-between" style="font-size:22px;font-weight:800;"><span>รวม</span><span class="text-accent">' + formatMoneySign(order.total) + '</span></div>';

  html += '<hr style="border:none;border-top:1px dashed var(--border);margin:8px 0;">';

  var payLabels = { cash: '💵 เงินสด', transfer: '📱 โอน', qr: '📷 QR' };
  html += '<div class="flex-between fs-sm"><span>ชำระ</span><span>' + (payLabels[order.payment] || order.payment) + '</span></div>';
  if (order.payment === 'cash') {
    html += '<div class="flex-between fs-sm"><span>รับ</span><span>' + formatMoneySign(order.received) + '</span></div>';
    html += '<div class="flex-between fs-sm fw-700"><span>ทอน</span><span class="text-success">' + formatMoneySign(order.change) + '</span></div>';
  }

  html += '<hr style="border:none;border-top:1px dashed var(--border);margin:10px 0;">';
  html += '<div style="font-size:12px;color:var(--text-muted);">' + sanitize(cfg.receiptFooter) + '</div>';
  html += '</div>';

  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  footer += '<button class="btn btn-primary" onclick="doPrintReceipt()">🖨️ พิมพ์</button>';

  openModal('🧾 ' + cfg.orderPrefix + padZ(order.number), html, footer);
  window._lastReceiptOrder = order;
}

function doPrintReceipt() {
  var order = window._lastReceiptOrder;
  if (!order) return;
  var cfg = ST.getConfig();

  var ph = '';
  ph += '<div class="receipt-header">';
  ph += '<div class="receipt-shop">' + sanitize(cfg.shopName) + '</div>';
  ph += '<div>ใบเสร็จรับเงิน</div>';
  ph += '</div>';
  ph += '<div class="receipt-divider"></div>';
  ph += '<div class="receipt-row"><span>' + cfg.orderPrefix + padZ(order.number) + '</span><span>' + sanitize(order.date) + ' ' + sanitize(order.time) + '</span></div>';
if (order.channelName && order.channelName !== 'Walk-in') {
  ph += '<div class="receipt-row"><span>ช่องทาง</span><span>' + sanitize(order.channelName) + '</span></div>';
  }
  ph += '<div class="receipt-divider"></div>';

  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var label = sanitize(it.name);
    if (it.drinkTypeName) label += ' [' + it.drinkTypeName + ']';
    if (it.size) label += ' (' + it.size + ')';
    label += ' x' + it.qty;
    ph += '<div class="receipt-row"><span>' + label + '</span><span>' + formatMoney(it.lineTotal) + '</span></div>';
    if (it.sweetName) {
      ph += '<div style="padding-left:8px;font-size:10px;">🍯 ' + it.sweetName + '</div>';
    }
    if (it.toppingNames && it.toppingNames.length > 0) {
      ph += '<div style="padding-left:8px;font-size:10px;">+ ' + it.toppingNames.join(', ') + '</div>';
    }
  }

  ph += '<div class="receipt-divider"></div>';
  if (order.discount > 0) {
    ph += '<div class="receipt-row"><span>ส่วนลด</span><span>-' + formatMoney(order.discount) + '</span></div>';
  }
  ph += '<div class="receipt-row receipt-total"><span>รวม</span><span>' + formatMoney(order.total) + '</span></div>';

  var payLabels = { cash: 'เงินสด', transfer: 'โอน', qr: 'QR' };
  ph += '<div class="receipt-row"><span>ชำระ: ' + (payLabels[order.payment] || '') + '</span><span>' + formatMoney(order.received) + '</span></div>';
  if (order.payment === 'cash' && order.change > 0) {
    ph += '<div class="receipt-row"><span>ทอน</span><span>' + formatMoney(order.change) + '</span></div>';
  }

  ph += '<div class="receipt-divider"></div>';
  ph += '<div class="receipt-footer">' + sanitize(cfg.receiptFooter) + '</div>';

  printReceipt(ph);
}

/* ============================================
   MODAL: EDIT MENU ITEM (v3 + Size Toggle)
   ============================================ */
/* ============================================
   MODAL: EDIT MENU ITEM (v4 - Cost per Size + Auto Cost toggle)
   ============================================ */
function modalEditMenu(item) {
  var isNew = !item;
  var m = item || {};
  var cats = ST.getCategories();
  var sizes = ST.getSizes();
  var drinkTypes = ST.getDrinkTypes();
  var sizeActive = m.sizeActive || {};

  var html = '';

  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อเมนู *</label>';
  html += '<input type="text" id="fMenuName" value="' + sanitize(m.name || '') + '" placeholder="เช่น อเมริกาโน่">';
  html += '</div>';

  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">หมวดหมู่</label>';
  html += '<select id="fMenuCat">';
  for (var c = 0; c < cats.length; c++) {
    var sel = (m.catId === cats[c].id) ? ' selected' : '';
    html += '<option value="' + sanitize(cats[c].id) + '"' + sel + '>' + cats[c].icon + ' ' + sanitize(cats[c].name) + '</option>';
  }
  html += '</select>';
  html += '</div>';
  html += '<div class="form-group" style="max-width:100px;">';
  html += '<label class="form-label">Emoji</label>';
  html += '<input type="text" id="fMenuEmoji" value="' + sanitize(m.emoji || '☕') + '" style="font-size:24px;text-align:center;">';
  html += '</div>';
  html += '</div>';

  /* 🔥 ราคาและต้นทุนตามขนาด (แยกแต่ละขนาด) */
  html += '<div class="card p-16 mb-16" style="border-color:var(--accent);">';
  html += '<div class="fw-700 mb-8">💰 ราคาและต้นทุนตามขนาด</div>';
  html += '<div class="form-group">';
  html += '<div class="form-row" style="gap:8px;">';
  
  for (var s = 0; s < sizes.length; s++) {
    var sizeName = sizes[s].name;
    var priceValue = (m.prices && m.prices[sizeName]) ? m.prices[sizeName] : '';
    var costValue = (m.costs && m.costs[sizeName]) ? m.costs[sizeName] : (m.cost || '');
    var isActive = sizeActive[sizeName] !== false;
    
    html += '<div style="flex:1;text-align:center;padding:8px;background:var(--bg-card);border-radius:var(--radius-sm);">';
    html += '<div class="fw-700 mb-4" style="font-size:16px;">' + sizeName + '</div>';
    html += '<label class="checkbox-wrap" style="justify-content:center;margin-bottom:8px;">';
    html += '<input type="checkbox" class="size-active-chk" data-size="' + sizeName + '" ' + (isActive ? 'checked' : '') + ' onchange="toggleSizePrice(this)">';
    html += '<span style="font-size:12px;">เปิดขาย</span>';
    html += '</label>';
    html += '<div class="form-group" style="margin-bottom:6px;">';
    html += '<label class="form-label fs-sm">ราคาขาย</label>';
    html += '<input type="number" id="fMenuPrice_' + sizeName + '" value="' + priceValue + '" placeholder="0" min="0" inputmode="numeric" style="text-align:center;font-size:14px;" ' + (isActive ? '' : 'disabled') + '>';
    html += '</div>';
    html += '<div class="form-group" style="margin-bottom:0;">';
    html += '<label class="form-label fs-sm">ต้นทุน (Manual)</label>';
    html += '<input type="number" id="fMenuCost_' + sizeName + '" value="' + costValue + '" placeholder="0" min="0" inputmode="numeric" style="text-align:center;font-size:14px;" ' + (isActive ? '' : 'disabled') + '>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';
  html += '<div class="form-hint">✅ เปิดใช้งานขนาด / ☐ ปิด (ไม่แสดงใน POS)</div>';
  html += '</div>';

  /* 🔥 ต้นทุนอัตโนมัติจาก Recipe (เฉพาะ Pro) - แยกแต่ละขนาด */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_recipe')) {
    html += '<div class="card p-16 mb-16" style="border-color:var(--accent2);">';
    html += '<div class="flex-between mb-8">';
    html += '<div class="fw-700">🧪 ต้นทุนอัตโนมัติจากสูตร</div>';
    html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
    html += '<div class="toggle' + (m.useAutoCost ? ' on' : '') + '" id="fMenuUseAutoCost" style="width:36px;height:20px;"></div>';
    html += '</label>';
    html += '</div>';
    html += '<div class="text-muted fs-sm mb-8">เปิดใช้งาน จะใช้ต้นทุนที่คำนวณจากสูตรวัตถุดิบแทนการกรอกเอง (แยกตามขนาด)</div>';
    
    /* แสดงต้นทุนจากสูตรแยกแต่ละขนาด */
    html += '<div class="form-row" style="gap:8px;margin-top:8px;">';
    for (var s2 = 0; s2 < sizes.length; s2++) {
      var sizeName2 = sizes[s2].name;
      var autoCost = 0;
      var hasRecipe = false;
      
      if (m.id) {
        var recipe = ST.getRecipe(m.id, sizeName2);
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          hasRecipe = true;
          autoCost = ST.calculateRecipeCost(recipe);
        }
      }
      
      html += '<div style="flex:1;text-align:center;padding:8px;background:var(--bg-card);border-radius:var(--radius-sm);">';
      html += '<div class="fw-600 mb-2">' + sizeName2 + '</div>';
      if (hasRecipe) {
        html += '<div class="fw-800 text-accent" style="font-size:18px;">' + formatMoneySign(autoCost) + '</div>';
        html += '<div class="fs-sm text-success">✅ มีสูตรแล้ว</div>';
      } else {
        html += '<div class="fw-800 text-muted" style="font-size:18px;">--</div>';
        html += '<div class="fs-sm text-warning">⚠️ ไม่มีสูตร</div>';
      }
      html += '<button class="btn btn-sm btn-outline mt-4" style="font-size:11px;padding:4px 8px;" onclick="event.stopPropagation(); closeMForce(); goToRecipeForMenu(\'' + (m.id || '') + '\', \'' + sizeName2 + '\')">📝 จัดการสูตร</button>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  /* Drink Type */
  html += '<div class="card p-16 mb-16" style="border-color:var(--accent2);">';
  html += '<div class="fw-700 mb-8">🔥 ประเภทเครื่องดื่ม</div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (m.allowDrinkType !== false ? ' on' : '') + '" id="fMenuAllowDrinkType"></div>';
  html += '<span>เปิดให้เลือกประเภท</span>';
  html += '</label>';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ประเภทที่มี</label>';
  html += '<div class="option-check-list">';
  for (var dt = 0; dt < drinkTypes.length; dt++) {
    var dtChecked = '';
    if (!m.availableDrinkTypes || m.availableDrinkTypes.indexOf(drinkTypes[dt].id) !== -1) {
      dtChecked = ' checked';
    }
    html += '<label class="checkbox-wrap">';
    html += '<input type="checkbox" class="fMenuDrinkType" value="' + sanitize(drinkTypes[dt].id) + '"' + dtChecked + '>';
    html += '<span>' + drinkTypes[dt].emoji + ' ' + sanitize(drinkTypes[dt].name);
    if (drinkTypes[dt].addPrice > 0) html += ' (+' + formatMoneySign(drinkTypes[dt].addPrice) + ')';
    html += '</span>';
    html += '</label>';
  }
  html += '</div>';
  html += '</div>';
  html += '</div>';

  /* Sweet */
  html += '<div class="card p-16 mb-16" style="border-color:var(--warning);">';
  html += '<div class="fw-700 mb-8">🍯 ระดับความหวาน</div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (m.allowSweetLevel !== false ? ' on' : '') + '" id="fMenuAllowSweet"></div>';
  html += '<span>เปิดให้เลือกระดับหวาน</span>';
  html += '</label>';
  html += '</div>';
  html += '</div>';

  /* Active */
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (m.active !== false ? ' on' : '') + '" id="fMenuActive"></div>';
  html += '<span>เปิดขาย</span>';
  html += '</label>';
  html += '</div>';

  /* รูปเมนู (เฉพาะ Pro) */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_menu_image')) {
    html += '<div class="form-group">';
    html += '<label class="form-label">🖼️ รูปเมนู (URL)</label>';
    html += '<input type="text" id="fMenuImage" value="' + sanitize(m.image || '') + '" placeholder="https://...">';
    html += '<div class="form-hint">ใส่ลิงก์รูป (แนะนำ 200x200px) ถ้าไม่มีจะใช้ Emoji แทน</div>';
    html += '<div id="imagePreview" style="margin-top:8px;"></div>';
    html += '</div>';
  }

  html += '<input type="hidden" id="fMenuId" value="' + sanitize(m.id || '') + '">';

  /* Preview script สำหรับรูป */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_menu_image')) {
    html += '<script>';
    html += 'function previewMenuImage() {';
    html += '  var url = document.getElementById("fMenuImage").value;';
    html += '  var preview = document.getElementById("imagePreview");';
    html += '  if (preview && url) {';
    html += '    preview.innerHTML = "<img src=\\"" + url + "\\" style=\\"width:60px;height:60px;object-fit:cover;border-radius:8px;\\" onerror=\\"this.style.display=\'none\'\\">";';
    html += '  } else if (preview) {';
    html += '    preview.innerHTML = "";';
    html += '  }';
    html += '}';
    html += 'setTimeout(function(){ previewMenuImage(); }, 100);';
    html += 'var imgInput = document.getElementById("fMenuImage");';
    html += 'if (imgInput) imgInput.oninput = previewMenuImage;';
    html += '</script>';
  }

  var footer = '';
  if (!isNew) {
    footer += '<button class="btn btn-danger btn-sm" onclick="deleteMenuFromModal()">🗑 ลบ</button>';
  }
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveMenuFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มเมนู' : '✏️ แก้ไขเมนู', html, footer);
}

/* ฟังก์ชันไปที่หน้า Recipe สำหรับเมนูนี้ */
function goToRecipeForMenu(menuId) {
  if (typeof RECIPE_VIEW !== 'undefined') {
    RECIPE_VIEW.selectedMenuId = menuId;
    RECIPE_VIEW.selectedSize = null;
  }
  if (typeof nav === 'function') {
    nav('recipe');
  }
}
/* ============================================
   modals.js — เพิ่มส่วนนี้ในฟังก์ชัน modalEditMenu
   แทนที่โค้ดส่วนรูปเมนูเดิม (ประมาณบรรทัด 1100-1120)
   ============================================ */

/* รูปเมนู (เฉพาะ Super Admin เท่านั้น) */
var isSuperAdmin = (typeof SuperAdmin !== 'undefined' && SuperAdmin.isLoggedIn);

if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_menu_image') && isSuperAdmin) {
  html += '<div class="form-group">';
  html += '<label class="form-label">🖼️ รูปเมนู (URL)</label>';
  html += '<input type="text" id="fMenuImage" value="' + sanitize(m.image || '') + '" placeholder="https://...">';
  html += '<div class="form-hint">ใส่ลิงก์รูป (แนะนำ 200x200px) ถ้าไม่มีจะใช้ Emoji แทน</div>';
  html += '<div id="imagePreview" style="margin-top:8px;"></div>';
  html += '</div>';
  
  // เพิ่ม script preview รูป
  html += '<script>';
  html += 'function previewMenuImage() {';
  html += '  var url = document.getElementById("fMenuImage").value;';
  html += '  var preview = document.getElementById("imagePreview");';
  html += '  if (preview && url) {';
  html += '    preview.innerHTML = "<img src=\\"" + url + "\\" style=\\"max-width:80px;max-height:80px;border-radius:8px;margin-top:8px;\\" onerror=\\"this.style.display=\'none\'\\">";';
  html += '  } else if (preview) {';
  html += '    preview.innerHTML = "";';
  html += '  }';
  html += '}';
  html += 'setTimeout(function(){ previewMenuImage(); }, 100);';
  html += 'var imgInput = document.getElementById("fMenuImage");';
  html += 'if (imgInput) imgInput.oninput = previewMenuImage;';
  html += '</script>';
}

function toggleSizePrice(checkbox) {
  var sizeName = checkbox.getAttribute('data-size');
  var priceInput = $('fMenuPrice_' + sizeName);
  if (priceInput) {
    priceInput.disabled = !checkbox.checked;
    if (!checkbox.checked) {
      priceInput.value = '';
    }
  }
}

function saveMenuFromModal() {
  var id = ($('fMenuId') || {}).value;
  var name = ($('fMenuName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อเมนู', 'error'); return; }

  var sizes = ST.getSizes();
  var prices = {};
  var costs = {};
  var sizeActive = {};
  
  for (var i = 0; i < sizes.length; i++) {
    var sizeName = sizes[i].name;
    var priceInput = $('fMenuPrice_' + sizeName);
    var costInput = $('fMenuCost_' + sizeName);
    var isActive = false;
    
    var checkboxes = qsa('.size-active-chk');
    for (var c = 0; c < checkboxes.length; c++) {
      if (checkboxes[c].getAttribute('data-size') === sizeName && checkboxes[c].checked) {
        isActive = true;
        break;
      }
    }
    
    sizeActive[sizeName] = isActive;
    
    if (isActive && priceInput) {
      var p = parseFloat(priceInput.value) || 0;
      if (p > 0) {
        prices[sizeName] = p;
      }
    }
    
    if (isActive && costInput) {
      costs[sizeName] = parseFloat(costInput.value) || 0;
    }
  }
  
  if (Object.keys(prices).length === 0) {
    toast('กรุณาใส่ราคาอย่างน้อย 1 ขนาด', 'error');
    return;
  }

  var allowDrinkType = hasClass($('fMenuAllowDrinkType'), 'on');
  var availDrinkTypes = [];
  var dtChecks = qsa('.fMenuDrinkType');
  for (var d = 0; d < dtChecks.length; d++) {
    if (dtChecks[d].checked) availDrinkTypes.push(dtChecks[d].value);
  }

  var data = {
    name: name,
    catId: ($('fMenuCat') || {}).value || '',
    emoji: ($('fMenuEmoji') || {}).value || '☕',
    prices: prices,
    costs: costs,
    sizeActive: sizeActive,
    active: hasClass($('fMenuActive'), 'on'),
    allowDrinkType: allowDrinkType,
    availableDrinkTypes: availDrinkTypes,
    allowSweetLevel: hasClass($('fMenuAllowSweet'), 'on')
  };
  
  /* ต้นทุนอัตโนมัติ */
  var useAutoCostEl = $('fMenuUseAutoCost');
  if (useAutoCostEl) {
    data.useAutoCost = hasClass(useAutoCostEl, 'on');
  }
  
  /* รูปเมนู (เฉพาะ Pro) */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_menu_image')) {
    var imageUrl = ($('fMenuImage') || {}).value.trim();
    if (imageUrl) {
      data.image = imageUrl;
    }
  }

  if (id) {
    ST.updateMenuItem(id, data);
    toast('อัพเดตเมนูแล้ว', 'success');
  } else {
    ST.addMenuItem(data);
    toast('เพิ่มเมนูแล้ว', 'success');
  }

  closeMForce();
  if (typeof renderMenuView === 'function') renderMenuView();
  if (typeof renderPOSView === 'function') renderPOSView();
}

function deleteMenuFromModal() {
  var id = ($('fMenuId') || {}).value;
  if (!id) return;
  confirmDialog('ต้องการลบเมนูนี้?', function() {
    ST.deleteMenuItem(id);
    closeMForce();
    toast('ลบเมนูแล้ว', 'warning');
    if (typeof renderMenuView === 'function') renderMenuView();
    if (typeof renderPOSView === 'function') renderPOSView();
  });
}

/* ============================================
   MODAL: EDIT CATEGORY
   ============================================ */
function modalEditCategory(cat) {
  var isNew = !cat;
  var c = cat || {};

  var emojiList = ['☕', '🍵', '🧋', '🍰', '🥤', '🧁', '🍕', '🍔', '🥐', '🍫', '🍪', '🧊', '🥛', '💧', '🍋', '🍓', '📦'];

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อหมวดหมู่ *</label>';
  html += '<input type="text" id="fCatName" value="' + sanitize(c.name || '') + '" placeholder="เช่น กาแฟ">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">ไอคอน</label>';
  html += '<div class="flex flex-wrap gap-8">';
  for (var i = 0; i < emojiList.length; i++) {
    var selCls = (c.icon === emojiList[i]) ? ' active' : '';
    html += '<button class="size-option' + selCls + '" style="flex:none;width:44px;height:44px;font-size:22px;padding:0;display:flex;align-items:center;justify-content:center;" data-emoji="' + emojiList[i] + '" onclick="selectCatEmoji(this)">' + emojiList[i] + '</button>';
  }
  html += '</div>';
  html += '</div>';

  html += '<input type="hidden" id="fCatId" value="' + sanitize(c.id || '') + '">';
  html += '<input type="hidden" id="fCatIcon" value="' + sanitize(c.icon || '📦') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteCatFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveCatFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มหมวดหมู่' : '✏️ แก้ไขหมวดหมู่', html, footer);
}

function selectCatEmoji(el) {
  var siblings = el.parentNode.querySelectorAll('.size-option');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');
  var hidden = $('fCatIcon');
  if (hidden) hidden.value = el.getAttribute('data-emoji');
  vibrate(20);
}

function saveCatFromModal() {
  var id = ($('fCatId') || {}).value;
  var name = ($('fCatName') || {}).value.trim();
  var icon = ($('fCatIcon') || {}).value || '📦';
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }

  if (id) {
    ST.updateCategory(id, { name: name, icon: icon });
    toast('อัพเดตแล้ว', 'success');
  } else {
    ST.addCategory({ name: name, icon: icon });
    toast('เพิ่มแล้ว', 'success');
  }
  closeMForce();
  if (typeof renderMenuView === 'function') renderMenuView();
}

function deleteCatFromModal() {
  var id = ($('fCatId') || {}).value;
  if (!id) return;
  confirmDialog('ลบหมวดหมู่นี้?', function() {
    ST.deleteCategory(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    if (typeof renderMenuView === 'function') renderMenuView();
  });
}

/* ============================================
   MODAL: EDIT TOPPING
   ============================================ */
function modalEditTopping(tp) {
  var isNew = !tp;
  var t = tp || {};

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อ *</label>';
  html += '<input type="text" id="fTpName" value="' + sanitize(t.name || '') + '" placeholder="เช่น วิปครีม">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ราคาเพิ่ม (฿)</label>';
  html += '<input type="number" id="fTpPrice" value="' + (t.price || '') + '" placeholder="0" min="0" inputmode="numeric">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (t.active !== false ? ' on' : '') + '" id="fTpActive"></div>';
  html += '<span>เปิดใช้งาน</span>';
  html += '</label>';
  html += '</div>';
  html += '<input type="hidden" id="fTpId" value="' + sanitize(t.id || '') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteTpFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveTpFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่ม Topping' : '✏️ แก้ไข Topping', html, footer);
}

function saveTpFromModal() {
  var id = ($('fTpId') || {}).value;
  var name = ($('fTpName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }

  if (id) {
    ST.updateTopping(id, { name: name, price: parseFloat(($('fTpPrice') || {}).value) || 0, active: hasClass($('fTpActive'), 'on') });
    toast('อัพเดตแล้ว', 'success');
  } else {
    ST.addTopping({ name: name, price: parseFloat(($('fTpPrice') || {}).value) || 0, active: hasClass($('fTpActive'), 'on') });
    toast('เพิ่มแล้ว', 'success');
  }
  closeMForce();
  if (typeof renderMenuView === 'function') renderMenuView();
}

function deleteTpFromModal() {
  var id = ($('fTpId') || {}).value;
  if (!id) return;
  confirmDialog('ลบ Topping นี้?', function() {
    ST.deleteTopping(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    if (typeof renderMenuView === 'function') renderMenuView();
  });
}

/* ============================================
   MODAL: STOCK ITEM (พร้อมหน่วยใหญ่)
   ============================================ */
function modalEditStock(item) {
  var isNew = !item;
  var s = item || {};

  /* คำนวณค่าสำหรับแสดงผล */
  var bigQty = 0;
  var smallQty = 0;
  var bigUnitSize = s.bigUnitSize || 0;
  var totalQty = s.qty || 0;
  
  if (bigUnitSize > 0 && s.bigUnit) {
    bigQty = Math.floor(totalQty / bigUnitSize);
    smallQty = totalQty % bigUnitSize;
  }

  var stockCats = ST.getStockCategories();

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อวัตถุดิบ *</label>';
  html += '<input type="text" id="fStkName" value="' + sanitize(s.name || '') + '" placeholder="เช่น เมล็ดกาแฟ, ถุงพลาสติก">';
  html += '</div>';
  
  /* หมวดหมู่ */
  html += '<div class="form-group">';
  html += '<label class="form-label">หมวดหมู่</label>';
  html += '<select id="fStkCategory">';
  html += '<option value="">-- ไม่ระบุหมวดหมู่ --</option>';
  for (var i = 0; i < stockCats.length; i++) {
    var selected = (s.categoryId === stockCats[i].id) ? ' selected' : '';
    html += '<option value="' + stockCats[i].id + '"' + selected + '>' + (stockCats[i].icon || '📦') + ' ' + sanitize(stockCats[i].name) + '</option>';
  }
  html += '</select>';
  html += '</div>';
  
  /* หน่วยย่อย + หน่วยใหญ่ */
  html += '<div class="form-row">';
  html += '<div class="form-group"><label class="form-label">หน่วยย่อย</label>';
  html += '<input type="text" id="fStkUnit" value="' + sanitize(s.unit || '') + '" placeholder="ml, g, ใบ, ชิ้น"></div>';
  html += '<div class="form-group"><label class="form-label">หน่วยใหญ่ (optional)</label>';
  html += '<input type="text" id="fStkBigUnit" value="' + sanitize(s.bigUnit || '') + '" placeholder="เช่น กล่อง, แพ็ค, ถุง"></div>';
  html += '</div>';
  
  /* ขนาดต่อหน่วยใหญ่ */
  html += '<div class="form-row">';
  html += '<div class="form-group"><label class="form-label">1 หน่วยใหญ่ =</label>';
  html += '<input type="number" id="fStkBigUnitSize" value="' + (s.bigUnitSize || '') + '" placeholder="1000" min="0" step="1" oninput="updateStockTotalQty()"></div>';
  html += '<div class="form-group"><label class="form-label" style="visibility:hidden;">.</label>';
  html += '<input type="text" id="fStkBigUnitDisplay" value="' + sanitize(s.unit || '') + '" readonly style="background:transparent;border:none;font-weight:600;" disabled></div>';
  html += '</div>';
  
  /* จำนวนคงเหลือ (แยกหน่วยใหญ่ + หน่วยย่อย) */
  html += '<div class="form-group">';
  html += '<label class="form-label">จำนวนคงเหลือ</label>';
  html += '<div class="form-row">';
  html += '<div class="form-group"><input type="number" id="fStkBigQty" value="' + bigQty + '" placeholder="0" min="0" step="1" oninput="updateStockTotalQty()"></div>';
  if (s.bigUnit) {
    html += '<div class="form-group"><input type="text" value="' + sanitize(s.bigUnit) + '" readonly style="background:transparent;border:none;font-weight:600;"></div>';
  } else {
    html += '<div class="form-group"><input type="text" value="หน่วยใหญ่" readonly disabled style="background:transparent;border:none;"></div>';
  }
  html += '<div class="form-group"><input type="number" id="fStkSmallQty" value="' + smallQty + '" placeholder="0" min="0" step="1" oninput="updateStockTotalQty()"></div>';
  html += '<div class="form-group"><input type="text" id="fStkUnitDisplay" value="' + sanitize(s.unit || '') + '" readonly style="background:transparent;border:none;font-weight:600;"></div>';
  html += '</div>';
  html += '</div>';
  
  /* คงเหลือรวม (หน่วยย่อย) - readonly */
  html += '<div class="form-group">';
  html += '<label class="form-label">คงเหลือรวม (หน่วยย่อย)</label>';
  html += '<input type="number" id="fStkTotalQty" value="' + (s.qty || 0) + '" readonly style="background:var(--bg-input);opacity:0.8;">';
  html += '</div>';
  
  /* ราคาต่อหน่วยใหญ่ */
  html += '<div class="form-group">';
  html += '<label class="form-label">ราคาต่อหน่วยใหญ่ (฿)</label>';
  html += '<input type="number" id="fStkBigPrice" value="' + ((s.costPerUnit || 0) * (s.bigUnitSize || 1)).toFixed(2) + '" placeholder="0" min="0" step="0.01" oninput="updateStockCostAuto()">';
  html += '</div>';
  
  /* ต้นทุน/หน่วยย่อย (คำนวณอัตโนมัติ) */
  html += '<div class="form-group">';
  html += '<label class="form-label">ต้นทุน/หน่วยย่อย (฿) - คำนวณอัตโนมัติ</label>';
  html += '<input type="number" id="fStkCostAuto" value="' + (s.costPerUnit || 0).toFixed(4) + '" step="0.0001" readonly style="background:var(--bg-input);">';
  html += '</div>';
  
  /* แจ้งเตือน */
  html += '<div class="form-group">';
  html += '<label class="form-label">แจ้งเตือนเมื่อเหลือ (หน่วยย่อย)</label>';
  html += '<input type="number" id="fStkMin" value="' + (s.minQty || 0) + '" placeholder="0" min="0" step="1">';
  html += '</div>';
  
  html += '<div class="form-hint">💡 ถ้ากรอกหน่วยใหญ่ ระบบจะแสดงผลเป็น "X กล่อง Y ml" อัตโนมัติ</div>';
  
  html += '<input type="hidden" id="fStkId" value="' + sanitize(s.id || '') + '">';
  html += '<input type="hidden" id="fStkOldUnit" value="' + sanitize(s.unit || '') + '">';
  html += '<input type="hidden" id="fStkOldBigUnit" value="' + sanitize(s.bigUnit || '') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteStkFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveStkFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มวัตถุดิบ' : '✏️ แก้ไขวัตถุดิบ', html, footer);

  initStockModalCalculations();
}

function saveStkFromModal() {
  var id = ($('fStkId') || {}).value;
  var name = ($('fStkName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  
  var unit = ($('fStkUnit') || {}).value.trim();
  var bigUnit = ($('fStkBigUnit') || {}).value.trim();
  var bigUnitSize = parseFloat(($('fStkBigUnitSize') || {}).value) || 0;
  var totalQty = parseFloat(($('fStkTotalQty') || {}).value) || 0;
  var costPerUnit = parseFloat(($('fStkCostAuto') || {}).value) || 0;
  var minQty = parseFloat(($('fStkMin') || {}).value) || 0;
  var categoryId = ($('fStkCategory') || {}).value;
  
  var data = {
    name: name,
    unit: unit || 'ชิ้น',
    qty: totalQty,
    minQty: minQty,
    costPerUnit: costPerUnit,
    bigUnit: bigUnit,
    bigUnitSize: bigUnitSize
  };
  
  if (categoryId) {
    data.categoryId = categoryId;
  }
  
  if (id) { 
    ST.updateStockItem(id, data); 
    toast('อัพเดตแล้ว', 'success'); 
  } else { 
    ST.addStockItem(data); 
    toast('เพิ่มแล้ว', 'success'); 
  }
  
  closeMForce();
  if (typeof renderStockView === 'function') renderStockView();
}

function deleteStkFromModal() {
  var id = ($('fStkId') || {}).value;
  if (!id) return;
  confirmDialog('ลบวัตถุดิบนี้?', function() {
    ST.deleteStockItem(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    if (typeof renderStockView === 'function') renderStockView();
  });
}

/* ============================================
   STOCK CALCULATION FUNCTIONS
   ============================================ */
function updateStockTotalQty() {
  var bigQtyInput = $('fStkBigQty');
  var smallQtyInput = $('fStkSmallQty');
  var bigUnitSizeInput = $('fStkBigUnitSize');
  var totalQtyInput = $('fStkTotalQty');
  
  if (!bigQtyInput || !smallQtyInput || !bigUnitSizeInput || !totalQtyInput) return;
  
  var bigQty = parseFloat(bigQtyInput.value) || 0;
  var smallQty = parseFloat(smallQtyInput.value) || 0;
  var bigUnitSize = parseFloat(bigUnitSizeInput.value) || 0;
  
  var totalQty = (bigQty * bigUnitSize) + smallQty;
  totalQtyInput.value = totalQty;
  
  updateStockCostAuto();
}

function updateStockCostAuto() {
  var bigPriceInput = $('fStkBigPrice');
  var bigUnitSizeInput = $('fStkBigUnitSize');
  var costAutoInput = $('fStkCostAuto');
  
  if (!bigPriceInput || !bigUnitSizeInput || !costAutoInput) return;
  
  var bigPrice = parseFloat(bigPriceInput.value) || 0;
  var bigUnitSize = parseFloat(bigUnitSizeInput.value) || 0;
  
  if (bigUnitSize > 0) {
    var unitCost = bigPrice / bigUnitSize;
    costAutoInput.value = unitCost.toFixed(4);
  } else {
    costAutoInput.value = bigPrice.toFixed(4);
  }
}

function initStockModalCalculations() {
  setTimeout(function() {
    updateStockTotalQty();
  }, 150);
}

/* ============================================
   MODAL: STOCK ADJUST
   ============================================ */
function modalStockAdjust(item, type) {
  if (!item) return;
  var isAdd = type === 'add';

  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div class="fw-700 fs-lg">' + sanitize(item.name) + '</div>';
  var displayQty = formatStockQty(item.qty, item.unit, item.bigUnit, item.bigUnitSize);
  html += '<div class="text-muted">คงเหลือ: ' + displayQty + '</div>';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">จำนวน (' + sanitize(item.unit) + ')</label>';
  html += '<input type="number" id="fAdjQty" value="" placeholder="0" min="0" inputmode="numeric" style="font-size:24px;text-align:center;">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">หมายเหตุ</label>';
  html += '<input type="text" id="fAdjReason" value="" placeholder="เช่น รับของเข้าร้าน">';
  html += '</div>';
  html += '<input type="hidden" id="fAdjId" value="' + sanitize(item.id) + '">';
  html += '<input type="hidden" id="fAdjType" value="' + (isAdd ? 'add' : 'use') + '">';

  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn ' + (isAdd ? 'btn-success' : 'btn-warning') + '" onclick="confirmStockAdjust()">' + (isAdd ? '📥 รับเข้า' : '📤 ใช้ไป') + '</button>';

  openModal(isAdd ? '📥 ' + sanitize(item.name) : '📤 ' + sanitize(item.name), html, footer);
}

function confirmStockAdjust() {
  var id = ($('fAdjId') || {}).value;
  var type = ($('fAdjType') || {}).value;
  var qty = parseFloat(($('fAdjQty') || {}).value) || 0;
  var reason = ($('fAdjReason') || {}).value.trim();
  if (qty <= 0) { toast('กรุณาใส่จำนวน', 'error'); return; }
  var actualQty = type === 'add' ? qty : -qty;
  ST.adjustStock(id, actualQty, reason || (type === 'add' ? 'รับเข้า' : 'ใช้ไป'));
  closeMForce();
  toast(type === 'add' ? 'รับเข้า +' + qty : 'ใช้ไป -' + qty, 'success');
  if (typeof renderStockView === 'function') renderStockView();
}

/* ============================================
   MODAL: ORDER DETAIL
   ============================================ */
function modalOrderDetail(order) {
  if (!order) return;
  var cfg = ST.getConfig();

  var statusBadge = order.status === 'cancelled'
    ? '<span class="badge badge-danger">ยกเลิก</span>'
    : '<span class="badge badge-success">สำเร็จ</span>';

  var html = '';
  html += '<div class="flex-between mb-16">';
  html += '<div>';
  html += '<div class="fw-800 fs-lg text-accent">' + cfg.orderPrefix + padZ(order.number) + '</div>';
  html += '<div class="text-muted fs-sm">' + sanitize(order.date) + ' ' + sanitize(order.time) + '</div>';
if (order.channelName) {
  html += '<div class="fs-sm"><span class="badge badge-info">' + sanitize(order.channelName) + '</span></div>';
  }
  html += '</div>';
  html += statusBadge;
  html += '</div>';

  html += '<div class="card p-16 mb-16">';
  var items = order.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (i > 0) html += '<div style="border-top:1px solid var(--border);margin:8px 0;"></div>';
    html += '<div class="flex-between">';
    html += '<div>';
    html += '<div class="fw-600">' + sanitize(it.name);
    if (it.drinkTypeName) html += ' <span class="badge badge-info" style="font-size:10px;">' + sanitize(it.drinkTypeName) + '</span>';
    if (it.size) html += ' <span class="badge badge-accent" style="font-size:10px;">' + sanitize(it.size) + '</span>';
    html += '</div>';
    if (it.sweetName) html += '<div class="text-muted fs-sm">🍯 ' + sanitize(it.sweetName) + '</div>';
    if (it.toppingNames && it.toppingNames.length > 0) html += '<div class="text-muted fs-sm">+ ' + it.toppingNames.join(', ') + '</div>';
    if (it.note) html += '<div class="text-muted fs-sm">📝 ' + sanitize(it.note) + '</div>';
    html += '</div>';
    html += '<div class="text-right">';
    html += '<div class="fw-600">x' + it.qty + '</div>';
    html += '<div class="text-accent fw-700">' + formatMoneySign(it.lineTotal) + '</div>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="card p-16">';
  html += '<div class="flex-between mb-8"><span>ยอดรวม</span><span>' + formatMoneySign(order.subtotal) + '</span></div>';
  if (order.discount > 0) html += '<div class="flex-between mb-8 text-danger"><span>ส่วนลด</span><span>-' + formatMoneySign(order.discount) + '</span></div>';
  if (order.vat > 0) html += '<div class="flex-between mb-8"><span>VAT</span><span>+' + formatMoneySign(order.vat) + '</span></div>';
  if (order.serviceCharge > 0) html += '<div class="flex-between mb-8"><span>SC</span><span>+' + formatMoneySign(order.serviceCharge) + '</span></div>';
  html += '<div class="flex-between fw-800 fs-lg" style="border-top:2px solid var(--border);padding-top:10px;margin-top:8px;"><span>รวม</span><span class="text-accent">' + formatMoneySign(order.total) + '</span></div>';
  var payLabels = { cash: '💵 เงินสด', transfer: '📱 โอน', qr: '📷 QR' };
  html += '<div class="flex-between mt-8 fs-sm text-muted"><span>ชำระ</span><span>' + (payLabels[order.payment] || order.payment) + '</span></div>';
  if (order.payment === 'cash') {
    html += '<div class="flex-between fs-sm text-muted"><span>รับ</span><span>' + formatMoneySign(order.received) + '</span></div>';
    html += '<div class="flex-between fs-sm"><span>ทอน</span><span class="text-success fw-600">' + formatMoneySign(order.change) + '</span></div>';
  }
  html += '</div>';

  var footer = '';
  if (order.status !== 'cancelled') footer += '<button class="btn btn-danger btn-sm" onclick="cancelOrderFromModal(\'' + sanitize(order.id) + '\')">❌ ยกเลิก</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  footer += '<button class="btn btn-primary" onclick="modalReceipt(window._detailOrder)">🧾 ใบเสร็จ</button>';

  window._detailOrder = order;
  openModal('📜 ออเดอร์ ' + cfg.orderPrefix + padZ(order.number), html, footer);
}

function cancelOrderFromModal(orderId) {
  confirmDialog('ยกเลิกออเดอร์นี้?', function() {
    ST.cancelOrder(orderId);
    closeMForce();
    toast('ยกเลิกแล้ว', 'warning');
    if (typeof renderOrdersView === 'function') renderOrdersView();
  });
}

/* ============================================
   MODAL: STAFF
   ============================================ */
function modalEditStaff(staff) {
  var isNew = !staff;
  var s = staff || {};
  var isManager = (APP.currentStaff && APP.currentStaff.role === 'manager');
  var customPerms = s.customPermissions || {};
  
  /* รายการเมนูทั้งหมด */
  var allMenus = [
    { id: 'pos', name: '🛒 POS', default: true },
    { id: 'menu', name: '📋 จัดการเมนู', default: false },
    { id: 'orders', name: '📜 ออเดอร์', default: true },
    { id: 'report', name: '📊 รายงาน', default: false },
    { id: 'stock', name: '📦 Stock', default: false },
    { id: 'staff', name: '👥 พนักงาน', default: false },
    { id: 'members', name: '👤 สมาชิก', default: false },
    { id: 'recipe', name: '🧪 สูตรวัตถุดิบ', default: false },
    { id: 'admin', name: '⚙️ ตั้งค่า', default: false }
  ];
  
  var html = '';
  
  /* ข้อมูลทั่วไป */
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อ *</label>';
  html += '<input type="text" id="fStaffName" value="' + sanitize(s.name || '') + '" placeholder="สมชาย">';
  html += '</div>';
  
  /* รหัสผ่าน */
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">' + (isNew ? 'PIN 4 หลัก *' : 'PIN ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)') + '</label>';
  html += '<input type="password" id="fStaffPin" value="" placeholder="0000" maxlength="4" inputmode="numeric" style="font-size:20px;text-align:center;">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ยืนยัน PIN</label>';
  html += '<input type="password" id="fStaffConfirmPin" value="" placeholder="0000" maxlength="4" inputmode="numeric" style="font-size:20px;text-align:center;">';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ตำแหน่ง</label>';
  html += '<select id="fStaffRole">';
  html += '<option value="cashier"' + (s.role === 'cashier' ? ' selected' : '') + '>แคชเชียร์</option>';
  html += '<option value="barista"' + (s.role === 'barista' ? ' selected' : '') + '>บาริสต้า</option>';
  html += '<option value="manager"' + (s.role === 'manager' ? ' selected' : '') + '>ผู้จัดการ</option>';
  html += '</select>';
  html += '</div>';
  
  /* สิทธิ์การเข้าถึงเมนู (เฉพาะ manager เท่านั้นที่ตั้งได้) */
  if (isManager && s.role !== 'manager') {
    html += '<div class="card p-16 mt-16" style="border-color:var(--accent2);">';
    html += '<div class="fw-700 mb-8">🔐 สิทธิ์การเข้าถึงเมนู</div>';
    html += '<div class="text-muted fs-sm mb-12">เลือกเมนูที่พนักงานคนนี้สามารถเข้าได้</div>';
    
    for (var i = 0; i < allMenus.length; i++) {
      var menu = allMenus[i];
      var isChecked = (customPerms[menu.id] !== undefined) ? customPerms[menu.id] : menu.default;
      html += '<label class="checkbox-wrap" style="margin-bottom:8px;">';
      html += '<input type="checkbox" class="staff-permission-chk" data-view="' + menu.id + '" ' + (isChecked ? 'checked' : '') + '>';
      html += '<span>' + menu.name + '</span>';
      html += '</label>';
    }
    
    html += '</div>';
  }
  
  html += '<div class="form-group mt-8">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (s.active !== false ? ' on' : '') + '" id="fStaffActive"></div>';
  html += '<span>เปิดใช้งาน</span>';
  html += '</label>';
  html += '</div>';
  
  html += '<input type="hidden" id="fStaffId" value="' + sanitize(s.id || '') + '">';
  
  var footer = '';
  if (!isNew && isManager) footer += '<button class="btn btn-danger btn-sm" onclick="deleteStaffFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveStaffFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';
  
  openModal(isNew ? '➕ เพิ่มพนักงาน' : '✏️ แก้ไขพนักงาน', html, footer);
}

function saveStaffFromModal() {
  var id = ($('fStaffId') || {}).value;
  var name = ($('fStaffName') || {}).value.trim();
  var newPin = ($('fStaffPin') || {}).value.trim();
  var confirmPin = ($('fStaffConfirmPin') || {}).value.trim();
  
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  
  if (newPin) {
    if (newPin.length !== 4) { toast('PIN ต้อง 4 หลัก', 'error'); return; }
    if (newPin !== confirmPin) { toast('รหัสไม่ตรงกัน', 'error'); return; }
  } else if (!id) {
    toast('กรุณาใส่ PIN', 'error');
    return;
  }
  
  var role = ($('fStaffRole') || {}).value || 'cashier';
  var active = hasClass($('fStaffActive'), 'on');
  var customPermissions = {};
  
  /* บันทึก custom permissions */
  var permCheckboxes = qsa('.staff-permission-chk');
  for (var i = 0; i < permCheckboxes.length; i++) {
    var view = permCheckboxes[i].getAttribute('data-view');
    customPermissions[view] = permCheckboxes[i].checked;
  }
  
  var data = { 
    name: name, 
    role: role, 
    active: active
  };
  
  if (newPin) data.pin = newPin;
  if (Object.keys(customPermissions).length > 0) data.customPermissions = customPermissions;
  
  if (id) { 
    /* ถ้าไม่เปลี่ยนรหัส ต้องเก็บรหัสเดิม */
    if (!newPin) {
      var existing = findById(ST.getStaff(), id);
      if (existing) data.pin = existing.pin;
    }
    ST.updateStaff(id, data); 
    toast('อัพเดตพนักงานแล้ว', 'success'); 
  } else { 
    ST.addStaff(data); 
    toast('เพิ่มพนักงานแล้ว', 'success'); 
  }
  
  closeMForce();
  
  /* อัปเดต sidebar */
  if (typeof updateSidebarByStaffPermission === 'function') {
    updateSidebarByStaffPermission();
  }
  
  if (typeof renderStaffView === 'function') {
    renderStaffView();
  } else {
    nav('staff');
  }
}

/* รีเซ็ตรหัสพนักงาน (Manager เท่านั้น) */
function resetStaffPassword(staffId) {
  promptDialog('รหัสใหม่ 4 หลัก:', '0000', function(newPin) {
    if (!newPin || newPin.length !== 4) {
      toast('PIN ต้อง 4 หลัก', 'error');
      return;
    }

    confirmDialog('รีเซ็ตรหัสพนักงานคนนี้?', function() {
      ST.updateStaff(staffId, { pin: newPin });
      toast('รีเซ็ตรหัสสำเร็จ', 'success');
      closeMForce();
      if (typeof renderStaffView === 'function') renderStaffView();
    });
  });
}

function deleteStaffFromModal() {
  var id = ($('fStaffId') || {}).value;
  if (!id) return;
  confirmDialog('ลบพนักงานนี้?', function() {
    ST.deleteStaff(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    /* redirect ไปหน้า staff */
    if (typeof renderStaffView === 'function') {
      renderStaffView();
    } else {
      nav('staff');
    }
  });
}
/* ============================================
   TOGGLE HELPER
   ============================================ */
function toggleToggle(wrap) {
  var toggle = wrap.querySelector('.toggle');
  if (toggle) toggleClass(toggle, 'on');
  vibrate(20);
}
/* ============================================
   MODAL CLICK HANDLER - ป้องกันปิดเมื่อคลิกพื้นหลัง
   ============================================ */
(function() {
  if (window._modalClickListenerAdded) return;
  window._modalClickListenerAdded = true;
  
  document.addEventListener('click', function(e) {
    var overlay = document.getElementById('modalOverlay');
    
    if (e.target === overlay && _modalOpen) {
      var disableClose = overlay.getAttribute('data-disable-close');
      if (disableClose !== 'true') {
        var modalBody = document.getElementById('modalBody');
        var hasUnsavedData = false;
        
        if (modalBody) {
          var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
          for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.value && el.value.trim() !== '') {
              hasUnsavedData = true;
              break;
            }
          }
        }
        
        if (hasUnsavedData) {
          confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
        } else {
          closeMForce();
        }
      }
    }
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _modalOpen) {
      var overlay = document.getElementById('modalOverlay');
      var disableClose = overlay ? overlay.getAttribute('data-disable-close') : null;
      if (disableClose !== 'true') {
        var modalBody = document.getElementById('modalBody');
        var hasUnsavedData = false;
        
        if (modalBody) {
          var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
          for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.value && el.value.trim() !== '') {
              hasUnsavedData = true;
              break;
            }
          }
        }
        
        if (hasUnsavedData) {
          confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
        } else {
          closeMForce();
        }
      }
    }
  });
})();

/* ============================================
   ตรวจสอบว่าอยู่หน้า POS หรือไม่
   ============================================ */
function isPOSPage() {
  if (typeof APP !== 'undefined' && APP && APP.currentView === 'pos') {
    return true;
  }
  /* ตรวจสอบจาก URL ด้วย */
  if (window.location.hash && window.location.hash.indexOf('pos') !== -1) {
    return true;
  }
  return false;
}

/* ============================================
   ป้องกันปิด modal เมื่อคลิกพื้นหลัง (ยกเว้นหน้า POS)
   ============================================ */
(function() {
  if (window._modalClickListenerAdded) return;
  window._modalClickListenerAdded = true;
  
  document.addEventListener('click', function(e) {
    var overlay = document.getElementById('modalOverlay');
    
    if (e.target === overlay && _modalOpen) {
      /* ถ้าอยู่หน้า POS ให้ปิดเลย */
      if (isPOSPage()) {
        closeMForce();
        return;
      }
      
      var disableClose = overlay.getAttribute('data-disable-close');
      if (disableClose !== 'true') {
        var modalBody = document.getElementById('modalBody');
        var hasUnsavedData = false;
        
        if (modalBody) {
          var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
          for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.value && el.value.trim() !== '') {
              hasUnsavedData = true;
              break;
            }
          }
        }
        
        if (hasUnsavedData) {
          confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
        } else {
          closeMForce();
        }
      }
    }
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _modalOpen) {
      /* ถ้าอยู่หน้า POS ให้ปิดเลย */
      if (isPOSPage()) {
        closeMForce();
        return;
      }
      
      var overlay = document.getElementById('modalOverlay');
      var disableClose = overlay ? overlay.getAttribute('data-disable-close') : null;
      if (disableClose !== 'true') {
        var modalBody = document.getElementById('modalBody');
        var hasUnsavedData = false;
        
        if (modalBody) {
          var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
          for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.value && el.value.trim() !== '') {
              hasUnsavedData = true;
              break;
            }
          }
        }
        
        if (hasUnsavedData) {
          confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
        } else {
          closeMForce();
        }
      }
    }
  });
})();
/* ============================================
   จัดการคลิกที่พื้นหลัง modal
   ============================================ */
function handleModalOverlayClick(event) {
  /* ถ้าคลิกที่ overlay เท่านั้น */
  if (event.target !== event.currentTarget) return;
  
  /* ตรวจสอบว่าเป็นหน้า POS หรือไม่ */
  var isPOS = false;
  if (typeof APP !== 'undefined' && APP && APP.currentView === 'pos') {
    isPOS = true;
  }
  if (window.location.hash && window.location.hash.indexOf('pos') !== -1) {
    isPOS = true;
  }
  
  /* ถ้าเป็นหน้า POS ปิดเลย */
  if (isPOS) {
    closeMForce();
    return;
  }
  
  /* ตรวจสอบว่ามีข้อมูลในฟอร์มหรือไม่ */
  var modalBody = document.getElementById('modalBody');
  var hasUnsavedData = false;
  
  if (modalBody) {
    var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.value && el.value.trim() !== '') {
        hasUnsavedData = true;
        break;
      }
    }
  }
  
  if (hasUnsavedData) {
    confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
  } else {
    closeMForce();
  }
}

/* ปิด modal แบบบังคับ */
function closeMForce() {
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  if (overlay) {
    overlay.className = 'modal-overlay';
  }
  if (box) {
    box.className = 'modal-box';
  }
  _modalOpen = false;
}
/* ============================================
   MODAL TOUCH HANDLER - สำหรับ iPad/Mobile
   ============================================ */

function closeModalOnTouch(e) {
  var overlay = document.getElementById('modalOverlay');
  
  // ตรวจสอบว่าคลิกที่ overlay และ modal เปิดอยู่
  if (e.target === overlay && _modalOpen) {
    e.preventDefault();
    
    // delay เล็กน้อยเพื่อให้ UI รู้สึก smooth
    setTimeout(function() {
      if (!_modalOpen) return;
      
      var modalBody = document.getElementById('modalBody');
      var hasUnsavedData = false;
      
      if (modalBody) {
        var inputs = modalBody.querySelectorAll('input:not([type=hidden]), select, textarea');
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].value && inputs[i].value.trim() !== '') {
            hasUnsavedData = true;
            break;
          }
        }
      }
      
      if (hasUnsavedData) {
        confirmDialog('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?', closeMForce);
      } else {
        closeMForce();
      }
    }, 50);
  }
}

/* เพิ่ม event listeners (ถ้ายังไม่มี) */
(function() {
  if (window._modalTouchListenerAdded) return;
  window._modalTouchListenerAdded = true;
  
  // ทั้ง click และ touchstart
  document.addEventListener('click', closeModalOnTouch);
  document.addEventListener('touchstart', closeModalOnTouch);
  
  console.log('[Modal] Touch handlers added for iPad');
})();

console.log('[modals.js] loaded');