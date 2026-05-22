/* ============================================
   COFFEE POS — APP.JS
   Config, Navigation, Theme, Init
   (โหลดท้ายสุด)
   ============================================ */

/* === GLOBAL STATE === */
var APP = {
  currentView: 'pos',
  currentStaff: null,
  clockInterval: null,
  isMobile: false
};

/* ============================================
   NAVIGATION
   ============================================ */
function nav(view) {
  /* ตรวจสอบ license ก่อน */
  var licenseTier = 'free';
  if (typeof FeatureManager !== 'undefined') {
    licenseTier = FeatureManager.getLicenseTier();
  } else if (typeof LicenseManager !== 'undefined') {
    licenseTier = LicenseManager.getTier();
  }
  
  /* ตรวจสอบว่า license อนุญาตให้เข้าหน้านี้ไหม */
  if (!isViewAllowedByLicense(view, licenseTier)) {
    toast('⚠️ ฟีเจอร์นี้ต้องมี ' + 
      (view === 'members' || view === 'recipe' ? 'Pro' : 'Standard') + 
      ' License', 'warning');
    return;
  }
  
  /* 🔥 ตรวจสอบสิทธิ์พนักงาน - ถ้าไม่มี staff login ให้ขอ PIN ก่อน */
  if (!APP.currentStaff) {
    /* ถ้ายังไม่มี staff login ให้ขอ PIN ก่อนเข้าหน้า */
    verifyManagerPIN(view, function() {
      nav(view);
    });
    return;
  }
  
  /* ถ้ามี staff แต่ role ไม่ใช่ manager และพยายามเข้าหน้าที่ไม่ได้รับอนุญาต */
  if (!ST.canAccessView(APP.currentStaff, view)) {
    verifyManagerPIN(view);
    return;
  }
  
  var validViews = ['pos', 'menu', 'orders', 'report', 'stock', 'staff', 'members', 'recipe', 'admin'];
  if (validViews.indexOf(view) === -1) view = 'pos';

  APP.currentView = view;

  var sideItems = qsa('.nav-item');
  for (var i = 0; i < sideItems.length; i++) {
    var v = sideItems[i].getAttribute('data-view');
    if (v === view) {
      addClass(sideItems[i], 'active');
    } else {
      removeClass(sideItems[i], 'active');
    }
  }

  var bnavItems = qsa('.bnav-item');
  for (var j = 0; j < bnavItems.length; j++) {
    var bv = bnavItems[j].getAttribute('data-view');
    if (bv === view) {
      addClass(bnavItems[j], 'active');
    } else {
      removeClass(bnavItems[j], 'active');
    }
  }

  if (APP.isMobile) {
    closeSidebar();
  }

  renderView(view);
}
/* ============================================
   PIN LOGIN FUNCTIONS (ย้ายมาจาก admin.js)
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

function pinInput(num) {
  var el = $('pinValue');
  if (!el || el.value.length >= 4) return;
  el.value += num;
  updatePinDots(el.value.length);
  vibrate(20);
  if (el.value.length === 4) setTimeout(pinSubmit, 200);
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
    
    // 🔥 ตั้งค่า isStaffLoggedIn
    if (typeof window !== 'undefined') {
      window.isStaffLoggedIn = true;
    }
    
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
    
    // 🔥 ถ้ามี Email Login อยู่แล้ว ให้ดึง License มาใช้
    if (typeof window !== 'undefined' && window.currentUser) {
      // มี Email Login → ใช้ License ที่โหลดไว้
      if (typeof LicenseManager !== 'undefined' && LicenseManager.tier !== 'free') {
        // License มีอยู่แล้ว ไม่ต้องทำอะไร
        console.log('[PIN] Using existing license:', LicenseManager.tier);
      }
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
    
    // 🔥 ตั้งค่า isStaffLoggedIn เป็น false
    if (typeof window !== 'undefined') {
      window.isStaffLoggedIn = false;
    }
    
    ST.remove('current_session');
    
    // 🔥 อย่าลบ license! เพราะ Email ยัง Login อยู่
    // localStorage.removeItem('v1_coffee_license');  // ← อย่าใช้
    
    updateLoginUI();
    updateSidebarByStaffPermission();
    
    // 🔥 ถ้ามี Email Login ให้ดึง License กลับมา
    if (typeof window !== 'undefined' && window.currentUser) {
      // มี Email Login → เรียกใช้ license จาก storage
      if (typeof window.applyLicenseFromStorage === 'function') {
        window.applyLicenseFromStorage();
      }
    }
    
    nav('pos');
    
    if (typeof renderPOSView === 'function') {
      renderPOSView();
    }
    
    toast(name + ' ออกจากระบบแล้ว', 'info');
  });
}

function renderStaffView() {
  var main = $('mainContent');
  if (!main) return;
  
  var html = '<div class="page-pad anim-fadeUp">';
  html += '<div class="section-header">';
  html += '<div class="section-title">👥 จัดการพนักงาน</div>';
  html += '</div>';
  
  /* เรียกใช้ renderStaffSettings จาก admin.js */
  if (typeof renderStaffSettings === 'function') {
    html += renderStaffSettings();
  } else {
    html += '<div class="card p-20 text-center">ไม่สามารถโหลดหน้าพนักงานได้</div>';
  }
  
  html += '</div>';
  
  main.innerHTML = html;
}

