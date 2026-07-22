# Rich Menu สำหรับ Bawmusic Customer Portal

ไฟล์นี้ใช้ตั้งค่า Rich Menu ของ LINE OA ให้ลูกค้าเข้าถึง 3 ฟังก์ชันหลักจากหน้าแชตได้ทันที

## ลิงก์ที่ใช้

| ปุ่ม | URL |
|---|---|
| จองงานใหม่ | https://aodxx.github.io/NN-Sound-Bawmusic/liff/index.html |
| ประวัติของฉัน | https://aodxx.github.io/NN-Sound-Bawmusic/liff/portal.html?tab=history |
| ตารางงาน | https://aodxx.github.io/NN-Sound-Bawmusic/liff/portal.html?tab=schedule |

ไฟล์กำหนดพื้นที่และลิงก์อยู่ที่ [line-rich-menu-config.json](./line-rich-menu-config.json)

## วิธีตั้งค่าที่แนะนำ: LINE Official Account Manager

การตั้งค่าผ่าน LINE Official Account Manager เหมาะกับระบบนี้ที่สุด เพราะไม่ต้องนำ Channel Access Token มาใส่ใน GitHub หรือในหน้าเว็บ

1. ตรวจสอบก่อนว่า PR ระยะที่ 2 ถูก Merge เข้า `main` แล้ว และ GitHub Pages เปิดใช้งานอยู่
2. เปิดหน้า URL ทั้ง 3 รายการบนมือถือ ตรวจสอบว่าโหลดได้
3. เข้า LINE Official Account Manager ของ Bawmusic
4. เปิดเมนู Rich menu แล้วสร้างเมนูใหม่
5. เลือกขนาดแบบใหญ่ และแบ่งพื้นที่แนวตั้ง 3 ช่องเท่าๆ กัน
6. กำหนดการกระทำของแต่ละพื้นที่เป็น **เปิดเว็บไซต์** แล้วใส่ URL ตามตารางด้านบน
7. ตั้งข้อความแถบเมนูเป็น `เมนู Bawmusic`
8. ตั้งเป็นเมนูเริ่มต้น แล้วบันทึก/เผยแพร่
9. เปิดห้องแชตของ LINE OA บนโทรศัพท์ แล้วกดปุ่มทั้ง 3 ปุ่ม

ไฟล์ [rich-menu-customer.svg](../assets/rich-menu-customer.svg) เป็นภาพต้นแบบสำหรับใช้จัดวางหน้าตาและข้อความใน Rich Menu หาก Manager ต้องการไฟล์ PNG/JPG ให้ใช้ตัวแก้ไขภาพของ Manager หรือส่งออกภาพจากต้นแบบก่อนอัปโหลด

## ข้อควรระวัง

- Rich Menu ไม่แสดงบน LINE สำหรับ PC ต้องทดสอบบนโทรศัพท์
- อย่าใส่ Channel Access Token หรือข้อมูลลับลงในไฟล์ JSON หรือ GitHub
- Rich Menu หนึ่งชุดควรสร้างและแก้ไขด้วยเครื่องมือเดียวกันตลอด หากสร้างผ่าน Official Account Manager ให้แก้ผ่าน Manager ต่อไป ไม่ควรสลับไปใช้ Messaging API กับเมนูชุดเดียวกัน
- ลูกค้าต้องเปิดหน้าเว็บผ่าน LINE และ LIFF Channel ต้องเปิด Scope `openid` กับ `profile`
- ตารางงานแสดงเฉพาะวันที่มีสถานะ `confirmed` และไม่แสดงรายละเอียดของงานอื่น

## ตรวจสอบเมื่อกดแล้วไม่เปิด

### เปิดแล้วเป็น 404

ตรวจสอบว่า GitHub Pages deploy จาก branch `main` และไฟล์ `liff/index.html` กับ `liff/portal.html` อยู่บน `main` แล้ว

### เปิดหน้าได้แต่ขึ้นปัญหา LIFF

ตรวจสอบ LIFF ID, Endpoint URL และ Scope ใน LINE Developers Console ให้ตรงกับหน้า LIFF เดิมของ Bawmusic

### หน้าเดิมยังแสดงอยู่

รอให้ GitHub Pages อัปเดต แล้วปิด/เปิดห้องแชต LINE ใหม่ จากนั้นลองกดอีกครั้ง

### ตารางงานไม่ขึ้น

ทดสอบ URL นี้โดยตรงก่อน:

`https://script.google.com/macros/s/AKfycbwczdEBiHu3bECE1OeeOzMKcIpB7Ed8oLAD0O3DbjDeuFM5drKH0JW_aJtN_Y2uYfXDBA/exec?action=listPublicSchedule&month=2026-07`

ต้องได้ `success: true` และข้อมูล `bookedDates`
