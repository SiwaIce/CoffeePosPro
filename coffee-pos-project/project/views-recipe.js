/* ============================================
   COFFEE POS — VIEWS-RECIPE.JS
   จัดการ Recipe / วัตถุดิบต่อเมนู
   Version: 1.0
   ============================================ */

/* Recipe View State */
var RECIPE_VIEW = {
  selectedMenuId: null,
  selectedSize: null
};

/* ============================================
   RENDER RECIPE MANAGEMENT PAGE
   ============================================ */
function renderRecipeView() {
  var main = $('mainContent');
  if (!main) return;
  
  /* Check if feature is enabled */
  if (!FeatureManager.isEnabled('pro_recipe')) {
    main.innerHTML = renderFeatureLocked('pro_recipe', '🧪 Recipe + COGS');
    return;
  }
  
  /* ตรวจสอบว่ามาจากหน้า Admin หรือไม่ */
  var isFromAdmin = !!document.getElementById('recipeViewContainer');
  
  var html = '<div class="page-pad anim-fadeUp">';
  
  /* เพิ่มปุ่มกลับถ้ามาจาก Admin */
  if (isFromAdmin) {
    html += '<div class="admin-back-btn mb-16">' +
      '<button class="btn btn-secondary btn-sm" onclick="switchAdmTab(\'shop\')">← กลับไปหน้า Admin</button>' +
      '</div>';
  }
  
  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">🧪 จัดการสูตรวัตถุดิบ (Recipe)</div>';
  html += '</div>';
  
  /* Description */
  html += '<div class="card-glass mb-16 p-16">';
  html += '<div class="flex gap-12" style="align-items:flex-start;">';
  html += '<span style="font-size:32px;">📖</span>';
  html += '<div>';
  html += '<div class="fw-700 mb-4">กำหนดสูตรแต่ละเมนู</div>';
  html += '<div class="text-muted fs-sm">ระบุว่าวัตถุดิบแต่ละชนิดใช้กี่หน่วยต่อ 1 แก้ว/ชิ้น</div>';
  html += '<div class="text-muted fs-sm mt-4">💡 ระบบจะคำนวณต้นทุนและหักสต็อกอัตโนมัติ (Pro)</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  
  /* Menu and Size Selector */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📋 เลือกเมนู</div></div>';
  
  /* Menu dropdown */
  html += '<div class="form-group">';
  html += '<label class="form-label">เมนู</label>';
  html += '<select id="recipeMenuSelect" onchange="onRecipeMenuChange()">';
  html += '<option value="">-- เลือกเมนู --</option>';
  
  var menuItems = ST.getActiveMenu();
  for (var i = 0; i < menuItems.length; i++) {
    var m = menuItems[i];
    var selected = (RECIPE_VIEW.selectedMenuId === m.id) ? ' selected' : '';
    html += '<option value="' + sanitize(m.id) + '"' + selected + '>' + (m.emoji || '☕') + ' ' + sanitize(m.name) + '</option>';
  }
  html += '</select>';
  html += '</div>';
  
  /* Size dropdown (show only if menu selected) */
  if (RECIPE_VIEW.selectedMenuId) {
    var selectedMenu = findById(menuItems, RECIPE_VIEW.selectedMenuId);
    var sizes = ST.getSizes();
    var availableSizes = [];
    
    if (selectedMenu && selectedMenu.prices) {
      for (var s = 0; s < sizes.length; s++) {
        if (selectedMenu.prices[sizes[s].name]) {
          availableSizes.push(sizes[s]);
        }
      }
    }
    
    html += '<div class="form-group">';
    html += '<label class="form-label">ขนาด</label>';
    html += '<select id="recipeSizeSelect" onchange="onRecipeSizeChange()">';
    html += '<option value="">-- เลือกขนาด --</option>';
    
    for (var sz = 0; sz < availableSizes.length; sz++) {
      var sizeName = availableSizes[sz].name;
      var selectedSize = (RECIPE_VIEW.selectedSize === sizeName) ? ' selected' : '';
      html += '<option value="' + sanitize(sizeName) + '"' + selectedSize + '>Size ' + sizeName + '</option>';
    }
    html += '</select>';
    html += '</div>';
  }
  
  html += '</div>';
  
  /* Recipe Editor (if menu and size selected) */
  if (RECIPE_VIEW.selectedMenuId && RECIPE_VIEW.selectedSize) {
    html += renderRecipeEditor(menuItems);
  } else if (RECIPE_VIEW.selectedMenuId && !RECIPE_VIEW.selectedSize) {
    html += '<div class="card p-20 text-center text-muted">กรุณาเลือกขนาด</div>';
  } else {
    html += '<div class="card p-20 text-center text-muted">กรุณาเลือกเมนูก่อน</div>';
  }
  
  /* Recipe List Summary */
  html += renderRecipeSummary();
  
  html += '</div>';
  main.innerHTML = html;
}
/* ============================================
   RENDER RECIPE EDITOR
   ============================================ */