function renderView(view) {
  var main = $('mainContent');
  if (!main) return;

  switch (view) {
    case 'pos':
      if (typeof renderPOSView === 'function') renderPOSView();
      break;
    case 'menu':
      if (typeof renderMenuView === 'function') renderMenuView();
      break;
    case 'orders':
      if (typeof renderOrdersView === 'function') renderOrdersView();
      break;
    case 'report':
      if (typeof renderReportView === 'function') renderReportView();
      break;
    case 'stock':
      if (typeof renderStockView === 'function') renderStockView();
      break;
    case 'staff':
      if (typeof renderStaffView === 'function') renderStaffView();
      break;
    case 'members':
      if (typeof renderMembersView === 'function') renderMembersView();
      break;
    case 'recipe':
      if (typeof renderRecipeView === 'function') renderRecipeView();
      break;
    case 'admin':
      if (typeof renderAdminView === 'function') renderAdminView();
      break;
    default:
      main.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><div class="empty-text">Coming soon...</div></div>';
  }
}
/* ============================================
   MANAGER PIN OVERRIDE
   ============================================ */
var _pendingView = null;
var _pendingCallback = null;

function verifyManagerPIN(view, callback) {
  _pendingView = view;
  _pendingCallback = callback;
  
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;margin-bottom:8px;">👑</div>';
  html += '<div class="fw-700 fs-lg mb-4">สิทธิ์ผู้จัดการ</div>';
  html += '<div class="text-muted fs-sm mb-8">กรุณาใส่ PIN ผู้จัดการ เพื่อเข้าถึงหน้านี้</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">PIN ผู้จัดการ</label>';
  html += '<input type="password" id="managerPin" placeholder="****" maxlength="4" inputmode="numeric" style="font-size:24px;text-align:center;letter-spacing:8px;">';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="submitManagerPIN()">ยืนยัน</button>';
  
  openModal('🔐 ยืนยันสิทธิ์', html, footer);
  
  setTimeout(function() {
    var pinInput = $('managerPin');
    if (pinInput) pinInput.focus();
  }, 100);
}

function submitManagerPIN() {
  var pin = ($('managerPin') || {}).value;
  if (!pin || pin.length !== 4) {
    toast('กรุณาใส่ PIN 4 หลัก', 'error');
    return;
  }
  
  /* หา manager ที่มี PIN นี้ */
  var staffList = ST.getStaff();
  var manager = null;
  for (var i = 0; i < staffList.length; i++) {
    if (staffList[i].pin === pin && staffList[i].role === 'manager') {
      manager = staffList[i];
      break;
    }
  }
  
  if (manager) {
    closeMForce();
    
    /* 🔥 สำคัญ: ตั้งค่า currentStaff เป็น manager คนนี้ */
    APP.currentStaff = manager;
    
    /* บันทึก session */
    ST.setObj('current_session', {
      staffId: manager.id,
      loginTime: Date.now(),
      staffName: manager.name,
      role: manager.role
    });
    
    /* อัปเดต UI */
    updateLoginUI();
    updateSidebarByStaffPermission();
    
    toast('ยืนยันสิทธิ์สำเร็จ เข้าสู่ระบบในนาม ' + manager.name, 'success');
    
    /* ถ้ามี callback ให้เรียก */
    if (_pendingCallback && typeof _pendingCallback === 'function') {
      _pendingCallback();
      _pendingCallback = null;
    }
    
    /* ไปยังหน้าที่ต้องการ */
    if (_pendingView) {
      nav(_pendingView);
      _pendingView = null;
    }
  } else {
    toast('PIN ผู้จัดการไม่ถูกต้อง', 'error');
    var pinInput = $('managerPin');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  }
}

/* ============================================
   SIDEBAR
   ============================================ */
function toggleSidebar() {
  var sidebar = $('sidebar');
  var overlay = $('sidebarOverlay');
  var mainContent = $('mainContent');
  if (!sidebar) return;

  /* สำหรับ Desktop: ถ้าไม่ใช่ mobile ให้ toggle class hidden */
  if (!APP.isMobile) {
    if (hasClass(sidebar, 'hidden')) {
      removeClass(sidebar, 'hidden');
      if (mainContent) removeClass(mainContent, 'sidebar-hidden');
      localStorage.setItem('sidebarHidden', 'false');
    } else {
      addClass(sidebar, 'hidden');
      if (mainContent) addClass(mainContent, 'sidebar-hidden');
      localStorage.setItem('sidebarHidden', 'true');
    }
  } else {
    /* Mobile: ใช้ slide open/close */
    if (hasClass(sidebar, 'open')) {
      closeSidebar();
    } else {
      addClass(sidebar, 'open');
      addClass(overlay, 'show');
    }
  }
  vibrate(20);
}

function closeSidebar() {
  removeClass('sidebar', 'open');
  removeClass('sidebarOverlay', 'show');
}

