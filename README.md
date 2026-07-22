
# Bawmusic — Band Booking Operating System

ระบบจัดการการจองงานสำหรับวงดนตรีและทีมงานอีเวนต์ ใช้สำหรับจัดการงาน ลูกค้า อุปกรณ์ การชำระเงิน และการจองผ่าน LINE ในระบบเดียว

> เอกสารนี้อ้างอิงโค้ดที่อยู่บนสาขา <code>main</code> หลัง Merge PR #33  
> Main commit ปัจจุบัน: <code>63ebc7e</code>  
> Frontend cache version: <code>3.4.2</code>  
> Backend database schema version: <code>3.4.0</code>

Repository: https://github.com/aodxx/NN-Sound-Bawmusic  
GitHub Pages: https://aodxx.github.io/NN-Sound-Bawmusic/

---

## 1. ภาพรวมระบบ

Bawmusic แบ่งการทำงานออกเป็น 4 ส่วนหลัก

1. **Admin Web App** — แอปสำหรับผู้ดูแลระบบ เปิดใช้งานจาก GitHub Pages และติดตั้งเป็น PWA บนมือถือได้
2. **Google Apps Script Web App** — Backend แบบ REST API ทำหน้าที่ตรวจสอบสิทธิ์ ประมวลผลข้อมูล และติดต่อบริการภายนอก
3. **Google Sheets** — ฐานข้อมูลหลักของระบบ แบ่งข้อมูลเป็นหลายชีตตามโมดูล
4. **Google Drive และ LINE** — ใช้เก็บรูปอุปกรณ์ สำรองรูปโปรไฟล์ LINE และรองรับการจองผ่าน LINE LIFF

~~~mermaid
flowchart LR
  Admin["ผู้ดูแลระบบ"] --> Pages["GitHub Pages / PWA"]
  Customer["ลูกค้าผ่าน LINE LIFF"] --> Pages
  Pages --> AppsScript["Google Apps Script Web App"]
  AppsScript --> Sheets["Google Sheets"]
  AppsScript --> Drive["Google Drive"]
  AppsScript --> Line["LINE API"]
~~~

การทำงานโดยสรุป:

- ผู้ดูแลเปิดหน้าเว็บและกรอกรหัสเข้าใช้งาน
- Frontend เรียก <code>createSession</code> ไปยัง Apps Script
- Apps Script ตรวจรหัสจาก Script Properties แล้วออก Session Token ชั่วคราว
- Frontend แนบ Session Token ไปกับคำขอของฟังก์ชันที่ต้องใช้สิทธิ์แอดมิน
- Apps Script อ่านและเขียนข้อมูลใน Google Sheets
- รูปอุปกรณ์ถูกย่อที่หน้าเว็บ แล้วส่งไปสร้างไฟล์ใน Google Drive
- ลูกค้าที่เปิด LIFF ผ่าน LINE สามารถดูอุปกรณ์จริงและส่งคำขอจองได้โดยไม่ต้องเข้าหน้าแอดมิน

---

## 2. สถานะและขอบเขตของระบบปัจจุบัน

### ใช้งานได้ในโค้ดปัจจุบัน

- หน้าล็อกอินด้วยรหัสเข้าใช้งานระบบ
- Session Token สำหรับจำการเข้าสู่ระบบชั่วคราว
- Dashboard ภาพรวมงานและรายได้
- รายการจองแบบปฏิทินและแบบรายการ
- สร้าง แก้ไข และลบการจอง
- ตรวจสอบงานหรืออุปกรณ์ที่ชนกัน
- จัดการลูกค้าและค้นหาลูกค้า
- แสดงรูปโปรไฟล์ LINE เมื่อมีการเชื่อมสมาชิกผ่าน LINE
- จัดการคลังอุปกรณ์และจำนวนคงเหลือ
- อัปโหลดรูปอุปกรณ์จริงไป Google Drive
- แสดงรูปอุปกรณ์ในหน้าอุปกรณ์ หน้าสร้างงาน และหน้า LIFF
- เทมเพลงานสำหรับเติมรายการอุปกรณ์
- ประวัติงานที่เสร็จสิ้นแล้ว
- บันทึกและสรุปการชำระเงิน
- สร้างสรุปงานเพื่อบันทึกเป็น PNG หรือพิมพ์
- สถิติรายได้ ประเภทงาน และลูกค้าหลัก
- ตั้งค่าชื่อวง เบอร์โทร LINE Facebook และแบนเนอร์
- เปลี่ยนธีมสว่าง/มืด/ตามระบบ
- ติดตั้งเป็น PWA บนหน้าจอหลัก
- หน้าจองคิวสำหรับลูกค้าผ่าน LINE LIFF
- ตรวจสอบ LINE ID Token และบันทึกสมาชิก
- รองรับการส่งข้อความ LINE หากตั้งค่า Channel Access Token แล้ว
- Audit Log สำหรับเก็บประวัติการเปลี่ยนแปลงสำคัญ

### สิ่งที่ต้องตั้งค่าเองก่อนใช้งานจริง

- Google Sheet ที่ใช้เป็นฐานข้อมูล
- Google Apps Script Web App deployment
- Script Properties ของ Apps Script
- รหัสเข้าใช้งาน <code>APP_ACCESS_CODE</code>
- สิทธิ์ Google Drive สำหรับบัญชีที่เลือก Execute as
- โฟลเดอร์ Google Drive สำหรับรูปอุปกรณ์และสำรองรูปโปรไฟล์
- LINE Login Channel ID สำหรับตรวจสอบ Token
- LINE Channel Access Token หากต้องการส่งข้อความกลับไปหาลูกค้า
- API URL ใน <code>js/api.js</code> และ <code>liff/index.html</code> หากใช้ Deployment ใหม่

