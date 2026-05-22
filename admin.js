/* ============================================
   COFFEE POS — ADMIN.JS
   Version: 2.0 (Full Feature)
   ============================================ */

var ADMVIEW = {
  tab: 'shop'
};

/* ============================================
   RENDER ADMIN VIEW
   ============================================ */
function renderAdminView() {
  var main = $('mainContent');
  if (!main) return;

  var html = '';
  html += '<div class="page-pad anim-fadeUp">';

  html += '<div class="section-header">';
  html += '<div class="section-title">⚙️ ตั้งค่า</div>';
  html += '<div class="section-tools">';
  html += '<button class="btn btn-danger btn-sm" onclick="hardRefreshConfirm()" title="Hard Refresh" style="background:var(--danger);">🔄 Hard Refresh</button>';
  html += '</div>';
  html += '</div>';

  html += '<div class="cat-tabs mb-16" id="adminTabs">';
  html += admSubTab('shop', '🏪 ร้านค้า');
  html += admSubTab('staff', '👥 พนักงาน');
  
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_members')) {
    html += admSubTab('members', '👤 สมาชิก');
  }
  
  if (typeof FeatureManager !== 'undefined' && FeatureManager.isEnabled('pro_recipe')) {
    html += admSubTab('recipe', '🧪 สูตรวัตถุดิบ');
  }
  
  html += admSubTab('data', '💾 ข้อมูล');
  html += admSubTab('license', '🔑 License');
  html += admSubTab('about', 'ℹ️ เกี่ยวกับ');
  html += '</div>';

  html += '<div id="admContent">';
  html += renderAdmContent();
  html += '</div>';

  html += '</div>';
  main.innerHTML = html;
}

function admSubTab(key, label) {
  var active = ADMVIEW.tab === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="switchAdmTab(\'' + key + '\')">' + label + '</button>';
}

function switchAdmTab(tab) {
  ADMVIEW.tab = tab;
  vibrate(20);
  renderAdminView();
}

function renderAdmContent() {
  switch (ADMVIEW.tab) {
    case 'shop': return renderShopSettings();
    case 'staff': return renderStaffSettings();
    case 'members':
      setTimeout(function() {
        if (typeof renderMembersView === 'function') {
          renderMembersView();
        }
      }, 50);
      return '<div id="membersViewContainer"></div>';
    case 'recipe': 
      setTimeout(function() {
        if (typeof renderRecipeView === 'function') {
          var container = document.getElementById('recipeViewContainer');
          if (container) {
            renderRecipeView();
          }
        }
      }, 50);
      return '<div id="recipeViewContainer"></div>';
    case 'data': return renderDataSettings();
    case 'license': return renderLicenseTab();
    case 'about': return renderAboutPage();
    default: return '';
  }
}

/* ============================================
   LICENSE TAB
   ============================================ */