/* Load saved sidebar state on desktop */
function loadSidebarState() {
  if (APP.isMobile) return;
  
  var isHidden = localStorage.getItem('sidebarHidden') === 'true';
  var sidebar = $('sidebar');
  var mainContent = $('mainContent');
  
  if (!sidebar) return;
  
  if (isHidden) {
    addClass(sidebar, 'hidden');
    if (mainContent) addClass(mainContent, 'sidebar-hidden');
  } else {
    removeClass(sidebar, 'hidden');
    if (mainContent) removeClass(mainContent, 'sidebar-hidden');
  }
}
/* ============================================
   THEME
   ============================================ */
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);

  /* Update icon */
  setText('themeIcon', next === 'dark' ? '🌙' : '☀️');

  /* Update meta theme-color */
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', next === 'dark' ? '#0f0f1a' : '#f5f5f5');
  }

  /* Save */
  var cfg = ST.getConfig();
  cfg.theme = next;
  ST.saveConfig(cfg);

  toast(next === 'dark' ? 'Dark Mode' : 'Light Mode', 'info', 1200);
}

function applyTheme() {
  var cfg = ST.getConfig();
  var theme = cfg.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  setText('themeIcon', theme === 'dark' ? '🌙' : '☀️');

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0f0f1a' : '#f5f5f5');
  }
}

/* ============================================
   SHOP NAME
   ============================================ */
function applyShopName() {
  var cfg = ST.getConfig();
  setText('shopName', cfg.shopName || 'Coffee POS');
  document.title = cfg.shopName || 'Coffee POS';
}

/* ============================================
   CLOCK
   ============================================ */
function startClock() {
  updateClock();
  APP.clockInterval = setInterval(updateClock, 1000);
}

/* ============================================
   RESPONSIVE CHECK
   ============================================ */
function checkMobile() {
  APP.isMobile = window.innerWidth < 768;
}

/* ============================================
   SYNC BUTTON
   ============================================ */
function showSync() {
  if (typeof firebaseSync === 'function') {
    firebaseSync();
  } else {
    toast('Firebase ยังไม่ได้ตั้งค่า', 'info');
  }
}

/* ============================================
   AUTH (placeholder — firebase-sync.js จะ override)
   ============================================ */
// แทนที่ฟังก์ชัน handleAuth เดิม
function handleAuth() {
  if (currentUser) {
    // มี user อยู่แล้ว → logout
    logoutFromFirebase();
  } else {
    // ยังไม่มี user → login
    loginWithGoogle();
  }
}

// ฟังก์ชัน login
function loginWithGoogle() {
  if (typeof firebase === 'undefined') {
    toast('Firebase ยังไม่ได้ตั้งค่า', 'error');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      toast('✅ เข้าสู่ระบบสำเร็จ', 'success');
    })
    .catch((error) => {
      console.error(error);
      toast('เข้าสู่ระบบไม่สำเร็จ', 'error');
    });
}

// ฟังก์ชัน logout
function logoutFromFirebase() {
  firebase.auth().signOut()
    .then(() => {
      toast('ออกจากระบบแล้ว', 'info');
      if (typeof APP !== 'undefined') {
        APP.currentStaff = null;
      }
      location.reload();
    })
    .catch((error) => {
      console.error(error);
    });
}

// อัปเดต UI ปุ่ม Auth
function updateAuthButton(user) {
  const btnAuth = document.getElementById('btnAuth');
  const authLabel = document.getElementById('authLabel');
  const sidebarUser = document.getElementById('sidebarUser');
  
  if (user) {
    if (authLabel) authLabel.textContent = 'Logout';
    if (sidebarUser) sidebarUser.innerHTML = '<div class="fs-sm truncate">🟢 ' + (user.displayName || user.email) + '</div>';
  } else {
    if (authLabel) authLabel.textContent = 'Login';
    if (sidebarUser) sidebarUser.innerHTML = '';
  }
}

/* ============================================
   PWA SERVICE WORKER
   ============================================ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
      console.log('[SW] registered:', reg.scope);
    }).catch(function(err) {
      console.log('[SW] failed:', err);
    });
  }
}

/* ============================================
   SEED DATA CHECK
   ============================================ */
function checkSeedData() {
  var hasMenu = ST.getMenu().length > 0;
  var hasStaff = ST.getStaff().length > 0;
  
  // ถ้ายังไม่มีพนักงานและไม่มีเมนู → แสดงหน้าตั้งค่าร้านครั้งแรก
  if (!hasStaff && !hasMenu) {
    showFirstTimeSetup();
  }
}

