/* ============================================
   FIREBASE SYNC - Multi-tenant
   ============================================ */

// ตรวจสอบว่าประกาศไปแล้วหรือยัง
if (typeof window.currentUser === 'undefined') {
  window.currentUser = null;
}
if (typeof window.userDb === 'undefined') {
  window.userDb = null;
}

// รอให้ Firebase โหลดเสร็จ
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
      
      await loadUserLicense(user.email);
      await loadUserData();
      updateUIForLogin(user);
      
      if (typeof toast === 'function') {
        toast('✅ เข้าสู่ระบบสำเร็จ', 'success');
      }
    } else {
      window.currentUser = null;
      window.userDb = null;
      updateUIForLogout();
    }
  });
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
      if (typeof LicenseManager.setTier === 'function') {
        LicenseManager.setTier(license.tier);
      }
      if (typeof LicenseManager.setKey === 'function') {
        LicenseManager.setKey(license.key);
      }
      
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
      if (typeof LicenseManager.setTier === 'function') {
        LicenseManager.setTier('free');
      }
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
        lastLogin: new Date().toISOString()
      });
    } else {
      const data = doc.data();
      if (data.settings && typeof ST !== 'undefined') {
        ST.saveConfig(data.settings);
      }
      if (data.shopName && typeof applyShopName === 'function') {
        applyShopName();
      }
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
}

function loginWithGoogle() {
  if (typeof firebase === 'undefined') {
    alert('Firebase ยังไม่ได้ตั้งค่า');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  window.auth.signInWithPopup(provider);
}

function logoutFromFirebase() {
  window.auth.signOut()
    .then(() => {
      if (typeof toast === 'function') {
        toast('ออกจากระบบแล้ว', 'info');
      }
      if (typeof APP !== 'undefined') {
        APP.currentStaff = null;
      }
      location.reload();
    })
    .catch((error) => {
      console.error(error);
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