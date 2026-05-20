/* ============================================
   COFFEE POS — SUPER ADMIN SYSTEM
   เข้าถึง: กดโลโก้ 5 ครั้ง / Console / ค้นหา "admin"
   Version: 2.0 (Full Feature Management)
   ============================================ */

/* Ensure ST exists */
if (typeof ST === 'undefined') {
  var ST = {
    getObj: function(key, fallback) { return fallback; },
    setObj: function(key, val) { console.log('[ST]', key, val); }
  };
}

var SuperAdmin = {
  isLoggedIn: false,
  defaultPassword: '0000',
  currentPassword: null,
  loginAttempts: 0,
  maxAttempts: 5,
  logoClickCount: 0,
  logoClickTimer: null,

  /* ============================================
     INIT
     ============================================ */
  init: function() {
    /* Load from storage */
    var saved = ST.getObj('super_admin', null);
    if (!saved) {
      /* First time setup */
      ST.setObj('super_admin', {
        password: this.defaultPassword,
        isSetup: true,
        setupAt: Date.now()
      });
      this.currentPassword = this.defaultPassword;
    } else {
      this.currentPassword = saved.password;
    }
    
    /* Setup logo click listener */
    this.setupLogoListener();
    
    /* Setup search listener */
    this.setupSearchListener();
    
    /* Expose to console */
    window.openSuperAdmin = function() {
      SuperAdmin.showLoginModal();
    };
    
    /* Expose feature manager to console */
    window.FeatureManager = FeatureManager;
    
    console.log('[SuperAdmin] ready — 3 ways to access:');
    console.log('  1. กดโลโก้ ☕ ที่ header 5 ครั้ง');
    console.log('  2. พิมพ์ openSuperAdmin() ใน console');
    console.log('  3. พิมพ์ "admin" ในช่องค้นหาเมนู');
  },

  /* ============================================
     1. LOGO CLICK DETECTION
     ============================================ */
  setupLogoListener: function() {
    var self = this;
    
    var checkInterval = setInterval(function() {
      var logo = document.querySelector('.brand-icon, .brand-name, #shopName');
      if (logo) {
        clearInterval(checkInterval);
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', function(e) {
          e.stopPropagation();
          self.onLogoClick();
        });
      }
    }, 500);
  },

  onLogoClick: function() {
    this.logoClickCount++;
    
    if (this.logoClickTimer) clearTimeout(this.logoClickTimer);
    
    this.logoClickTimer = setTimeout(function() {
      SuperAdmin.logoClickCount = 0;
    }, 1000);
    
    if (this.logoClickCount >= 5) {
      this.logoClickCount = 0;
      this.showLoginModal();
      vibrate(50);
    }
  },

  /* ============================================
     2. SEARCH "admin" DETECTION
     ============================================ */
  setupSearchListener: function() {
    var self = this;
    
    document.addEventListener('input', function(e) {
      if (e.target && (e.target.id === 'posSearch' || e.target.id === 'menuListSearch')) {
        var val = e.target.value;
        if (val && val.toLowerCase() === 'admin') {
          self.showLoginModal();
          e.target.value = '';
        }
      }
    });
  },

  /* ============================================
     LOGIN MODAL
     ============================================ */
  showLoginModal: function() {
    var html = '';
    html += '<div class="text-center mb-16">';
    html += '<div style="font-size:48px;margin-bottom:8px;">👑</div>';
    html += '<div class="fw-700 fs-lg mb-4">Super Admin</div>';
    html += '<div class="text-muted fs-sm">กรุณาใส่รหัสผ่าน</div>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">รหัสผ่าน</label>';
    html += '<input type="password" id="saPassword" placeholder="****" style="font-size:24px;text-align:center;letter-spacing:8px;" maxlength="6" inputmode="numeric">';
    html += '</div>';
    
    if (this.loginAttempts >= this.maxAttempts) {
      html += '<div class="text-danger text-center fs-sm mb-8">❌ หมดโอกาสลองใหม่ รอ 5 นาที</div>';
    }
    
    var footer = '';
    footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
    footer += '<button class="btn btn-primary" onclick="SuperAdmin.verifyLogin()">เข้าสู่ระบบ</button>';
    
    openModal('👑 Super Admin', html, footer);
    
    setTimeout(function() {
      var input = $('saPassword');
      if (input) input.focus();
    }, 100);
  },

  /* ============================================
     VERIFY PASSWORD
     ============================================ */
  verifyLogin: function() {
    var input = $('saPassword');
    if (!input) return;
    
    var enteredPass = input.value;
    
    if (enteredPass === this.currentPassword) {
      this.isLoggedIn = true;
      this.loginAttempts = 0;
      closeMForce();
      toast('✅ เข้าสู่ระบบ Super Admin', 'success');
      this.showAdminPanel();
    } else {
      this.loginAttempts++;
      var remaining = this.maxAttempts - this.loginAttempts;
      toast('❌ รหัสผิด เหลือ ' + remaining + ' ครั้ง', 'error');
      
      if (this.loginAttempts >= this.maxAttempts) {
        this.lockout();
      }
      
      vibrate(100);
      if (typeof playSound === 'function') playSound('error');
    }
  },

  /* ============================================
     LOCKOUT
     ============================================ */
  lockout: function() {
    var self = this;
    toast('🔒 หมดโอกาสลองใหม่ รอ 5 นาที', 'error');
    setTimeout(function() {
      self.loginAttempts = 0;
      toast('🔓 ลองใหม่ได้แล้ว', 'info');
    }, 300000);
  },

  /* ============================================
     CHANGE PASSWORD
     ============================================ */
  changePassword: function(oldPass, newPass) {
    if (oldPass !== this.currentPassword) {
      toast('รหัสเดิมไม่ถูกต้อง', 'error');
      return false;
    }
    
    if (!newPass || newPass.length < 4) {
      toast('รหัสใหม่อย่างน้อย 4 หลัก', 'error');
      return false;
    }
    
    this.currentPassword = newPass;
    ST.setObj('super_admin', { password: newPass, isSetup: true, setupAt: Date.now() });
    toast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
    return true;
  },