function showFirstTimeSetup() {
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:64px;margin-bottom:16px;">☕</div>';
  html += '<div class="fw-800 fs-xl mb-8">ยินดีต้อนรับ!</div>';
  html += '<div class="text-muted mb-20">กรุณาตั้งค่าร้านค้าของคุณ</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อร้าน</label>';
  html += '<input type="text" id="shopNameSetup" placeholder="เช่น ร้านกาแฟสมชาย" class="form-control">';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อผู้ใช้ (ผู้จัดการ)</label>';
  html += '<input type="text" id="adminName" placeholder="เช่น สมชาย" class="form-control">';
  html += '</div>';
  
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">PIN 4 หลัก</label>';
  html += '<input type="password" id="adminPin" placeholder="0000" maxlength="4" class="form-control" style="font-size:24px;text-align:center;letter-spacing:8px;" inputmode="numeric">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ยืนยัน PIN</label>';
  html += '<input type="password" id="confirmPin" placeholder="0000" maxlength="4" class="form-control" style="font-size:24px;text-align:center;letter-spacing:8px;" inputmode="numeric">';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="toggle-wrap" onclick="toggleToggle(this)">';
  html += '<div class="toggle" id="seedSampleData"></div>';
  html += '<span>เพิ่มเมนูตัวอย่าง (แนะนำสำหรับมือใหม่)</span>';
  html += '</label>';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-primary btn-lg btn-block" onclick="completeFirstTimeSetup()">✅ เริ่มต้นใช้งาน</button>';
  
  openModal('🚀 ตั้งค่าร้านครั้งแรก', html, footer);
}

function completeFirstTimeSetup() {
  var shopName = ($('shopNameSetup') || {}).value.trim();
  var adminName = ($('adminName') || {}).value.trim();
  var adminPin = ($('adminPin') || {}).value.trim();
  var confirmPin = ($('confirmPin') || {}).value.trim();
  var seedSample = hasClass($('seedSampleData'), 'on');
  
  if (!shopName) {
    toast('กรุณาใส่ชื่อร้าน', 'error');
    return;
  }
  
  if (!adminName) {
    toast('กรุณาใส่ชื่อผู้ใช้', 'error');
    return;
  }
  
  if (!adminPin || adminPin.length !== 4) {
    toast('PIN ต้อง 4 หลัก', 'error');
    return;
  }
  
  if (adminPin !== confirmPin) {
    toast('PIN ไม่ตรงกัน', 'error');
    return;
  }
  
  // บันทึกชื่อร้าน
  var cfg = ST.getConfig();
  cfg.shopName = shopName;
  ST.saveConfig(cfg);
  applyShopName();
  
  // สร้างพนักงานผู้จัดการคนแรก
  ST.addStaff({
    id: genId('staff'),
    name: adminName,
    pin: adminPin,
    role: 'manager',
    active: true
  });
  
  // เพิ่มเมนูตัวอย่าง
  if (seedSample) {
    ST.seedSampleData();
  } else {
    ensureBasicCategories();
  }
  
  closeMForce();
  
  toast('✅ ตั้งค่าร้านสำเร็จ! กรุณาเข้าสู่ระบบ', 'success');
  
  setTimeout(function() {
    showPinLogin();
  }, 500);
}

function ensureBasicCategories() {
  var cats = ST.getCategories();
  if (!cats || cats.length === 0) {
    ST.saveCategories(ST._defaultCategories());
  }
  var sizes = ST.getSizes();
  if (!sizes || sizes.length === 0) {
    ST.saveSizes(ST._defaultSizes());
  }
}

function doSeedData() {
  // ตรวจสอบว่ามีพนักงานแล้วหรือยัง
  var hasStaff = ST.getStaff().length > 0;
  var hasMenu = ST.getMenu().length > 0;
  
  if (hasStaff && hasMenu) {
    // มีข้อมูลแล้ว ให้ถามก่อนเพิ่ม
    confirmDialog('มีข้อมูลอยู่แล้ว ต้องการเพิ่มข้อมูลตัวอย่างเพิ่มเติมหรือไม่?', function() {
      ST.seedSampleData();
      closeMForce();
      nav('pos');
      toast('เพิ่มข้อมูลตัวอย่างแล้ว', 'success');
    });
  } else {
    // ยังไม่มีข้อมูล → เพิ่มเลย
    ST.seedSampleData();
    closeMForce();
    nav('pos');
    toast('เพิ่มข้อมูลตัวอย่างแล้ว', 'success');
  }
}
/* ============================================
   SHOW STAFF MENU (กดชื่อผู้ใช้)
   ============================================ */
function showStaffMenu() {
  if (!APP.currentStaff) {
    showPinLogin();
    return;
  }
  
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;">👤</div>';
  html += '<div class="fw-800 fs-lg mt-2">' + sanitize(APP.currentStaff.name) + '</div>';
  html += '<div class="text-muted">' + getRoleName(APP.currentStaff.role) + '</div>';
  html += '</div>';
  
  html += '<div class="card-glass p-16 mb-16">';
  html += '<div class="flex-between mb-8">';
  html += '<span>ตำแหน่ง</span>';
  html += '<span>' + getRoleName(APP.currentStaff.role) + '</span>';
  html += '</div>';
  html += '<div class="flex-between">';
  html += '<span>สถานะ</span>';
  html += '<span class="badge badge-success">กำลังทำงาน</span>';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  html += '<button class="btn btn-danger" onclick="closeMForce(); logoutStaff()">🚪 ออกจากระบบ</button>';
  html += '</div>';
  
  openModal('👤 บัญชีของฉัน', html);
}
/* ============================================
   KEYBOARD SHORTCUTS
   ============================================ */