function renderLicenseTab() {
  var licenseTier = 'free';
  var licenseKey = null;
  var daysLeft = 0;
  
  try {
    var licenseRaw = localStorage.getItem('v1_coffee_license');
    if (licenseRaw) {
      var license = JSON.parse(licenseRaw);
      if (license && license.tier) {
        licenseTier = license.tier;
        licenseKey = license.key;
        if (licenseTier === 'trial' && license.trialExpiry) {
          daysLeft = Math.max(0, Math.ceil((license.trialExpiry - Date.now()) / (1000 * 60 * 60 * 24)));
        }
      }
    }
  } catch(e) {}
  
  var html = '';
  
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">🔑 สถานะ License</div>';
  html += '</div>';
  
  html += '<div class="text-center p-16">';
  html += '<div style="font-size:64px;">';
  if (licenseTier === 'pro') html += '⭐';
  else if (licenseTier === 'trial') html += '🧪';
  else if (licenseTier === 'standard') html += '📦';
  else html += '🆓';
  html += '</div>';
  
  html += '<div class="fw-800 fs-xl mt-4">';
  if (licenseTier === 'pro') html += 'Pro Edition';
  else if (licenseTier === 'trial') html += 'Trial Mode';
  else if (licenseTier === 'standard') html += 'Standard Edition';
  else html += 'Free Edition';
  html += '</div>';
  
  if (licenseKey) {
    html += '<div class="text-muted mt-4">Key: <code>' + sanitize(licenseKey) + '</code></div>';
  }
  
  if (licenseTier === 'trial' && daysLeft > 0) {
    html += '<div class="mt-4"><span class="badge badge-warning">เหลือ ' + daysLeft + ' วัน</span></div>';
  }
  
  html += '</div>';
  html += '</div>';
  
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">💰 แผนราคา</div>';
  html += '<div class="text-muted fs-sm">*ราคายังไม่ระบุ (ติดต่อสอบถาม)</div>';
  html += '</div>';
  
  html += '<div class="pricing-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:8px;">';
  
  /* Free */
  html += '<div class="pricing-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">';
  html += '<div class="pricing-header" style="padding:20px 16px;text-align:center;border-bottom:1px solid var(--border);">';
  html += '<div class="pricing-icon" style="font-size:40px;">🆓</div>';
  html += '<div class="pricing-tier" style="font-size:20px;font-weight:800;margin-top:8px;">Free</div>';
  html += '<div class="pricing-price" style="font-size:28px;font-weight:800;color:var(--success);margin-top:8px;">ฟรี</div>';
  html += '<div class="pricing-period" style="font-size:12px;color:var(--text-muted);">ตลอดชีพ</div>';
  html += '</div>';
  html += '<div class="pricing-body" style="padding:16px;">';
  html += '<div class="pricing-features" style="display:flex;flex-direction:column;gap:10px;">';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> POS ขายหน้าร้าน</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> จัดการเมนู</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> ประวัติออเดอร์</div>';
  html += '<div class="feature-item"><span style="color:var(--danger);">❌</span> Stock วัตถุดิบ</div>';
  html += '<div class="feature-item"><span style="color:var(--danger);">❌</span> ระบบพนักงาน</div>';
  html += '<div class="feature-item"><span style="color:var(--danger);">❌</span> รายงานขั้นสูง</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="pricing-footer" style="padding:16px;border-top:1px solid var(--border);">';
  if (licenseTier === 'free') {
    html += '<button class="btn btn-success btn-block" disabled>กำลังใช้งาน</button>';
  } else {
    html += '<button class="btn btn-outline btn-block" onclick="alert(\'ฟรี ใช้งานได้เลย\')">เริ่มต้นใช้งาน</button>';
  }
  html += '</div>';
  html += '</div>';
  
  /* Standard */
  html += '<div class="pricing-card" style="background:var(--bg-card);border:2px solid var(--info);border-radius:var(--radius);overflow:hidden;position:relative;">';
  html += '<div class="pricing-badge" style="position:absolute;top:12px;right:12px;background:var(--info);color:#fff;padding:2px 8px;border-radius:20px;font-size:10px;">แนะนำ</div>';
  html += '<div class="pricing-header" style="padding:20px 16px;text-align:center;border-bottom:1px solid var(--border);">';
  html += '<div class="pricing-icon" style="font-size:40px;">📦</div>';
  html += '<div class="pricing-tier" style="font-size:20px;font-weight:800;margin-top:8px;">Standard</div>';
  html += '<div class="pricing-price" style="font-size:28px;font-weight:800;color:var(--info);margin-top:8px;">--</div>';
  html += '<div class="pricing-period" style="font-size:12px;color:var(--text-muted);">บาท / ครั้งเดียว</div>';
  html += '</div>';
  html += '<div class="pricing-body" style="padding:16px;">';
  html += '<div class="pricing-features" style="display:flex;flex-direction:column;gap:10px;">';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> ทุกอย่างใน Free</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> Stock วัตถุดิบ</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> ระบบพนักงาน</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> LINE Notify</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> PromptPay QR</div>';
  html += '<div class="feature-item"><span style="color:var(--danger);">❌</span> สมาชิก + แต้ม</div>';
  html += '<div class="feature-item"><span style="color:var(--danger);">❌</span> Recipe + Auto Stock</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="pricing-footer" style="padding:16px;border-top:1px solid var(--border);">';
  if (licenseTier === 'standard') {
    html += '<button class="btn btn-info btn-block" disabled>กำลังใช้งาน</button>';
  } else {
    html += '<button class="btn btn-outline btn-block" onclick="LicenseManager.showLicenseModal()">อัปเกรด</button>';
  }
  html += '</div>';
  html += '</div>';
  
  /* Pro */
  html += '<div class="pricing-card" style="background:linear-gradient(135deg,var(--bg-card),rgba(249,115,22,0.05));border:2px solid var(--accent);border-radius:var(--radius);overflow:hidden;">';
  html += '<div class="pricing-header" style="padding:20px 16px;text-align:center;border-bottom:1px solid var(--border);">';
  html += '<div class="pricing-icon" style="font-size:40px;">⭐</div>';
  html += '<div class="pricing-tier" style="font-size:20px;font-weight:800;margin-top:8px;color:var(--accent);">Pro</div>';
  html += '<div class="pricing-price" style="font-size:28px;font-weight:800;color:var(--accent);margin-top:8px;">--</div>';
  html += '<div class="pricing-period" style="font-size:12px;color:var(--text-muted);">บาท / ปี</div>';
  html += '</div>';
  html += '<div class="pricing-body" style="padding:16px;">';
  html += '<div class="pricing-features" style="display:flex;flex-direction:column;gap:10px;">';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> ทุกอย่างใน Standard</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> สมาชิก + แต้มสะสม</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> Recipe + ต้นทุน</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> Auto ตัด Stock</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> Kitchen Display</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> Real-time Dashboard</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> รายงานขั้นสูง (COGS)</div>';
  html += '<div class="feature-item"><span style="color:var(--success);">✅</span> รูปเมนู</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="pricing-footer" style="padding:16px;border-top:1px solid var(--border);">';
  if (licenseTier === 'pro') {
    html += '<button class="btn btn-accent btn-block" style="background:var(--accent);color:#fff;" disabled>กำลังใช้งาน</button>';
  } else if (licenseTier === 'trial') {
    html += '<button class="btn btn-warning btn-block" disabled>กำลังทดลองใช้</button>';
  } else {
    html += '<button class="btn btn-primary btn-block" style="background:linear-gradient(135deg,var(--accent),var(--accent2));" onclick="LicenseManager.showLicenseModal()">อัปเกรดเป็น Pro</button>';
  }
  html += '</div>';
  html += '</div>';
  
  html += '</div>';
  html += '</div>';
  
  /* Feature comparison table */
  html += '<div class="card mb-16">';
  html += '<div class="card-header">';
  html += '<div class="card-title">📋 เปรียบเทียบฟีเจอร์</div>';
  html += '</div>';
  
  html += '<div class="feature-compare-cards">';
  
  var compareFeatures = [
    { name: '🛒 POS ขายหน้าร้าน', free: true, std: true, pro: true },
    { name: '📋 จัดการเมนู', free: true, std: true, pro: true },
    { name: '📜 ประวัติออเดอร์', free: true, std: true, pro: true },
    { name: '📦 Stock วัตถุดิบ', free: false, std: true, pro: true },
    { name: '👥 ระบบพนักงาน', free: false, std: true, pro: true },
    { name: '📊 รายงานพื้นฐาน', free: true, std: true, pro: true },
    { name: '💬 LINE Notify', free: false, std: true, pro: true },
    { name: '📷 PromptPay QR', free: false, std: true, pro: true },
    { name: '🛵 ช่องทางขาย', free: false, std: true, pro: true },
    { name: '👤 สมาชิก + แต้ม', free: false, std: false, pro: true },
    { name: '🧪 Recipe + COGS', free: false, std: false, pro: true },
    { name: '⚡ Auto ตัด Stock', free: false, std: false, pro: true },
    { name: '🍳 Kitchen Display', free: false, std: false, pro: true },
    { name: '🔄 Real-time Dashboard', free: false, std: false, pro: true },
    { name: '📈 รายงานขั้นสูง', free: false, std: false, pro: true },
    { name: '🖼️ รูปเมนู', free: false, std: false, pro: true }
  ];
  
  for (var i = 0; i < compareFeatures.length; i++) {
    var f = compareFeatures[i];
    html += '<div class="feature-compare-card">';
    html += '<div class="feature-name">' + f.name + '</div>';
    html += '<div class="feature-badges">';
    html += '<span class="tier-badge free ' + (f.free ? 'active' : 'inactive') + '">🆓 ' + (f.free ? '✅' : '❌') + '</span>';
    html += '<span class="tier-badge standard ' + (f.std ? 'active' : 'inactive') + '">📦 ' + (f.std ? '✅' : '❌') + '</span>';
    html += '<span class="tier-badge pro ' + (f.pro ? 'active' : 'inactive') + '">⭐ ' + (f.pro ? '✅' : '❌') + '</span>';
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  html += '</div>';
  
  html += '<div class="flex gap-12 flex-wrap">';
  if (licenseTier !== 'pro') {
    html += '<button class="btn btn-primary btn-lg" style="flex:1;" onclick="LicenseManager.showLicenseModal()">🔑 เปิดใช้งาน Pro License</button>';
  } else {
    html += '<button class="btn btn-secondary" onclick="LicenseManager.showLicenseModal()">🔄 เปลี่ยน License Key</button>';
  }
  html += '</div>';
  
  return html;
}

/* ============================================
   TAB: SHOP SETTINGS
   ============================================ */
function renderShopSettings() {
  var cfg = ST.getConfig();
  var html = '';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">🏪 ข้อมูลร้าน</div></div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อร้าน</label>';
  html += '<input type="text" id="cfgShopName" value="' + sanitize(cfg.shopName || '') + '">';
  html += '</div>';
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">สกุลเงิน</label>';
  html += '<input type="text" id="cfgCurrency" value="' + sanitize(cfg.currency || '฿') + '" style="width:80px;">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">Prefix ออเดอร์</label>';
  html += '<input type="text" id="cfgOrderPrefix" value="' + sanitize(cfg.orderPrefix || '#') + '" style="width:80px;">';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📋 ภาษีและค่าบริการ</div></div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (cfg.vatEnabled ? ' on' : '') + '" id="cfgVatEnabled"></div>';
  html += '<span>เปิด VAT</span>';
  html += '</label>';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">อัตรา VAT (%)</label>';
  html += '<input type="number" id="cfgVatRate" value="' + (cfg.vatRate || 7) + '">';
  html += '</div>';
  html += '<div style="border-top:1px solid var(--border);margin:14px 0;"></div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (cfg.serviceChargeEnabled ? ' on' : '') + '" id="cfgSCEnabled"></div>';
  html += '<span>เปิด Service Charge</span>';
  html += '</label>';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">อัตรา SC (%)</label>';
  html += '<input type="number" id="cfgSCRate" value="' + (cfg.serviceChargeRate || 10) + '">';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">🔊 เสียง</div></div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (cfg.soundEnabled !== false ? ' on' : '') + '" id="cfgSoundEnabled"></div>';
  html += '<span>เปิดเสียงเตือน</span>';
  html += '</label>';
  html += '</div>';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="playSound(\'add\')">🔔 ทดสอบ สั่ง</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="playSound(\'success\')">🎵 ทดสอบ สำเร็จ</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="playSound(\'error\')">⚠️ ทดสอบ Error</button>';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📱 QR PromptPay</div></div>';
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (cfg.promptPayEnabled ? ' on' : '') + '" id="cfgPPEnabled"></div>';
  html += '<span>เปิดใช้ QR PromptPay</span>';
  html += '</label>';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">💬 LINE Notify</div></div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">LINE Notify Token</label>';
  html += '<input type="text" id="cfgLineToken" value="' + sanitize(cfg.lineNotifyToken || '') + '">';
  html += '</div>';
  html += '<div class="flex gap-8 flex-wrap">';
  html += '<button class="btn btn-secondary btn-sm" onclick="testLineNotify()">🔔 ทดสอบส่ง</button>';
  html += '<button class="btn btn-primary btn-sm" onclick="sendDailySummaryLine()">📊 ส่งสรุปวันนี้</button>';
  html += '<button class="btn btn-secondary btn-sm" onclick="copyDailySummary()">📋 Copy สรุป</button>';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">🎨 ธีม</div></div>';
  html += '<div class="theme-selector">';
  html += '<div class="theme-option' + (cfg.theme === 'dark' ? ' active' : '') + '" onclick="setThemeFromAdmin(\'dark\')">';
  html += '<div class="theme-preview dark-preview"></div>';
  html += '<div class="fw-600">🌙 Dark</div>';
  html += '</div>';
  html += '<div class="theme-option' + (cfg.theme === 'light' ? ' active' : '') + '" onclick="setThemeFromAdmin(\'light\')">';
  html += '<div class="theme-preview light-preview"></div>';
  html += '<div class="fw-600">☀️ Light</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<button class="btn btn-primary btn-lg btn-block" onclick="saveShopSettings()">💾 บันทึกการตั้งค่า</button>';

  return html;
}

function saveShopSettings() {
  var cfg = ST.getConfig();

  cfg.shopName = ($('cfgShopName') || {}).value || 'Coffee POS';
  cfg.currency = ($('cfgCurrency') || {}).value || '฿';
  cfg.orderPrefix = ($('cfgOrderPrefix') || {}).value || '#';
  cfg.vatEnabled = hasClass($('cfgVatEnabled'), 'on');
  cfg.vatRate = parseFloat(($('cfgVatRate') || {}).value) || 7;
  cfg.serviceChargeEnabled = hasClass($('cfgSCEnabled'), 'on');
  cfg.serviceChargeRate = parseFloat(($('cfgSCRate') || {}).value) || 10;
  cfg.soundEnabled = hasClass($('cfgSoundEnabled'), 'on');
  cfg.promptPayEnabled = hasClass($('cfgPPEnabled'), 'on');
  cfg.lineNotifyToken = ($('cfgLineToken') || {}).value || '';

  ST.saveConfig(cfg);
  applyShopName();
  toast('บันทึกการตั้งค่าแล้ว', 'success');
  if (typeof playSound === 'function') playSound('success');
}

function setThemeFromAdmin(theme) {
  var cfg = ST.getConfig();
  cfg.theme = theme;
  ST.saveConfig(cfg);
  document.documentElement.setAttribute('data-theme', theme);
  setText('themeIcon', theme === 'dark' ? '🌙' : '☀️');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0f1a' : '#f5f5f5');
  renderAdminView();
  toast(theme === 'dark' ? 'Dark Mode' : 'Light Mode', 'info', 1200);
}

function toggleChannelActive(chId, wrap) {
  var toggle = wrap.querySelector('.toggle');
  if (toggle) toggleClass(toggle, 'on');
  var isOn = hasClass(toggle, 'on');
  ST.updateChannel(chId, { active: isOn });
  vibrate(20);
}

function modalEditChannel(ch) {
  var isNew = !ch;
  var c = ch || {};
  var emojiList = ['🚶', '🟢', '🟡', '🔴', '📱', '📞', '🏪', '🛵', '🚗', '💻', '📦'];

  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อช่องทาง *</label>';
  html += '<input type="text" id="fChName" value="' + sanitize(c.name || '') + '" placeholder="เช่น Grab, Walk-in">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">ไอคอน</label>';
  html += '<div class="flex flex-wrap gap-6">';
  for (var i = 0; i < emojiList.length; i++) {
    var selE = ((c.emoji || '🏪') === emojiList[i]) ? ' active' : '';
    html += '<button class="opt-btn-sm' + selE + '" style="flex:none;width:40px;min-width:40px;height:40px;font-size:20px;padding:0;" data-emoji="' + emojiList[i] + '" onclick="selectChEmoji(this)">' + emojiList[i] + '</button>';
  }
  html += '</div>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle' + (c.active !== false ? ' on' : '') + '" id="fChActive"></div>';
  html += '<span>เปิดใช้งาน</span>';
  html += '</label>';
  html += '</div>';

  html += '<input type="hidden" id="fChId" value="' + sanitize(c.id || '') + '">';
  html += '<input type="hidden" id="fChEmoji" value="' + sanitize(c.emoji || '🏪') + '">';

  var footer = '';
  if (!isNew) footer += '<button class="btn btn-danger btn-sm" onclick="deleteChFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveChFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';

  openModal(isNew ? '➕ เพิ่มช่องทาง' : '✏️ แก้ไขช่องทาง', html, footer);
}

function selectChEmoji(el) {
  var siblings = el.parentNode.querySelectorAll('.opt-btn-sm');
  for (var i = 0; i < siblings.length; i++) removeClass(siblings[i], 'active');
  addClass(el, 'active');
  var hidden = $('fChEmoji');
  if (hidden) hidden.value = el.getAttribute('data-emoji');
  vibrate(20);
}

function saveChFromModal() {
  var id = ($('fChId') || {}).value;
  var name = ($('fChName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อ', 'error'); return; }
  var data = {
    name: name,
    emoji: ($('fChEmoji') || {}).value || '🏪',
    active: hasClass($('fChActive'), 'on')
  };
  if (id) { ST.updateChannel(id, data); toast('อัพเดตแล้ว', 'success'); }
  else { ST.addChannel(data); toast('เพิ่มแล้ว', 'success'); }
  closeMForce();
  renderAdminView();
}

function deleteChFromModal() {
  var id = ($('fChId') || {}).value;
  if (!id) return;
  confirmDialog('ลบช่องทางนี้?', function() {
    ST.deleteChannel(id);
    closeMForce();
    toast('ลบแล้ว', 'warning');
    renderAdminView();
  });
}

/* ============================================
   TAB: STAFF
   ============================================ */
function renderStaffSettings() {
  var staffList = ST.getStaff();
  var shifts = ST.getShifts();

  var html = '';

  html += '<div class="flex-between mb-16">';
  html += '<div class="text-muted">พนักงานทั้งหมด ' + staffList.length + ' คน</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditStaff(null)">➕ เพิ่มพนักงาน</button>';
  html += '</div>';

  if (staffList.length === 0) {
    html += '<div class="card p-20 text-center mb-16">';
    html += '<div style="font-size:48px;">👥</div>';
    html += '<div class="fw-600 mb-8">ยังไม่มีพนักงาน</div>';
    html += '<div class="text-muted fs-sm mb-16">เพิ่มพนักงานเพื่อบันทึกยอดขายแต่ละคน</div>';
    html += '<button class="btn btn-primary" onclick="modalEditStaff(null)">➕ เพิ่มพนักงาน</button>';
    html += '</div>';
  } else {
    html += '<div class="staff-grid stagger">';
    for (var i = 0; i < staffList.length; i++) {
      html += renderStaffCard(staffList[i], shifts);
    }
    html += '</div>';
  }

  html += '<div class="card mt-16">';
  html += '<div class="card-header"><div class="card-title">👤 พนักงานปัจจุบัน</div></div>';
  if (APP.currentStaff) {
    html += '<div class="flex-between p-16">';
    html += '<div>';
    html += '<div class="fw-700 fs-lg">' + sanitize(APP.currentStaff.name) + '</div>';
    html += '<div class="text-muted fs-sm">' + getRoleName(APP.currentStaff.role) + '</div>';
    html += '</div>';
    html += '<button class="btn btn-warning btn-sm" onclick="logoutStaff()">🚪 ออกจากระบบ</button>';
    html += '</div>';
  } else {
    html += '<div class="p-16 text-center">';
    html += '<div class="text-muted mb-12">ยังไม่ได้เข้าสู่ระบบ</div>';
    html += '<button class="btn btn-primary" onclick="showPinLogin()">🔐 เข้าสู่ระบบ (PIN)</button>';
    html += '</div>';
  }
  html += '</div>';

  var todayShifts = getTodayShifts(shifts, staffList);
  if (todayShifts.length > 0) {
    html += '<div class="card mt-16">';
    html += '<div class="card-header"><div class="card-title">📋 กะวันนี้</div></div>';
    html += '<div class="table-wrap"></table>';
    html += '<thead><tr><th>พนักงาน</th><th>เข้า</th><th>ออก</th><th>ชม.</th></tr></thead>';
    html += '<tbody>';
    for (var t = 0; t < todayShifts.length; t++) {
      var sh = todayShifts[t];
      var hrs = calcShiftHours(sh);
      html += '<tr>';
      html += '<td class="fw-600">' + sanitize(sh.staffName) + '</td>';
      html += '<td class="text-center">' + sanitize(sh.clockIn) + '</td>';
      html += '<td class="text-center">' + (sh.clockOut ? sanitize(sh.clockOut) : '<span class="badge badge-success">ทำงาน</span>') + '</td>';
      html += '<td class="text-right">' + (hrs ? hrs + 'h' : '-') + '</td>';
      html += '</tr>';
    }
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    html += '</div>';
  }

  return html;
}

function renderStaffCard(staff, allShifts) {
  var isActive = staff.active !== false;
  var activeShift = ST.getActiveShift(staff.id);

  var todayOrders = ST.getTodayOrders();
  var staffOrders = 0;
  var staffSales = 0;
  for (var i = 0; i < todayOrders.length; i++) {
    if (todayOrders[i].staffId === staff.id && todayOrders[i].status !== 'cancelled') {
      staffOrders++;
      staffSales += todayOrders[i].total || 0;
    }
  }

  var html = '';
  html += '<div class="staff-card anim-fadeUp' + (isActive ? '' : ' inactive') + '">';

  html += '<div class="flex-between mb-8">';
  html += '<div class="flex gap-8" style="align-items:center;">';
  html += '<div class="staff-avatar">' + getInitials(staff.name) + '</div>';
  html += '<div>';
  html += '<div class="fw-700">' + sanitize(staff.name) + '</div>';
  html += '<div class="text-muted fs-sm">' + getRoleName(staff.role) + '</div>';
  html += '</div></div>';
  html += '<div class="flex gap-4" style="align-items:center;">';
  if (activeShift) html += '<span class="badge badge-success">🟢</span>';
  if (!isActive) html += '<span class="badge badge-danger">ปิด</span>';
  html += '</div></div>';

  if (staffOrders > 0) {
    html += '<div class="flex gap-12 mb-8">';
    html += '<div class="fs-sm"><span class="text-muted">วันนี้:</span> <span class="fw-600">' + staffOrders + ' บิล</span></div>';
    html += '<div class="fs-sm"><span class="text-muted">ยอด:</span> <span class="fw-700 text-accent">' + formatMoneySign(staffSales) + '</span></div>';
    html += '</div>';
  }

  html += '<div class="flex gap-6 mt-8" style="border-top:1px solid var(--border);padding-top:8px;">';
  html += '<button class="btn btn-secondary btn-sm" onclick="modalEditStaff(findById(ST.getStaff(),\'' + sanitize(staff.id) + '\'))">✏️</button>';
  html += '<button class="btn btn-info btn-sm" onclick="showStaffWorkHistory(\'' + sanitize(staff.id) + '\')">📋 ประวัติงาน</button>';
  if (isActive) {
    if (activeShift) {
      html += '<button class="btn btn-warning btn-sm" onclick="doClockOut(\'' + sanitize(staff.id) + '\',\'' + sanitize(activeShift.id) + '\')">🕐 Out</button>';
    } else {
      html += '<button class="btn btn-success btn-sm" onclick="doClockIn(\'' + sanitize(staff.id) + '\')">🕐 In</button>';
    }
  }
  html += '</div></div>';
  return html;
}

function getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0);
}

