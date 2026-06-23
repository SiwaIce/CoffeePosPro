/* ============================================
   COFFEE POS — FEATURE REGISTRY
   Version: 2.0 (Fixed)
   ============================================ */

if (typeof ST === 'undefined') {
  var ST = {
    getObj: function(key, fallback) { return fallback; },
    setObj: function(key, val) { console.log('[ST]', key, val); }
  };
}

var FEATURE_REGISTRY = {
  core_pos: { id: 'core_pos', name: '🛒 หน้าร้าน POS', tier: 'core', canToggle: false, defaultValue: true, description: 'ระบบขายหน้าร้าน' },
  core_menu: { id: 'core_menu', name: '📋 จัดการเมนู', tier: 'core', canToggle: false, defaultValue: true, description: 'เพิ่ม/แก้ไข/ลบ เมนู' },
  core_orders: { id: 'core_orders', name: '📜 ประวัติออเดอร์', tier: 'core', canToggle: false, defaultValue: true, description: 'ดูและจัดการออเดอร์' },
  core_admin: { id: 'core_admin', name: '⚙️ ตั้งค่าร้าน', tier: 'core', canToggle: false, defaultValue: true, description: 'หน้าการตั้งค่าร้าน' },
  
  std_stock: { id: 'std_stock', name: '📦 Stock วัตถุดิบ', tier: 'standard', canToggle: true, defaultValue: false, description: 'จัดการสต็อกวัตถุดิบ' },
  std_staff: { id: 'std_staff', name: '👥 ระบบพนักงาน', tier: 'standard', canToggle: true, defaultValue: false, description: 'พนักงาน + PIN Login' },
  std_report: { id: 'std_report', name: '📊 รายงานพื้นฐาน', tier: 'standard', canToggle: true, defaultValue: false, description: 'Dashboard + รายงานยอดขาย' },
  std_export: { id: 'std_export', name: '📤 Export CSV', tier: 'standard', canToggle: true, defaultValue: false, description: 'ส่งออกข้อมูล CSV' },
  std_line: { id: 'std_line', name: '💬 LINE Notify', tier: 'standard', canToggle: true, defaultValue: false, description: 'แจ้งเตือนผ่าน LINE' },
  std_promptpay: { id: 'std_promptpay', name: '📷 PromptPay QR', tier: 'standard', canToggle: true, defaultValue: false, description: 'QR Code พร้อมเพย์' },
  std_channels: { id: 'std_channels', name: '🛵 ช่องทางขาย', tier: 'standard', canToggle: true, defaultValue: false, description: 'Grab, LINE MAN, Walk-in' },
  std_favorites: { id: 'std_favorites', name: '⭐ เมนูโปรด', tier: 'standard', canToggle: true, defaultValue: false, description: 'บันทึกเมนูที่ชอบ' },
  std_recent: { id: 'std_recent', name: '🕐 ออเดอร์ล่าสุด', tier: 'standard', canToggle: true, defaultValue: false, description: 'แสดงออเดอร์ล่าสุดในหน้า POS' },
  std_hold: { id: 'std_hold', name: '📋 ออเดอร์ค้าง', tier: 'standard', canToggle: true, defaultValue: false, description: 'แสดงออเดอร์ค้างในหน้า POS' },
  std_sound: { id: 'std_sound', name: '🔊 เสียง', tier: 'standard', canToggle: true, defaultValue: false, description: 'เสียงแจ้งเตือน' },
  
  pro_members: { id: 'pro_members', name: '👤 สมาชิก + แต้มสะสม', tier: 'pro', canToggle: true, defaultValue: false, description: 'ระบบสมาชิกและแต้ม', requiresLicense: true },
  pro_recipe: { id: 'pro_recipe', name: '🧪 Recipe + COGS', tier: 'pro', canToggle: true, defaultValue: false, description: 'สูตรวัตถุดิบ + ต้นทุน', requiresLicense: true },
  pro_autostock: { id: 'pro_autostock', name: '⚡ Auto ตัด Stock', tier: 'pro', canToggle: true, defaultValue: false, description: 'หักสต็อกอัตโนมัติเมื่อขาย', requiresLicense: true, dependsOn: 'pro_recipe' },
  pro_kds: { id: 'pro_kds', name: '🍳 Kitchen Display', tier: 'pro', canToggle: true, defaultValue: false, description: 'จอครัวแยก', requiresLicense: true },
  pro_realtime: { id: 'pro_realtime', name: '🔄 Real-time Dashboard', tier: 'pro', canToggle: true, defaultValue: false, description: 'อัปเดตข้อมูลอัตโนมัติ', requiresLicense: true },
  pro_advanced_report: { id: 'pro_advanced_report', name: '📈 รายงานขั้นสูง', tier: 'pro', canToggle: true, defaultValue: false, description: 'COGS, กำไรสุทธิ, วิเคราะห์', requiresLicense: true, dependsOn: 'pro_recipe' },
pro_menu_image: { 
  id: 'pro_menu_image', 
  name: '🖼️ รูปเมนู', 
  tier: 'pro', 
  canToggle: true, 
  defaultValue: true,   // ← แก้ไขตรงนี้
  description: 'เพิ่มรูปภาพให้เมนู (เฉพาะ Pro)', 
  requiresLicense: true 
}
};