function renderRecipeEditor(menuItems) {
  var selectedMenu = findById(menuItems, RECIPE_VIEW.selectedMenuId);
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  var stockItems = ST.getStock();  // ดึงข้อมูล Stock
  
  var html = '';
  
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">' + (selectedMenu.emoji || '☕') + ' ' + sanitize(selectedMenu.name) + ' (Size ' + RECIPE_VIEW.selectedSize + ')</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalAddRecipeIngredient()">➕ เพิ่มวัตถุดิบ</button>';
  html += '</div>';
  
  if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
    var totalCost = 0;
    for (var i = 0; i < recipe.ingredients.length; i++) {
      totalCost += recipe.ingredients[i].totalCost || 0;
    }
    var sellingPrice = selectedMenu.prices ? (selectedMenu.prices[RECIPE_VIEW.selectedSize] || 0) : 0;
    var profit = sellingPrice - totalCost;
    var profitMargin = sellingPrice > 0 ? roundTo((profit / sellingPrice) * 100, 1) : 0;
    
    html += '<div class="recipe-cost-summary mb-16">';
    html += '<div class="flex gap-12 flex-wrap">';
    html += '<div><span class="text-muted fs-sm">💰 ต้นทุนวัตถุดิบ</span><div class="fw-800 text-danger">' + formatMoneySign(totalCost) + '</div></div>';
    html += '<div><span class="text-muted fs-sm">🏷️ ราคาขาย</span><div class="fw-800 text-accent">' + formatMoneySign(sellingPrice) + '</div></div>';
    html += '<div><span class="text-muted fs-sm">📈 กำไร</span><div class="fw-800 text-success">' + formatMoneySign(profit) + '</div></div>';
    html += '<div><span class="text-muted fs-sm">📊 % กำไร</span><div class="fw-800">' + profitMargin + '%</div></div>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="table-wrap">';
    html += '<table class="recipe-ingredients-table">';
    html += '<thead><tr><th>วัตถุดิบ</th><th class="text-right">ปริมาณ</th><th class="text-right">ต้นทุน/หน่วย</th><th class="text-right">ต้นทุนรวม</th><th class="text-center"></th></thead>';
    html += '<tbody>';
    
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var ing = recipe.ingredients[i];
      var stockItem = findById(stockItems, ing.stockId);
      var unitCost = stockItem ? stockItem.costPerUnit : ing.unitCost;
      var lineCost = (ing.qty || 0) * (unitCost || 0);
      
      html += '<tr>';
      html += '<td class="fw-600">' + sanitize(ing.stockName) + '</td>';
      html += '<td class="text-right">' + formatNumber(ing.qty) + ' ' + sanitize(ing.unit) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(unitCost) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(lineCost) + '</td>';
      html += '<td class="text-center"><button class="btn-icon" onclick="modalEditRecipeIngredient(\'' + ing.stockId + '\')">✏️</button>';
      html += '<button class="btn-icon" onclick="removeRecipeIngredient(\'' + ing.stockId + '\')" style="color:var(--danger);">🗑</button></td>';
      html += '</tr>';
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    
  } else {
    html += '<div class="text-center p-20 text-muted">';
    html += '<div style="font-size:32px;margin-bottom:8px;">🧪</div>';
    html += '<div>ยังไม่มีสูตรสำหรับเมนูนี้</div>';
    html += '<div class="fs-sm mt-4">กด "เพิ่มวัตถุดิบ" เพื่อเริ่มต้น<br>วัตถุดิบจะดึงข้อมูลจาก Stock อัตโนมัติ</div>';
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

/* ============================================
   RENDER RECIPE SUMMARY (All recipes)
   ============================================ */
function renderRecipeSummary() {
  var recipes = ST.getRecipes();
  if (recipes.length === 0) return '';
  
  var menuItems = ST.getMenu();
  
  var html = '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📋 สรุปสูตรทั้งหมด</div></div>';
  
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><tr>';
  html += '<th>เมนู</th>';
  html += '<th>ขนาด</th>';
  html += '<th class="text-right">ต้นทุน</th>';
  html += '<th class="text-right">ราคาขาย</th>';
  html += '<th class="text-right">กำไร</th>';
  html += '<th class="text-right">% กำไร</th>';
  html += '</tr></thead>';
  html += '<tbody>';
  
  for (var i = 0; i < recipes.length; i++) {
    var r = recipes[i];
    var menu = findById(menuItems, r.menuId);
    if (!menu) continue;
    
    var totalCost = ST.calculateRecipeCost(r);
    var sellingPrice = menu.prices ? (menu.prices[r.size] || 0) : 0;
    var profit = sellingPrice - totalCost;
    var profitMargin = sellingPrice > 0 ? roundTo((profit / sellingPrice) * 100, 1) : 0;
    var marginClass = profitMargin >= 50 ? 'text-success' : (profitMargin >= 30 ? 'text-warning' : 'text-danger');
    
    html += '<tr style="cursor:pointer;" onclick="selectRecipeFromSummary(\'' + r.menuId + '\', \'' + r.size + '\')">';
    html += '<td class="fw-600">' + (menu.emoji || '☕') + ' ' + sanitize(menu.name) + '</td>';
    html += '<td>' + r.size + '</td>';
    html += '<td class="text-right text-danger">' + formatMoneySign(totalCost) + '</td>';
    html += '<td class="text-right text-accent">' + formatMoneySign(sellingPrice) + '</td>';
    html += '<td class="text-right text-success">' + formatMoneySign(profit) + '</td>';
    html += '<td class="text-right ' + marginClass + ' fw-700">' + profitMargin + '%</td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  return html;
}

/* ============================================
   FUNCTIONS
   ============================================ */
function onRecipeMenuChange() {
  var select = $('recipeMenuSelect');
  if (select) {
    RECIPE_VIEW.selectedMenuId = select.value;
    RECIPE_VIEW.selectedSize = null;
    renderRecipeView();
  }
}

function onRecipeSizeChange() {
  var select = $('recipeSizeSelect');
  if (select) {
    RECIPE_VIEW.selectedSize = select.value;
    renderRecipeView();
  }
}

function selectRecipeFromSummary(menuId, size) {
  RECIPE_VIEW.selectedMenuId = menuId;
  RECIPE_VIEW.selectedSize = size;
  renderRecipeView();
}

/* ============================================
   MODAL: ADD / EDIT RECIPE INGREDIENT
   ============================================ */
function modalAddRecipeIngredient() {
  var stockItems = ST.getStock();
  if (stockItems.length === 0) {
    toast('กรุณาเพิ่มวัตถุดิบใน Stock ก่อน', 'warning');
    return;
  }
  
  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">เลือกวัตถุดิบจาก Stock</label>';
  html += '<select id="recipeIngredientStockId" onchange="updateStockUnitAndCost()">';
  html += '<option value="">-- เลือกวัตถุดิบ --</option>';
  for (var i = 0; i < stockItems.length; i++) {
    var item = stockItems[i];
    var costDisplay = formatMoneySign(item.costPerUnit || 0);
    html += '<option value="' + sanitize(item.id) + '" data-unit="' + sanitize(item.unit) + '" data-cost="' + (item.costPerUnit || 0) + '">';
    html += sanitize(item.name) + ' (' + costDisplay + '/' + sanitize(item.unit) + ')';
    html += '</option>';
  }
  html += '</select>';
  html += '</div>';
  
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">ปริมาณที่ใช้</label>';
  html += '<input type="number" id="recipeIngredientQty" placeholder="0" value="1" step="0.1" oninput="updateIngredientCost()">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">หน่วย</label>';
  html += '<input type="text" id="recipeIngredientUnit" readonly style="background:var(--bg-input);opacity:0.8;">';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="card-glass p-12">';
  html += '<div class="flex-between">';
  html += '<span class="text-muted">ต้นทุนต่อหน่วย</span>';
  html += '<span id="displayUnitCost" class="fw-600">฿0.00</span>';
  html += '</div>';
  html += '<div class="flex-between mt-4">';
  html += '<span class="text-muted">ต้นทุนรวม</span>';
  html += '<span id="displayTotalCost" class="fw-700 text-accent">฿0.00</span>';
  html += '</div>';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveRecipeIngredient()">➕ เพิ่มวัตถุดิบ</button>';
  
  openModal('➕ เพิ่มวัตถุดิบในสูตร', html, footer);
}

function modalEditRecipeIngredient(stockId) {
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) return;
  
  var ingredient = null;
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) {
      ingredient = recipe.ingredients[i];
      break;
    }
  }
  
  if (!ingredient) return;
  
  var stockItems = ST.getStock();
  var stockItem = findById(stockItems, stockId);
  
  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">วัตถุดิบ</label>';
  html += '<input type="text" class="form-control" value="' + sanitize(stockItem ? stockItem.name : '') + '" disabled>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ปริมาณที่ใช้ (ต่อ 1 แก้ว/ชิ้น)</label>';
  html += '<input type="number" id="recipeIngredientQty" value="' + ingredient.qty + '" step="0.1">';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="updateRecipeIngredient(\'' + stockId + '\')">💾 บันทึก</button>';
  
  openModal('✏️ แก้ไขวัตถุดิบ', html, footer);
}

