/* ============================================
   LICENSE VERIFICATION - Local Only Version
   ============================================ */

var LicenseManager = {
  currentKey: null,
  tier: 'free',
  trialExpiry: null,
  
  patterns: {
    pro: /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    standard: /^STD-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    trial: /^TRIAL-[A-Z0-9]{6}$/
  },
  
  init: function() {
    var saved = ST.getObj('license', null);
    if (saved) {
      this.currentKey = saved.key;
      this.tier = saved.tier;
      this.trialExpiry = saved.trialExpiry || null;
      
      var override = ST.getObj('license_override', null);
      if (override && override.enabled) {
        this.tier = override.tier;
      }
      
      if (this.tier === 'trial' && this.trialExpiry) {
        if (Date.now() > this.trialExpiry) {
          this.tier = 'free';
          this.currentKey = null;
          ST.setObj('license', null);
        }
      }
    }
  },
  
  validate: function(key) {
    var cleanKey = key.trim().toUpperCase();
    
    if (this.patterns.pro.test(cleanKey)) {
      this.currentKey = cleanKey;
      this.tier = 'pro';
      this.trialExpiry = null;
      ST.setObj('license', { key: cleanKey, tier: 'pro', activatedAt: Date.now() });
      this.afterLicenseChange();
      return { valid: true, tier: 'pro' };
    }
    
    if (this.patterns.standard.test(cleanKey)) {
      this.currentKey = cleanKey;
      this.tier = 'standard';
      this.trialExpiry = null;
      ST.setObj('license', { key: cleanKey, tier: 'standard', activatedAt: Date.now() });
      this.afterLicenseChange();
      return { valid: true, tier: 'standard' };
    }
    
    if (this.patterns.trial.test(cleanKey)) {
      var expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      this.currentKey = cleanKey;
      this.tier = 'trial';
      this.trialExpiry = expiry;
      ST.setObj('license', { key: cleanKey, tier: 'trial', trialExpiry: expiry, activatedAt: Date.now() });
      this.afterLicenseChange();
      return { valid: true, tier: 'trial', daysLeft: 30 };
    }
    
    return { valid: false, error: 'รูปแบบ License ไม่ถูกต้อง' };
  },
  
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
  
  removeLocalOverride: function() {
    ST.remove('license_override');
    var saved = ST.getObj('license', null);
    if (saved && saved.verifiedBy !== 'override') {
      this.tier = saved.tier;
      this.currentKey = saved.key;
    } else {
      this.tier = 'free';
      this.currentKey = null;
    }
    toast('🆓 ยกเลิก Override', 'info');
    this.afterLicenseChange();
  },
  
  getTier: function() {
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
  
  getCurrentKey: function() {
    var saved = ST.getObj('license', null);
    return saved ? saved.key : this.currentKey;
  },
  
  getTrialDaysLeft: function() {
    var saved = ST.getObj('license', null);
    if (saved && saved.tier === 'trial' && saved.trialExpiry) {
      var diff = saved.trialExpiry - Date.now();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    return 0;
  },
  
  setTier: function(tier) {
    this.tier = tier;
    this.afterLicenseChange();
  },
  
  setKey: function(key) {
    this.currentKey = key;
  },
  
  afterLicenseChange: function() {
    console.log('[LicenseManager] License changed to:', this.tier);
    
    if (typeof FeatureManager !== 'undefined') {
      if (typeof FeatureManager.clearOverrides === 'function') {
        FeatureManager.clearOverrides();
      }
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
  
  showLicenseModal: function() {
    var html = '';
    var currentTier = this.getTier();
    var daysLeft = this.getTrialDaysLeft();
    
    html += '<div class="text-center mb-16">';
    html += '<div style="font-size:48px;">🔑</div>';
    html += '<div class="fw-800 fs-xl mb-2">License</div>';
    html += '<div class="text-muted fs-sm">สถานะ: ';
    if (currentTier === 'pro') html += '<span class="badge badge-success">⭐ Pro</span>';
    else if (currentTier === 'trial') html += '<span class="badge badge-warning">🧪 ทดลองใช้</span>';
    else if (currentTier === 'standard') html += '<span class="badge badge-info">📦 Standard</span>';
    else html += '<span class="badge badge-secondary">🆓 Free</span>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">License Key</label>';
    html += '<input type="text" id="licenseKey" placeholder="PRO-XXXX-XXXX" style="font-family:monospace;text-align:center;">';
    html += '</div>';
    
    var footer = '';
    footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
    footer += '<button class="btn btn-primary" onclick="LicenseManager.activateFromModal()">🔓 เปิดใช้งาน</button>';
    
    openModal('🔑 License', html, footer);
  },
  
  activateFromModal: function() {
    var keyEl = document.getElementById('licenseKey');
    if (!keyEl) return;
    
    var result = this.validate(keyEl.value.trim());
    if (result.valid) {
      closeMForce();
      toast('✅ เปิดใช้งาน ' + result.tier.toUpperCase() + ' สำเร็จ!', 'success');
    } else {
      toast('❌ ' + result.error, 'error');
    }
  }
};

LicenseManager.init();

console.log('[license-verify.js] loaded');