var FEATURE_PRESETS = {
  free: { name: '🆓 Free', description: 'ฟีเจอร์พื้นฐาน', icon: '🆓', features: { std_stock: false, std_staff: false, std_report: false, std_line: false, std_promptpay: false, std_channels: false, std_favorites: false, std_recent: false, std_sound: false, std_hold: false, std_export: false, pro_members: false, pro_recipe: false, pro_autostock: false, pro_kds: false, pro_realtime: false, pro_advanced_report: false, pro_menu_image: false } },
  standard: { name: '📦 Standard', description: 'ฟีเจอร์ทั่วไป', icon: '📦', features: { std_stock: true, std_staff: true, std_report: true, std_line: false, std_promptpay: true, std_channels: true, std_favorites: true, std_recent: true, std_sound: true, std_hold: true, std_export: true, pro_members: false, pro_recipe: false, pro_autostock: false, pro_kds: false, pro_realtime: false, pro_advanced_report: false, pro_menu_image: false } },
  pro: { name: '⭐ Pro', description: 'ฟีเจอร์ทั้งหมด', icon: '⭐', features: { std_stock: true, std_staff: true, std_report: true, std_line: true, std_promptpay: true, std_channels: true, std_favorites: true, std_recent: true, std_sound: true, std_hold: true, std_export: true, pro_members: true, pro_recipe: true, pro_autostock: true, pro_kds: true, pro_realtime: true, pro_advanced_report: true, pro_menu_image: true } },
  custom: { name: '🎨 Custom', description: 'เลือกเอง', icon: '🎨', features: {} }
};

function getLicenseTierFromStorage() {
  try {
    var licenseRaw = localStorage.getItem('v1_coffee_license');
    if (licenseRaw) {
      var license = JSON.parse(licenseRaw);
      if (license && license.tier) {
        if (license.tier === 'trial' && license.trialExpiry && Date.now() > license.trialExpiry) return 'free';
        if (license.expiresAt && Date.now() > license.expiresAt) return 'free';
        return license.tier;
      }
    }
  } catch(e) {}
  return 'free';
}

