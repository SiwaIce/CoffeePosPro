/* ============================================
   FIREBASE SYNC - Multi-tenant (แบบ B)
   Version: 2.0 (Full Sync)
   ============================================ */

var isStaffLoggedIn = false;

if (typeof window.currentUser === 'undefined') {
  window.currentUser = null;
}
if (typeof window.userDb === 'undefined') {
  window.userDb = null;
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof firebase !== 'undefined') {
    initFirebase();
  }
});

function initFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyAO3hKQQJTmEt79XbgIf7u0o9P6pJjG7TM",
    authDomain: "coffee-pos-saas-7f310.firebaseapp.com",
    databaseURL: "https://coffee-pos-saas-7f310-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "coffee-pos-saas-7f310",
    storageBucket: "coffee-pos-saas-7f310.firebasestorage.app",
    messagingSenderId: "90638894965",
    appId: "1:90638894965:web:81c585f0eeac718446b53c"
  };
  
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  window.auth = firebase.auth();
  const db = firebase.firestore();

  window.auth.onAuthStateChanged(async (user) => {
    if (user) {
      window.currentUser = user;
      window.userDb = db.collection('users').doc(user.uid);
      console.log('[Firebase] Logged in:', user.email);

      var syncBtnInit = document.getElementById('btnManualSync');
      if (syncBtnInit) addClass(syncBtnInit, 'syncing');

      await loadUserLicense(user.email);
      await loadAllFromFirebase();  // 🔥 โหลดข้อมูลจาก Cloud
      await loadUserData();
      updateUIForLogin(user);

      if (syncBtnInit) removeClass(syncBtnInit, 'syncing');
      
      setupAutoSync();    // 🔥 ตั้ง auto sync
      startPeriodicSync(); // 🔥 sync ทุก 5 นาที
      startLicenseRevalidation(user.email); // 🔥 ตรวจ license ซ้ำเป็นระยะ (กันใครแก้ tier ใน localStorage เอง)

      if (isStaffLoggedIn) {
        applyLicenseFromStorage();
      }
      
      // รีเฟรชหน้า
      if (typeof APP !== 'undefined' && APP && APP.currentView && typeof renderView === 'function') {
        renderView(APP.currentView);
      }
      
    } else {
      window.currentUser = null;
      window.userDb = null;
      isStaffLoggedIn = false;

      if (periodicSyncInterval) clearInterval(periodicSyncInterval);
      stopLicenseRevalidation();

      if (typeof LicenseManager !== 'undefined') {
        LicenseManager.tier = 'free';
        LicenseManager.currentKey = null;
        if (typeof LicenseManager.afterLicenseChange === 'function') {
          LicenseManager.afterLicenseChange();
        }
      }
      
      updateUIForLogout();
    }
  });
}

// ============================================
// 🔥 ฟังก์ชัน SYNC ใหม่ทั้งหมด
// ============================================

var periodicSyncInterval = null;
var _lastSyncErrorToastAt = 0;

function notifySyncError(msg) {
  var now = Date.now();
  if (now - _lastSyncErrorToastAt < 30000) return; /* กันแจ้งซ้ำถี่เกินไปตอน auto-sync */
  _lastSyncErrorToastAt = now;
  if (typeof toast === 'function') {
    toast(msg, 'error', 3000);
  }
}

async function syncAllToFirebase() {
  if (!window.currentUser) return false;
  if (!window.userDb) return false;

  _lastSyncStartedAt = Date.now();
  try {
    var dataToSync = {
      menu: ST.getMenu(),
      categories: ST.getCategories(),
      orders: ST.getOrders(),
      stock: ST.getStock(),
      stockLogs: ST.getStockLogs(),
      staff: ST.getStaff(),
      shifts: ST.getShifts(),
      toppings: ST.getToppings(),
      sizes: ST.getSizes(),
      sweetLevels: ST.getSweetLevels(),
      drinkTypes: ST.getDrinkTypes(),
      channels: ST.getChannels(),
      recipes: ST.getRecipes(),
      members: ST.getMembers(),
      memberTransactions: ST.getMemberTransactions(),
      config: ST.getConfig(),
      lastSyncAt: Date.now(),
      lastSyncBy: window.location.hostname
    };
    
    await window.userDb.set(dataToSync, { merge: true });
    localStorage.setItem('v1_coffee_last_sync', Date.now().toString());
    console.log('[Sync] All data saved to Firebase');
    return true;
  } catch(e) {
    console.error('[Sync] Error saving:', e);
    notifySyncError('⚠️ ซิงค์ข้อมูลขึ้น Cloud ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)');
    return false;
  }
}

