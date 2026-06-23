/* ============================================
   COFFEE POS — VIEWS-RECIPE.JS
   จัดการ Recipe / วัตถุดิบต่อเมนู
   Version: 2.0 (+ Export/Import CSV + Copy Recipe)
   ============================================ */

var RECIPE_VIEW = {
  selectedMenuId: null,
  selectedSize: null
};

/* ============================================
   RENDER RECIPE MANAGEMENT PAGE
   ============================================ */
function renderRecipeView() {
 // ป้องกัน error ถ้า ST ยังไม่โหลด
  if (typeof ST === 'undefined' || !ST.getActiveMenu) {
    console.log('[RecipeView] Waiting for ST to load...');
    setTimeout(renderRecipeView, 100);
    return;
  }
  
  var main = $('mainContent');
  if (!main) return;

  if (!FeatureManager.isEnabled('pro_recipe')) {
    main.innerHTML = renderFeatureLocked('pro_recipe', '🧪 Recipe + COGS');
    return;
  }

  var isFromAdmin = !!document.getElementById('recipeViewContainer');

  var html = '<div class="page-pad anim-fadeUp">';

  if (isFromAdmin) {
    html += '<div class="admin-back-btn mb-16">' +
      '<button class="btn btn-secondary btn-sm" onclick="switchAdmTab(\'shop\')">← กลับไปหน้า Admin</button>' +
      '</div>';
  }

  /* Header */
  html += '<div class="section-header">';
  html += '<div class="section-title">🧪 จัดการสูตรวัตถุดิบ (Recipe)</div>';
  html += '</div>';

  /* ============================================
     🔥 แถบปุ่ม Export / Import
     ============================================ */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📊 นำเข้า / ส่งออกสูตรทั้งหมด</div></div>';
  html += '<div class="p-16">';
  html += '<div class="text-muted fs-sm mb-12">จัดการสูตรได้ง่ายๆ ผ่าน Excel — กรอกทีเดียวครบทุกเมนู</div>';
  html += '<div class="flex gap-8 flex-wrap">';
  html += '<button class="btn btn-outline btn-sm" onclick="exportRecipeTemplate()">📥 โหลด Template Excel</button>';
  html += '<button class="btn btn-outline btn-sm" onclick="exportRecipeCSV()">📤 Export สูตรปัจจุบัน (CSV)</button>';
  html += '<label class="btn btn-primary btn-sm" style="cursor:pointer;margin:0;">';
  html += '📂 Import CSV';
  html += '<input type="file" accept=".csv" style="display:none;" onchange="importRecipeCSV(event)">';
  html += '</label>';
  html += '</div>';
  html += '<div class="text-muted fs-sm mt-8">💡 <b>วิธีใช้:</b> โหลด Template → กรอกข้อมูลใน Excel → Import กลับ</div>';
  html += '</div>';
  html += '</div>';

  /* Menu and Size Selector */
  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📋 เลือกเมนูเพื่อแก้ไขสูตร</div></div>';

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

  if (RECIPE_VIEW.selectedMenuId && RECIPE_VIEW.selectedSize) {
    html += renderRecipeEditor(menuItems);
  } else if (RECIPE_VIEW.selectedMenuId && !RECIPE_VIEW.selectedSize) {
    html += '<div class="card p-20 text-center text-muted">กรุณาเลือกขนาด</div>';
  } else {
    html += '<div class="card p-20 text-center text-muted">กรุณาเลือกเมนูก่อน</div>';
  }

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
  var stockItems = ST.getStock() || [];

  var html = '';
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">' + (selectedMenu.emoji || '☕') + ' ' + sanitize(selectedMenu.name) + ' (Size ' + RECIPE_VIEW.selectedSize + ')</div>';

  /* 🔥 ปุ่มกลุ่ม: เพิ่มวัตถุดิบ + Copy จากสูตรอื่น */
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="modalCopyRecipe()">📋 Copy สูตร</button>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalAddRecipeIngredient()">➕ เพิ่มวัตถุดิบ</button>';
  html += '</div>';
  html += '</div>';

  if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
    var totalCost = 0;
    for (var i = 0; i < recipe.ingredients.length; i++) {
      var ing = recipe.ingredients[i];
      var stockItem = findById(stockItems, ing.stockId);
      var unitCost = (stockItem && stockItem.costPerUnit) ? stockItem.costPerUnit : (ing.unitCost || 0);
      totalCost += (ing.qty || 0) * unitCost;
    }
    var sellingPrice = selectedMenu.prices ? (selectedMenu.prices[RECIPE_VIEW.selectedSize] || 0) : 0;
    var profit = sellingPrice - totalCost;
    var profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100 * 10) / 10 : 0;

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
    html += '<thead><tr><th>วัตถุดิบ</th><th class="text-right">ปริมาณ</th><th class="text-right">ต้นทุน/หน่วย</th><th class="text-right">ต้นทุนรวม</th><th class="text-center"></th></tr></thead>';
    html += '<tbody>';

    for (var i = 0; i < recipe.ingredients.length; i++) {
      var ing = recipe.ingredients[i];
      var stockItem = findById(stockItems, ing.stockId);
      var unitCost = (stockItem && stockItem.costPerUnit) ? stockItem.costPerUnit : (ing.unitCost || 0);
      var lineCost = (ing.qty || 0) * unitCost;

      html += '<tr>';
      html += '<td class="fw-600">' + sanitize(ing.stockName) + '</td>';
      html += '<td class="text-right">' + formatNumber(ing.qty) + ' ' + sanitize(ing.unit) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(unitCost) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(lineCost) + '</td>';
      html += '<td class="text-center">';
      html += '<button class="btn-icon" onclick="modalEditRecipeIngredient(\'' + ing.stockId + '\')">✏️</button>';
      html += '<button class="btn-icon" onclick="removeRecipeIngredient(\'' + ing.stockId + '\')" style="color:var(--danger);">🗑</button>';
      html += '</td>';
      html += '</tr>';
    }

    html += '</tbody></table></div>';
  } else {
    html += '<div class="text-center p-20 text-muted">';
    html += '<div style="font-size:32px;margin-bottom:8px;">🧪</div>';
    html += '<div>ยังไม่มีสูตรสำหรับเมนูนี้</div>';
    html += '<div class="fs-sm mt-4">กด "เพิ่มวัตถุดิบ" หรือ "Copy สูตร" จากเมนูอื่นได้เลย</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/* ============================================
   RENDER RECIPE SUMMARY
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
  html += '<th>เมนู</th><th>ขนาด</th>';
  html += '<th class="text-right">ต้นทุน</th><th class="text-right">ราคาขาย</th>';
  html += '<th class="text-right">กำไร</th><th class="text-right">% กำไร</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < recipes.length; i++) {
    var r = recipes[i];
    var menu = findById(menuItems, r.menuId);
    if (!menu) continue;

    var totalCost = ST.calculateRecipeCost(r);
    var sellingPrice = menu.prices ? (menu.prices[r.size] || 0) : 0;
    var profit = sellingPrice - totalCost;
    var profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100 * 10) / 10 : 0;
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

  html += '</tbody></table></div></div>';
  return html;
}