> GitHub Pages เป็นเฉพาะ Frontend ส่วน Apps Script เป็น Backend แยกกัน การ Merge หรือ Deploy GitHub Pages ไม่ได้อัปเดตโค้ด Apps Script ให้อัตโนมัติ

---

## 3. ฟีเจอร์ของแต่ละหน้าจอ

### 3.1 หน้าหลัก / Dashboard

แสดงภาพรวมที่ใช้ดูงานประจำวัน ได้แก่

- งานวันนี้
- งานที่กำลังจะมาถึง
- รายได้รวม
- ยอดที่เหลือหรือยอดค้างชำระ
- จำนวนงานตามสถานะ
- กิจกรรมล่าสุด
- รายการที่ต้องติดตาม
- ทางลัดไปหน้าสถิติและหน้าการจอง
- ปุ่มเพิ่มการจองใหม่

ถ้าโหลดข้อมูลไม่สำเร็จ หน้าจอจะแสดงรายละเอียดข้อผิดพลาดและปุ่มลองใหม่แทนการค้างแบบไม่มีสถานะ

### 3.2 หน้าการจอง

รองรับ 2 มุมมอง

- **ปฏิทิน** — ดูงานตามวันและเลือกวันที่เพื่อเพิ่มงาน
- **รายการ** — ดูงานทั้งหมดพร้อมกรองตามสถานะ

ฟอร์มการจองรองรับข้อมูล:

- ลูกค้าเดิมหรือลูกค้าใหม่
- ชื่อ เบอร์โทร และ LINE
- สถานที่จัดงานและลิงก์แผนที่
- จังหวัด
- วันที่ เวลาเริ่ม และเวลาสิ้นสุด
- ประเภทงาน เช่น แต่งงาน บวช ศพ งานองค์กร วันเกิด และคอนเสิร์ต
- แพ็กเกจ ราคา เงินมัดจำ และยอดคงเหลือ
- รายการอุปกรณ์พร้อมจำนวน
- หมายเหตุ
- เทมเพลตงานเพื่อเติมอุปกรณ์อัตโนมัติ

ก่อนบันทึก ระบบตรวจสอบงานชนกันและอุปกรณ์ที่ถูกใช้ในวันเดียวกัน หากพบความเสี่ยงจะแสดงรายการงานที่เกี่ยวข้องให้ตรวจสอบก่อน

สถานะหลักของงาน:

- <code>pending</code> — รอยืนยัน
- <code>confirmed</code> — ยืนยันแล้ว
- <code>completed</code> — เสร็จสิ้น
- <code>cancelled</code> — ยกเลิก

การยืนยันงานสามารถเชื่อมกับการส่งข้อความ LINE ได้เมื่อมีสมาชิก LINE และตั้งค่า Messaging API ครบแล้ว

### 3.3 หน้าลูกค้า

รองรับ:

- ค้นหาด้วยชื่อ เบอร์โทร หรือ LINE
- เพิ่มลูกค้าใหม่
- แก้ไขและลบลูกค้า
- ดูจำนวนงานทั้งหมด
- ดูรายได้สะสม
- ดูประเภทงานที่เคยใช้
- แสดงสถานะการเชื่อมต่อ LINE OA
- แสดงรูปโปรไฟล์ LINE เมื่อมีข้อมูลจากสมาชิกที่ยืนยันผ่าน LIFF

การกรอก LINE ID ในฟอร์มลูกค้าเพียงอย่างเดียวไม่สามารถทำให้ระบบรู้รูปโปรไฟล์ LINE ได้โดยอัตโนมัติ รูปโปรไฟล์จะถูกผูกเมื่อผู้ใช้ผ่านขั้นตอน LINE Login/LIFF และระบบตรวจสอบ ID Token สำเร็จ

### 3.4 หน้าคลังอุปกรณ์

รองรับ:

- แยกหมวดหมู่อุปกรณ์
- ดูจำนวนพร้อมใช้งาน
- เพิ่ม แก้ไข และลบอุปกรณ์
- ระบุหน่วย เช่น ชิ้น ชุด ตัว หรือเครื่อง
- บันทึกหมายเหตุ
- เลือกภาพอุปกรณ์จริงจากเครื่อง
- แสดงตัวอย่างภาพก่อนบันทึก
- แสดงภาพอุปกรณ์ในรายการ
- ใช้ภาพเดียวกันในฟอร์มสร้างงานและหน้า LIFF

หมวดหมู่ปัจจุบัน:

- ระบบเสียง
- ไฟ/แสง
- เวที
- อุปกรณ์เสริม
- อุปกรณ์สนับสนุน

ขั้นตอนอัปโหลดภาพ:

1. เลือกไฟล์ภาพจากหน้าเพิ่มหรือแก้ไขอุปกรณ์
2. Frontend ย่อภาพให้ด้านยาวไม่เกิน 1,200 พิกเซล
3. Frontend แปลงภาพเป็น JPEG คุณภาพประมาณ 0.78
4. ส่งข้อมูลภาพแบบ Base64 ไปยัง <code>uploadEquipmentImage</code>
5. Apps Script สร้างไฟล์ในโฟลเดอร์อุปกรณ์บน Google Drive
6. เปิดสิทธิ์ไฟล์เป็น Anyone with the link — Viewer เพื่อให้ลูกค้าเห็นภาพ
7. บันทึก File ID และ URL ลงในชีต Equipment
8. ถ้าขั้นตอนแชร์ไฟล์หรือบันทึกชีตล้มเหลว ระบบพยายามย้ายไฟล์ที่สร้างไว้ไปถังขยะ เพื่อลดไฟล์ค้าง

