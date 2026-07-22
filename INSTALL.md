# คู่มือติดตั้ง Bawmusic

ระบบ Bawmusic ประกอบด้วย 2 ส่วน:
1. **Backend** — Google Apps Script + Google Sheets (ฐานข้อมูล + REST API)
2. **Frontend** — PWA บน GitHub Pages

ทำตามขั้นตอนด้านล่างตามลำดับ

---

## ส่วนที่ 1: ติดตั้ง Backend (Google Apps Script)

### ขั้นตอนที่ 1 — สร้าง Google Sheet
1. ไปที่ [sheets.google.com](https://sheets.google.com) แล้วสร้างสเปรดชีตใหม่
2. ตั้งชื่อว่า `Bawmusic Database` (หรือชื่ออื่นตามต้องการ)

### ขั้นตอนที่ 2 — เพิ่มโค้ด Apps Script
1. ในสเปรดชีต ไปที่เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. ลบโค้ดเริ่มต้นทั้งหมดในไฟล์ `Code.gs`
3. เปิดไฟล์ `code.gs` จากโปรเจคนี้ คัดลอกโค้ดทั้งหมด แล้ววางในหน้า Apps Script
4. เปิด Project Settings แล้วติ๊ก **Show "appsscript.json" manifest file in editor**
5. เปิดไฟล์ `appsscript.json` จากโปรเจคนี้ แล้วคัดลอกเนื้อหาไปแทนที่ manifest ของ Apps Script
6. กด **บันทึก** (ไอคอนแผ่นดิสก์ หรือ Ctrl+S)

> สำคัญ: manifest ต้องมี OAuth Scope `https://www.googleapis.com/auth/drive` เพื่อให้ `Folder.createFile()` สร้างไฟล์ได้ ไม่ใช่แค่เปิดอ่านโฟลเดอร์

### ขั้นตอนที่ 3 — Deploy เป็น Web App
1. คลิกปุ่ม **Deploy (ทำให้ใช้งานได้จริง)** มุมขวาบน → **New deployment**
2. คลิกไอคอนเฟือง ⚙️ ข้างคำว่า "Select type" → เลือก **Web app**
3. ตั้งค่าดังนี้:
   - **Description**: `Bawmusic API v1`
   - **Execute as**: `Me (อีเมลของคุณ)`
   - **Who has access**: `Anyone` (สำคัญมาก — ต้องเลือกนี้เพื่อให้ frontend เรียก API ได้)
4. คลิก **Deploy**
5. ระบบจะขอสิทธิ์การเข้าถึง (Authorize access) — คลิกอนุญาตทั้งหมด (อาจต้องกด "Advanced" → "Go to Bawmusic (unsafe)" เนื่องจากยังไม่ได้ยืนยันแอป — เป็นเรื่องปกติสำหรับสคริปต์ส่วนตัว)
6. คัดลอก **Web app URL** ที่ได้ (จะมีลักษณะ `https://script.google.com/macros/s/xxxxxxxxxx/exec`)

### ขั้นตอนที่ 4 — ตั้งรหัสเข้าใช้งานแอป
ไปที่ **Apps Script → Project Settings → Script Properties** แล้วเพิ่มรายการ:

| Key | Value |
|---|---|
| `APP_ACCESS_CODE` | รหัสส่วนตัวของคุณ |

รหัสนี้ใช้เข้าแอปแทน Google Sign-In และไม่ควรเผยแพร่ใน GitHub

### ขั้นตอนที่ 5 — ทดสอบ API
เปิด Web app URL ที่คัดลอกมาในเบราว์เซอร์ พร้อมต่อท้ายด้วย `?action=getSettings`

ตัวอย่าง: `https://script.google.com/macros/s/xxxxx/exec?action=getSettings`

หากเห็นข้อความ JSON แบบ `{"success":true,"data":{...}}` แสดงว่าใช้งานได้แล้ว
(ระบบจะสร้างชีตและข้อมูลตัวอย่างให้อัตโนมัติในการเรียกครั้งแรก)

---

## ส่วนที่ 2: ตั้งค่า Frontend

### ขั้นตอนที่ 1 — แก้ไข API URL
1. เปิดไฟล์ `js/api.js`
2. หาบรรทัด:
   ```js
   const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
3. แทนที่ด้วย Web app URL ที่ได้จากขั้นตอนก่อนหน้า แล้วบันทึก

---

## ส่วนที่ 3: Deploy ขึ้น GitHub Pages

### ขั้นตอนที่ 1 — สร้าง Repository
1. ไปที่ [github.com](https://github.com) → สร้าง repository ใหม่ (public หรือ private ก็ได้ถ้ามี GitHub Pro)
2. ตั้งชื่อ เช่น `bawmusic`

### ขั้นตอนที่ 2 — อัปโหลดไฟล์
1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ยกเว้นโฟลเดอร์ `api/` ที่ใช้แค่คัดลอกโค้ดไปยัง Apps Script เท่านั้น) ขึ้น repository
2. ตรวจสอบว่ามีไฟล์ `index.html` อยู่ที่ root ของ repository (สำคัญมาก)

### ขั้นตอนที่ 3 — เปิดใช้งาน GitHub Pages
1. ไปที่ **Settings → Pages**
2. ที่ **Source** เลือก branch `main` และโฟลเดอร์ `/ (root)`
3. คลิก **Save**
4. รอ 1-2 นาที จะได้ลิงก์ เช่น `https://yourusername.github.io/bawmusic/`

### ขั้นตอนที่ 4 — ติดตั้งเป็นแอปบนมือถือ
1. เปิดลิงก์ GitHub Pages บนมือถือ (Chrome หรือ Safari)
2. จะมีข้อความแจ้งเตือน "เพิ่มลงหน้าจอหลัก" หรือกดเมนู (⋮ หรือ Share) → **Add to Home Screen**
3. ไอคอน Bawmusic จะปรากฏบนหน้าจอหลักเหมือนแอปทั่วไป

---

---

## ส่วนที่ 4: เตรียมพร้อมสำหรับ LINE LIFF

ระบบมีชีตและ API รองรับ LINE ไว้แล้ว (Members, Payments, AuditLog) และตอนนี้มี **หน้า LIFF ให้ลูกค้าจองคิวเอง** พร้อมใช้งานที่ `liff/index.html`

### ค่า config ที่ใช้อยู่ตอนนี้
| รายการ | ค่า |
|---|---|
| LIFF ID | `2007938843-WTd19n2O` |
| LIFF URL | `https://liff.line.me/2007938843-WTd19n2O` |
| LINE Login Channel ID | `2007938843` |
| Messaging API Channel ID | `2009136431` |

### ขั้นตอนที่ 1 — แก้ API_URL ในหน้า LIFF
เปิดไฟล์ `liff/index.html` หา:
```js
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```
แก้เป็น Web App URL **เดียวกัน** กับที่ใช้ใน `js/api.js` ของแอปแอดมิน (ต้องเป็น deployment เดียวกัน เพราะใช้ฐานข้อมูลชุดเดียวกัน)

### ขั้นตอนที่ 2 — ตั้งค่า Script Property สำหรับ verify token
ไปที่ Apps Script → Project Settings → Script Properties → เพิ่ม:

| Key | Value |
|---|---|
| `LINE_LOGIN_CHANNEL_ID` | `2007938843` |

จำเป็นเพื่อให้ `verifyLineToken` ตรวจสอบ ID Token กับ LINE ได้ถูก channel

### ขั้นตอนที่ 3 — อัปโหลดขึ้น GitHub Pages
อัปโหลดโฟลเดอร์ `liff/` ทั้งโฟลเดอร์ขึ้น repository เดียวกับแอปแอดมิน (จะได้ URL เช่น `https://yourusername.github.io/bawmusic/liff/`)

### ขั้นตอนที่ 4 — ผูก LIFF Endpoint URL ใน LINE Developers Console
1. ไปที่ LINE Developers Console → เลือก Provider → LIFF app ที่มี LIFF ID `2007938843-WTd19n2O`
2. แก้ **Endpoint URL** เป็นลิงก์ GitHub Pages จากขั้นตอนที่ 3 (เช่น `https://yourusername.github.io/bawmusic/liff/`)
3. Size แนะนำ: `Full` (เต็มจอ เหมาะกับฟอร์มยาว)
4. Scopes ที่ต้องเปิด: `profile`, `openid`

### ทดสอบ
เปิดลิงก์ `https://liff.line.me/2007938843-WTd19n2O` ผ่านแอป LINE (ต้องเปิดผ่านแอป LINE เท่านั้น เปิดในเบราว์เซอร์ปกติจะใช้งานไม่ได้เต็มรูปแบบ) ควรเห็นหน้าฟอร์มจองคิวพร้อมชื่อ/รูปโปรไฟล์ LINE ของคุณ

### สถานะการจองจาก LIFF
การจองที่ลูกค้าส่งผ่าน LIFF จะถูกบันทึกด้วยสถานะ **"รอยืนยัน" (pending)** เสมอ — แอดมินต้องเข้าไปที่แอปหลัก เปิดรายการจองนั้น กรอกราคา/แพ็คเกจ แล้วเปลี่ยนสถานะเป็น "ยืนยันแล้ว" เอง (ยังไม่มีการแจ้งเตือนอัตโนมัติเข้า LINE — เป็นเฟสถัดไปที่ต้องใช้ Channel Access Token)

### สิ่งที่ยังไม่ได้ทำ (เฟสถัดไป)
- ส่งข้อความยืนยัน/แจ้งเตือนกลับหาลูกค้าอัตโนมัติผ่าน LINE OA (ต้องใช้ **Channel Access Token** จาก Messaging API Channel ซึ่งเป็นความลับ ยังไม่ได้รับมา)
- ระบบแคมเปญ/โปรโมชั่นส่งหาลูกค้ากลุ่มเป้าหมาย

### API backend ที่รองรับ LINE (อ้างอิง)
```
submitLiffBooking      — รับการจองจากหน้า LIFF (verify token + บันทึกอัตโนมัติ)
verifyLineToken        — ตรวจสอบ LINE ID Token กับเซิร์ฟเวอร์ LINE โดยตรง
verifyAndUpsertMember  — verify token + บันทึกสมาชิกในขั้นตอนเดียว
upsertMember / listMembers / getMemberByLineId
listPublicEquipment      — ส่งรายการอุปกรณ์แบบปลอดภัยให้หน้า LIFF
uploadEquipmentImage     — อัปโหลดรูปอุปกรณ์ไปยัง Google Drive (ต้องมี session แอดมิน)
createPayment / updatePayment / deletePayment / listPayments / getPayment
listAuditLog
getBookingByToken      — ใช้แสดงรายละเอียดการจองผ่านลิงก์ที่ส่งให้ลูกค้า โดยไม่ต้องรู้ id จริง
```

### Google Drive Media (รูปอุปกรณ์และสำรองรูปโปรไฟล์ LINE)

ระบบใช้โฟลเดอร์ย่อย 2 ชุดในโฟลเดอร์ Drive ของแอดมิน:

- `Bawmusic Equipment` — รูปอุปกรณ์ที่เปิดดูได้ด้วยลิงก์ เพื่อให้ลูกค้าเห็นผ่าน GitHub Pages/LIFF
- `Bawmusic Profile Backup` — สำเนารูปโปรไฟล์ LINE ใช้เป็นข้อมูลสำรองเท่านั้น และควรตั้งเป็นส่วนตัว

เพื่อไม่เปิดเผย Folder ID ใน repository สาธารณะ ให้ตั้งค่าที่ **Apps Script → Project Settings → Script Properties**:

| Key | Value |
|---|---|
| `DRIVE_EQUIPMENT_FOLDER_ID` | ID ของโฟลเดอร์ `Bawmusic Equipment` |
| `DRIVE_PROFILE_BACKUP_FOLDER_ID` | ID ของโฟลเดอร์ `Bawmusic Profile Backup` |

หลังตั้งค่าแล้ว ให้วาง `code.gs` รุ่นล่าสุดใน Apps Script, กดบันทึก และ Deploy เป็นเวอร์ชันใหม่ด้วยบัญชีที่มีสิทธิ์เข้าโฟลเดอร์ รูปโปรไฟล์ยังใช้ URL จาก LINE เป็นหลัก ส่วนรูปอุปกรณ์จะถูกย่อก่อนอัปโหลดและแสดงในหน้าอุปกรณ์ หน้างานใหม่ และหน้า LIFF ลูกค้า

**ต้องอนุญาตสิทธิ์ Drive ครั้งแรก:** ใน Apps Script เลือกฟังก์ชัน `authorizeDriveAccess` จากรายการด้านบน แล้วกด **Run** ขณะล็อกอินด้วยบัญชีเดียวกับที่เลือก `Execute as` จากนั้นกดยอมรับสิทธิ์ Google Drive ให้ครบ หากฟังก์ชันนี้ทำงานสำเร็จจะแสดงชื่อโฟลเดอร์ทั้งสองชุด พร้อมผลทดสอบสร้างไฟล์และเปิดสิทธิ์ดูรูปใน Execution log

หากพบข้อความ `Required permissions: https://www.googleapis.com/auth/drive` ให้ตรวจตามลำดับนี้:

1. เปิด Apps Script Project เดียวกับ Web App URL ที่อยู่ใน `js/api.js`
2. ตรวจว่า `appsscript.json` มี `https://www.googleapis.com/auth/drive`
3. บันทึกโปรเจกต์ แล้ว Run `authorizeDriveAccess` จาก Editor ด้วยบัญชีเดียวกับ **Execute as**
4. ต้องได้ผล `writeTest: true` และ `publicViewTest: true`
5. แก้ไข Deployment เดิมให้ใช้เวอร์ชันล่าสุด หรือสร้าง Deployment ใหม่

การกด Run ฟังก์ชันใน Editor อย่างเดียวไม่อัปเดตโค้ดของ Web App Deployment ให้เอง

> **ความปลอดภัย:** ให้ตั้งโฟลเดอร์สำรองรูปโปรไฟล์เป็น `Restricted` ส่วนรูปอุปกรณ์ให้ระบบเปิดเฉพาะไฟล์เป็น `Anyone with the link — Viewer` เท่าที่จำเป็น

## การแก้ปัญหาเบื้องต้น

**ปัญหา: เปิดแอปแล้วโหลดข้อมูลไม่ขึ้น**
- ตรวจสอบว่าแก้ `API_URL` ใน `js/api.js` ถูกต้องแล้ว
- ตรวจสอบว่าตั้งค่า "Who has access" เป็น `Anyone` ตอน Deploy
- ลองเปิด API URL ตรงๆ ในเบราว์เซอร์ตามขั้นตอนที่ 4 ของส่วนที่ 1

**ปัญหา: อัปโหลดรูปขึ้น `You do not have permission to call DriveApp.getFolderById`**
- เปิด Apps Script ด้วยบัญชีเดียวกับที่เลือก **Execute as**
- ตรวจสอบ Script Properties ของโฟลเดอร์ทั้งสองชุด
- เลือกฟังก์ชัน `authorizeDriveAccess` แล้วกด **Run** เพื่อให้ Google ขอสิทธิ์ Drive ใหม่ (รุ่นล่าสุดจะทดสอบสร้างไฟล์และเปิดสิทธิ์ดูจริงด้วย)
- ถ้า Apps Script อยู่คนละบัญชีกับเจ้าของโฟลเดอร์ ให้แชร์โฟลเดอร์ให้บัญชี Execute as มีสิทธิ์ Editor แล้ว Deploy เวอร์ชันใหม่

**ปัญหา: แก้โค้ด Apps Script แล้วแต่ระบบยังใช้โค้ดเก่า**
- ทุกครั้งที่แก้โค้ดใน Apps Script ต้องทำ **New deployment** ใหม่ (Deploy → Manage deployments → แก้ไข deployment เดิม หรือสร้างใหม่) ไม่ใช่แค่กด Save

**ปัญหา: อยากเริ่มฐานข้อมูลใหม่ทั้งหมด**
- ลบชีตทั้งหมดในสเปรดชีต แล้วไปที่ Apps Script → Project Settings → ลบ Script Property ชื่อ `DB_INITIALIZED` จากนั้นเรียก API อีกครั้งเพื่อสร้างชีตใหม่

**ปัญหา: หน้า LIFF ขึ้น "เกิดข้อผิดพลาด"**
- ต้องเปิดผ่านแอป LINE เท่านั้น (แตะลิงก์ในแชท ไม่ใช่วางใน Chrome/Safari ตรงๆ)
- ตรวจสอบว่าตั้งค่า Endpoint URL ใน LINE Developers Console ตรงกับ URL จริงที่ deploy แล้ว
- ตรวจสอบว่าตั้ง Script Property `LINE_LOGIN_CHANNEL_ID` แล้ว

---

## โครงสร้างไฟล์

```
bawmusic/
├── index.html              ← หน้าแอปหลัก (PWA shell)
├── manifest.json            ← PWA manifest
├── service-worker.js        ← Offline support
├── css/
│   └── style.css
├── js/
│   ├── api.js                ← ⚠️ แก้ API_URL ที่นี่
│   ├── utils.js
│   ├── app.js
│   └── views/
│       ├── dashboard.js
│       ├── bookings.js
│       ├── customers.js
│       ├── equipment.js
│       ├── analytics.js
│       ├── settings.js
│       ├── bookingForm.js
│       └── jobSummary.js
├── assets/
│   └── icons/                ← ไอคอนแอปทุกขนาด
├── liff/
│   └── index.html            ← หน้าจองคิวสำหรับลูกค้า (⚠️ แก้ API_URL ที่นี่ด้วย)
└── api/
    └── Code.gs                ← คัดลอกไปวางใน Apps Script (ไม่ต้องอัปโหลดขึ้น GitHub)
```
