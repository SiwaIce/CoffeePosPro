/* ============================================
   LICENSE VERIFICATION v2.0
   รองรับ Cloud Validation + Local Override
   ============================================ */

var LicenseManager = {
  currentKey: null,
  tier: 'free',
  trialExpiry: null,
  useCloud: true,  // ใช้ Cloud Validation หรือไม่
  
  /* License patterns */
  patterns: {
    pro: /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    standard: /^STD-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    trial: /^TRIAL-[A-Z0-9]{6}$/
  },
  
  /* ============================================
     INIT - โหลด license จาก localStorage
     ============================================ */
  init: function() {
    var saved = ST.getObj('license', null);
    if (saved) {
      this.currentKey = saved.key;
      this.tier = saved.tier;
      this.trialExpiry = saved.trialExpiry || null;
      
      /* ตรวจสอบ local override จาก Super Admin */
      var override = ST.getObj('license_override', null);
      if (override && override.enabled) {
        this.tier = override.tier;
        console.log('[LicenseManager] Using local override:', this.tier);
      }
      
      /* Check trial expiry */
      if (this.tier === 'trial' && this.trialExpiry) {
        if (Date.now() > this.trialExpiry) {
          this.tier = 'free';
          this.currentKey = null;
          ST.setObj('license', null);
          toast('⚠️ สิ้นสุดระยะเวลาทดลองใช้แล้ว', 'warning');
        }
      }
    }
  },
  
  /* ============================================
     CHECK CLOUD AVAILABILITY
     ============================================ */
  isCloudAvailable: function() {
    return this.useCloud && typeof firebase !== 'undefined' && firebase.apps.length > 0;
  },
  
  /* ============================================
     VALIDATE LICENSE KEY (Cloud + Local)
     ============================================ */
  validate: async function(key) {
    var cleanKey = key.trim().toUpperCase();
    var self = this;
    
    /* 1. ลอง Cloud Validation ก่อน */
    if (this.isCloudAvailable()) {
      try {
        var result = await this.cloudValidate(cleanKey);
        if (result.valid) {
          this.afterLicenseChange();
          return result;
        }
      } catch(e) {
        console.log('[LicenseManager] Cloud validation failed, fallback to local:', e);
      }
    }
    
    /* 2. Fallback: Local Validation */
    return this.localValidate(cleanKey);
  },
  
  /* ============================================
     CLOUD VALIDATION (Firebase)
     ============================================ */
  cloudValidate: async function(cleanKey) {
    console.log('[LicenseManager] Cloud validating:', cleanKey);
    
    /* ตรวจสอบรูปแบบก่อน */
    if (!this.patterns.pro.test(cleanKey) && 
        !this.patterns.standard.test(cleanKey) && 
        !this.patterns.trial.test(cleanKey)) {
      return { valid: false, error: 'รูปแบบ License ไม่ถูกต้อง' };
    }
    
    try {
      /* เรียก Firebase Cloud Function */
      var verifyLicense = firebase.functions().httpsCallable('verifyLicense');
      var result = await verifyLicense({
        key: cleanKey,
        shopDomain: window.location.hostname,
        timestamp: Date.now()
      });
      
      if (result.data && result.data.valid) {
        this.currentKey = cleanKey;
        this.tier = result.data.tier;
        this.trialExpiry = result.data.expiresAt ? new Date(result.data.expiresAt).getTime() : null;
        
        ST.setObj('license', {
          key: cleanKey,
          tier: this.tier,
          trialExpiry: this.trialExpiry,
          activatedAt: Date.now(),
          verifiedBy: 'cloud'
        });
        
        toast('✅ เปิดใช้งาน ' + this.tier.toUpperCase() + ' (Cloud)', 'success');
        return { valid: true, tier: this.tier };
      } else {
        return { valid: false, error: result.data?.error || 'License ไม่ถูกต้อง' };
      }
    } catch(error) {
      console.error('[LicenseManager] Cloud error:', error);
      return { valid: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  },
  
  /* ============================================
     LOCAL VALIDATION (Fallback)
     ============================================ */
  localValidate: function(cleanKey) {
    console.log('[LicenseManager] Local validating:', cleanKey);
    
    /* Check Pro pattern */
    if (this.patterns.pro.test(cleanKey)) {
      this.currentKey = cleanKey;
      this.tier = 'pro';
      this.trialExpiry = null;
      
      ST.setObj('license', {
        key: cleanKey,
        tier: 'pro',
        activatedAt: Date.now(),
        verifiedBy: 'local'
      });
      
      this.afterLicenseChange();
      return { valid: true, tier: 'pro' };
    }
    
    /* Check Standard pattern */
    if (this.patterns.standard.test(cleanKey)) {
      this.currentKey = cleanKey;
      this.tier = 'standard';
      this.trialExpiry = null;
      
      ST.setObj('license', {
        key: cleanKey,
        tier: 'standard',
        activatedAt: Date.now(),
        verifiedBy: 'local'
      });
      
      this.afterLicenseChange();
      return { valid: true, tier: 'standard' };
    }
    
    /* Check Trial pattern */
    if (this.patterns.trial.test(cleanKey)) {
      var expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      
      this.currentKey = cleanKey;
      this.tier = 'trial';
      this.trialExpiry = expiry;
      
      ST.setObj('license', {
        key: cleanKey,
        tier: 'trial',
        trialExpiry: expiry,
        activatedAt: Date.now(),
        verifiedBy: 'local'
      });
      
      this.afterLicenseChange();
      
      var daysLeft = 30;
      toast('🎉 ทดลองใช้ 30 วัน เหลือ ' + daysLeft + ' วัน', 'success');
      
      return { valid: true, tier: 'trial', daysLeft: 30 };
    }
    
    return { valid: false, error: 'รูปแบบ License ไม่ถูกต้อง' };
  },
  
  /* ============================================
     FORCE LOCAL OVERRIDE (Super Admin)
     ============================================ */
  forceLocalOverride: function(tier, key) {
    this.tier = tier;
    this.currentKey = key || ('OVERRIDE-' + tier.toUpperCase());
    
    /* บันทึก override */
    ST.setObj('license_override', {
      enabled: true,
      tier: tier,
      key: this.currentKey,
      setAt: Date.now(),
      setBy: 'super_admin'
    });
    
    /* บันทึก license หลัก */
    ST.setObj('license', {
      key: this.currentKey,
      tier: tier,
      activatedAt: Date.now(),
      verifiedBy: 'override'
    });
    
    toast('🔧 บังคับ License เป็น ' + tier.toUpperCase() + ' (Local Override)', 'warning');
    
    this.afterLicenseChange();
  },
  
  /* ============================================
     REMOVE LOCAL OVERRIDE
     ============================================ */
  removeLocalOverride: function() {
    ST.remove('license_override');
    
    /* reload license ปกติ */
    var saved = ST.getObj('license', null);
    if (saved && saved.verifiedBy !== 'override') {
      this.tier = saved.tier;
      this.currentKey = saved.key;
    } else {
      this.tier = 'free';
      this.currentKey = null;
    }
    
    toast('🆓 ยกเลิก Override กลับสู่ License ปกติ', 'info');
    this.afterLicenseChange();
  },
  
  /* ============================================
     GET CURRENT TIER (รวม Override)
     ============================================ */
  getTier: function() {
    /* ตรวจสอบ local override ก่อน */
    var override = ST.getObj('license_override', null);
    if (override && override.enabled) {
      return override.tier;
    }
    
    var saved = ST.getObj('license', null);
    if (saved && saved.tier) {
      if (saved.tier === 'trial' && saved.trialExpiry && Date.now() > saved.trialExpiry) {
        return 'free';
      }
      return saved.tier;
    }
    return 'free';
  },
  
  /* ============================================
     AFTER LICENSE CHANGE
     ============================================ */
  afterLicenseChange: function() {
    console.log('[LicenseManager] License changed to:', this.tier);
    
    if (typeof FeatureManager !== 'undefined') {
      FeatureManager.clearOverrides();
      FeatureManager.applyToUI();
    }
    
    if (typeof updateSidebarByStaffPermission === 'function') {
      updateSidebarByStaffPermission();
    }
    if (typeof updateSidebarVisibility === 'function') {
      updateSidebarVisibility();
    }
    
    if (typeof APP !== 'undefined' && APP) {
      if (APP.currentView === 'admin' && typeof renderAdminView === 'function') {
        renderAdminView();
      }
      if (APP.currentView === 'pos' && typeof renderPOSView === 'function') {
        renderPOSView();
      }
    }
  },
  
  /* ============================================
     GET TRIAL DAYS LEFT
     ============================================ */
  getTrialDaysLeft: function() {
    var saved = ST.getObj('license', null);
    if (saved && saved.tier === 'trial' && saved.trialExpiry) {
      var diff = saved.trialExpiry - Date.now();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    return 0;
  },
  
  getCurrentKey: function() {
    var saved = ST.getObj('license', null);
    if (saved && saved.key) return saved.key;
    return this.currentKey;
  },
  
  /* ============================================
     SHOW LICENSE MODAL
     ============================================ */
  showLicenseModal: function() {
    var html = '';
    var currentTier = this.getTier();
    var daysLeft = this.getTrialDaysLeft();
    var cloudStatus = this.isCloudAvailable() ? '🟢 เชื่อมต่อ Cloud' : '🔴 Offline Mode';
    
    html += '<div class="text-center mb-16">';
    html += '<div style="font-size:48px;">🔑</div>';
    html += '<div class="fw-800 fs-xl mb-2">License</div>';
    html += '<div class="text-muted fs-sm">สถานะ: ';
    if (currentTier === 'pro') {
      html += '<span class="badge badge-success">⭐ Pro</span>';
    } else if (currentTier === 'trial') {
      html += '<span class="badge badge-warning">🧪 ทดลองใช้ (เหลือ ' + daysLeft + ' วัน)</span>';
    } else if (currentTier === 'standard') {
      html += '<span class="badge badge-info">📦 Standard</span>';
    } else {
      html += '<span class="badge badge-secondary">🆓 Free</span>';
    }
    html += '</div>';
    html += '<div class="text-muted fs-xs mt-2">' + cloudStatus + '</div>';
    if (this.getCurrentKey()) {
      html += '<div class="text-muted fs-sm mt-4">Key: <code>' + this.getCurrentKey() + '</code></div>';
    }
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">License Key</label>';
    html += '<input type="text" id="licenseKey" placeholder="PRO-XXXX-XXXX หรือ STD-XXXX-XXXX" style="font-family:monospace;text-align:center;letter-spacing:2px;">';
    html += '<div class="form-hint">รูปแบบ: PRO-ABCD-1234, STD-ABCD-1234 หรือ TRIAL-XXXXXX</div>';
    html += '</div>';
    
    html += '<div class="flex gap-8 flex-wrap">';
    html += '<button class="btn btn-secondary btn-sm" onclick="LicenseManager.pasteDemoKey()">📋 วาง Demo Key</button>';
    html += '<button class="btn btn-info btn-sm" onclick="LicenseManager.generateAndPaste()">🎲 สุ่ม Key ทดสอบ</button>';
    html += '</div>';
    
    var footer = '';
    footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
    footer += '<button class="btn btn-primary" onclick="LicenseManager.activateFromModal()">🔓 เปิดใช้งาน</button>';
    
    openModal('🔑 ลงทะเบียน License', html, footer);
  },
  
  activateFromModal: function() {
    var keyEl = document.getElementById('licenseKey');
    if (!keyEl) return;
    
    var key = keyEl.value.trim();
    if (!key) {
      toast('กรุณาใส่ License Key', 'error');
      return;
    }
    
    /* ใช้ async/await */
    this.validate(key).then(function(result) {
      if (result.valid) {
        closeMForce();
      } else {
        toast('❌ ' + result.error, 'error');
      }
    });
  },
  
  pasteDemoKey: function() {
    var keyEl = document.getElementById('licenseKey');
    if (keyEl) {
      keyEl.value = 'PRO-DEMO-0000';
      toast('วาง Demo Key แล้ว (ใช้เพื่อทดสอบ)', 'info');
    }
  },
  
  generateAndPaste: function() {
    var keyEl = document.getElementById('licenseKey');
    if (keyEl) {
      keyEl.value = this.generateDemoKey();
      toast('สุ่ม Key ทดสอบเรียบร้อย', 'success');
    }
  },
  
  generateDemoKey: function() {
    var parts = [];
    for (var i = 0; i < 2; i++) {
      var part = '';
      for (var j = 0; j < 4; j++) {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        part += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      parts.push(part);
    }
    return 'PRO-' + parts.join('-');
  }
};
  // 🔥 เพิ่มฟังก์ชัน forceTier
  forceTier: function(tier, key) {
    this.tier = tier;
    this.currentKey = key || ('FORCED-' + tier.toUpperCase());
    
    ST.setObj('license_override', {
      enabled: true,
      tier: tier,
      key: this.currentKey,
      setAt: Date.now(),
      setBy: 'super_admin'
    });
    
    ST.setObj('license', {
      key: this.currentKey,
      tier: tier,
      activatedAt: Date.now(),
      verifiedBy: 'override'
    });
    
    toast('🔧 บังคับ License เป็น ' + tier.toUpperCase(), 'warning');
    
    this.afterLicenseChange();
  },
  
  // 🔥 เพิ่มฟังก์ชัน resetToFree
  resetToFree: function() {
    this.tier = 'free';
    this.currentKey = null;
    
    ST.remove('license');
    ST.remove('license_override');
    
    localStorage.removeItem('current_session');
    if (typeof APP !== 'undefined') {
      APP.currentStaff = null;
    }
    
    toast('🆓 รีเซ็ตเป็น Free Edition', 'info');
    
    this.afterLicenseChange();
  },
  
  // 🔥 เพิ่มฟังก์ชัน afterLicenseChange (ถ้ายังไม่มี)
  afterLicenseChange: function() {
    console.log('[LicenseManager] License changed to:', this.tier);
    
    if (typeof FeatureManager !== 'undefined') {
      FeatureManager.clearOverrides();
      FeatureManager.applyToUI();
    }
    
    if (typeof updateSidebarByStaffPermission === 'function') {
      updateSidebarByStaffPermission();
    }
    if (typeof updateSidebarVisibility === 'function') {
      updateSidebarVisibility();
    }
    
    if (typeof APP !== 'undefined' && APP) {
      if (APP.currentView === 'admin' && typeof renderAdminView === 'function') {
        renderAdminView();
      }
      if (APP.currentView === 'pos' && typeof renderPOSView === 'function') {
        renderPOSView();
      }
    }
  }
};

/* ============================================
   SUPER ADMIN: LICENSE OVERRIDE
   เพิ่มใน super-admin.js ด้วย
   ============================================ */

/* ฟังก์ชันสำหรับ Super Admin */
function showLicenseOverridePanel() {
  var currentOverride = ST.getObj('license_override', null);
  var currentTier = LicenseManager.getTier();
  
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;">🔧</div>';
  html += '<div class="fw-800 fs-lg mb-2">License Override</div>';
  html += '<div class="text-muted fs-sm">บังคับ License โดยไม่ต้องใช้ Key (สำหรับทดสอบ)</div>';
  html += '</div>';
  
  html += '<div class="card-glass p-16 mb-16">';
  html += '<div class="flex-between mb-8">';
  html += '<span>สถานะปัจจุบัน:</span>';
  html += '<span class="fw-700">' + (currentOverride && currentOverride.enabled ? '🔧 Override กำลังทำงาน' : '🆓 ใช้ License ปกติ') + '</span>';
  html += '</div>';
  if (currentOverride && currentOverride.enabled) {
    html += '<div class="flex-between">';
    html += '<span>Override Tier:</span>';
    html += '<span class="fw-700 text-accent">' + currentOverride.tier.toUpperCase() + '</span>';
    html += '</div>';
  }
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">เลือก Tier ที่ต้องการบังคับ</label>';
  html += '<div class="flex gap-8 flex-wrap">';
  html += '<button class="btn btn-secondary" onclick="LicenseManager.forceLocalOverride(\'free\')">🆓 Free</button>';
  html += '<button class="btn btn-info" onclick="LicenseManager.forceLocalOverride(\'standard\')">📦 Standard</button>';
  html += '<button class="btn btn-primary" onclick="LicenseManager.forceLocalOverride(\'pro\')">⭐ Pro</button>';
  html += '</div>';
  html += '</div>';
  
  if (currentOverride && currentOverride.enabled) {
    html += '<div class="form-group mt-8">';
    html += '<button class="btn btn-danger btn-block" onclick="LicenseManager.removeLocalOverride()">🗑 ยกเลิก Override</button>';
    html += '</div>';
  }
  
  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  
  openModal('🔧 License Override (Super Admin)', html, footer);
}

/* Auto init */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    LicenseManager.init();
  });
} else {
  LicenseManager.init();
}
// เพิ่มเข้าไปใน LicenseManager object
LicenseManager.setTier = function(tier) {
  this.tier = tier;
  if (typeof FeatureManager !== 'undefined') {
    FeatureManager.applyToUI();
  }
  if (typeof updateSidebarByStaffPermission === 'function') {
    updateSidebarByStaffPermission();
  }
};

LicenseManager.setKey = function(key) {
  this.currentKey = key;
};

console.log('[license-verify.js] loaded');