ถ้าอัปโหลดไม่ได้ ให้ตรวจ OAuth Scope และสิทธิ์ของบัญชี Execute as ตามหัวข้อ Google Drive ด้านล่าง

### 3.5 หน้าประวัติงาน

ใช้ดูงานที่เสร็จสิ้นแล้ว โดยรองรับ:

- ค้นหาประวัติงาน
- กรองตามปี
- ดูสรุปงาน
- ดูข้อมูลลูกค้า
- ดูอุปกรณ์ที่ใช้
- ดูสรุปการเงิน
- ดูประวัติการชำระเงิน
- เพิ่มรายการชำระเงิน
- เปิดสรุปงานเพื่อแชร์
- บันทึกสรุปเป็นรูป PNG
- พิมพ์สรุปงาน

### 3.6 หน้าสถิติและรายงาน

แสดงกราฟและรายการสรุปด้วย Chart.js ได้แก่:

- รายได้รายเดือน
- ประเภทงานยอดนิยม
- ลูกค้าที่สร้างรายได้สูงสุด
- จำนวนงานและค่าเฉลี่ยรายได้ตามข้อมูลที่มีในระบบ
- ข้อมูลสรุปแยกตามปีที่เลือก

### 3.7 หน้าตั้งค่า

รองรับ:

- ชื่อวง
- URL แบนเนอร์
- เบอร์โทร
- LINE ID
- Facebook
- ติดตั้งแอป
- ธีมตามระบบ
- ธีมสว่าง
- ธีมมืด
- สร้างเทมเพลงาน
- แก้ไขข้อมูลการตั้งค่าที่บันทึกในชีต Settings
- ดูข้อมูลเกี่ยวกับระบบ

---

## 4. การเข้าสู่ระบบและการป้องกัน API

ระบบแอดมินปัจจุบันใช้รหัสเข้าใช้งาน ไม่ได้ใช้ Google Sign-In เป็นขั้นตอนหลัก

### ลำดับการเข้าสู่ระบบ

1. ผู้ใช้เปิดหน้า Admin Web App
2. หน้าเว็บตรวจว่ามี Session Token ใน Local Storage หรือไม่
3. ถ้าไม่มี จะแสดงหน้ากรอกรหัส
4. หน้าเว็บเรียก <code>createSession</code> แบบ GET
5. Apps Script เปรียบเทียบรหัสกับ Script Property <code>APP_ACCESS_CODE</code>
6. ถ้าถูกต้อง ระบบออก Session Token
7. Token ถูกเก็บใน Browser และถูกแนบไปกับ API request ถัดไป
8. Apps Script ตรวจ Token ด้วย CacheService ก่อนทำงานกับข้อมูลแอดมิน

Session ปัจจุบันมีอายุ 21,600 วินาที หรือประมาณ 6 ชั่วโมง

เมื่อ Session หมดอายุ ระบบจะล้าง Token แสดงหน้าล็อกอิน และแจ้งให้กรอกรหัสใหม่

### Public Actions

ฟังก์ชันต่อไปนี้เปิดให้เรียกได้โดยไม่ต้องมี Session แอดมิน เพราะใช้กับหน้า LIFF หรือการตรวจสอบเบื้องต้น:

- <code>createSession</code>
- <code>submitLiffBooking</code>
- <code>verifyAndUpsertMember</code>
- <code>verifyLineToken</code>
- <code>getBookingByToken</code>
- <code>listPublicEquipment</code>

ฟังก์ชันอื่นต้องส่ง Session Token ที่ยังไม่หมดอายุ

> รหัสเข้าใช้งานไม่ควรเขียนไว้ในไฟล์ Frontend หรือ Commit ลง GitHub ให้เก็บไว้ใน Apps Script Script Properties เท่านั้น

---

## 5. โครงสร้างฐานข้อมูล Google Sheets

เมื่อเรียก API ครั้งแรก ระบบจะสร้างชีตที่ยังไม่มีให้โดยอัตโนมัติ และเติมข้อมูลตัวอย่าง/ค่าตั้งต้นบางส่วน

### Customers

เก็บข้อมูลลูกค้า:

<code>id</code>, <code>name</code>, <code>phone</code>, <code>line</code>, <code>facebook</code>, <code>address</code>, <code>mapLink</code>, <code>notes</code>, <code>createdAt</code>, <code>memberId</code>

### Bookings

เก็บข้อมูลการจอง:

<code>id</code>, <code>customerId</code>, <code>customerName</code>, <code>phone</code>, <code>line</code>, <code>venue</code>, <code>mapLink</code>, <code>province</code>, <code>date</code>, <code>startTime</code>, <code>endTime</code>, <code>jobType</code>, <code>package</code>, <code>price</code>, <code>deposit</code>, <code>remaining</code>, <code>remarks</code>, <code>equipment</code>, <code>status</code>, <code>createdAt</code>, <code>updatedAt</code>, <code>bookingToken</code>

ฟิลด์ <code>equipment</code> เก็บรายการอุปกรณ์พร้อมจำนวนในรูปแบบ JSON

### Equipment

เก็บข้อมูลอุปกรณ์:

<code>id</code>, <code>name</code>, <code>category</code>, <code>availableQty</code>, <code>unit</code>, <code>remarks</code>, <code>imageFileId</code>, <code>imageUrl</code>, <code>imageName</code>, <code>imageUpdatedAt</code>

### Templates

เก็บเทมเพลงาน:

<code>id</code>, <code>name</code>, <code>jobType</code>, <code>equipmentPreset</code>, <code>notes</code>

### Settings

เก็บค่าตั้งค่าของวง:

<code>key</code>, <code>value</code>

ค่าที่ใช้ตั้งต้น ได้แก่:

- <code>bandName</code>
- <code>logo</code>
- <code>bannerImage</code>
- <code>phone</code>
- <code>line</code>
- <code>facebook</code>
- <code>primaryColor</code>
- <code>accentColor</code>
- <code>theme</code>

### StatisticsCache

เก็บข้อมูลแคชสถิติ:

<code>key</code>, <code>value</code>, <code>updatedAt</code>

### Members

เก็บสมาชิกที่เชื่อมผ่าน LINE:

<code>lineUserId</code>, <code>displayName</code>, <code>pictureUrl</code>, <code>isFriend</code>, <code>isBlocked</code>, <code>marketingConsent</code>, <code>lastActiveAt</code>, <code>createdAt</code>, <code>profileDriveFileId</code>, <code>profileDriveUpdatedAt</code>

### Payments

เก็บรายการชำระเงิน:

<code>id</code>, <code>bookingId</code>, <code>amount</code>, <code>type</code>, <code>paymentDate</code>, <code>evidenceUrl</code>, <code>notes</code>, <code>createdAt</code>

### AuditLog

เก็บประวัติการเปลี่ยนแปลง:

<code>id</code>, <code>actorId</code>, <code>action</code>, <code>entity</code>, <code>beforeData</code>, <code>afterData</code>, <code>timestamp</code>

---

## 6. Backend API ที่มีอยู่

ทุกคำขอจะส่งผลลัพธ์ในรูปแบบ:

~~~json
{
  "success": true,
  "data": {}
}
~~~

เมื่อเกิดข้อผิดพลาด:

~~~json
{
  "success": false,
  "error": "รายละเอียดข้อผิดพลาด"
}
~~~

### Dashboard และรายงาน

- <code>getDashboard</code>
- <code>getAnalytics</code>

### การจอง

- <code>listBookings</code>
- <code>getBooking</code>
- <code>createBooking</code>
- <code>updateBooking</code>
- <code>deleteBooking</code>
- <code>checkConflicts</code>
- <code>getBookingByToken</code>

### ลูกค้า

- <code>listCustomers</code>
- <code>getCustomer</code>
- <code>createCustomer</code>
- <code>updateCustomer</code>
- <code>deleteCustomer</code>
- <code>searchCustomers</code>

### อุปกรณ์

- <code>listEquipment</code>
- <code>listPublicEquipment</code>
- <code>createEquipment</code>
- <code>updateEquipment</code>
- <code>deleteEquipment</code>
- <code>uploadEquipmentImage</code>
- <code>checkAvailability</code>

### เทมเพลต

- <code>listTemplates</code>
- <code>createTemplate</code>
- <code>updateTemplate</code>
- <code>deleteTemplate</code>

### ตั้งค่า

- <code>getSettings</code>
- <code>updateSettings</code>

### LINE และสมาชิก

- <code>listMembers</code>
- <code>getMemberByLineId</code>
- <code>upsertMember</code>
- <code>verifyLineToken</code>
- <code>verifyAndUpsertMember</code>
- <code>submitLiffBooking</code>

### การเงินและประวัติ

- <code>listPayments</code>
- <code>getPayment</code>
- <code>createPayment</code>
- <code>updatePayment</code>
- <code>deletePayment</code>
- <code>listAuditLog</code>

### LINE Messaging และแคมเปญ

- <code>sendBookingConfirmation</code>
- <code>sendCampaign</code>
- <code>getMemberIdsBySegment</code>

Segment ที่ Backend รองรับ:

- <code>all</code>
- <code>marketing_consent</code>
- <code>has_booked</code>
- <code>never_booked</code>
- <code>inactive_6_months</code>

---

## 7. Google Drive: รูปอุปกรณ์และรูปโปรไฟล์ LINE

ระบบใช้ Google Drive สองโฟลเดอร์แยกหน้าที่กัน

### โฟลเดอร์รูปอุปกรณ์

ใช้เก็บภาพอุปกรณ์จริงที่ลูกค้าต้องดูได้จาก GitHub Pages และ LIFF

- ต้องให้บัญชี Execute as เข้าถึงโฟลเดอร์ได้
- ระบบจะสร้างไฟล์ใหม่เมื่ออัปโหลด
- ระบบพยายามตั้งไฟล์เป็น Anyone with the link — Viewer
- URL ที่บันทึกในชีต Equipment จะถูกนำไปแสดงในหน้าแอดมินและหน้า LIFF

### โฟลเดอร์สำรองรูปโปรไฟล์

ใช้สำรองรูปโปรไฟล์ที่ได้จาก LINE

- รูปจาก LINE ยังใช้ <code>pictureUrl</code> เป็น URL หลักในการแสดงผล
- Google Drive ใช้เก็บสำเนาสำรองและ File ID
- ควรตั้งเป็น Restricted
- ไม่ควรเปิดโฟลเดอร์สำรองนี้เป็นสาธารณะ

### Script Properties สำหรับ Drive

ตั้งค่าที่ Apps Script → Project Settings → Script Properties:

| Key | ค่า |
|---|---|
| <code>DRIVE_EQUIPMENT_FOLDER_ID</code> | ID โฟลเดอร์เก็บรูปอุปกรณ์ |
| <code>DRIVE_PROFILE_BACKUP_FOLDER_ID</code> | ID โฟลเดอร์สำรองรูปโปรไฟล์ LINE |

