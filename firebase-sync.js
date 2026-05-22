/* ============================================
   FIREBASE SYNC - Multi-tenant
   ============================================ */

// 🔥 วางตัวแปรไว้ที่จุดเริ่มต้น (หลัง comment header)
let isStaffLoggedIn = false;

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

  // 🔥 เพิ่มส่วนนี้: ตรวจสอบว่ายังไม่ Login ให้เคลียร์ License
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.log('[Firebase] No user logged in, clearing license...');
    localStorage.removeItem('v1_coffee_license');
    localStorage.removeItem('v1_coffee_license_override');
    
    if (typeof LicenseManager !== 'undefined') {
      LicenseManager.tier = 'free';
      LicenseManager.currentKey = null;
      if (typeof LicenseManager.afterLicenseChange === 'function') {
        LicenseManager.afterLicenseChange();
      }
    }
  }
  
  // 🔥 วาง auth.onAuthStateChanged ตรงนี้ (แทนที่อันเดิม)
  window.auth.onAuthStateChanged(async (user) => {
    if (user) {
      window.currentUser = user;
      window.userDb = db.collection('users').doc(user.uid);
      console.log('[Firebase] Logged in:', user.email);
      
      await loadUserLicense(user.email);
      await loadUserData();
      updateUIForLogin(user);
      
      if (isStaffLoggedIn) {
        applyLicenseFromStorage();
      }
      
    } else {
      window.currentUser = null;
      window.userDb = null;
      isStaffLoggedIn = false;
      
      if (typeof LicenseManager !== 'undefined') {
        LicenseManager.tier = 'free';
        LicenseManager.currentKey = null;
        localStorage.removeItem('v1_coffee_license');
        if (typeof LicenseManager.afterLicenseChange === 'function') {
          LicenseManager.afterLicenseChange();
        }
      }
      
      updateUIForLogout();
    }
  });
}

// 🔥 วางฟังก์ชัน applyLicenseFromStorage ไว้ด้านล่าง (หลัง loadUserLicense)
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
    } catch(e) {}
  }
}

async function loadUserLicense(email) {
  if (typeof LicenseManager === 'undefined') return;
  
  try {
    const db = firebase.firestore();
    const licenseQuery = await db.collection('licenses')
      .where('customerEmail', '==', email)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (!licenseQuery.empty) {
      const license = licenseQuery.docs[0].data();
      
      LicenseManager.tier = license.tier;
      LicenseManager.currentKey = license.key;
      
      localStorage.setItem('v1_coffee_license', JSON.stringify({
        key: license.key,
        tier: license.tier,
        activatedAt: Date.now()
      }));
      
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        if (typeof toast === 'function') {
          toast('⚠️ License หมดอายุแล้ว', 'warning');
        }
      } else {
        if (typeof toast === 'function') {
          toast(`✅ License ${license.tier.toUpperCase()} ใช้งานได้`, 'success');
        }
      }
    } else {
      LicenseManager.tier = 'free';
      LicenseManager.currentKey = null;
      localStorage.removeItem('v1_coffee_license');
      
      if (typeof toast === 'function') {
        toast('🆓 ใช้เวอร์ชัน Free', 'info');
      }
    }
    
    if (typeof LicenseManager.afterLicenseChange === 'function') {
      LicenseManager.afterLicenseChange();
    }
    
  } catch(e) {
    console.log('[Firebase] loadUserLicense error:', e);
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
  
  // 🔥 ซ่อนปุ่ม Login (รูปกุญแจ)
  if (loginBtn) loginBtn.style.display = 'none';
  
  // 🔥 แสดงปุ่ม Logout
  if (logoutBtn) logoutBtn.style.display = '';
  
  // 🔥 เปลี่ยนปุ่ม Auth ใน Sidebar
  if (btnAuth) btnAuth.style.display = '';
  if (authLabel) authLabel.textContent = 'Logout';
  
  // 🔥 แสดงชื่อใน Sidebar
  if (sidebarUser) sidebarUser.innerHTML = '<div class="fs-sm truncate">🟢 ' + (user.displayName || user.email) + '</div>';
  
  // 🔥 แสดงชื่อที่ Top Bar
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
  
  // 🔥 แสดงปุ่ม Login (รูปกุญแจ)
  if (loginBtn) loginBtn.style.display = '';
  
  // 🔥 ซ่อนปุ่ม Logout
  if (logoutBtn) logoutBtn.style.display = 'none';
  
  // 🔥 เปลี่ยนปุ่ม Auth ใน Sidebar
  if (btnAuth) btnAuth.style.display = '';
  if (authLabel) authLabel.textContent = 'Login';
  
  // 🔥 ล้างชื่อใน Sidebar
  if (sidebarUser) sidebarUser.innerHTML = '';
  
  // 🔥 ล้างชื่อที่ Top Bar
  if (topStaff) {
    topStaff.innerHTML = '';
    topStaff.style.display = 'none';
  }
  
  console.log('[Firebase] UI updated for logout');
}

function loginWithGoogle() {
  if (typeof firebase === 'undefined') {
    alert('Firebase ยังไม่ได้ตั้งค่า');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  firebase.auth().signInWithPopup(provider);
}

function logoutFromFirebase() {
  const keysToClear = [
    'v1_coffee_license',
    'v1_coffee_license_override',
    'current_session',
    'firebase_first_sync_done'
  ];
  
  for (let i = 0; i < keysToClear.length; i++) {
    localStorage.removeItem(keysToClear[i]);
  }
  
  if (typeof LicenseManager !== 'undefined') {
    LicenseManager.tier = 'free';
    LicenseManager.currentKey = null;
    if (typeof LicenseManager.afterLicenseChange === 'function') {
      LicenseManager.afterLicenseChange();
    }
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