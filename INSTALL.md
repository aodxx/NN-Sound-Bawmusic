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
3. เปิดไฟล์ `api/Code.gs` จากแพ็กเกจนี้ คัดลอกโค้ดทั้งหมด แล้ววางในหน้า Apps Script
4. กด **บันทึก** (ไอคอนแผ่นดิสก์ หรือ Ctrl+S)

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

### ขั้นตอนที่ 4 — ทดสอบ API
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

## การแก้ปัญหาเบื้องต้น

**ปัญหา: เปิดแอปแล้วโหลดข้อมูลไม่ขึ้น**
- ตรวจสอบว่าแก้ `API_URL` ใน `js/api.js` ถูกต้องแล้ว
- ตรวจสอบว่าตั้งค่า "Who has access" เป็น `Anyone` ตอน Deploy
- ลองเปิด API URL ตรงๆ ในเบราว์เซอร์ตามขั้นตอนที่ 4 ของส่วนที่ 1

**ปัญหา: แก้โค้ด Apps Script แล้วแต่ระบบยังใช้โค้ดเก่า**
- ทุกครั้งที่แก้โค้ดใน Apps Script ต้องทำ **New deployment** ใหม่ (Deploy → Manage deployments → แก้ไข deployment เดิม หรือสร้างใหม่) ไม่ใช่แค่กด Save

**ปัญหา: อยากเริ่มฐานข้อมูลใหม่ทั้งหมด**
- ลบชีตทั้งหมดในสเปรดชีต แล้วไปที่ Apps Script → Project Settings → ลบ Script Property ชื่อ `DB_INITIALIZED` จากนั้นเรียก API อีกครั้งเพื่อสร้างชีตใหม่

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
└── api/
    └── Code.gs                ← คัดลอกไปวางใน Apps Script (ไม่ต้องอัปโหลดขึ้น GitHub)
```
