/* ============================================
   LICENSE VERIFICATION - Firebase Cloud Version
   ============================================
   แก้ไขหลัก:
   1. validate() → ยิง Firebase แทนการ pattern match อย่างเดียว
   2. ผูก key ↔ email (1 key = 1 email เท่านั้น)
   3. license tier sync กับ Firebase อัตโนมัติ (ข้ามเครื่อง)
   ============================================ */

var LicenseManager = {
  currentKey: null,
  tier: 'free',
  trialExpiry: null,

  init: function() {
    // โหลดจาก localStorage เป็น fallback (จะถูก override โดย loadUserLicense จาก firebase-sync.js)
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
      } else if (saved.expiresAt && Date.now() > saved.expiresAt) {
        // license แบบมีกำหนดวันหมดอายุ (ไม่ใช่ trial) หมดอายุแล้วตอนยังออฟไลน์
        this.tier = 'free';
        this.currentKey = null;
        ST.setObj('license', null);
      }
    }
  },

  /* ============================================
     🔥 VALIDATE - ตรวจสอบกับ Firebase
     Flow:
       1. ยิง Firestore หา doc ใน licenses collection ที่ key ตรง
       2. ถ้าไม่เจอ → invalid
       3. ถ้า status !== 'active' → invalid
       4. ถ้า activatedEmail มีค่า และ ≠ email ปัจจุบัน → "key ถูกใช้แล้ว"
       5. ถ้าผ่าน → บันทึก activatedEmail = currentUser.email, เซ็ต tier
     ============================================ */
  validate: async function(key) {
    var cleanKey = key.trim().toUpperCase();

    // ต้อง login ก่อนถึงจะ validate ได้
    if (!window.currentUser) {
      return { valid: false, error: 'กรุณา Login ก่อนใส่ License Key' };
    }

    var userEmail = window.currentUser.email;

    try {
      var db = firebase.firestore();
      /* ใช้ get-by-id (key คือ document ID) ไม่ใช่ where-query
         เพื่อให้ security rule จำกัด "list" ทั้ง collection ไว้แค่ admin ได้
         โดยที่ลูกค้ายัง lookup key ของตัวเองได้ตามปกติ (ต้องรู้ key ที่แน่นอนอยู่แล้ว) */
      var docRef = db.collection('licenses').doc(cleanKey);
      var docSnap = await docRef.get();

      if (!docSnap.exists) {
        return { valid: false, error: 'ไม่พบ License Key นี้ในระบบ' };
      }

      var license = docSnap.data();

      // ตรวจ status
      if (license.status !== 'active') {
        return { valid: false, error: 'License Key นี้ถูกระงับแล้ว' };
      }

      // 🔐 ตรวจ email binding: ถ้ามี activatedEmail อยู่แล้วและ ≠ email นี้ → ปฏิเสธ
      if (license.activatedEmail && license.activatedEmail !== userEmail) {
        return { valid: false, error: 'License Key นี้ถูกผูกกับ email อื่นแล้ว' };
      }

      // ตรวจวันหมดอายุ (ใช้ได้ทุก tier ไม่ใช่แค่ trial)
      if (license.expiresAt && Date.now() > license.expiresAt) {
        return { valid: false, error: 'License Key นี้หมดอายุแล้ว' };
      }

      var tier = license.tier;
      var trialExpiry = null;

      // ถ้ายังไม่มี activatedEmail → ผูก email ไว้เลย (ครั้งแรกที่ใช้)
      var updateData = {
        activatedEmail: userEmail,
        activatedAt: license.activatedAt || new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        lastUsedBy: window.location.hostname,
        usedCount: (license.usedCount || 0) + 1
      };

      if (tier === 'trial') {
        if (license.trialExpiry) {
          trialExpiry = license.trialExpiry; // ใช้ค่าจาก Firebase
        } else {
          trialExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
          updateData.trialExpiry = trialExpiry;
        }

        if (Date.now() > trialExpiry) {
          return { valid: false, error: 'Trial หมดอายุแล้ว' };
        }
      }

      await docRef.update(updateData);

      // ผูก license key ไว้ในเอกสารของผู้ใช้เอง (users/{uid}) ที่เจ้าตัวมีสิทธิ์อ่าน/เขียนอยู่แล้ว
      // เพื่อให้ device อื่นค้นพบ license ได้ โดยไม่ต้องให้ client ทั่วไป list ทั้ง collection licenses
      if (window.userDb) {
        try {
          await window.userDb.set({ licenseKey: cleanKey }, { merge: true });
        } catch(saveErr) {
          console.warn('[LicenseManager] save licenseKey to userDb failed:', saveErr);
        }
      }

      // บันทึกลง localStorage + LicenseManager state
      this.currentKey = cleanKey;
      this.tier = tier;
      this.trialExpiry = trialExpiry;

      var licenseObj = { key: cleanKey, tier: tier, activatedAt: Date.now() };
      if (trialExpiry) licenseObj.trialExpiry = trialExpiry;
      if (license.expiresAt) licenseObj.expiresAt = license.expiresAt;

      ST.setObj('license', licenseObj);
      localStorage.setItem('v1_coffee_license', JSON.stringify(licenseObj));

      this.afterLicenseChange();

      var result = { valid: true, tier: tier };
      if (tier === 'trial' && trialExpiry) {
        result.daysLeft = Math.max(0, Math.ceil((trialExpiry - Date.now()) / (1000 * 60 * 60 * 24)));
      }
      return result;

    } catch(e) {
      console.error('[LicenseManager] validate error:', e);
      return { valid: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
    }
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
    localStorage.removeItem('v1_coffee_license');
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
      if (saved.expiresAt && Date.now() > saved.expiresAt) {
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

    if (!window.currentUser) {
      html += '<div class="alert alert-warning">⚠️ กรุณา Login ด้วย Google ก่อนใส่ License Key</div>';
    } else {
      html += '<div class="text-muted fs-sm mb-8">📧 ' + window.currentUser.email + '</div>';
    }

    html += '<div class="form-group">';
    html += '<label class="form-label">License Key</label>';
    html += '<input type="text" id="licenseKey" placeholder="PRO-XXXX-XXXX หรือ STD-XXXX-XXXX" style="font-family:monospace;text-align:center;">';
    html += '</div>';
    html += '<div id="licenseMsg" style="min-height:24px;"></div>';

    var footer = '';
    footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
    footer += '<button class="btn btn-primary" id="btnActivate" onclick="LicenseManager.activateFromModal()">🔓 เปิดใช้งาน</button>';

    openModal('🔑 License', html, footer);
  },

  activateFromModal: async function() {
    var keyEl = document.getElementById('licenseKey');
    var msgEl = document.getElementById('licenseMsg');
    var btn = document.getElementById('btnActivate');
    if (!keyEl) return;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังตรวจสอบ...'; }
    if (msgEl) msgEl.innerHTML = '';

    var result = await this.validate(keyEl.value.trim());

    if (btn) { btn.disabled = false; btn.textContent = '🔓 เปิดใช้งาน'; }

    if (result.valid) {
      closeMForce();
      toast('✅ เปิดใช้งาน ' + result.tier.toUpperCase() + ' สำเร็จ!', 'success');
    } else {
      if (msgEl) msgEl.innerHTML = '<div class="text-danger fs-sm">❌ ' + result.error + '</div>';
      toast('❌ ' + result.error, 'error');
    }
  }
};

LicenseManager.init();

console.log('[license-verify.js] loaded');