function getRoleName(role) {
  var map = { cashier: 'แคชเชียร์', barista: 'บาริสต้า', manager: 'ผู้จัดการ' };
  return map[role] || role || 'พนักงาน';
}

function getTodayShifts(shifts, staffList) {
  var today = todayStr();
  var result = [];
  for (var i = 0; i < shifts.length; i++) {
    if (shifts[i].date === today) {
      var s = cloneObj(shifts[i]);
      var staff = findById(staffList, s.staffId);
      s.staffName = staff ? staff.name : 'ไม่ระบุ';
      result.push(s);
    }
  }
  return result;
}

function calcShiftHours(shift) {
  if (!shift.clockIn) return '';
  var end = shift.clockOut || nowTimeStr();
  var inP = shift.clockIn.split(':');
  var outP = end.split(':');
  var inMin = parseInt(inP[0], 10) * 60 + parseInt(inP[1], 10);
  var outMin = parseInt(outP[0], 10) * 60 + parseInt(outP[1], 10);
  var diff = outMin - inMin;
  if (diff < 0) diff += 1440;
  return roundTo(diff / 60, 1);
}

function doClockIn(staffId) {
  ST.clockIn(staffId);
  var staff = findById(ST.getStaff(), staffId);
  toast((staff ? staff.name : '') + ' Clock In', 'success');
  
  if (typeof renderStaffView === 'function') {
    renderStaffView();
  } else {
    nav('staff');
  }
}

