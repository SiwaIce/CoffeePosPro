# 🔧 วิธีใช้ไฟล์ที่แก้ไข

## ไฟล์ที่ได้รับ
1. `license-verify.js` — แทนที่ไฟล์เดิมทั้งหมด
2. `firebase-sync-patch.js` — ใช้แทนที่ฟังก์ชัน `loadUserLicense` ใน `firebase-sync.js`

## วิธีอัปเดต firebase-sync.js
เปิด `firebase-sync.js` หาฟังก์ชัน `loadUserLicense` (ประมาณบรรทัด 148-196)
แล้วแทนที่ทั้งฟังก์ชันด้วย code ใน `firebase-sync-patch.js`

## ต้องสร้าง Firebase Security Rules

### Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection: เจ้าของเท่านั้น
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Licenses collection:
    // - อ่านได้ถ้า login
    // - เขียน/อัปเดตได้เฉพาะ Cloud Functions (admin SDK) เท่านั้น
    // - ยกเว้น usedCount/lastUsedAt ที่ client อัปเดตได้
    match /licenses/{licenseId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['usedCount', 'lastUsedAt', 'lastUsedBy', 'activatedEmail', 'activatedAt', 'trialExpiry']);
      allow create, delete: if false; // ห้าม client สร้าง/ลบ
    }
  }
}
```

## โครงสร้าง Document ใน Firestore `licenses` collection
```json
{
  "key": "PRO-ABCD-1234",
  "tier": "pro",
  "status": "active",
  "customerEmail": "",
  "activatedEmail": "",
  "activatedAt": "",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "usedCount": 0,
  "lastUsedAt": "",
  "lastUsedBy": "",
  "note": "ลูกค้า: ชื่อร้าน"
}
```
- **`activatedEmail`** = email ที่ผูกไว้ (ว่างตอนสร้าง, จะถูกเซ็ตอัตโนมัติตอน activate ครั้งแรก)
- **`customerEmail`** = email ที่คุณกำหนดตอน gen key (optional, ใช้ track ลูกค้า)

## สรุปการทำงาน
1. **Gen key ใน Firebase Console** → สร้าง doc ใน `licenses` collection
2. **ลูกค้า login + ใส่ key** → `validate()` ยิง Firebase ตรวจ + ผูก email
3. **ลูกค้า login เครื่องใหม่** → `loadUserLicense()` ค้นหาจาก email → โหลด tier อัตโนมัติ ✅
4. **key ถูกใช้แล้ว** → ถ้า activatedEmail ≠ email ใหม่ → ปฏิเสธ ✅