function initShortcuts() {
  document.addEventListener('keydown', function(e) {
    /* Ctrl+P override for receipt */
    /* Let default print handle it — our @media print CSS takes care */

    /* F1 = POS */
    if (e.key === 'F1') { e.preventDefault(); nav('pos'); }
    /* F2 = Orders */
    if (e.key === 'F2') { e.preventDefault(); nav('orders'); }
    /* F3 = Report */
    if (e.key === 'F3') { e.preventDefault(); nav('report'); }
  });
}

/* ============================================
   WINDOW RESIZE
   ============================================ */
function onResize() {
  checkMobile();
  /* Re-render current view if needed */
  if (APP.currentView === 'pos' && typeof updatePOSLayout === 'function') {
    updatePOSLayout();
  }
}

var debouncedResize = debounce(onResize, 250);

/* ============================================
   LOW STOCK ALERT
   ============================================ */
function checkLowStock() {
  var low = ST.getLowStock();
  if (low.length > 0) {
    toast('⚠️ วัตถุดิบใกล้หมด ' + low.length + ' รายการ', 'warning', 4000);
  }
}

/* ============================================
   [Standard Version] FEATURE TOGGLE
   ============================================ */
function applyFeatureToggle() {
  if (typeof FeatureManager === 'undefined' || !FeatureManager.isEnabled) {
    console.log('[FeatureToggle] FeatureManager not ready yet');
    return;
  }
  
  var cfg = ST.getConfig();

  /* Sidebar */
  var sideItems = qsa('.nav-item');
  for (var i = 0; i < sideItems.length; i++) {
    var view = sideItems[i].getAttribute('data-view');
    var show = FeatureManager.isViewEnabled(view);
    sideItems[i].style.display = show ? '' : 'none';
  }

  /* Bottom Nav */
  var bnavItems = qsa('.bnav-item');
  for (var j = 0; j < bnavItems.length; j++) {
    var bview = bnavItems[j].getAttribute('data-view');
    var bshow = FeatureManager.isViewEnabled(bview);
    bnavItems[j].style.display = bshow ? '' : 'none';
  }
  
  /* Update sidebar visibility for members/recipe */
  if (typeof updateSidebarVisibility === 'function') {
    updateSidebarVisibility();
  }
}
/* อัปเดต Sidebar ตามสิทธิ์พนักงาน */
function updateSidebarByStaffPermission() {
  console.log('[updateSidebarByStaffPermission] Called, currentStaff:', APP.currentStaff);
  
  var sideItems = qsa('.nav-item');
  var recentStrip = $('#recentStrip');
  var holdStrip = $('#holdOrdersStrip');
  
  // 🔥 ตรวจสอบ license tier ปัจจุบัน (จาก LicenseManager)
  var licenseTier = 'free';
  if (typeof LicenseManager !== 'undefined') {
    licenseTier = LicenseManager.getTier();
  }
  
  // 🔥 ถ้าไม่มี staff login → แสดงเมนูตาม License เท่านั้น (ไม่ใช่ทุกอย่าง)
  if (!APP.currentStaff) {
    for (var i = 0; i < sideItems.length; i++) {
      var view = sideItems[i].getAttribute('data-view');
      var show = isViewAllowedByLicense(view, licenseTier);
      sideItems[i].style.display = show ? '' : 'none';
    }
    
    if (recentStrip) recentStrip.style.display = 'none';
    if (holdStrip) holdStrip.style.display = 'none';
    
    var loginBtn = $('#loginBtn');
    var logoutBtn = $('#logoutBtn');
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }
  
  // 🔥 มี staff login → แสดงตามสิทธิ์ + license
  for (var i = 0; i < sideItems.length; i++) {
    var view = sideItems[i].getAttribute('data-view');
    var canAccess = false;
    
    var licenseAllowed = isViewAllowedByLicense(view, licenseTier);
    
    if (!licenseAllowed) {
      canAccess = false;
    } else if (APP.currentStaff.role === 'manager') {
      canAccess = licenseAllowed;
    } else {
      var allowedViews = ['pos', 'orders'];
      canAccess = (allowedViews.indexOf(view) !== -1) && licenseAllowed;
    }
    
    sideItems[i].style.display = canAccess ? '' : 'none';
  }
  
  if (recentStrip) recentStrip.style.display = '';
  if (holdStrip) holdStrip.style.display = '';
  
  var loginBtn = $('#loginBtn');
  var logoutBtn = $('#logoutBtn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = '';
}

/* ฟังก์ชันตรวจสอบว่า view นี้ license อนุญาตหรือไม่ */
function isViewAllowedByLicense(view, licenseTier) {
  /* Core views เปิดทุก license */
  var coreViews = ['pos', 'menu', 'orders', 'admin'];
  if (coreViews.indexOf(view) !== -1) {
    return true;
  }
  
  /* Standard views ต้อง license standard หรือ pro */
  var standardViews = ['report', 'stock', 'staff'];
  if (standardViews.indexOf(view) !== -1) {
    return (licenseTier === 'standard' || licenseTier === 'pro');
  }
  
  /* Pro views ต้อง license pro เท่านั้น */
  var proViews = ['members', 'recipe'];
  if (proViews.indexOf(view) !== -1) {
    return (licenseTier === 'pro');
  }
  
  return true;
}

/* อัปเดต UI ตามสถานะ Login */
function updateLoginUI() {
  var isLoggedIn = !!APP.currentStaff;
  var loginBtn = $('#loginBtn');
  var logoutBtn = $('#logoutBtn');
  var topStaff = $('#topStaff');
  
  console.log('[updateLoginUI] isLoggedIn:', isLoggedIn);
  
  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
    if (topStaff) {
      topStaff.textContent = '👤 ' + APP.currentStaff.name;
      topStaff.style.display = '';
      topStaff.title = 'คลิกเพื่อดูบัญชี';
    }
  } else {
    /* แสดงปุ่ม Login เสมอเมื่อไม่ได้ login */
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (topStaff) {
      topStaff.textContent = '';
      topStaff.style.display = 'none';
    }
  }
}
/* ============================================
   INIT
   ============================================ */