function saveRecipeIngredient() {
  var stockId = ($('recipeIngredientStockId') || {}).value;
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;
  
  if (!stockId || qty <= 0) {
    toast('กรุณาเลือกวัตถุดิบและระบุปริมาณ', 'error');
    return;
  }
  
  var stockItems = ST.getStock();
  var stockItem = findById(stockItems, stockId);
  
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) {
    recipe = {
      menuId: RECIPE_VIEW.selectedMenuId,
      size: RECIPE_VIEW.selectedSize,
      ingredients: []
    };
  }
  
  /* Check if ingredient already exists */
  var existingIdx = -1;
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) {
      existingIdx = i;
      break;
    }
  }
  
  var ingredient = {
    stockId: stockId,
    stockName: stockItem ? stockItem.name : '',
    qty: qty,
    unit: stockItem ? stockItem.unit : 'หน่วย'
  };
  
  if (existingIdx !== -1) {
    recipe.ingredients[existingIdx] = ingredient;
  } else {
    recipe.ingredients.push(ingredient);
  }
  
  ST.setRecipe(recipe);
  closeMForce();
  toast('เพิ่มวัตถุดิบในสูตรแล้ว', 'success');
  renderRecipeView();
}

function updateRecipeIngredient(stockId) {
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;
  
  if (qty <= 0) {
    toast('ปริมาณต้องมากกว่า 0', 'error');
    return;
  }
  
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) return;
  
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) {
      recipe.ingredients[i].qty = qty;
      break;
    }
  }
  
  ST.setRecipe(recipe);
  closeMForce();
  toast('อัพเดตวัตถุดิบแล้ว', 'success');
  renderRecipeView();
}