async function loadAllFromFirebase() {
  if (!window.currentUser) return false;
  if (!window.userDb) return false;
  
  try {
    var doc = await window.userDb.get();
    if (!doc.exists) {
      console.log('[Sync] No existing data, will create on first sync');
      return false;
    }
    
    var cloudData = doc.data();
    var lastLocalSync = parseInt(localStorage.getItem('v1_coffee_last_sync') || '0');
    var lastCloudSync = cloudData.lastSyncAt || 0;
    
    if (lastCloudSync > lastLocalSync) {
      if (cloudData.menu) ST.saveMenu(cloudData.menu);
      if (cloudData.categories) ST.saveCategories(cloudData.categories);
      if (cloudData.orders) ST.saveOrders(cloudData.orders);
      if (cloudData.stock) ST.saveStock(cloudData.stock);
      if (cloudData.stockLogs) ST.saveStockLogs(cloudData.stockLogs);
      if (cloudData.staff) ST.saveStaff(cloudData.staff);
      if (cloudData.shifts) ST.saveShifts(cloudData.shifts);
      if (cloudData.toppings) ST.saveToppings(cloudData.toppings);
      if (cloudData.sizes) ST.saveSizes(cloudData.sizes);
      if (cloudData.sweetLevels) ST.saveSweetLevels(cloudData.sweetLevels);
      if (cloudData.drinkTypes) ST.saveDrinkTypes(cloudData.drinkTypes);
      if (cloudData.channels) ST.saveChannels(cloudData.channels);
      if (cloudData.recipes) ST.saveRecipes(cloudData.recipes);
      if (cloudData.members) ST.saveMembers(cloudData.members);
      if (cloudData.memberTransactions) ST.saveMemberTransactions(cloudData.memberTransactions);
      if (cloudData.config) ST.saveConfig(cloudData.config);
      
      localStorage.setItem('v1_coffee_last_sync', lastCloudSync.toString());
      console.log('[Sync] Loaded data from Firebase (newer)');
      if (typeof toast === 'function') {
        toast('📡 ซิงค์ข้อมูลจาก Cloud แล้ว', 'success', 2000);
      }
      return true;
    }
    
    console.log('[Sync] Local data is up to date');
    return false;
  } catch(e) {
    console.error('[Sync] Error loading:', e);
    notifySyncError('⚠️ โหลดข้อมูลจาก Cloud ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)');
    return false;
  }
}

/* ห่างขั้นต่ำระหว่างรอบซิงค์จริง 30 วิ — กันงานหนัก (รวบรวม+แปลงข้อมูลทั้งร้าน) มารันถี่เกินไป
   ตอนใช้งานติดๆกัน (ขายหลายบิลใน 1-2 นาที) โดยไม่เปลี่ยนพฤติกรรมซิงค์เอง แค่เปลี่ยนความถี่ */
var _lastSyncStartedAt = 0;
var SYNC_MIN_GAP_MS = 30000;
var _syncDebounceTimer = null;

function _performAutoSyncWhenReady() {
  var elapsed = Date.now() - _lastSyncStartedAt;
  if (elapsed < SYNC_MIN_GAP_MS) {
    _syncDebounceTimer = setTimeout(_performAutoSyncWhenReady, SYNC_MIN_GAP_MS - elapsed);
    return;
  }
  syncAllToFirebase();
}

function requestAutoSync() {
  if (!window.currentUser) return;
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(_performAutoSyncWhenReady, 10000);
}

function setupAutoSync() {
  ST._onSet = function(key, val) {
    requestAutoSync();
  };
}

function startPeriodicSync() {
  if (periodicSyncInterval) clearInterval(periodicSyncInterval);

  periodicSyncInterval = setInterval(function() {
    requestAutoSync();
  }, 5 * 60 * 1000);
}