function doClockOut(staffId, shiftId) {
  ST.clockOut(shiftId);
  var staff = findById(ST.getStaff(), staffId);
  toast((staff ? staff.name : '') + ' Clock Out', 'info');
  
  if (typeof renderStaffView === 'function') {
    renderStaffView();
  } else {
    nav('staff');
  }
}

function renderStaffView() {
  var main = $('mainContent');
  if (!main) return;
  
  var html = '<div class="page-pad anim-fadeUp">';
  html += '<div class="section-header">';
  html += '<div class="section-title">👥 จัดการพนักงาน</div>';
  html += '</div>';
  html += renderStaffSettings();
  html += '</div>';
  
  main.innerHTML = html;
}

/* ============================================
   PIN LOGIN
   ============================================ */
function showPinLogin() {
  var staffCount = ST.getStaff().length;
  var hasNoStaff = (staffCount === 0);
  
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;margin-bottom:8px;">🔐</div>';
  html += '<div class="fw-700 fs-lg mb-4">เข้าสู่ระบบ</div>';
  html += '<div class="text-muted fs-sm">กรอก PIN 4 หลักเพื่อเริ่มใช้งาน</div>';
  html += '</div>';
  
  html += '<div class="pin-display" id="pinDisplay">';
  html += '<span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span><span class="pin-dot"></span>';
  html += '</div>';
  
  html += '<div id="pinError" class="text-danger text-center fs-sm mb-8" style="min-height:20px;"></div>';
  
  html += '<div class="pin-pad">';
  for (var n = 1; n <= 9; n++) {
    html += '<button class="pin-key" onclick="pinInput(' + n + ')">' + n + '</button>';
  }
  html += '<button class="pin-key" onclick="pinClear()">⌫</button>';
  html += '<button class="pin-key" onclick="pinInput(0)">0</button>';
  html += '<button class="pin-key pin-key-enter" onclick="pinSubmit()">✓</button>';
  html += '</div>';
  
  html += '<input type="hidden" id="pinValue" value="">';
  
  if (hasNoStaff) {
    html += '<div class="text-center mt-16 pt-12 border-top">';
    html += '<div class="text-muted fs-sm mb-8">🔑 ยังไม่มีบัญชีผู้ใช้งาน</div>';
    html += '<button class="btn btn-primary" onclick="closeMForce(); setupFirstStaff()">➕ ตั้งค่าพนักงานคนแรก</button>';
    html += '</div>';
  }
  
  openModal('🔐 เข้าสู่ระบบ', html, '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>');
}