/* ============================================
   FUNCTIONS: เลือกเมนู / Size
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================
   MODAL: ADD RECIPE INGREDIENT
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
    html += '<option value="' + sanitize(item.id) + '" data-unit="' + sanitize(item.unit) + '" data-cost="' + (item.costPerUnit || 0) + '">';
    html += sanitize(item.name) + ' (' + formatMoneySign(item.costPerUnit || 0) + '/' + sanitize(item.unit) + ')';
    html += '</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-row">';
  html += '<div class="form-group"><label class="form-label">ปริมาณที่ใช้</label>';
  html += '<input type="number" id="recipeIngredientQty" placeholder="0" value="1" min="0" step="0.1" oninput="updateIngredientCost()"></div>';
  html += '<div class="form-group"><label class="form-label">หน่วย</label>';
  html += '<input type="text" id="recipeIngredientUnit" readonly style="background:var(--bg-input);opacity:0.8;"></div>';
  html += '</div>';

  html += '<div class="card-glass p-12">';
  html += '<div class="flex-between"><span class="text-muted">ต้นทุน/หน่วย</span><span id="displayUnitCost" class="fw-600">฿0.00</span></div>';
  html += '<div class="flex-between mt-4"><span class="text-muted">ต้นทุนรวม</span><span id="displayTotalCost" class="fw-700 text-accent">฿0.00</span></div>';
  html += '</div>';

  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveRecipeIngredient()">➕ เพิ่มวัตถุดิบ</button>';
  openModal('➕ เพิ่มวัตถุดิบในสูตร', html, footer);
}

/* ============================================
   MODAL: EDIT RECIPE INGREDIENT
   ============================================ */