var FeatureManager = {
  getLicenseTier: function() {
    try {
      var licenseRaw = localStorage.getItem('v1_coffee_license');
      if (licenseRaw) {
        var license = JSON.parse(licenseRaw);
        if (license && license.tier) {
          if (license.tier === 'trial' && license.trialExpiry && Date.now() > license.trialExpiry) {
            return 'free';
          }
          if (license.expiresAt && Date.now() > license.expiresAt) {
            return 'free';
          }
          return license.tier;
        }
      }
    } catch(e) {}
    return 'free';
  },
  
  getOverrides: function() {
    return ST.getObj('feature_overrides', {});
  },
  
  saveOverrides: function(overrides) {
    ST.setObj('feature_overrides', overrides);
  },
  
  clearOverrides: function() {
    this.saveOverrides({});
  },
  
  isEnabled: function(featureId) {
    var feature = FEATURE_REGISTRY[featureId];
    if (!feature) return false;
    if (feature.tier === 'core') return true;
    
    var licenseTier = this.getLicenseTier();
    var overrides = this.getOverrides();
    
    if (overrides[featureId] !== undefined) {
      return overrides[featureId];
    }
    
    if (licenseTier === 'free') {
      return false;
    }
    
    if (licenseTier === 'standard') {
      if (feature.tier === 'pro') return false;
      return true;
    }
    
    if (licenseTier === 'pro') {
      return true;
    }
    
    return feature.defaultValue;
  },
  
  toggleFeature: function(featureId, enabled) {
    var feature = FEATURE_REGISTRY[featureId];
    if (!feature) {
      toast('ไม่พบฟีเจอร์นี้', 'error');
      return false;
    }
    
    if (!feature.canToggle) {
      toast('ไม่สามารถปิด/เปิดฟีเจอร์นี้ได้', 'error');
      return false;
    }

    var overrides = this.getOverrides();
    overrides[featureId] = enabled;
    this.saveOverrides(overrides);
    toast((enabled ? '✅ เปิด' : '🔒 ปิด') + ' ' + feature.name, 'success');
    this.applyToUI();
    return true;
  },
  
  /* 🔥 getAllGrouped - สำหรับ Super Admin */
  getAllGrouped: function() {
    var result = { core: [], standard: [], pro: [] };
    var licenseTier = this.getLicenseTier();

    for (var id in FEATURE_REGISTRY) {
      var f = FEATURE_REGISTRY[id];
      var enabled = this.isEnabled(id);
      var canToggle = f.canToggle;
      
      if (f.tier === 'pro' && licenseTier !== 'pro') {
        canToggle = false;
      }
      
      result[f.tier].push({
        id: f.id,
        name: f.name,
        description: f.description,
        canToggle: canToggle,
        enabled: enabled,
        requiresLicense: f.requiresLicense || false,
        tier: f.tier
      });
    }
    return result;
  },
  
  applyToUI: function() {
    console.log('[FeatureManager] Applying toggles to UI...');
    var licenseTier = this.getLicenseTier();
    console.log('[FeatureManager] License tier:', licenseTier);
    
    var sideItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < sideItems.length; i++) {
      var view = sideItems[i].getAttribute('data-view');
      var show = this.isViewEnabled(view);
      sideItems[i].style.display = show ? '' : 'none';
    }
    
    var bnavItems = document.querySelectorAll('.bnav-item');
    for (var j = 0; j < bnavItems.length; j++) {
      var bview = bnavItems[j].getAttribute('data-view');
      var bshow = this.isViewEnabled(bview);
      bnavItems[j].style.display = bshow ? '' : 'none';
    }
    
    var membersNav = document.getElementById('navMembers');
    var recipeNav = document.getElementById('navRecipe');
    if (membersNav) membersNav.style.display = this.isViewEnabled('members') ? '' : 'none';
    if (recipeNav) recipeNav.style.display = this.isViewEnabled('recipe') ? '' : 'none';
    
    if (typeof updateSidebarByStaffPermission === 'function') {
      updateSidebarByStaffPermission();
    }
    
    if (typeof APP !== 'undefined' && APP && APP.currentView === 'admin' && typeof renderAdminView === 'function') {
      renderAdminView();
    }
  },
  
  isViewEnabled: function(view) {
    var viewFeatureMap = {
      'pos': 'core_pos',
      'menu': 'core_menu',
      'orders': 'core_orders',
      'report': 'std_report',
      'stock': 'std_stock',
      'staff': 'std_staff',
      'members': 'pro_members',
      'recipe': 'pro_recipe',
      'admin': 'core_admin'
    };
    var featureId = viewFeatureMap[view];
    if (!featureId) return true;
    return this.isEnabled(featureId);
  },
  
  getCurrentTierName: function() {
    var tier = this.getLicenseTier();
    if (tier === 'pro') return '⭐ Pro';
    if (tier === 'standard') return '📦 Standard';
    return '🆓 Free';
  }
};

setTimeout(function() {
  if (typeof FeatureManager !== 'undefined') FeatureManager.applyToUI();
}, 200);

console.log('[feature-registry.js] loaded');