function removeRecipeIngredient(stockId) {
  confirmDialog('ลบวัตถุดิบนี้จากสูตร?', function() {
    var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
    if (!recipe) return;
    
    var newIngredients = [];
    for (var i = 0; i < recipe.ingredients.length; i++) {
      if (recipe.ingredients[i].stockId !== stockId) {
        newIngredients.push(recipe.ingredients[i]);
      }
    }
    recipe.ingredients = newIngredients;
    ST.setRecipe(recipe);
    toast('ลบวัตถุดิบแล้ว', 'warning');
    renderRecipeView();
  });
}

/* ============================================
   RENDER FEATURE LOCKED
   ============================================ */
function renderFeatureLocked(featureId, featureName) {
  return '<div class="page-pad text-center">' +
    '<div class="empty-state">' +
    '<div class="empty-icon">🔒</div>' +
    '<div class="empty-text fw-700 mb-4">' + featureName + '</div>' +
    '<div class="empty-text text-muted">ฟีเจอร์นี้ต้องมี Pro License</div>' +
    '<button class="btn btn-primary mt-16" onclick="LicenseManager.showLicenseModal()">🔑 อัปเกรดเป็น Pro</button>' +
    '</div></div>';
}

/* อัปเดตหน่วยและต้นทุนเมื่อเลือกวัตถุดิบ */
function updateStockUnitAndCost() {
  var select = $('recipeIngredientStockId');
  var selectedOption = select.options[select.selectedIndex];
  var unit = selectedOption.getAttribute('data-unit') || '';
  var unitCost = parseFloat(selectedOption.getAttribute('data-cost')) || 0;
  
  var unitInput = $('recipeIngredientUnit');
  if (unitInput) unitInput.value = unit;
  
  var displayUnitCost = $('displayUnitCost');
  if (displayUnitCost) displayUnitCost.textContent = formatMoneySign(unitCost);
  
  updateIngredientCost();
}

