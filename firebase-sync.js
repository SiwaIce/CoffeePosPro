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
    
    // 🔥 โหลด License (จะได้ tier ตามอีเมล)
    await loadUserLicense(user.email);
    
    await loadUserData();
    updateUIForLogin(user);
    
    if (typeof toast === 'function') {
      toast('✅ เข้าสู่ระบบสำเร็จ', 'success');
    }
  } else {
    window.currentUser = null;
    window.userDb = null;
    
    // 🔥 logout แล้วกลับเป็น Free
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
      
      // 🔥 ตั้งค่า License
      LicenseManager.tier = license.tier;
      LicenseManager.currentKey = license.key;
      
      // บันทึกใน localStorage
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
      // 🔥 ไม่มี License → Free
      LicenseManager.tier = 'free';
      LicenseManager.currentKey = null;
      localStorage.removeItem('v1_coffee_license');
      
      if (typeof toast === 'function') {
        toast('🆓 ใช้เวอร์ชัน Free', 'info');
      }
    }
    
    // 🔥 อัปเดต UI ตาม License
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
    const isFirstSync = localStorage.getItem('firebase_first_sync_done');
    
    if (!doc.exists && !isFirstSync) {
      // 🔥 เฉพาะครั้งแรกที่ Login และไม่มีข้อมูลใน Firebase
      console.log('[Firebase] First time sync, checking local data...');
      
      // ถ้ามีออเดอร์ค้างใน Local ให้ถามก่อนล้าง
      const holdOrders = localStorage.getItem('v1_coffee_hold_orders');
      if (holdOrders && holdOrders !== '[]') {
        const confirmClear = confirm('พบออเดอร์ค้างในเครื่อง ต้องการล้างและเริ่มต้นใหม่ หรือยกเลิก?');
        if (!confirmClear) {
          console.log('[Firebase] User cancelled clear');
          return;
        }
      }
      
      // บันทึกว่าทำการล้างครั้งแรกแล้ว
      localStorage.setItem('firebase_first_sync_done', 'true');
      
      // สร้างข้อมูลเริ่มต้นใน Firebase
      await window.userDb.set({
        shopName: 'ร้านของฉัน',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        syncedAt: new Date().toISOString()
      });
      
      if (typeof toast === 'function') {
        toast('✅ พร้อมใช้งาน', 'success');
      }
      
    } else if (doc.exists) {
      // มีข้อมูลอยู่แล้ว → โหลดจาก Firebase (ไม่ล้างอะไร)
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

// ฟังก์ชัน Logout
function logoutFromFirebase() {
  // 🔥 ล้าง localStorage ที่เกี่ยวกับ License ทั้งหมด
  const keysToClear = [
    'v1_coffee_license',
    'v1_coffee_license_override',
    'current_session',
    'firebase_first_sync_done'
  ];
  
  for (let i = 0; i < keysToClear.length; i++) {
    localStorage.removeItem(keysToClear[i]);
  }
  
  // 🔥 รีเซ็ต LicenseManager เป็น Free
  if (typeof LicenseManager !== 'undefined') {
    LicenseManager.tier = 'free';
    LicenseManager.currentKey = null;
    if (typeof LicenseManager.afterLicenseChange === 'function') {
      LicenseManager.afterLicenseChange();
    }
  }
  
  // 🔥 รีเซ็ต APP.currentStaff
  if (typeof APP !== 'undefined') {
    APP.currentStaff = null;
  }
  
  // Sign out from Firebase
  window.auth.signOut()
    .then(() => {
      if (typeof toast === 'function') {
        toast('ออกจากระบบแล้ว กลับสู่ Free Edition', 'info');
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