function modalEditRecipeIngredient(stockId) {
  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) return;

  var ingredient = null;
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) { ingredient = recipe.ingredients[i]; break; }
  }
  if (!ingredient) return;

  var stockItems = ST.getStock();
  var stockItem = findById(stockItems, stockId);

  var html = '';
  html += '<div class="form-group"><label class="form-label">วัตถุดิบ</label>';
  html += '<input type="text" value="' + sanitize(stockItem ? stockItem.name : '') + '" disabled></div>';
  html += '<div class="form-group"><label class="form-label">ปริมาณที่ใช้ (ต่อ 1 แก้ว/ชิ้น)</label>';
  html += '<input type="number" id="recipeIngredientQty" value="' + ingredient.qty + '" min="0" step="0.1"></div>';

  var unitCost = (stockItem && stockItem.costPerUnit) ? stockItem.costPerUnit : (ingredient.unitCost || 0);
  html += '<div class="card-glass p-12 mt-8">';
  html += '<div class="flex-between"><span class="text-muted">ต้นทุน/หน่วย</span><span class="fw-600">' + formatMoneySign(unitCost) + '</span></div>';
  html += '</div>';

  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="updateRecipeIngredient(\'' + stockId + '\')">💾 บันทึก</button>';
  openModal('✏️ แก้ไขวัตถุดิบ', html, footer);
}

/* ============================================
   🔥 MODAL: COPY RECIPE จากเมนู/Size อื่น
   ============================================ */