function initApp() {
  console.log('[app.js] initializing...');

  /* 1. Check mobile */
  checkMobile();

  /* 2. Apply theme */
  applyTheme();

  /* 3. Apply shop name */
  applyShopName();
  
  /* 4. Apply feature toggles */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.applyToUI) {
    FeatureManager.applyToUI();
  } else {
    applyFeatureToggle();
  }

  /* 5. ตรวจสอบและสร้าง default admin ถ้ายังไม่มีพนักงาน */
  if (typeof ST.ensureDefaultAdmin === 'function') {
    ST.ensureDefaultAdmin();
  }

/* ใน function initApp() เพิ่ม */
if (typeof ST.startStockMonitor === 'function') {
  ST.startStockMonitor();
}
/* ใน function initApp() เพิ่ม */
if (typeof ST.startAutoBackup === 'function') {
  ST.startAutoBackup();
}

  /* 6. Start clock */
  startClock();

  /* 7. Register Service Worker */
  registerSW();

  /* 8. Init keyboard shortcuts */
  initShortcuts();

  /* 9. Window resize */
  window.addEventListener('resize', debouncedResize);
  
  /* 10. Load sidebar state after DOM ready */
  setTimeout(function() {
    loadSidebarState();
    updateSidebarVisibility(); 
    restoreSession();
    updateSidebarByStaffPermission(); 
    updateLoginUI();
  }, 100);

  /* 11. Hide splash, show app */
  setTimeout(function() {
    var splash = $('splash');
    var app = $('app');
    if (splash) addClass(splash, 'hide');
    if (app) app.style.display = '';

    setTimeout(function() {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 500);

    /* 12. Render default view */
    nav('pos');

    /* 13. Check seed data */
    setTimeout(function() {
      checkSeedData();
    }, 300);

    /* 14. Check low stock */
    setTimeout(function() {
      checkLowStock();
    }, 2000);

  }, 800);

  console.log('[app.js] ready!');
}

/* === RUN ON LOAD === */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function showStaffMenu() {
  // 🔥 ถ้ายังไม่มี staff login → แสดงหน้า Login ทันที
  if (!APP.currentStaff) {
    showPinLogin();
    return;
  }
  
  // มี staff login → แสดงเมนู
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div style="font-size:48px;">👤</div>';
  html += '<div class="fw-800 fs-lg mt-2">' + sanitize(APP.currentStaff.name) + '</div>';
  html += '<div class="text-muted">' + getRoleName(APP.currentStaff.role) + '</div>';
  html += '</div>';
  
  html += '<div class="card-glass p-16 mb-16">';
  html += '<div class="flex-between mb-8">';
  html += '<span>ตำแหน่ง</span>';
  html += '<span>' + getRoleName(APP.currentStaff.role) + '</span>';
  html += '</div>';
  html += '<div class="flex-between">';
  html += '<span>สถานะ</span>';
  html += '<span class="badge badge-success">กำลังทำงาน</span>';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  html += '<button class="btn btn-danger" onclick="closeMForce(); logoutStaff()">🚪 ออกจากระบบ</button>';
  html += '</div>';
  
  openModal('👤 บัญชีของฉัน', html);
}

/* ============================================
   RESTORE LOGIN SESSION AFTER REFRESH
   ============================================ */
function restoreSession() {
  var savedSession = ST.getObj('current_session', null);
  
  if (savedSession && savedSession.staffId) {
    var staff = findById(ST.getStaff(), savedSession.staffId);
    
    if (staff && staff.active !== false) {
      APP.currentStaff = staff;
      
      /* อัปเดต UI */
      updateLoginUI();
      updateSidebarByStaffPermission();
      
      console.log('[Session] Restored login for:', staff.name);
      return true;
    } else {
      /* session หมดอายุ หรือ staff ถูกลบ */
      ST.remove('current_session');
    }
  }
  
  return false;
}
/* ============================================
   UPDATE SIDEBAR VISIBILITY (Feature Toggle)
   ============================================ */