/* คำนวณต้นทุนรวมเมื่อเปลี่ยนปริมาณ */
function updateIngredientCost() {
  var select = $('recipeIngredientStockId');
  var selectedOption = select.options[select.selectedIndex];
  var unitCost = parseFloat(selectedOption.getAttribute('data-cost')) || 0;
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;
  
  var totalCost = unitCost * qty;
  var displayTotalCost = $('displayTotalCost');
  if (displayTotalCost) displayTotalCost.textContent = formatMoneySign(totalCost);
}

/* แก้ไข saveRecipeIngredient ให้ดึงข้อมูลจาก Stock */
function saveRecipeIngredient() {
  var select = $('recipeIngredientStockId');
  var stockId = select.value;
  if (!stockId) { toast('กรุณาเลือกวัตถุดิบ', 'error'); return; }
  
  var selectedOption = select.options[select.selectedIndex];
  var stockName = selectedOption.text.split(' (')[0];
  var unit = selectedOption.getAttribute('data-unit') || '';
  var unitCost = parseFloat(selectedOption.getAttribute('data-cost')) || 0;
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;
  
  if (qty <= 0) { toast('กรุณาใส่ปริมาณ', 'error'); return; }
  
  var stockItems = ST.getStock();
  var stockItem = findById(stockItems, stockId);
  
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) {
    recipe = {
      menuId: RECIPE_VIEW.selectedMenuId,
      size: RECIPE_VIEW.selectedSize,
      ingredients: []
    };
  }
  
  /* ตรวจสอบว่ามีวัตถุดิบนี้อยู่แล้วหรือไม่ */
  var existingIdx = -1;
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) {
      existingIdx = i;
      break;
    }
  }
  
  var ingredient = {
    stockId: stockId,
    stockName: stockName,
    qty: qty,
    unit: unit,
    unitCost: unitCost,
    totalCost: unitCost * qty
  };
  
  if (existingIdx !== -1) {
    recipe.ingredients[existingIdx] = ingredient;
  } else {
    recipe.ingredients.push(ingredient);
  }
  
  ST.setRecipe(recipe);
  closeMForce();
  toast('เพิ่มวัตถุดิบในสูตรแล้ว', 'success');
  renderRecipeView();
}
// ใน views-members.js ตอนต้น renderMembersView()
if (typeof window !== 'undefined' && window.location && window.location.hash === '#admin') {
  html = '<div class="page-pad">' +
    '<button class="btn btn-secondary btn-sm mb-16" onclick="backToAdmin()">← กลับไปตั้งค่า</button>' +
    html;
}
console.log('[views-recipe.js] loaded');