function modalCopyRecipe() {
  var recipes = ST.getRecipes();
  var menuItems = ST.getMenu();

  /* กรองออกสูตรที่เป็นของเมนู+size ปัจจุบัน */
  var otherRecipes = [];
  for (var i = 0; i < recipes.length; i++) {
    if (!(recipes[i].menuId === RECIPE_VIEW.selectedMenuId && recipes[i].size === RECIPE_VIEW.selectedSize)) {
      if (recipes[i].ingredients && recipes[i].ingredients.length > 0) {
        otherRecipes.push(recipes[i]);
      }
    }
  }

  if (otherRecipes.length === 0) {
    toast('ยังไม่มีสูตรอื่นให้ Copy — กรุณาสร้างสูตรเมนูอื่นก่อน', 'warning');
    return;
  }

  var html = '<div class="form-group">';
  html += '<label class="form-label">เลือกสูตรที่จะ Copy มา</label>';
  html += '<select id="copyRecipeSource">';
  html += '<option value="">-- เลือกสูตร --</option>';

  for (var i = 0; i < otherRecipes.length; i++) {
    var r = otherRecipes[i];
    var menu = findById(menuItems, r.menuId);
    var menuName = menu ? ((menu.emoji || '☕') + ' ' + menu.name) : r.menuId;
    var ingCount = r.ingredients ? r.ingredients.length : 0;
    html += '<option value="' + sanitize(r.menuId) + '|' + sanitize(r.size) + '">';
    html += menuName + ' / Size ' + r.size + ' (' + ingCount + ' วัตถุดิบ)';
    html += '</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="card-glass p-12 mt-8 text-muted fs-sm">';
  html += '⚠️ สูตรปัจจุบันของเมนูนี้จะถูกแทนที่ด้วยสูตรที่เลือก (สามารถแก้ไขปริมาณได้ภายหลัง)';
  html += '</div>';

  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="doCopyRecipe()">📋 Copy สูตรนี้</button>';
  openModal('📋 Copy สูตรจากเมนูอื่น', html, footer);
}

function doCopyRecipe() {
  var select = $('copyRecipeSource');
  if (!select || !select.value) { toast('กรุณาเลือกสูตร', 'error'); return; }

  var parts = select.value.split('|');
  var srcMenuId = parts[0];
  var srcSize = parts[1];

  var srcRecipe = ST.getRecipe(srcMenuId, srcSize);
  if (!srcRecipe || !srcRecipe.ingredients) { toast('ไม่พบสูตรต้นฉบับ', 'error'); return; }

  /* Deep copy ingredients */
  var newIngredients = [];
  for (var i = 0; i < srcRecipe.ingredients.length; i++) {
    newIngredients.push({
      stockId: srcRecipe.ingredients[i].stockId,
      stockName: srcRecipe.ingredients[i].stockName,
      qty: srcRecipe.ingredients[i].qty,
      unit: srcRecipe.ingredients[i].unit,
      unitCost: srcRecipe.ingredients[i].unitCost || 0,
      totalCost: srcRecipe.ingredients[i].totalCost || 0
    });
  }

  var newRecipe = {
    menuId: RECIPE_VIEW.selectedMenuId,
    size: RECIPE_VIEW.selectedSize,
    ingredients: newIngredients
  };

  ST.setRecipe(newRecipe);
  closeMForce();
  toast('✅ Copy สูตรสำเร็จ — แก้ไขปริมาณได้เลย', 'success');
  renderRecipeView();
}

/* ============================================
   SAVE / UPDATE / REMOVE INGREDIENT
   ============================================ */
function saveRecipeIngredient() {
  var select = $('recipeIngredientStockId');
  var stockId = select ? select.value : '';
  if (!stockId) { toast('กรุณาเลือกวัตถุดิบ', 'error'); return; }

  var selectedOption = select.options[select.selectedIndex];
  var stockName = selectedOption.text.split(' (')[0];
  var unit = selectedOption.getAttribute('data-unit') || '';
  var unitCost = parseFloat(selectedOption.getAttribute('data-cost')) || 0;
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;

  if (qty <= 0) { toast('กรุณาใส่ปริมาณ', 'error'); return; }

  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) {
    recipe = { menuId: RECIPE_VIEW.selectedMenuId, size: RECIPE_VIEW.selectedSize, ingredients: [] };
  }

  var existingIdx = -1;
  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) { existingIdx = i; break; }
  }

  var ingredient = { stockId: stockId, stockName: stockName, qty: qty, unit: unit, unitCost: unitCost, totalCost: unitCost * qty };

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
  if (qty <= 0) { toast('ปริมาณต้องมากกว่า 0', 'error'); return; }

  var recipe = ST.getRecipe(RECIPE_VIEW.selectedMenuId, RECIPE_VIEW.selectedSize);
  if (!recipe) return;

  for (var i = 0; i < recipe.ingredients.length; i++) {
    if (recipe.ingredients[i].stockId === stockId) {
      recipe.ingredients[i].qty = qty;
      recipe.ingredients[i].totalCost = (recipe.ingredients[i].unitCost || 0) * qty;
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
      if (recipe.ingredients[i].stockId !== stockId) newIngredients.push(recipe.ingredients[i]);
    }
    recipe.ingredients = newIngredients;
    ST.setRecipe(recipe);
    toast('ลบวัตถุดิบแล้ว', 'warning');
    renderRecipeView();
  });
}

/* ============================================
   UNIT & COST CALCULATORS (Modal helpers)
   ============================================ */
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

function updateIngredientCost() {
  var select = $('recipeIngredientStockId');
  if (!select) return;
  var selectedOption = select.options[select.selectedIndex];
  var unitCost = parseFloat(selectedOption.getAttribute('data-cost')) || 0;
  var qty = parseFloat(($('recipeIngredientQty') || {}).value) || 0;

  var displayTotalCost = $('displayTotalCost');
  if (displayTotalCost) displayTotalCost.textContent = formatMoneySign(unitCost * qty);
}

/* ============================================
   🔥 EXPORT RECIPE TEMPLATE (CSV)
   สร้าง template เปล่า มีเมนู+size ทุกตัวพร้อมให้กรอก
   ============================================ */