/* ============================================
     SHOW ADMIN PANEL (Full Feature Management)
     ============================================ */
  showAdminPanel: function() {
    var features = FeatureManager.getAllGrouped();
    var licenseTier = FeatureManager.getLicenseTier();
    var licenseKey = (typeof LicenseManager !== 'undefined' && LicenseManager) ? LicenseManager.getCurrentKey() : null;
    var currentTierName = FeatureManager.getCurrentTierName();
    
    var html = '';
    
    /* Header */
    html += '<div class="text-center mb-16">';
    html += '<div style="font-size:56px;">👑</div>';
    html += '<div class="fw-800 fs-xl mb-2">Super Admin Panel</div>';
    html += '<div class="text-muted fs-sm">License: ' + currentTierName + '</div>';
    if (licenseKey) {
      html += '<div class="text-muted fs-sm">Key: <code>' + sanitize(licenseKey) + '</code></div>';
    }
    html += '</div>';
    
    /* Stats */
    var proCount = features.pro.length;
    var enabledPro = 0;
    for (var i = 0; i < features.pro.length; i++) {
      if (features.pro[i].enabled) enabledPro++;
    }
    
    html += '<div class="kpi-grid mb-16" style="grid-template-columns:repeat(3,1fr);">';
    html += '<div class="kpi-card"><div class="kpi-value">' + features.standard.length + '</div><div class="kpi-label">Standard Features</div></div>';
    html += '<div class="kpi-card"><div class="kpi-value">' + proCount + '</div><div class="kpi-label">Pro Features</div></div>';
    html += '<div class="kpi-card"><div class="kpi-value text-accent">' + enabledPro + '/' + proCount + '</div><div class="kpi-label">Pro Enabled</div></div>';
    html += '</div>';
    
    /* Change Password Section */
    html += '<div class="card mb-16">';
    html += '<div class="card-header"><div class="card-title">🔐 เปลี่ยนรหัสผ่าน Super Admin</div></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label class="form-label">รหัสปัจจุบัน</label>';
    html += '<input type="password" id="saOldPass" placeholder="****" maxlength="6"></div>';
    html += '<div class="form-group"><label class="form-label">รหัสใหม่</label>';
    html += '<input type="password" id="saNewPass" placeholder="****" maxlength="6"></div>';
    html += '<div class="form-group" style="display:flex;align-items:flex-end;"><button class="btn btn-primary btn-sm" onclick="SuperAdmin.changePasswordFromModal()">เปลี่ยนรหัส</button></div>';
    html += '</div>';
    html += '</div>';
    
    /* Preset Section - 3 ปุ่มใหญ่ */
    html += '<div class="card mb-16">';
    html += '<div class="card-header">';
    html += '<div class="card-title">📦 Preset การตั้งค่า</div>';
    html += '<div class="text-muted fs-sm">เลือกชุดฟีเจอร์สำเร็จรูป</div>';
    html += '</div>';
    html += '<div class="preset-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
    
    /* Free Preset */
    html += '<div class="preset-card" onclick="SuperAdmin.applyPresetWithConfirm(\'free\')" style="cursor:pointer;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;transition:all var(--transition);">';
    html += '<div style="font-size:32px;">🆓</div>';
    html += '<div class="fw-700 mt-4">Free</div>';
    html += '<div class="text-muted fs-sm">ฟีเจอร์พื้นฐาน</div>';
    html += '</div>';
    
    /* Standard Preset */
    html += '<div class="preset-card" onclick="SuperAdmin.applyPresetWithConfirm(\'standard\')" style="cursor:pointer;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;transition:all var(--transition);">';
    html += '<div style="font-size:32px;">📦</div>';
    html += '<div class="fw-700 mt-4">Standard</div>';
    html += '<div class="text-muted fs-sm">ฟีเจอร์ทั่วไป</div>';
    html += '</div>';
    
    /* Pro Preset */
    var proDisabled = (licenseTier !== 'pro') ? ' style="opacity:0.5;cursor:not-allowed;"' : '';
    html += '<div class="preset-card" onclick="' + (licenseTier === 'pro' ? 'SuperAdmin.applyPresetWithConfirm(\'pro\')' : '') + '"' + proDisabled + ' style="cursor:pointer;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;transition:all var(--transition);">';
    html += '<div style="font-size:32px;">⭐</div>';
    html += '<div class="fw-700 mt-4">Pro</div>';
    html += '<div class="text-muted fs-sm">ฟีเจอร์ทั้งหมด</div>';
    if (licenseTier !== 'pro') {
      html += '<div class="text-warning fs-sm mt-2">ต้องมี Pro License</div>';
    }
    html += '</div>';
    
    html += '</div>';
    html += '</div>';

/* License Override Section */
html += '<div class="card mb-16">';
html += '<div class="card-header">';
html += '<div class="card-title">🔑 บังคับ License (สำหรับทดสอบ)</div>';
html += '<div class="text-muted fs-sm">⚠️ ใช้สำหรับทดสอบเท่านั้น</div>';
html += '</div>';
html += '<div class="flex gap-8 flex-wrap">';
html += '<button class="btn btn-sm ' + (licenseTier === 'free' ? 'btn-primary' : 'btn-secondary') + '" onclick="LicenseManager.forceTier(\'free\')">🆓 Free</button>';
html += '<button class="btn btn-sm ' + (licenseTier === 'standard' ? 'btn-primary' : 'btn-secondary') + '" onclick="LicenseManager.forceTier(\'standard\')">📦 Standard</button>';
html += '<button class="btn btn-sm ' + (licenseTier === 'pro' ? 'btn-primary' : 'btn-secondary') + '" onclick="LicenseManager.forceTier(\'pro\')">⭐ Pro</button>';
html += '<button class="btn btn-sm btn-danger" onclick="LicenseManager.resetToFree()">🔄 รีเซ็ตเป็น Free</button>';
html += '</div>';
html += '</div>';
    
    /* Feature Toggles - Core (อ่านอย่างเดียว) */
    if (features.core.length > 0) {
      html += '<div class="card mb-16">';
      html += '<div class="card-header"><div class="card-title">📌 CORE (เปิดตลอด - เปลี่ยนไม่ได้)</div></div>';
      for (var c = 0; c < features.core.length; c++) {
        var f = features.core[c];
        html += '<div class="feature-toggle-item" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">';
        html += '<div>';
        html += '<div class="fw-600">' + f.name + '</div>';
        html += '<div class="text-muted fs-sm">' + f.description + '</div>';
        html += '</div>';
        html += '<div><span class="badge badge-success">เปิดตลอด</span></div>';
        html += '</div>';
      }
      html += '</div>';
    }
    
    /* Feature Toggles - Standard (Toggle ได้) */
    if (features.standard.length > 0) {
      html += '<div class="card mb-16">';
      html += '<div class="card-header">';
      html += '<div class="card-title">📦 STANDARD FEATURES</div>';
      html += '<div class="text-muted fs-sm">คลิกที่การ์ดเพื่อเปิด/ปิด</div>';
      html += '</div>';
      
      for (var s = 0; s < features.standard.length; s++) {
        var f2 = features.standard[s];
        var isOn = f2.enabled;
        
        html += '<div class="feature-toggle-item ' + (isOn ? 'enabled' : 'disabled') + '" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="SuperAdmin.toggleFeatureQuick(\'' + f2.id + '\')">';
        html += '<div>';
        html += '<div class="fw-600">' + f2.name + '</div>';
        html += '<div class="text-muted fs-sm">' + f2.description + '</div>';
        html += '</div>';
        html += '<div class="feature-toggle-switch">';
        html += '<div class="toggle-switch ' + (isOn ? 'on' : 'off') + '" style="width:44px;height:24px;background:' + (isOn ? 'var(--success)' : 'var(--border)') + ';border-radius:12px;position:relative;transition:all 0.2s;">';
        html += '<div class="toggle-slider" style="width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;top:2px;' + (isOn ? 'right:2px' : 'left:2px') + ';transition:all 0.2s;"></div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    
    /* Feature Toggles - Pro (Toggle ได้ ถ้ามี Pro License) */
    if (features.pro.length > 0) {
      var canEditPro = (licenseTier === 'pro');
      
      html += '<div class="card mb-16">';
      html += '<div class="card-header">';
      html += '<div class="card-title">⭐ PRO FEATURES</div>';
      if (!canEditPro) {
        html += '<div class="text-muted fs-sm text-warning">🔐 ต้องมี Pro License จึงจะเปิดฟีเจอร์เหล่านี้ได้</div>';
      } else {
        html += '<div class="text-muted fs-sm">คลิกที่การ์ดเพื่อเปิด/ปิด</div>';
      }
      html += '</div>';
      
      for (var pr = 0; pr < features.pro.length; pr++) {
        var f3 = features.pro[pr];
        var isOn3 = f3.enabled;
        var canToggle = canEditPro && f3.canToggle;
        var clickHandler = canToggle ? 'SuperAdmin.toggleFeatureQuick(\'' + f3.id + '\')' : '';
        
        html += '<div class="feature-toggle-item ' + (isOn3 ? 'enabled' : 'disabled') + '" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);' + (canToggle ? 'cursor:pointer;' : 'opacity:0.6;') + '" ' + (clickHandler ? 'onclick="' + clickHandler + '"' : '') + '>';
        html += '<div>';
        html += '<div class="fw-600">' + f3.name + ' <span class="badge badge-accent">Pro</span></div>';
        html += '<div class="text-muted fs-sm">' + f3.description + '</div>';
        html += '</div>';
        html += '<div>';
        if (!canEditPro) {
          html += '<span class="badge badge-warning">ต้องมี Pro License</span>';
        } else {
          html += '<div class="toggle-switch ' + (isOn3 ? 'on' : 'off') + '" style="width:44px;height:24px;background:' + (isOn3 ? 'var(--success)' : 'var(--border)') + ';border-radius:12px;position:relative;transition:all 0.2s;">';
          html += '<div class="toggle-slider" style="width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;top:2px;' + (isOn3 ? 'right:2px' : 'left:2px') + ';transition:all 0.2s;"></div>';
          html += '</div>';
        }
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    
    /* Action Buttons */
    html += '<div class="flex gap-8 mb-16">';
    html += '<button class="btn btn-secondary" onclick="SuperAdmin.resetFeaturesConfirm()" style="flex:1;">🔄 รีเซ็ตทั้งหมด</button>';
    html += '<button class="btn btn-danger" onclick="SuperAdmin.logout()" style="flex:1;">🚪 ออกจากระบบ</button>';
    html += '</div>';
    
    var footer = '<button class="btn btn-primary" onclick="closeMForce()">ปิด</button>';
    
    openModal('👑 Super Admin', html, footer, { wide: true });
  },

  /* ============================================
     NEW: Toggle Feature แบบรวดเร็ว (ไม่ต้อง confirm)
     ============================================ */
  toggleFeatureQuick: function(featureId) {
    var feature = FEATURE_REGISTRY[featureId];
    if (!feature) return;
    
    var currentState = FeatureManager.isEnabled(featureId);
    var newState = !currentState;
    
    FeatureManager.toggleFeature(featureId, newState);
    this.showAdminPanel(); // Refresh panel
  },

  /* ============================================
     PANEL ACTIONS
     ============================================ */
  changePasswordFromModal: function() {
    var oldPass = ($('saOldPass') || {}).value;
    var newPass = ($('saNewPass') || {}).value;
    
    if (this.changePassword(oldPass, newPass)) {
      $('saOldPass').value = '';
      $('saNewPass').value = '';
      toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'success');
      this.showAdminPanel();
    }
  },

  toggleFeatureConfirm: function(featureId, enabled) {
    var feature = FEATURE_REGISTRY[featureId];
    var action = enabled ? 'เปิด' : 'ปิด';
    
    confirmDialog(action + ' "' + feature.name + '" ใช่หรือไม่?', function() {
      FeatureManager.toggleFeature(featureId, enabled);
      SuperAdmin.showAdminPanel();
    });
  },

  applyPresetWithConfirm: function(presetKey) {
    var presetNames = { free: '🆓 Free', standard: '📦 Standard', pro: '⭐ Pro' };
    var presetName = presetNames[presetKey] || presetKey;
    
    confirmDialog('ตั้งค่าเป็น ' + presetName + '? (การตั้งค่าปัจจุบันจะถูกแทนที่)', function() {
      if (presetKey === 'free') {
        SuperAdmin.applyFreePreset();
      } else {
        FeatureManager.applyPreset(presetKey);
      }
      SuperAdmin.showAdminPanel();
    });
  },
  
  /* Free Preset (ปิดทุกอย่างยกเว้น core) */
  applyFreePreset: function() {
    var overrides = {};
    
    /* ปิด Standard Features ทั้งหมด */
    var stdFeatures = ['std_stock', 'std_staff', 'std_line', 'std_promptpay', 
                       'std_channels', 'std_favorites', 'std_recent', 'std_sound', 'std_report'];
    for (var i = 0; i < stdFeatures.length; i++) {
      overrides[stdFeatures[i]] = false;
    }
    
    /* ปิด Pro Features ทั้งหมด */
    var proFeatures = ['pro_members', 'pro_recipe', 'pro_autostock', 'pro_kds', 
                       'pro_realtime', 'pro_advanced_report'];
    for (var j = 0; j < proFeatures.length; j++) {
      overrides[proFeatures[j]] = false;
    }
    
    FeatureManager.saveOverrides(overrides);
    FeatureManager.applyToUI();
    toast('ตั้งค่าเป็น Free แล้ว', 'success');
  },

  resetFeaturesConfirm: function() {
    confirmDialog('⚠️ รีเซ็ตฟีเจอร์ทั้งหมดกลับเป็นค่าเริ่มต้น?', function() {
      FeatureManager.resetToDefaults();
      SuperAdmin.showAdminPanel();
    });
  },

  logout: function() {
    this.isLoggedIn = false;
    closeMForce();
    toast('ออกจากระบบ Super Admin', 'info');
  }
};

/* Auto init */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    SuperAdmin.init();
  });
} else {
  SuperAdmin.init();
}

/* Super Admin Panel CSS */
(function() {
  var styleId = 'superAdminStyle';
  if (document.getElementById(styleId)) return;
  
  var css = '';
  css += '.preset-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow);}';
  css += '.feature-toggle-item:hover{background:var(--glass);}';
  css += '.feature-toggle-item.enabled .fw-600{color:var(--success);}';
  css += '.toggle-switch{transition:all 0.2s;}';
  
  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ============================================
   SUPER ADMIN JS
   (โค้ดทั้งหมดข้างบน)
   ============================================ */

/* Super Admin Panel CSS */
(function() {
  var styleId = 'superAdminStyle';
  if (document.getElementById(styleId)) return;
  
  var css = '';
  css += '.preset-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow);}';
  css += '.feature-toggle-item:hover{background:var(--glass);}';
  css += '.feature-toggle-item.enabled .fw-600{color:var(--success);}';
  css += '.toggle-switch{transition:all 0.2s;}';
  
  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

console.log('[super-admin.js] loaded');