// ปรับปรุง pinInput ให้ทำงานกับ Touch
function pinInput(num) {
  var el = $('pinValue');
  if (!el || el.value.length >= 4) return;
  el.value += num;
  updatePinDots(el.value.length);
  vibrate(20);
  if (el.value.length === 4) setTimeout(pinSubmit, 200);
}

// เพิ่ม visual feedback สำหรับ Touch
function pinKeyTouch(el, num) {
  el.style.transform = 'scale(0.92)';
  setTimeout(function() {
    el.style.transform = '';
  }, 100);
  pinInput(num);
}

function pinClear() {
  var el = $('pinValue');
  if (!el) return;
  if (el.value.length > 0) {
    el.value = el.value.substring(0, el.value.length - 1);
    updatePinDots(el.value.length);
  }
  setText('pinError', '');
  vibrate(20);
}

function updatePinDots(filled) {
  var dots = qsa('.pin-dot');
  for (var i = 0; i < dots.length; i++) {
    if (i < filled) addClass(dots[i], 'filled');
    else removeClass(dots[i], 'filled');
  }
}

function pinSubmit() {
  var el = $('pinValue');
  if (!el) return;
  var pin = el.value;
  if (pin.length !== 4) { setText('pinError', 'กรอก 4 หลัก'); return; }

  var staff = ST.verifyPin(pin);
  if (staff) {
    APP.currentStaff = staff;
    
    ST.setObj('current_session', {
      staffId: staff.id,
      loginTime: Date.now(),
      staffName: staff.name,
      role: staff.role
    });
    
    setText('topStaff', '👤 ' + staff.name);
    
    var logoutBtn = $('#logoutBtn');
    if (logoutBtn) logoutBtn.style.display = '';
    
    var loginBtn = $('#loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    
    closeMForce();
    toast('ยินดีต้อนรับ ' + staff.name, 'success');
    if (typeof playSound === 'function') playSound('success');
    
    var activeShift = ST.getActiveShift(staff.id);
    if (!activeShift) {
      ST.clockIn(staff.id);
      toast(staff.name + ' Clock In', 'info', 2000);
    }
    
    if (typeof updateSidebarByStaffPermission === 'function') {
      updateSidebarByStaffPermission();
    }
    
    nav('pos');
  } else {
    setText('pinError', '❌ PIN ไม่ถูกต้อง');
    el.value = '';
    updatePinDots(0);
    vibrate(100);
    if (typeof playSound === 'function') playSound('error');
  }
}

function logoutStaff() {
  if (!APP.currentStaff) return;
  
  confirmDialog('ออกจากระบบ ' + APP.currentStaff.name + '?', function() {
    var activeShift = ST.getActiveShift(APP.currentStaff.id);
    if (activeShift) ST.clockOut(activeShift.id);
    var name = APP.currentStaff.name;
    APP.currentStaff = null;
    
    ST.remove('current_session');
    
    updateLoginUI();
    updateSidebarByStaffPermission();
    
    nav('pos');
    
    if (typeof renderPOSView === 'function') {
      renderPOSView();
    }
    
    toast(name + ' ออกจากระบบแล้ว', 'info');
  });
}

function updateLoginUI() {
  var isLoggedIn = !!APP.currentStaff;
  var loginBtn = $('#loginBtn');
  var logoutBtn = $('#logoutBtn');
  var topStaff = $('#topStaff');
  
  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
    if (topStaff) {
      topStaff.textContent = '👤 ' + APP.currentStaff.name;
      topStaff.style.display = '';
      topStaff.title = 'คลิกเพื่อดูบัญชี';
    }
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (topStaff) {
      topStaff.textContent = '';
      topStaff.style.display = 'none';
    }
  }
}

/* ============================================
   TAB: DATA MANAGEMENT
   ============================================ */
function renderDataSettings() {
  var info = ST.getStorageInfo();
  var html = '';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">💾 พื้นที่จัดเก็บ</div></div>';
  html += '<div class="flex-between mb-12">';
  html += '<span class="text-muted">ใช้ทั้งหมด</span>';
  html += '<span class="fw-700">' + info.totalFormatted + '</span>';
  html += '</div>';
  html += '</div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📤 Export / Import JSON</div></div>';
  html += '<div class="admin-actions">';
  html += adminActionCard('📥', 'Backup JSON', 'ดาวน์โหลดข้อมูลทั้งหมด', 'exportJSON()');
  html += adminActionCard('📤', 'Restore JSON', 'นำเข้าจากไฟล์ JSON', 'importJSONTrigger()');
  html += adminActionCard('📊', 'Export ยอดขาย CSV', 'ออเดอร์สำหรับ Excel', 'exportCSVOrders()');
  html += adminActionCard('📋', 'Export เมนู CSV', 'รายการเมนูทั้งหมด', 'exportCSVMenu()');
  html += adminActionCard('📝', 'Copy สรุปวันนี้', 'คัดลอกวาง Line / Sheets', 'copySalesReport()');
  html += '</div></div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📂 Export CSV (สำหรับแก้ไขใน Excel)</div></div>';
  html += '<div class="admin-actions">';
  html += adminActionCard('🍽️', 'Export เมนู (CSV)', 'ส่งออกเพื่อแก้ไขใน Excel', 'exportMenuForEdit()');
  html += adminActionCard('📦', 'Export Stock (CSV)', 'ส่งออกเพื่อแก้ไขใน Excel', 'exportStockForEdit()');
  html += adminActionCard('👥', 'Export พนักงาน (CSV)', 'ส่งออกเพื่อแก้ไขใน Excel', 'exportStaffForEdit()');
  html += '</div></div>';

  html += '<div class="card mb-16">';
  html += '<div class="card-header"><div class="card-title">📂 Import จาก CSV (แก้ไขแล้วนำเข้ากลับ)</div></div>';
  html += '<div class="admin-actions">';
  html += adminActionCard('🍽️', 'Import เมนู', 'นำเข้าเมนูจากไฟล์ CSV', 'showImportModal(\'menu\')');
  html += adminActionCard('📦', 'Import Stock', 'นำเข้าวัตถุดิบจากไฟล์ CSV', 'showImportModal(\'stock\')');
  html += adminActionCard('👥', 'Import พนักงาน', 'นำเข้าพนักงานจากไฟล์ CSV', 'showImportModal(\'staff\')');
  html += '</div></div>';

  html += '<input type="file" id="importFileInput" accept=".json" style="display:none;" onchange="importJSONFile(this)">';
  html += '<input type="file" id="csvFileInput" accept=".csv" style="display:none;" onchange="handleCSVImport(this)">';

  html += '<div class="card mb-16" style="border-color:var(--danger);">';
  html += '<div class="card-header"><div class="card-title text-danger">⚠️ Danger Zone</div></div>';
  html += '<div class="admin-actions">';
  html += adminActionCard('🗑', 'ล้างออเดอร์ทั้งหมด', 'ลบออเดอร์ (เมนูยังอยู่)', 'clearAllOrders()', true);
  html += adminActionCard('💣', 'Reset ทั้งหมด', 'ลบทุกอย่าง กลับสู่เริ่มต้น', 'resetAllData()', true);
  html += adminActionCard('🧪', 'โหลดข้อมูลตัวอย่าง', 'เพิ่มเมนู + วัตถุดิบ', 'loadSampleData()');
  html += adminActionCard('🔄', 'Hard Refresh', 'โหลดหน้าเว็บใหม่ทั้งหมด', 'hardRefreshConfirm()', true);
  html += '</div></div>';

  return html;
}

function adminActionCard(icon, title, desc, onclick, isDanger) {
  var cls = isDanger ? ' danger' : '';
  var titleCls = isDanger ? ' text-danger' : '';
  return '<div class="admin-action-card' + cls + '" onclick="' + onclick + '">'
    + '<div class="admin-action-icon">' + icon + '</div>'
    + '<div class="admin-action-info">'
    + '<div class="fw-600' + titleCls + '">' + title + '</div>'
    + '<div class="text-muted fs-sm">' + desc + '</div>'
    + '</div></div>';
}