function updateSidebarVisibility() {
  if (typeof FeatureManager === 'undefined') return;
  
  var showMembers = FeatureManager.isEnabled('pro_members');
  var showRecipe = FeatureManager.isEnabled('pro_recipe');
  var showStock = FeatureManager.isEnabled('std_stock');
  var showStaff = FeatureManager.isEnabled('std_staff');
  var showReport = FeatureManager.isEnabled('std_report');
  
  var membersNav = $('#navMembers');
  var recipeNav = $('#navRecipe');
  var stockNav = getNavItemByView('stock');
  var staffNav = getNavItemByView('staff');
  var reportNav = getNavItemByView('report');
  
  if (membersNav) membersNav.style.display = showMembers ? '' : 'none';
  if (recipeNav) recipeNav.style.display = showRecipe ? '' : 'none';
  
  /* Hide stock, staff, report if not licensed */
  if (stockNav) stockNav.style.display = showStock ? '' : 'none';
  if (staffNav) staffNav.style.display = showStaff ? '' : 'none';
  if (reportNav) reportNav.style.display = showReport ? '' : 'none';
  
  console.log('[updateSidebarVisibility] members:', showMembers, 'recipe:', showRecipe, 'stock:', showStock, 'staff:', showStaff, 'report:', showReport);
}

/* Helper to get nav item by data-view */
function getNavItemByView(view) {
  var items = qsa('.nav-item');
  for (var i = 0; i < items.length; i++) {
    if (items[i].getAttribute('data-view') === view) {
      return items[i];
    }
  }
  return null;
}
/* ============================================
   REFRESH PAGE (สำหรับมือถือ/แท็บเล็ต)
   แก้ไขให้ reload แล้ว license ถูกต้อง
   ============================================ */
function refreshPage() {
  toast('🔄 กำลังรีเฟรช...', 'info', 800);
  /* บันทึก license ปัจจุบันก่อน refresh */
  var currentLicense = null;
  if (typeof LicenseManager !== 'undefined') {
    currentLicense = ST.getObj('license', null);
  }
  
  setTimeout(function() {
    /* ถ้ามี license ให้เขียนกลับก่อน reload (กันหาย) */
    if (currentLicense && currentLicense.tier === 'free') {
      ST.remove('license');
      if (typeof FeatureManager !== 'undefined') {
        FeatureManager.saveOverrides({});
      }
    }
    location.reload();
  }, 300);
}

/* ============================================
   INIT APP - เพิ่มการตรวจสอบ license ซ้ำ
   ============================================ */