async function manualSync() {
  if (!window.currentUser) {
    if (typeof toast === 'function') {
      toast('⚠️ กรุณาเข้าสู่ระบบก่อนซิงค์ข้อมูล', 'warning', 2500);
    }
    return;
  }

  var syncBtn = document.getElementById('btnManualSync');
  if (syncBtn) addClass(syncBtn, 'syncing');

  if (typeof toast === 'function') {
    toast('🔄 กำลังซิงค์ข้อมูล...', 'info', 1000);
  }
  var savedOk = await syncAllToFirebase();
  var loadedOk = await loadAllFromFirebase();

  if (syncBtn) removeClass(syncBtn, 'syncing');

  if (typeof renderView === 'function' && typeof APP !== 'undefined' && APP && APP.currentView) {
    renderView(APP.currentView);
  }

  if (typeof toast === 'function') {
    if (savedOk === false) {
      toast('❌ ซิงค์ข้อมูลไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'error', 3000);
    } else {
      toast('✅ ซิงค์ข้อมูลเสร็จสมบูรณ์', 'success', 2000);
    }
  }
}

function applyLicenseFromStorage() {
  var savedLicense = localStorage.getItem('v1_coffee_license');
  if (savedLicense) {
    try {
      var license = JSON.parse(savedLicense);
      if (license && license.tier && license.tier !== 'free') {
        if (typeof LicenseManager !== 'undefined') {
          LicenseManager.tier = license.tier;
          LicenseManager.currentKey = license.key;
          if (typeof LicenseManager.afterLicenseChange === 'function') {
            LicenseManager.afterLicenseChange();
          }
        }
        console.log('[Firebase] Applied license from storage:', license.tier);
      }
    } catch(e) {
      console.log('[Firebase] applyLicenseFromStorage error:', e);
    }
  }
}

/* ============================================
   🔥 LICENSE: โหลด/ตรวจซ้ำจาก Firebase
   ใช้ licenseKey ที่ผูกไว้ใน users/{uid} ของผู้ใช้เอง (เขียนตอน validate() สำเร็จ)
   แทนการ query ทั้ง licenses collection ด้วย email — เพื่อให้ปิด list-permission
   ของ collection licenses ไว้แค่ admin ได้ (กันลูกค้าคนอื่นเห็น key/ข้อมูลลูกค้าคนอื่น)
   ============================================ */
async function loadUserLicense(email) {
  if (typeof LicenseManager === 'undefined') return;
  if (!window.userDb) return;

  try {
    var userSnap = await window.userDb.get();
    var licenseKey = userSnap.exists ? (userSnap.data().licenseKey || null) : null;

    if (!licenseKey) {
      _downgradeLicenseToFree(null);
      console.log('[Firebase] ยังไม่ได้ผูก License key, ตั้งเป็น Free');
      return;
    }

    var db = firebase.firestore();
    var doc = await db.collection('licenses').doc(licenseKey).get();

    if (!doc.exists || doc.data().status !== 'active') {
      _downgradeLicenseToFree('License ไม่พบหรือถูกระงับ ปรับเป็น Free');
      return;
    }

    var license = doc.data();

    if (license.expiresAt && Date.now() > license.expiresAt) {
      _downgradeLicenseToFree('License หมดอายุแล้ว กรุณาติดต่อผู้ดูแลเพื่อต่ออายุ');
      return;
    }

    if (license.activatedEmail && license.activatedEmail !== email) {
      _downgradeLicenseToFree('License นี้ถูกผูกกับบัญชีอื่นแล้ว');
      return;
    }

    await doc.ref.update({
      usedCount: (license.usedCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
      lastUsedBy: window.location.hostname
    });

    localStorage.setItem('v1_coffee_license', JSON.stringify({
      key: license.key || licenseKey,
      tier: license.tier,
      activatedAt: Date.now(),
      trialExpiry: license.trialExpiry || null,
      expiresAt: license.expiresAt || null
    }));

    LicenseManager.tier = license.tier;
    LicenseManager.currentKey = license.key || licenseKey;

    if (typeof LicenseManager.afterLicenseChange === 'function') {
      LicenseManager.afterLicenseChange();
    }

    console.log('[Firebase] License loaded:', license.tier);

  } catch(e) {
    console.log('[Firebase] loadUserLicense error:', e);
  }
}

function _downgradeLicenseToFree(toastMsg) {
  var wasNotFree = typeof LicenseManager !== 'undefined' && LicenseManager.tier !== 'free';
  localStorage.removeItem('v1_coffee_license');
  if (typeof LicenseManager !== 'undefined') {
    LicenseManager.tier = 'free';
    LicenseManager.currentKey = null;
    if (typeof LicenseManager.afterLicenseChange === 'function') {
      LicenseManager.afterLicenseChange();
    }
  }
  if (wasNotFree && toastMsg && typeof toast === 'function') {
    toast('⚠️ ' + toastMsg, 'warning', 4000);
  }
}

var licenseRevalidationInterval = null;

function startLicenseRevalidation(email) {
  stopLicenseRevalidation();
  licenseRevalidationInterval = setInterval(function() {
    if (window.currentUser) loadUserLicense(email);
  }, 30 * 60 * 1000); /* ตรวจซ้ำทุก 30 นาทีระหว่างเปิดแอปทิ้งไว้ */
}

function stopLicenseRevalidation() {
  if (licenseRevalidationInterval) {
    clearInterval(licenseRevalidationInterval);
    licenseRevalidationInterval = null;
  }
}

async function loadUserData() {
  if (!window.userDb) return;
  
  try {
    const doc = await window.userDb.get();
    if (!doc.exists) {
      await window.userDb.set({
        shopName: 'ร้านของฉัน',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        syncedAt: new Date().toISOString()
      });
      
      if (typeof toast === 'function') {
        toast('✅ พร้อมใช้งาน', 'success');
      }
    } else {
      const data = doc.data();
      if (data.settings && typeof ST !== 'undefined') {
        ST.saveConfig(data.settings);
      }
      if (data.shopName && typeof applyShopName === 'function') {
        applyShopName();
      }
      console.log('[Firebase] Loaded existing user data');
    }
  } catch(e) {
    console.log('[Firebase] loadUserData error:', e);
  }
}

function updateUIForLogin(user) {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const topStaff = document.getElementById('topStaff');
  const btnAuth = document.getElementById('btnAuth');
  const authLabel = document.getElementById('authLabel');
  const sidebarUser = document.getElementById('sidebarUser');
  
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = '';
  if (btnAuth) btnAuth.style.display = '';
  if (authLabel) authLabel.textContent = 'Logout';
  if (sidebarUser) sidebarUser.innerHTML = '<div class="fs-sm truncate">🟢 ' + (user.displayName || user.email) + '</div>';
  if (topStaff) {
    topStaff.innerHTML = '👤 ' + (user.displayName || user.email);
    topStaff.style.display = '';
  }
  
  console.log('[Firebase] UI updated for login:', user.email);
}

function updateUIForLogout() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const topStaff = document.getElementById('topStaff');
  const btnAuth = document.getElementById('btnAuth');
  const authLabel = document.getElementById('authLabel');
  const sidebarUser = document.getElementById('sidebarUser');
  
  if (loginBtn) loginBtn.style.display = '';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (btnAuth) btnAuth.style.display = '';
  if (authLabel) authLabel.textContent = 'Login';
  if (sidebarUser) sidebarUser.innerHTML = '';
  if (topStaff) {
    topStaff.innerHTML = '';
    topStaff.style.display = 'none';
  }
  
  console.log('[Firebase] UI updated for logout');
}

function loginWithGoogle() {
  if (typeof firebase === 'undefined') {
    toast('Firebase ยังไม่ได้ตั้งค่า', 'error');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  firebase.auth().signInWithPopup(provider);
}

function logoutFromFirebase() {
  const keysToClear = [
    'current_session',
    'firebase_first_sync_done'
  ];
  
  for (let i = 0; i < keysToClear.length; i++) {
    localStorage.removeItem(keysToClear[i]);
  }
  
  if (typeof APP !== 'undefined') {
    APP.currentStaff = null;
  }
  
  firebase.auth().signOut()
    .then(() => {
      if (typeof toast === 'function') {
        toast('ออกจากระบบแล้ว', 'info');
      }
      location.reload();
    })
    .catch((error) => {
      console.error(error);
      location.reload();
    });
}

function handleAuth() {
  if (window.currentUser) {
    logoutFromFirebase();
  } else {
    loginWithGoogle();
  }
}

console.log('[firebase-sync.js] loaded');