function clearAllOrders() {
  var orders = ST.getOrders();
  confirmDialog('ล้างออเดอร์ทั้งหมด ' + orders.length + ' รายการ? (ออเดอร์ค้างจะถูกล้างด้วย)', function() {
    ST.saveOrders([]);
    ST.saveHoldOrders([]);
    localStorage.removeItem('v1_coffee_orders');
    localStorage.removeItem('v1_coffee_hold_orders');
    toast('ล้างออเดอร์และออเดอร์ค้างแล้ว', 'warning');
    renderAdminView();
  });
}

function resetAllData() {
  confirmDialog('⚠️ Reset ข้อมูลทั้งหมด?\n\n⚠️ ออเดอร์, สต็อก, เมนูตัวอย่าง, พนักงาน จะถูกล้าง\n✅ License (Standard/Pro) จะคงอยู่', function() {
    
    var currentLicense = ST.getObj('license', null);
    var currentLicenseTier = currentLicense ? currentLicense.tier : 'free';
    var currentLicenseKey = currentLicense ? currentLicense.key : null;
    
    var keysToReset = ['categories', 'menu', 'toppings', 'sizes', 'sweetLevels', 'drinkTypes', 
                       'orders', 'stock', 'stockLogs', 'staff', 'shifts', 'favorites', 
                       'channels', 'promptpayAccounts', 'recipes', 'memberTransactions', 'members',
                       'hold_orders', 'kitchen_orders'];
    
    for (var i = 0; i < keysToReset.length; i++) {
      ST.remove(keysToReset[i]);
      localStorage.removeItem('v1_coffee_' + keysToReset[i]);
    }
    
    if (typeof FeatureManager !== 'undefined') {
      FeatureManager.clearOverrides();
    }
    
    localStorage.removeItem('current_session');
    if (APP) APP.currentStaff = null;
    
    localStorage.removeItem('sidebarHidden');
    localStorage.removeItem('recentStripHidden');
    localStorage.removeItem('holdStripHidden');
    
    if (currentLicense && currentLicenseTier !== 'free') {
      ST.setObj('license', {
        key: currentLicenseKey,
        tier: currentLicenseTier,
        activatedAt: Date.now()
      });
    }
    
    setText('topStaff', '');
    applyShopName();
    
    ensureDefaultData();
    
    if (ST.getStaff().length === 0) {
      ST.addStaff({
        id: genId('staff'),
        name: 'ผู้ดูแลระบบ',
        pin: '0000',
        role: 'manager',
        active: true
      });
    }
    
    if (typeof FeatureManager !== 'undefined') {
      FeatureManager.applyToUI();
    }
    if (typeof updateSidebarByStaffPermission === 'function') {
      updateSidebarByStaffPermission();
    }
    
    toast('✅ ล้างข้อมูลเรียบร้อย (License: ' + (currentLicenseTier === 'free' ? 'Free' : currentLicenseTier.toUpperCase()) + ')', 'success');
    
    if (typeof nav === 'function') {
      nav('pos');
    }
    
    setTimeout(function() {
      if (typeof showPinLogin === 'function') {
        showPinLogin();
      }
    }, 500);
  });
}

function ensureDefaultData() {
  var cats = ST.getCategories();
  if (!cats || cats.length === 0) {
    ST.saveCategories(ST._defaultCategories());
  }
  
  var sizes = ST.getSizes();
  if (!sizes || sizes.length === 0) {
    ST.saveSizes(ST._defaultSizes());
  }
  
  var toppings = ST.getToppings();
  if (!toppings || toppings.length === 0) {
    ST.saveToppings(ST._defaultToppings());
  }
  
  var sweetLevels = ST.getSweetLevels();
  if (!sweetLevels || sweetLevels.length === 0) {
    ST.saveSweetLevels(ST._defaultSweetLevels());
  }
  
  var drinkTypes = ST.getDrinkTypes();
  if (!drinkTypes || drinkTypes.length === 0) {
    ST.saveDrinkTypes(ST._defaultDrinkTypes());
  }
  
  var channels = ST.getChannels();
  if (!channels || channels.length === 0) {
    ST.saveChannels(ST._defaultChannels());
  }
  
  console.log('[ensureDefaultData] Default data created');
}

function hardRefreshConfirm() {
  confirmDialog('⚠️ Hard Refresh จะโหลดหน้าเว็บใหม่ทั้งหมด\nคุณอาจต้องเข้าสู่ระบบใหม่\n\nยืนยัน?', function() {
    toast('กำลังโหลดหน้าใหม่...', 'warning', 1000);
    setTimeout(function() {
      location.reload();
    }, 500);
  });
}

function loadSampleData() {
  confirmDialog('เพิ่มข้อมูลตัวอย่าง? (ข้อมูลเดิมไม่ถูกลบ)', function() {
    ST.seedSampleData();
    renderAdminView();
    toast('เพิ่มข้อมูลตัวอย่างเรียบร้อย', 'success');
  });
}

function importJSONTrigger() {
  var input = $('importFileInput');
  if (input) input.click();
}