function exportRecipeTemplate() {
  var menuItems = ST.getActiveMenu();
  var sizes = ST.getSizes();
  var stockItems = ST.getStock();

  if (menuItems.length === 0) {
    toast('ยังไม่มีเมนู กรุณาเพิ่มเมนูก่อน', 'warning');
    return;
  }

  /* Header row */
  var rows = [];
  rows.push(['เมนู', 'ขนาด', 'วัตถุดิบ', 'ปริมาณ', 'หน่วย']);

  /* คำอธิบาย stock ที่มีอยู่ (comment row) */
  rows.push(['# วัตถุดิบที่มีในระบบ:', '', '', '', '']);
  for (var s = 0; s < stockItems.length; s++) {
    rows.push(['# ' + stockItems[s].name, '', '', '', stockItems[s].unit]);
  }
  rows.push(['# ===== เริ่มกรอกข้อมูลด้านล่าง =====', '', '', '', '']);

  /* สร้าง rows สำหรับทุกเมนู × ทุก size */
  for (var i = 0; i < menuItems.length; i++) {
    var menu = menuItems[i];
    var menuName = menu.name;

    var menuSizes = [];
    if (menu.prices) {
      for (var sz = 0; sz < sizes.length; sz++) {
        if (menu.prices[sizes[sz].name]) {
          menuSizes.push(sizes[sz].name);
        }
      }
    }
    if (menuSizes.length === 0) menuSizes = ['M'];

    for (var ms = 0; ms < menuSizes.length; ms++) {
      /* ดูว่ามีสูตรอยู่แล้วไหม ถ้ามีใส่ให้เลย */
      var existingRecipe = ST.getRecipe(menu.id, menuSizes[ms]);
      if (existingRecipe && existingRecipe.ingredients && existingRecipe.ingredients.length > 0) {
        for (var ei = 0; ei < existingRecipe.ingredients.length; ei++) {
          var ing = existingRecipe.ingredients[ei];
          rows.push([menuName, menuSizes[ms], ing.stockName, ing.qty, ing.unit]);
        }
      } else {
        /* เมนูที่ยังไม่มีสูตร ใส่แถวว่างให้กรอก */
        rows.push([menuName, menuSizes[ms], '', '', '']);
      }
    }
  }

  var csv = recipeRowsToCSV(rows);
  var cfg = ST.getConfig();
  var filename = (cfg.shopName || 'coffee-pos') + '_recipe_template_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
  toast('✅ โหลด Template สำเร็จ — เปิดใน Excel แล้วกรอกได้เลย', 'success', 3000);
}

/* ============================================
   🔥 EXPORT RECIPE CSV (สูตรปัจจุบันทั้งหมด)
   ============================================ */
