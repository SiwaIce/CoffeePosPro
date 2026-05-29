// ============================================
// PATCH สำหรับ loadUserLicense ใน firebase-sync.js
// แทนที่ฟังก์ชัน loadUserLicense เดิม (บรรทัด ~150)
// ============================================

async function loadUserLicense(email) {
  if (typeof LicenseManager === 'undefined') return;

  try {
    const db = firebase.firestore();

    // 🔥 ค้นหา license ที่ผูกกับ email นี้ (activatedEmail)
    const licenseQuery = await db.collection('licenses')
      .where('activatedEmail', '==', email)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!licenseQuery.empty) {
      const doc = licenseQuery.docs[0];
      const license = doc.data();

      // ตรวจ trial หมดอายุ
      if (license.tier === 'trial' && license.trialExpiry && Date.now() > license.trialExpiry) {
        console.log('[License] Trial expired for', email);
        localStorage.removeItem('v1_coffee_license');
        LicenseManager.tier = 'free';
        LicenseManager.currentKey = null;
        if (typeof LicenseManager.afterLicenseChange === 'function') LicenseManager.afterLicenseChange();
        return;
      }

      // อัปเดต lastUsedAt + usedCount
      await doc.ref.update({
        usedCount: (license.usedCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
        lastUsedBy: window.location.hostname
      });

      // บันทึก localStorage
      var licenseObj = {
        key: license.key,
        tier: license.tier,
        activatedAt: Date.now()
      };
      if (license.trialExpiry) licenseObj.trialExpiry = license.trialExpiry;
      localStorage.setItem('v1_coffee_license', JSON.stringify(licenseObj));

      // ✅ Set tier — ใช้งานได้ทุกเครื่องที่ login ด้วย email เดิม
      LicenseManager.tier = license.tier;
      LicenseManager.currentKey = license.key;
      if (typeof LicenseManager.afterLicenseChange === 'function') LicenseManager.afterLicenseChange();
      console.log('[Firebase] License loaded by email binding:', license.tier);

    } else {
      // ไม่เจอ license ที่ผูก email นี้
      localStorage.removeItem('v1_coffee_license');
      LicenseManager.tier = 'free';
      LicenseManager.currentKey = null;
      if (typeof LicenseManager.afterLicenseChange === 'function') LicenseManager.afterLicenseChange();
      console.log('[Firebase] No license found for', email, '→ free');
    }

  } catch(e) {
    console.log('[Firebase] loadUserLicense error:', e);
  }
}