function importJSONFile(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      confirmDialog('นำเข้าจาก ' + file.name + '?\nข้อมูลเดิมจะถูกแทนที่', function() {
        ST.importAll(data);
        applyShopName();
        applyTheme();
        if (typeof applyFeatureToggle === 'function') applyFeatureToggle();
        renderAdminView();
      });
    } catch (err) {
      toast('ไฟล์ JSON ไม่ถูกต้อง', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function testLineNotify() {
  var token = ($('cfgLineToken') || {}).value;
  if (!token) { toast('กรุณาใส่ Token', 'error'); return; }
  var msg = '🔔 ทดสอบจาก ' + (ST.getConfig().shopName || 'Coffee POS');
  sendLineNotify(token, msg, function(ok) {
    if (ok) toast('ส่งสำเร็จ!', 'success');
    else toast('ส่งไม่สำเร็จ', 'error');
  });
}

function sendDailySummaryLine() {
  var token = ($('cfgLineToken') || {}).value;
  if (!token) { toast('กรุณาใส่ Token', 'error'); return; }
  var msg = buildDailySummaryMessage();
  sendLineNotify(token, msg, function(ok) {
    if (ok) toast('ส่งสรุปแล้ว!', 'success');
  });
}

function copyDailySummary() {
  var msg = buildDailySummaryMessage();
  copyText(msg);
}

function renderRecipeAdminTab() {
  if (typeof FeatureManager !== 'undefined' && !FeatureManager.isEnabled('pro_recipe')) {
    return '<div class="card p-20 text-center">🔒 ต้องมี Pro License</div>';
  }
  return '<div id="recipeViewContainer"></div>';
}

function openKitchenDisplayFromAdmin() {
  if (typeof KitchenDisplay !== 'undefined') {
    KitchenDisplay.openKitchenDisplay();
  } else {
    window.open(window.location.href.split('#')[0] + '?mode=kitchen', '_blank');
  }
}

function showStaffWorkHistory(staffId) {
  var staff = findById(ST.getStaff(), staffId);
  if (!staff) return;
  
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var selectedMonth = currentMonth;
  var selectedYear = currentYear;
  
  renderWorkHistoryModal(staff, selectedMonth, selectedYear);
}

function renderWorkHistoryModal(staff, month, year) {
  var shifts = ST.getShiftsByStaffAndMonth(staff.id, month, year);
  var details = ST.getStaffWorkDetails(staff.id, month, year);
  var performance = ST.getStaffPerformance(staff.id, month, year);
  var totalHours = ST.getStaffWorkHours(staff.id, month, year);
  
  var monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  
  var html = '';
  
  html += '<div class="text-center mb-20">';
  html += '<div class="staff-work-avatar" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">';
  html += '<span style="font-size:32px;">👤</span>';
  html += '</div>';
  html += '<div class="fw-800 fs-xl">' + sanitize(staff.name) + '</div>';
  html += '<div class="text-muted">' + getRoleName(staff.role) + ' · ' + performance.rating + '</div>';
  html += '</div>';
  
  html += '<div class="work-stats-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">';
  html += '<div class="work-stat-card" style="background:var(--bg-card);border-radius:var(--radius);padding:12px;text-align:center;">';
  html += '<div class="work-stat-value" style="font-size:24px;font-weight:800;color:var(--accent);">' + performance.totalDays + '</div>';
  html += '<div class="work-stat-label" style="font-size:11px;color:var(--text-muted);">วันทำงาน</div>';
  html += '</div>';
  html += '<div class="work-stat-card" style="background:var(--bg-card);border-radius:var(--radius);padding:12px;text-align:center;">';
  html += '<div class="work-stat-value" style="font-size:24px;font-weight:800;color:var(--accent2);">' + performance.totalHours + '</div>';
  html += '<div class="work-stat-label" style="font-size:11px;color:var(--text-muted);">ชั่วโมงทำงาน</div>';
  html += '</div>';
  html += '<div class="work-stat-card" style="background:var(--bg-card);border-radius:var(--radius);padding:12px;text-align:center;">';
  html += '<div class="work-stat-value" style="font-size:24px;font-weight:800;color:var(--success);">' + formatMoneySign(performance.totalSales) + '</div>';
  html += '<div class="work-stat-label" style="font-size:11px;color:var(--text-muted);">ยอดขายรวม</div>';
  html += '</div>';
  html += '<div class="work-stat-card" style="background:var(--bg-card);border-radius:var(--radius);padding:12px;text-align:center;">';
  html += '<div class="work-stat-value" style="font-size:24px;font-weight:800;color:var(--warning);">' + formatMoneySign(performance.avgSalesPerHour) + '</div>';
  html += '<div class="work-stat-label" style="font-size:11px;color:var(--text-muted);">รายได้/ชม.</div>';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:10px;">';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="changeWorkHistoryMonth(\'' + staff.id + '\', ' + (month - 1) + ', ' + year + ')">◀ ' + (month === 0 ? monthNames[11] : monthNames[month-1]) + '</button>';
  html += '<span class="fw-700" style="padding:6px 16px;background:var(--bg-card);border-radius:20px;">' + monthNames[month] + ' ' + (year + 543) + '</span>';
  html += '<button class="btn btn-secondary btn-sm" onclick="changeWorkHistoryMonth(\'' + staff.id + '\', ' + (month + 1) + ', ' + year + ')">' + (month === 11 ? monthNames[0] : monthNames[month+1]) + ' ▶</button>';
  html += '</div>';
  html += '<button class="btn btn-sm btn-outline" onclick="exportStaffWorkHistory(\'' + staff.id + '\', ' + month + ', ' + year + ')">📥 Export CSV</button>';
  html += '</div>';
  
  html += '<div class="card-glass p-16 mb-20" style="background:linear-gradient(135deg,var(--accent-glow),transparent);">';
  html += '<div class="flex-between flex-wrap gap-12">';
  html += '<div><span class="text-muted fs-sm">📅 ชั่วโมงทำงาน ' + monthNames[month] + '</span><div class="fw-800 fs-xl" style="color:var(--accent);">' + totalHours + ' ชม.</div></div>';
  html += '<div><span class="text-muted fs-sm">💰 ยอดขายเดือนนี้</span><div class="fw-800 fs-xl text-success">' + formatMoneySign(performance.totalSales) + '</div></div>';
  html += '<div><span class="text-muted fs-sm">📊 เฉลี่ย/วัน</span><div class="fw-800">' + formatMoneySign(performance.avgSalesPerDay) + '</div></div>';
  html += '<div><span class="text-muted fs-sm">⭐ คะแนน</span><div class="fw-800">' + performance.rating + '</div></div>';
  html += '</div>';
  html += '</div>';
  
  if (details.length > 0) {
    var maxHours = 12;
    html += '<div class="work-chart mb-20" style="background:var(--bg-card);border-radius:var(--radius);padding:16px;">';
    html += '<div class="fw-600 mb-12">📊 ชั่วโมงทำงานรายวัน</div>';
    html += '<div class="chart-bars" style="display:flex;gap:6px;align-items:flex-end;min-height:120px;">';
    
    for (var i = 0; i < details.length && i < 31; i++) {
      var d = details[i];
      var barHeight = Math.min(80, (d.hours / maxHours) * 80);
      var dayNum = d.date.split('/')[0];
      var isActive = d.isActive;
      
      html += '<div style="flex:1;text-align:center;">';
      html += '<div style="height:90px;display:flex;flex-direction:column;justify-content:flex-end;">';
      html += '<div style="height:' + barHeight + 'px;background:linear-gradient(180deg,var(--accent),var(--accent2));border-radius:4px 4px 0 0;width:100%;" title="' + d.hours + ' ชั่วโมง"></div>';
      html += '</div>';
      html += '<div class="fs-sm mt-4" style="color:' + (isActive ? 'var(--warning)' : 'var(--text-muted)') + ';">' + dayNum + '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
  }
  
  if (details.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📋</div>';
    html += '<div class="empty-text">ไม่มีประวัติการทำงานในเดือนนี้</div>';
    html += '</div>';
  } else {
    html += '<div class="table-wrap" style="max-height:400px;overflow-y:auto;">';
    html += '<table>';
    html += '<thead style="position:sticky;top:0;background:var(--bg-card);">';
    html += '<tr><th>วันที่</th><th>เวลาเข้า</th><th>เวลาออก</th><th class="text-right">ชั่วโมง</th><th class="text-right">ออเดอร์</th><th class="text-right">ยอดขาย</th><th class="text-right">รายได้/ชม.</th><th class="text-center">สถานะ</th></tr>';
    html += '</thead>';
    html += '<tbody>';
    
    for (var i = 0; i < details.length; i++) {
      var d = details[i];
      var hoursColor = d.hours >= 8 ? 'text-success' : (d.hours >= 4 ? 'text-warning' : 'text-danger');
      var statusText = d.isActive ? '🟢 กำลังทำงาน' : (d.hours >= 8 ? '✅ ครบ' : (d.hours >= 4 ? '🟡 ปกติ' : '🔴 ไม่ครบ'));
      var statusColor = d.isActive ? 'text-warning' : (d.hours >= 8 ? 'text-success' : (d.hours >= 4 ? 'text-info' : 'text-danger'));
      
      html += '<tr>';
      html += '<td class="fw-600">' + relativeDay(d.date) + '<br><span class="text-muted fs-sm">' + d.date + '</span>' + '</td>';
      html += '<td class="text-center">' + d.clockIn + '</td>';
      html += '<td class="text-center">' + (d.isActive ? '<span class="badge badge-warning">ยังไม่เลิก</span>' : d.clockOut) + '</td>';
      html += '<td class="text-right ' + hoursColor + ' fw-600">' + d.hours + ' ชม.' + '</td>';
      html += '<td class="text-right">' + d.orderCount + '  บิล' + '</td>';
      html += '<td class="text-right fw-700 text-accent">' + formatMoneySign(d.dailySales) + '</td>';
      html += '<td class="text-right">' + formatMoneySign(d.salesPerHour) + '</td>';
      html += '<td class="text-center ' + statusColor + '">' + statusText + '</td>';
      html += '</tr>';
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
  }
  
  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  
  openModal('📋 ประวัติการทำงาน: ' + staff.name, html, footer, { wide: true });
}

function changeWorkHistoryMonth(staffId, month, year) {
  var now = new Date();
  if (month < 0) {
    month = 11;
    year--;
  }
  if (month > 11) {
    month = 0;
    year++;
  }
  
  var staff = findById(ST.getStaff(), staffId);
  if (staff) {
    renderWorkHistoryModal(staff, month, year);
  }
}

function exportStaffWorkHistory(staffId, month, year) {
  var staff = findById(ST.getStaff(), staffId);
  if (!staff) return;
  
  var shifts = ST.getShiftsByStaffAndMonth(staffId, month, year);
  
  var rows = [];
  rows.push(['วันที่', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมงทำงาน']);
  
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    var hours = s.clockOut ? calcShiftHours(s) : '';
    rows.push([s.date, s.clockIn, s.clockOut || 'ยังไม่ออก', hours]);
  }
  
  var csv = rowsToCSV(rows);
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = staff.name + '_worklog_' + (year + 543) + '_' + (month + 1) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  
  toast('ดาวน์โหลดเรียบร้อย', 'success');
}

function setupFirstStaff() {
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;margin-bottom:8px;">👋</div>';
  html += '<div class="fw-700 fs-lg mb-4">ยินดีต้อนรับ!</div>';
  html += '<div class="text-muted fs-sm">กรุณาสร้างบัญชีผู้ใช้งานแรก</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อผู้ใช้</label>';
  html += '<input type="text" id="firstStaffName" placeholder="เช่น สมชาย ใจดี" class="form-control">';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">PIN 4 หลัก</label>';
  html += '<input type="password" id="firstStaffPin" placeholder="0000" maxlength="4" class="form-control" style="font-size:24px;text-align:center;letter-spacing:8px;">';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ยืนยัน PIN</label>';
  html += '<input type="password" id="firstStaffConfirmPin" placeholder="0000" maxlength="4" class="form-control" style="font-size:24px;text-align:center;letter-spacing:8px;">';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ตำแหน่ง</label>';
  html += '<select id="firstStaffRole" class="form-control">';
  html += '<option value="manager">ผู้จัดการ (เข้าถึงทุกอย่าง)</option>';
  html += '<option value="cashier">แคชเชียร์</option>';
  html += '<option value="barista">บาริสต้า</option>';
  html += '</select>';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="createFirstStaff()">✅ สร้างบัญชี</button>';
  
  openModal('👤 สร้างบัญชีแรก', html, footer);
}

function createFirstStaff() {
  var name = ($('firstStaffName') || {}).value.trim();
  var pin = ($('firstStaffPin') || {}).value.trim();
  var confirmPin = ($('firstStaffConfirmPin') || {}).value.trim();
  var role = ($('firstStaffRole') || {}).value || 'manager';
  
  if (!name) {
    toast('กรุณาใส่ชื่อผู้ใช้', 'error');
    return;
  }
  
  if (!pin || pin.length !== 4) {
    toast('PIN ต้อง 4 หลัก', 'error');
    return;
  }
  
  if (pin !== confirmPin) {
    toast('PIN ไม่ตรงกัน', 'error');
    return;
  }
  
  var existingStaff = ST.getStaff();
  if (existingStaff.length > 0) {
    toast('มีพนักงานอยู่แล้ว ไม่สามารถสร้างซ้ำได้', 'error');
    closeMForce();
    return;
  }
  
  var newStaff = ST.addStaff({
    name: name,
    pin: pin,
    role: role,
    active: true
  });
  
  toast('สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ', 'success');
  closeMForce();
  
  setTimeout(function() {
    showPinLogin();
  }, 500);
}

/* ============================================
   ADDITIONAL CSS
   ============================================ */
(function() {
  var styleId = 'adminViewStyle';
  if (document.getElementById(styleId)) return;

  var css = '';
  
  css += '.theme-selector{display:flex;gap:12px;padding:8px 0;}';
  css += '.theme-option{flex:1;padding:12px;border:2px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;transition:all var(--transition);}';
  css += '.theme-option:hover{border-color:var(--accent);}';
  css += '.theme-option.active{border-color:var(--accent);background:rgba(249,115,22,0.08);}';
  css += '.theme-preview{height:40px;border-radius:var(--radius-sm);margin-bottom:8px;}';
  css += '.dark-preview{background:linear-gradient(135deg,#0f0f1a,#1a1a2e);}';
  css += '.light-preview{background:linear-gradient(135deg,#f5f5f5,#ffffff);border:1px solid #ddd;}';

  css += '.admin-actions{display:flex;flex-direction:column;gap:6px;}';
  css += '.admin-action-card{display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:all var(--transition);}';
  css += '.admin-action-card:hover{border-color:var(--accent);background:var(--glass);}';
  css += '.admin-action-card.danger:hover{border-color:var(--danger);background:rgba(239,68,68,0.05);}';
  css += '.admin-action-icon{font-size:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}';
  css += '.admin-action-info{flex:1;min-width:0;}';

  css += '.storage-bars{display:flex;flex-direction:column;gap:8px;}';
  css += '.storage-bar-row{padding:2px 0;}';

  css += '.staff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;}';
  css += '.staff-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;transition:all var(--transition);}';
  css += '.staff-card:hover{border-color:var(--accent);}';
  css += '.staff-card.inactive{opacity:0.5;}';
  css += '.staff-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));';
  css += 'display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;flex-shrink:0;}';

  css += '.pin-display{display:flex;justify-content:center;gap:16px;margin-bottom:16px;}';
  css += '.pin-dot{width:20px;height:20px;border-radius:50%;border:2px solid var(--border);transition:all var(--transition);}';
  css += '.pin-dot.filled{background:var(--accent);border-color:var(--accent);}';
  css += '.pin-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:260px;margin:0 auto;}';
  css += '.pin-key{height:52px;font-size:22px;font-weight:700;border-radius:var(--radius-sm);';
  css += 'background:var(--bg-card);border:1px solid var(--border);transition:all var(--transition);display:flex;align-items:center;justify-content:center;}';
  css += '.pin-key:hover{border-color:var(--accent);}';
  css += '.pin-key:active{transform:scale(0.92);background:var(--accent);color:#fff;}';
  css += '.pin-key-enter{background:var(--success);color:#fff;border-color:var(--success);}';

  css += '.about-tech{display:flex;flex-direction:column;}';
  css += '.about-row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--border);}';
  css += '.about-row:last-child{border-bottom:none;}';

  css += '@media(max-width:768px){';
  css += '.staff-grid{grid-template-columns:1fr;}';
  css += '}';

  css += '.work-stat-card{transition:all var(--transition);}';
  css += '.work-stat-card:hover{transform:translateY(-3px);border-color:var(--accent);}';
  css += '.chart-bars{overflow-x:auto;padding-bottom:4px;}';
  css += '.work-chart{overflow-x:auto;}';
  
  css += '.feature-compare-cards{display:flex;flex-direction:column;gap:8px;padding:8px;}';
  css += '.feature-compare-card{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all var(--transition);}';
  css += '.feature-compare-card:hover{border-color:var(--accent);transform:translateX(4px);background:var(--glass);}';
  css += '.feature-compare-card .feature-name{font-size:14px;font-weight:600;}';
  css += '.feature-badges{display:flex;gap:12px;}';
  css += '.tier-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;}';
  css += '.tier-badge.free.active{background:rgba(34,197,94,0.15);color:var(--success);}';
  css += '.tier-badge.free.inactive{background:rgba(239,68,68,0.1);color:var(--danger);}';
  css += '.tier-badge.standard.active{background:rgba(59,130,246,0.15);color:var(--info);}';
  css += '.tier-badge.standard.inactive{background:rgba(239,68,68,0.1);color:var(--danger);}';
  css += '.tier-badge.pro.active{background:rgba(249,115,22,0.15);color:var(--accent);}';
  css += '.tier-badge.pro.inactive{background:rgba(239,68,68,0.1);color:var(--danger);}';
  css += '@media(max-width:768px){';
  css += '.feature-compare-card{flex-direction:column;align-items:flex-start;gap:10px;}';
  css += '.feature-badges{flex-wrap:wrap;}';
  css += '}';

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

console.log('[admin.js] loaded');