function exportRecipeCSV() {
  var recipes = ST.getRecipes();
  var menuItems = ST.getMenu();

  if (recipes.length === 0) {
    toast('ยังไม่มีสูตรวัตถุดิบ', 'warning');
    return;
  }

  var rows = [['เมนู', 'ขนาด', 'วัตถุดิบ', 'ปริมาณ', 'หน่วย']];

  for (var i = 0; i < recipes.length; i++) {
    var r = recipes[i];
    var menu = findById(menuItems, r.menuId);
    if (!menu || !r.ingredients) continue;

    for (var j = 0; j < r.ingredients.length; j++) {
      var ing = r.ingredients[j];
      rows.push([menu.name, r.size, ing.stockName, ing.qty, ing.unit]);
    }
  }

  var csv = recipeRowsToCSV(rows);
  var cfg = ST.getConfig();
  var filename = (cfg.shopName || 'coffee-pos') + '_recipes_' + todayStr().replace(/\//g, '-') + '.csv';
  downloadFile(filename, '\uFEFF' + csv, 'text/csv');
  toast('✅ Export สูตรสำเร็จ', 'success');
}

/* ============================================
   🔥 IMPORT RECIPE CSV
   Format: เมนู, ขนาด, วัตถุดิบ, ปริมาณ, หน่วย
   ============================================ */
function importRecipeCSV(event) {
  var file = event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var text = e.target.result;
      /* ลบ BOM ถ้ามี */
      text = text.replace(/^\uFEFF/, '');

      var lines = text.split(/\r?\n/);
      var menuItems = ST.getMenu();
      var stockItems = ST.getStock();

      /* สร้าง map เพื่อ lookup เร็ว */
      var menuMap = {};
      for (var i = 0; i < menuItems.length; i++) {
        menuMap[menuItems[i].name.trim().toLowerCase()] = menuItems[i];
      }
      var stockMap = {};
      for (var i = 0; i < stockItems.length; i++) {
        stockMap[stockItems[i].name.trim().toLowerCase()] = stockItems[i];
      }

      /* เก็บ recipes ที่จะ import แบบ group */
      var recipeMap = {}; /* key: menuId|size */
      var errors = [];
      var importCount = 0;
      var skipCount = 0;

      for (var ln = 1; ln < lines.length; ln++) {
        var line = lines[ln].trim();
        if (!line) continue;
        /* ข้ามบรรทัด comment */
        if (line.charAt(0) === '#') continue;

        var cols = parseCSVLine(line);
        if (cols.length < 4) { skipCount++; continue; }

        var menuName = (cols[0] || '').trim();
        var sizeName = (cols[1] || '').trim();
        var stockName = (cols[2] || '').trim();
        var qty = parseFloat((cols[3] || '').trim());
        var unit = (cols[4] || '').trim();

        if (!menuName || !sizeName || !stockName || isNaN(qty) || qty <= 0) {
          skipCount++;
          continue;
        }

        /* หาเมนู */
        var menu = menuMap[menuName.toLowerCase()];
        if (!menu) {
          errors.push('ไม่พบเมนู: ' + menuName);
          continue;
        }

        /* หา stock */
        var stockItem = stockMap[stockName.toLowerCase()];
        if (!stockItem) {
          errors.push('ไม่พบวัตถุดิบ: ' + stockName + ' (บรรทัด ' + (ln + 1) + ')');
          continue;
        }

        var recipeKey = menu.id + '|' + sizeName;
        if (!recipeMap[recipeKey]) {
          recipeMap[recipeKey] = {
            menuId: menu.id,
            size: sizeName,
            ingredients: []
          };
        }

        /* ตรวจซ้ำ */
        var alreadyExists = false;
        for (var ei = 0; ei < recipeMap[recipeKey].ingredients.length; ei++) {
          if (recipeMap[recipeKey].ingredients[ei].stockId === stockItem.id) {
            alreadyExists = true; break;
          }
        }

        if (!alreadyExists) {
          recipeMap[recipeKey].ingredients.push({
            stockId: stockItem.id,
            stockName: stockItem.name,
            qty: qty,
            unit: unit || stockItem.unit || 'หน่วย',
            unitCost: stockItem.costPerUnit || 0,
            totalCost: (stockItem.costPerUnit || 0) * qty
          });
          importCount++;
        }
      }

      /* บันทึก recipes */
      var savedCount = 0;
      for (var key in recipeMap) {
        ST.setRecipe(recipeMap[key]);
        savedCount++;
      }

      /* แสดงผล */
      var msg = '✅ Import สำเร็จ: ' + savedCount + ' สูตร (' + importCount + ' รายการวัตถุดิบ)';
      if (skipCount > 0) msg += ' | ข้าม ' + skipCount + ' แถว';
      toast(msg, 'success', 4000);

      if (errors.length > 0) {
        var uniqueErrors = errors.slice(0, 5);
        setTimeout(function() {
          toast('⚠️ ' + uniqueErrors.join(', '), 'warning', 5000);
        }, 1000);
      }

      renderRecipeView();

    } catch(err) {
      console.error('[importRecipeCSV]', err);
      toast('❌ เกิดข้อผิดพลาดในการอ่านไฟล์', 'error');
    }
  };

  reader.readAsText(file, 'UTF-8');
  /* reset input เพื่อให้ import ไฟล์เดิมซ้ำได้ */
  event.target.value = '';
}

/* ============================================
   HELPERS: CSV
   ============================================ */
function recipeRowsToCSV(rows) {
  return rows.map(function(row) {
    return row.map(function(cell) {
      var str = String(cell === null || cell === undefined ? '' : cell);
      if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  }).join('\r\n');
}

function parseCSVLine(line) {
  var result = [];
  var current = '';
  var inQuotes = false;

  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
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

console.log('[views-recipe.js] loaded v2.0');