function initApp() {
  console.log('[app.js] initializing...');

  /* 1. Check mobile */
  checkMobile();

  /* 2. Apply theme */
  applyTheme();

  /* 3. Apply shop name */
  applyShopName();
  
  /* 4. รีเซ็ต license ถ้าไม่มี key และไม่ใช่ trial/pro */
  ensureCorrectLicenseState();
  
  /* 5. Apply feature toggles */
  if (typeof FeatureManager !== 'undefined' && FeatureManager.applyToUI) {
    FeatureManager.applyToUI();
  } else {
    applyFeatureToggle();
  }

  /* 6. ตรวจสอบและสร้าง default admin ถ้ายังไม่มีพนักงาน */
  if (typeof ST.ensureDefaultAdmin === 'function') {
    ST.ensureDefaultAdmin();
  }

  /* 7. Start clock */
  startClock();

  /* 8. Register Service Worker */
  registerSW();

  /* 9. Init keyboard shortcuts */
  initShortcuts();

  /* 10. Window resize */
  window.addEventListener('resize', debouncedResize);
  
  /* 11. Load sidebar state after DOM ready */
  setTimeout(function() {
    loadSidebarState();
    updateSidebarVisibility(); 
    restoreSession();
    updateSidebarByStaffPermission(); 
    updateLoginUI();
    /* บังคับอัปเดต sidebar อีกครั้ง */
    forceUpdateSidebarOnLoad();
  }, 100);

  /* 12. Hide splash, show app */
  setTimeout(function() {
    var splash = $('splash');
    var app = $('app');
    if (splash) addClass(splash, 'hide');
    if (app) app.style.display = '';

    setTimeout(function() {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 500);

    /* 13. Render default view */
    nav('pos');

    /* 14. Check seed data */
    setTimeout(function() {
      checkSeedData();
    }, 300);

    /* 15. Check low stock */
    setTimeout(function() {
      checkLowStock();
    }, 2000);

  }, 800);

  console.log('[app.js] ready!');
}

/* เพิ่มฟังก์ชัน ensureCorrectLicenseState */
function ensureCorrectLicenseState() {
  var savedLicense = ST.getObj('license', null);
  
  /* ถ้าไม่มี license หรือเป็น free */
  if (!savedLicense || savedLicense.tier === 'free') {
    /* ล้าง feature overrides */
    if (typeof FeatureManager !== 'undefined') {
      FeatureManager.saveOverrides({});
    }
    /* ตั้งค่าเป็น free */
    if (typeof LicenseManager !== 'undefined') {
      LicenseManager.tier = 'free';
      LicenseManager.currentKey = null;
      ST.remove('license');
    }
    console.log('[ensureCorrectLicenseState] Set to FREE');
  }
}

/* เพิ่มฟังก์ชัน forceUpdateSidebarOnLoad */
function forceUpdateSidebarOnLoad() {
  var licenseTier = 'free';
  if (typeof LicenseManager !== 'undefined') {
    licenseTier = LicenseManager.getTier();
  }
  
  var freeViews = ['pos', 'menu', 'orders', 'admin'];
  var sideItems = qsa('.nav-item');
  
  for (var i = 0; i < sideItems.length; i++) {
    var view = sideItems[i].getAttribute('data-view');
    if (licenseTier === 'free') {
      sideItems[i].style.display = (freeViews.indexOf(view) !== -1) ? '' : 'none';
    } else if (typeof FeatureManager !== 'undefined' && typeof FeatureManager.isViewEnabled === 'function') {
      sideItems[i].style.display = FeatureManager.isViewEnabled(view) ? '' : 'none';
    }
  }
  
  var bnavItems = qsa('.bnav-item');
  for (var j = 0; j < bnavItems.length; j++) {
    var bview = bnavItems[j].getAttribute('data-view');
    if (licenseTier === 'free') {
      bnavItems[j].style.display = (freeViews.indexOf(bview) !== -1) ? '' : 'none';
    } else if (typeof FeatureManager !== 'undefined' && typeof FeatureManager.isViewEnabled === 'function') {
      bnavItems[j].style.display = FeatureManager.isViewEnabled(bview) ? '' : 'none';
    }
  }
  
  console.log('[forceUpdateSidebarOnLoad] License tier:', licenseTier);

}
/* softRefresh - รีเฟรชข้อมูลโดยไม่ reload หน้า (ไม่หลุด logout) */
function softRefresh() {
  toast('🔄 กำลังรีเฟรชข้อมูล...', 'info', 1000);
  
  /* รีเฟรช FeatureManager และ license */
  if (typeof FeatureManager !== 'undefined') {
    FeatureManager.applyToUI();
  }
  
  /* รีเฟรช view ปัจจุบัน */
  if (APP && APP.currentView) {
    renderView(APP.currentView);
  }
  
  /* อัปเดต sidebar ตามสิทธิ์ */
  if (typeof updateSidebarByStaffPermission === 'function') {
    updateSidebarByStaffPermission();
  }
  
  /* อัปเดต UI ปุ่ม Login/Logout */
  if (typeof updateLoginUI === 'function') {
    updateLoginUI();
  }
  
  /* รีเฟรช stock alert */
  if (typeof checkLowStock === 'function') {
    checkLowStock();
  }
  
  setTimeout(function() {
    toast('✅ รีเฟรชข้อมูลเรียบร้อย', 'success', 1500);
  }, 500);
}

/* อัปเดต sidebar visibility ตาม license (เรียกเมื่อ license เปลี่ยน) */
function updateSidebarVisibilityByLicense() {
  var licenseTier = 'free';
  if (typeof FeatureManager !== 'undefined') {
    licenseTier = FeatureManager.getLicenseTier();
  } else {
    try {
      var lic = JSON.parse(localStorage.getItem('v1_coffee_license') || '{}');
      licenseTier = lic.tier || 'free';
    } catch(e) {}
  }
  
  console.log('[updateSidebarVisibilityByLicense] License tier:', licenseTier);
  
  var membersNav = document.getElementById('navMembers');
  var recipeNav = document.getElementById('navRecipe');
  var stockNav = getNavItemByView('stock');
  var staffNav = getNavItemByView('staff');
  var reportNav = getNavItemByView('report');
  
  if (membersNav) membersNav.style.display = (licenseTier === 'pro') ? '' : 'none';
  if (recipeNav) recipeNav.style.display = (licenseTier === 'pro') ? '' : 'none';
  if (stockNav) stockNav.style.display = (licenseTier === 'standard' || licenseTier === 'pro') ? '' : 'none';
  if (staffNav) staffNav.style.display = (licenseTier === 'standard' || licenseTier === 'pro') ? '' : 'none';
  if (reportNav) reportNav.style.display = (licenseTier === 'standard' || licenseTier === 'pro') ? '' : 'none';
}

function getNavItemByView(view) {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) {
    if (items[i].getAttribute('data-view') === view) {
      return items[i];
    }
  }
  return null;
}
function restoreSession() {
  var savedSession = ST.getObj('current_session', null);
  
  if (savedSession && savedSession.staffId) {
    var staff = findById(ST.getStaff(), savedSession.staffId);
    
    if (staff && staff.active !== false) {
      APP.currentStaff = staff;
      updateLoginUI();
      updateSidebarByStaffPermission();
      console.log('[Session] Restored login for:', staff.name);
      return true;
    } else {
      ST.remove('current_session');
    }
  }
  
  /* 🔥 ถ้าไม่มี session แต่มีพนักงานในระบบ ให้แสดง login */
  var staffList = ST.getStaff();
  if (staffList.length > 0 && !APP.currentStaff) {
    console.log('[Session] No session but staff exists, showing login');
    setTimeout(function() {
      if (typeof showPinLogin === 'function') {
        showPinLogin();
      }
    }, 500);
  }
  
  return false;
}

console.log('[app.js] loaded');