ห้ามใส่ Folder ID ลงใน Frontend หรือ README ที่เป็นข้อมูลลับของระบบ หากเป็น Repository สาธารณะให้เก็บไว้ใน Script Properties เท่านั้น

### OAuth Scope ที่ต้องมี

ไฟล์ <code>appsscript.json</code> ใน Repository มี Scope ที่ระบบปัจจุบันต้องใช้:

~~~json
{
  "timeZone": "Asia/Bangkok",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
~~~

Scope ที่สำคัญสำหรับการอัปโหลดคือ:

<code>https://www.googleapis.com/auth/drive</code>

การมีสิทธิ์อ่านโฟลเดอร์อย่างเดียวไม่เพียงพอ เพราะการอัปโหลดใช้ <code>Folder.createFile()</code> และการเปิดลิงก์ใช้ <code>File.setSharing()</code>

### การทดสอบสิทธิ์ Drive

หลังวาง <code>code.gs</code> และ <code>appsscript.json</code> ใน Apps Script แล้ว:

1. เปิด Apps Script Project ที่เป็น Backend จริงของ Web App
2. เปิด Project Settings
3. เปิดการแสดงไฟล์ <code>appsscript.json</code>
4. วาง Manifest รุ่นปัจจุบันและกดบันทึก
5. ตั้งค่า Folder ID ทั้งสองรายการใน Script Properties
6. เลือกฟังก์ชัน <code>authorizeDriveAccess</code>
7. กด Run ด้วยบัญชีเดียวกับที่เลือก Execute as
8. อนุญาตสิทธิ์ Google Drive ให้ครบ
9. ตรวจ Execution log

ผลทดสอบที่ต้องได้:

- เข้าถึงโฟลเดอร์รูปอุปกรณ์ได้
- เข้าถึงโฟลเดอร์สำรองรูปโปรไฟล์ได้
- สร้างไฟล์ทดสอบได้
- เปิดสิทธิ์ดูไฟล์ทดสอบได้
- ลบไฟล์ทดสอบได้
- มีค่า <code>writeTest: true</code>
- มีค่า <code>publicViewTest: true</code>

ฟังก์ชันนี้ใช้ไฟล์ทดสอบชั่วคราวและพยายามลบออกหลังทดสอบเสร็จ

### ข้อผิดพลาด Drive ที่พบบ่อย

ถ้าพบข้อความ:

<code>You do not have permission to call DriveApp.Folder.createFile</code>

สาเหตุหลักคือ Apps Script ยังไม่ได้รับ Drive OAuth Scope หรือ Web App กำลังทำงานด้วยบัญชีคนละบัญชีกับที่อนุญาตสิทธิ์ไว้

ให้ตรวจตามลำดับ:

1. <code>appsscript.json</code> มี Drive Scope หรือไม่
2. บัญชี Execute as มีสิทธิ์ Editor ในโฟลเดอร์หรือไม่
3. กด Run <code>authorizeDriveAccess</code> จาก Apps Script Editor แล้วหรือไม่
4. ยอมรับสิทธิ์ Google Drive ด้วยบัญชีเดียวกับ Execute as หรือไม่
5. แก้ไข Web App deployment ให้ใช้โค้ดรุ่นล่าสุดหรือไม่
6. Google Workspace มีนโยบายห้ามตั้ง Anyone with the link หรือไม่

ถ้าสร้างไฟล์ได้แต่เปิดสิทธิ์สาธารณะไม่ได้ มักเกิดจากนโยบาย Workspace หรือสิทธิ์การแชร์ของบัญชีเจ้าของโฟลเดอร์

---

## 8. LINE และ LIFF

หน้าลูกค้าปัจจุบันอยู่ที่:

<code>liff/index.html</code>

LIFF ID ที่อยู่ในโค้ดปัจจุบัน:

<code>2007938843-WTd19n2O</code>

### สิ่งที่ลูกค้าทำได้ใน LIFF

- เปิดผ่านแอป LINE
- อ่านชื่อและรูปโปรไฟล์ LINE
- กรอกชื่อผู้ติดต่อ
- กรอกเบอร์โทร
- เลือกจังหวัด
- เลือกวันที่จัดงาน
- เลือกเวลา
- เลือกประเภทงาน
- ดูภาพอุปกรณ์จริงจากระบบ
- กรอกรายละเอียดเพิ่มเติม
- ส่งคำขอจองคิว
- รับรหัสอ้างอิงการจอง

ข้อความในหน้า LIFF ระบุชัดว่าการส่งคำขอยังไม่ใช่การยืนยันขั้นสุดท้าย ทางวงต้องติดต่อกลับเพื่อยืนยันและแจ้งราคา

การจองจาก LIFF จะถูกสร้างเป็นสถานะ <code>pending</code> เพื่อให้ผู้ดูแลตรวจสอบและยืนยันจากหน้า Admin

### Script Properties สำหรับ LINE

| Key | ใช้ทำอะไร |
|---|---|
| <code>LINE_LOGIN_CHANNEL_ID</code> | ตรวจสอบ LINE ID Token |
| <code>LINE_CHANNEL_ACCESS_TOKEN</code> | ส่งข้อความผ่าน LINE Messaging API |

<code>LINE_CHANNEL_ACCESS_TOKEN</code> เป็นความลับ ห้ามใส่ใน Frontend, GitHub หรือ README

### การเชื่อมรูปโปรไฟล์

เมื่อลูกค้าเปิด LIFF และระบบตรวจสอบ ID Token สำเร็จ ระบบจะ:

1. ตรวจสอบ Token กับ LINE
2. อ่านข้อมูลโปรไฟล์
3. บันทึก <code>lineUserId</code>, <code>displayName</code> และ <code>pictureUrl</code>
4. อัปเดตหรือสร้างข้อมูลในชีต Members
5. เชื่อม Member กับ Customer เมื่อจับคู่ข้อมูลได้
6. พยายามสำรองรูปโปรไฟล์ไว้ใน Google Drive ถ้าตั้งค่าโฟลเดอร์สำรองแล้ว

ถ้าลูกค้าไม่เปิด LIFF หรือ Token ตรวจสอบไม่ผ่าน จะมีเพียงข้อมูลลูกค้าที่กรอกเอง และอาจยังไม่มีรูปโปรไฟล์ LINE

### การตั้งค่า LIFF

1. แก้ <code>API_URL</code> ใน <code>liff/index.html</code> ให้เป็น Apps Script Web App URL เดียวกับ <code>js/api.js</code>
2. ตั้ง <code>LINE_LOGIN_CHANNEL_ID</code> ใน Apps Script
3. ตั้ง Endpoint URL ใน LINE Developers Console ให้ชี้ไปที่:
   <code>https://aodxx.github.io/NN-Sound-Bawmusic/liff/</code>
4. เปิด Scope อย่างน้อย <code>profile</code> และ <code>openid</code>
5. เปิดลิงก์ผ่านแอป LINE เพื่อทดสอบ

การเปิดไฟล์ LIFF ใน Chrome โดยตรงอาจแสดงหน้าแจ้งเตือน เพราะไม่ได้อยู่ในบริบทของ LINE LIFF

---

## 9. การติดตั้ง Backend ด้วย Google Apps Script

### ขั้นตอนที่ 1: สร้าง Google Sheet

1. สร้าง Google Sheet ใหม่
2. ตั้งชื่อได้ตามต้องการ เช่น Bawmusic Database
3. เปิด Extensions → Apps Script

### ขั้นตอนที่ 2: วางโค้ด Backend

ที่ Repository root มีไฟล์:

- <code>code.gs</code>
- <code>appsscript.json</code>

ใน Apps Script:

1. เปิดไฟล์ <code>code.gs</code> หรือไฟล์ Code.gs
2. คัดลอกเนื้อหาจาก <code>code.gs</code> ไปวาง
3. เปิด Project Settings
4. เปิดตัวเลือก Show appsscript.json manifest file in editor
5. คัดลอกเนื้อหาจาก <code>appsscript.json</code> ไปวาง
6. กดบันทึก

### ขั้นตอนที่ 3: ตั้ง Script Properties

อย่างน้อยต้องมี:

| Key | จำเป็น | รายละเอียด |
|---|---|---|
| <code>APP_ACCESS_CODE</code> | จำเป็น | รหัสที่ใช้เข้าหน้า Admin |
| <code>DRIVE_EQUIPMENT_FOLDER_ID</code> | จำเป็นสำหรับรูปอุปกรณ์ | ID โฟลเดอร์รูปอุปกรณ์ |
| <code>DRIVE_PROFILE_BACKUP_FOLDER_ID</code> | จำเป็นสำหรับสำรองรูป LINE | ID โฟลเดอร์สำรองรูปโปรไฟล์ |
| <code>LINE_LOGIN_CHANNEL_ID</code> | จำเป็นสำหรับตรวจ LINE | LINE Login Channel ID |
| <code>LINE_CHANNEL_ACCESS_TOKEN</code> | ไม่บังคับ | จำเป็นเมื่อใช้ส่งข้อความ LINE |

ถ้ายังไม่ใช้ LINE หรือ Google Drive บางส่วน สามารถตั้งค่าเฉพาะฟีเจอร์ที่ต้องการได้ แต่การอัปโหลดรูปอุปกรณ์ต้องมี Drive Folder ID และ Drive Scope

### ขั้นตอนที่ 4: Deploy เป็น Web App

1. กด Deploy → New deployment
2. เลือกประเภท Web app
3. ตั้ง Execute as เป็นบัญชีผู้ดูแลที่มีสิทธิ์ใน Sheet และ Drive
4. ตั้ง Who has access เป็น Anyone
5. กด Deploy
6. อนุญาตสิทธิ์ Google ตามที่ระบบร้องขอ
7. คัดลอก Web app URL ที่ลงท้ายด้วย <code>/exec</code>

ตัวอย่างรูปแบบ URL:

<code>https://script.google.com/macros/s/DEPLOYMENT_ID/exec</code>

> การกด Save ใน Apps Script ไม่ได้เปลี่ยนโค้ดของ Web App deployment ที่ใช้งานอยู่ ต้องแก้ไข deployment ให้ใช้เวอร์ชันล่าสุดหรือสร้าง deployment ใหม่ทุกครั้งที่แก้ Backend

### ขั้นตอนที่ 5: ทดสอบ Backend

เปิด URL นี้ในเบราว์เซอร์:

<code>https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=getSettings</code>

ถ้า Backend ทำงานและมี Session/สิทธิ์ถูกต้อง ระบบควรตอบกลับเป็น JSON ไม่ใช่หน้า HTML error

การเรียก API ครั้งแรกจะทำให้ระบบสร้างชีตและข้อมูลตั้งต้น หากฐานข้อมูลยังไม่ถูก initialize

---

## 10. การตั้งค่า Frontend และ GitHub Pages

### API URL

มีจุดที่ต้องตรวจ 2 จุด และควรใช้ Web App URL เดียวกัน:

1. <code>js/api.js</code>
2. <code>liff/index.html</code>

ตัวอย่าง:

~~~js
const API_URL = 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec';
~~~

ไม่ควรใส่:

- <code>APP_ACCESS_CODE</code>
- <code>LINE_CHANNEL_ACCESS_TOKEN</code>
- Google Drive Folder ID
- Secret อื่นใด

ไว้ใน Frontend

### เปิด GitHub Pages

1. ไปที่ Repository Settings
2. เปิด Pages
3. เลือก Source เป็น Deploy from a branch
4. เลือก Branch <code>main</code>
5. เลือกโฟลเดอร์ <code>/ (root)</code>
6. บันทึก
7. รอให้ GitHub สร้างเว็บไซต์
8. เปิด URL:
   <code>https://aodxx.github.io/NN-Sound-Bawmusic/</code>

ไฟล์ <code>index.html</code> ต้องอยู่ที่ root ของ Repository

### PWA และ Service Worker

ระบบมี:

- <code>manifest.json</code>
- <code>service-worker.js</code>
- ไอคอนสำหรับติดตั้ง
- App shell caching
- Offline fallback บางส่วน
- ปุ่มติดตั้งจากหน้า Settings และ Header

การเรียก Apps Script API จะไม่ถูกเก็บใน Cache เพื่อให้ข้อมูลการจองและการเงินเป็นข้อมูลล่าสุด

ถ้าแก้ไฟล์หน้าเว็บแล้วผู้ใช้ยังเห็นหน้ารุ่นเก่า:

1. ปิดหน้าเว็บเดิม
2. ล้าง Site data หรือ Cache ของเว็บไซต์
3. เปิดใหม่
4. ถ้ายังไม่เปลี่ยน ให้ใช้ปุ่มล้างแคช/โหลดใหม่ของระบบ
5. ตรวจเลข <code>CACHE_NAME</code> ใน <code>service-worker.js</code> ให้เพิ่มเมื่อมีการปล่อย Frontend รุ่นใหม่

---

## 11. โครงสร้างไฟล์ปัจจุบัน

~~~text
/
├── index.html                  # หน้า Admin Web App
├── manifest.json               # PWA manifest
├── service-worker.js           # Cache และ Offline fallback
├── appsscript.json             # Apps Script OAuth manifest
├── code.gs                     # Backend Google Apps Script REST API
├── INSTALL.md                  # คู่มือติดตั้งแบบย่อ/ตามขั้นตอน
├── README.md                   # เอกสารระบบฉบับนี้
├── css/
│   └── style.css               # ธีมและ responsive layout
├── js/
│   ├── api.js                  # API wrapper และ Session handling
│   ├── app.js                  # Alpine.js app controller
│   ├── utils.js                # format, loading, toast และ resize ภาพ
│   └── views/
│       ├── dashboard.js        # Dashboard
│       ├── bookings.js         # ปฏิทินและรายการจอง
│       ├── customers.js        # ลูกค้า
│       ├── equipment.js        # คลังอุปกรณ์และอัปโหลดรูป
│       ├── analytics.js        # สถิติและ Chart.js
│       ├── history.js          # ประวัติงานและการชำระเงิน
│       ├── settings.js         # ตั้งค่าและเทมเพลต
│       ├── bookingForm.js      # ฟอร์มเพิ่ม/แก้ไขการจอง
│       └── jobSummary.js       # สรุปงาน PNG/พิมพ์
├── assets/
│   └── icons/                  # ไอคอน PWA
└── liff/
    └── index.html              # หน้าจองคิวสำหรับลูกค้าผ่าน LINE
~~~

ไลบรารี Frontend ที่ใช้ผ่าน CDN:

- Tailwind CSS
- Alpine.js
- SweetAlert2
- Chart.js
- Font Awesome
- html2canvas
- LINE LIFF SDK
- Google Fonts: Kanit และ Prompt

---

## 12. แนวทางความปลอดภัย

- เก็บรหัสเข้าใช้งานไว้ใน Script Properties
- เก็บ LINE Channel Access Token ไว้ใน Script Properties
- ไม่ Commit Secret ลง GitHub
- จำกัด Public Actions ให้เฉพาะฟังก์ชันที่จำเป็น
- ตั้งโฟลเดอร์สำรองรูปโปรไฟล์เป็น Restricted
- เปิดสาธารณะเฉพาะรูปอุปกรณ์ที่ลูกค้าต้องดู
- ตรวจสอบบัญชี Execute as ทุกครั้งที่เกิดปัญหาสิทธิ์
- ใช้ Web App URL ผ่าน HTTPS เท่านั้น
- หลีกเลี่ยงการใช้ Folder ID หรือข้อมูลลูกค้าจริงในเอกสารสาธารณะ
- ตรวจสอบ AuditLog เมื่อจำเป็นต้องย้อนดูการแก้ไขข้อมูล

รหัสเข้าใช้งานแบบเดียวร่วมกันเหมาะกับระบบภายในขนาดเล็ก หากในอนาคตมีผู้ดูแลหลายคน ควรเปลี่ยนเป็นระบบบัญชีผู้ใช้และสิทธิ์แยกรายบุคคล

---

## 13. การแก้ปัญหาเบื้องต้น

### เปิดเว็บแล้วหน้าขาวหรือโหลดนาน

ตรวจสอบ:

1. <code>API_URL</code> ใน <code>js/api.js</code>
2. Apps Script Web App URL ยังใช้งานได้หรือไม่
3. Deployment ตั้ง Who has access เป็น Anyone หรือไม่
4. Apps Script ตอบ JSON หรือถูก Redirect/แสดงหน้า HTML
5. Service Worker หรือ Browser Cache ยังเก็บไฟล์รุ่นเก่าหรือไม่
6. เปิด Console ของเบราว์เซอร์เพื่อดูข้อความ <code>API call failed</code>

### ล็อกอินแล้ววนกลับมาหน้าเดิม

ตรวจสอบ:

1. ตั้ง <code>APP_ACCESS_CODE</code> แล้วหรือไม่
2. รหัสที่กรอกตรงกับ Script Property หรือไม่
3. Browser อนุญาต Local Storage หรือไม่
4. Apps Script deployment เป็น URL เดียวกับที่อยู่ใน <code>js/api.js</code> หรือไม่
5. Session หมดอายุแล้วหรือไม่

### เห็นข้อความ Session หมดอายุ

เป็นพฤติกรรมปกติเมื่อ Session Token ใน CacheService หมดอายุหรือถูกล้าง ให้กรอกรหัสใหม่

### อัปโหลดรูปอุปกรณ์ไม่สำเร็จ

ตรวจสอบ:

1. มี <code>DRIVE_EQUIPMENT_FOLDER_ID</code>
2. Folder ID ถูกต้อง
3. บัญชี Execute as เข้าถึงโฟลเดอร์ได้
4. Manifest มี Drive OAuth Scope
5. เคย Run <code>authorizeDriveAccess</code> และอนุญาตสิทธิ์แล้ว
6. Web App deployment ใช้ Apps Script code รุ่นล่าสุด
7. รูปไม่ใหญ่เกินขนาดที่ระบบรับ
8. Google Workspace ไม่ได้ห้ามการตั้ง Anyone with the link

### อัปโหลดสำเร็จแต่ลูกค้าไม่เห็นรูป

ตรวจสอบ:

1. URL ในคอลัมน์ <code>imageUrl</code> ของชีต Equipment
2. ไฟล์ใน Drive ตั้งเป็น Viewer ที่เข้าถึงด้วยลิงก์ได้หรือไม่
3. นโยบายองค์กรบล็อกการแชร์สาธารณะหรือไม่
4. หน้า LIFF ใช้ API URL เดียวกับ Admin หรือไม่
5. Service Worker/Browser Cache ยังแสดงข้อมูลเก่าหรือไม่

### รูปโปรไฟล์ LINE ไม่แสดง

ตรวจสอบ:

1. ลูกค้าเปิด LIFF ผ่านแอป LINE จริงหรือไม่
2. LIFF เปิด Scope <code>profile</code> และ <code>openid</code> หรือไม่
3. ตั้ง <code>LINE_LOGIN_CHANNEL_ID</code> ถูกต้องหรือไม่
4. ID Token มาจาก Channel เดียวกับที่ตั้งค่าไว้หรือไม่
5. มีข้อมูลสมาชิกในชีต Members หรือไม่
6. ลูกค้าถูกเชื่อมกับ Customer หรือยัง

การพิมพ์ LINE ID ด้วยตัวเองไม่ได้ทำให้ระบบดึงรูปโปรไฟล์ได้ ต้องผ่าน LINE Token verification ก่อน

### แก้ Apps Script แล้วหน้าเว็บยังทำงานแบบเดิม

กด Save อย่างเดียวไม่พอ:

1. แก้ไขโค้ดใน Apps Script
2. บันทึก
3. ไปที่ Deploy → Manage deployments
4. แก้ไข deployment ให้ใช้เวอร์ชันล่าสุด หรือสร้าง deployment ใหม่
5. ตรวจ URL ที่อยู่ใน Frontend
6. ล้าง Cache/Service Worker ของหน้าเว็บ

### มีคอลัมน์ในชีตซ้ำหรือข้อมูลอ่านผิด

ระบบรุ่นปัจจุบันรองรับการอ่านชีตเก่าที่มี Header ซ้ำได้บางกรณี และการเพิ่มอุปกรณ์จะจับคู่ข้อมูลตามชื่อ Header จริง

อย่างไรก็ตาม ควรตรวจแถว Header แถวที่ 1 ให้มีชื่อคอลัมน์ไม่ซ้ำกัน และไม่ควรเปลี่ยนชื่อคอลัมน์ที่ระบบใช้งานโดยไม่แก้ Backend ให้สอดคล้องกัน

---

## 14. การพัฒนาต่อ

แนวทางที่เหมาะสมสำหรับเฟสถัดไป:

- เปลี่ยนจากรหัสร่วมเป็นบัญชีผู้ดูแลหลายระดับ
- เพิ่มการแจ้งเตือน LINE เมื่อมีการสร้างหรือยืนยันการจอง
- เพิ่มการแนบหลักฐานการชำระเงินไป Google Drive
- เพิ่มการค้นหาและกรองข้อมูลขั้นสูง
- เพิ่มระบบปฏิทินภายนอก
- เพิ่มระบบสำรองและกู้คืนข้อมูล
- เพิ่ม automated test สำหรับ API และการอัปโหลดรูป
- เพิ่มระบบตรวจ Deployment/Apps Script health แบบอัตโนมัติ
- เพิ่มการแยก Configuration ออกจาก Frontend เพื่อรองรับหลายสภาพแวดล้อม

---

## 15. ไฟล์อ้างอิง

- คู่มือติดตั้ง: [INSTALL.md](./INSTALL.md)
- Backend: [code.gs](./code.gs)
- Apps Script manifest: [appsscript.json](./appsscript.json)
- Admin entry point: [index.html](./index.html)
- API wrapper: [js/api.js](./js/api.js)
- LIFF booking page: [liff/index.html](./liff/index.html)
- Service Worker: [service-worker.js](./service-worker.js)
