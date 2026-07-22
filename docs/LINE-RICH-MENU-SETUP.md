# Rich Menu สำหรับ Bawmusic Customer Portal

เอกสารนี้อธิบายการผูก Rich Menu ของ LINE OA เข้ากับระบบลูกค้า โดยใช้ LIFF URL ที่ถูกต้อง

## ค่าปัจจุบันของ LIFF

| หน้าที่ | LIFF app | LIFF ID | URL สำหรับ Rich Menu |
|---|---|---|---|
| จองงานใหม่ | NN'Sound music (เดิม) | 2007938843-WTd19n2O | https://liff.line.me/2007938843-WTd19n2O |
| ประวัติของฉัน | Bawmusic Customer Portal (ใหม่) | 2007938843-kgwzlris | https://liff.line.me/2007938843-kgwzlris/?tab=history |
| ตารางงาน | Bawmusic Customer Portal (ใหม่) | 2007938843-kgwzlris | https://liff.line.me/2007938843-kgwzlris/?tab=schedule |

> URL สำหรับ Rich Menu ต้องเป็น URL ที่ขึ้นต้นด้วย `https://liff.line.me/` ไม่ใช่ Endpoint URL ของ GitHub Pages

## ค่าใน LINE Developers

แอป LIFF ใหม่ชื่อ **Bawmusic Customer Portal** ต้องตั้งค่าเป็น:

- Size: **Full**
- Endpoint URL: `https://aodxx.github.io/NN-Sound-Bawmusic/liff/portal.html`
- Scope: เปิด **openid** และ **profile**
- Scope: ไม่ต้องเปิด `chat_message.write`
- Add friend option: On (Normal) ใช้ได้
- Scan QR: ปิดได้
- Module mode: เปิดได้เมื่อใช้ Full

เหตุผลที่ต้องเปิด:

- `openid` ใช้สำหรับ `liff.getIDToken()` เพื่อยืนยันว่าประวัติเป็นของลูกค้า LINE คนใด
- `profile` ใช้สำหรับ `liff.getProfile()` เพื่อแสดงชื่อและรูปโปรไฟล์ LINE

ในภาพการตั้งค่าล่าสุด ช่อง **profile ยังไม่ได้เลือก** ให้เปิดจากการแก้ไขแอป Bawmusic Customer Portal ก่อนทดสอบ หากแก้ Scope ของแอปที่สร้างแล้วไม่ได้ ให้ลบเฉพาะแอปใหม่นี้แล้วสร้างใหม่ตามค่าข้างต้น ห้ามลบ LIFF เดิมที่ใช้จองงาน

## ใช้กับภาพ Rich Menu เดิม

ไม่จำเป็นต้องสร้างหรืออัปโหลดภาพใหม่ หากมีภาพ Rich Menu แบบ 2x3 อยู่แล้ว ให้คงภาพเดิมไว้ แล้วเข้าไปแก้การกระทำของพื้นที่ที่ต้องการ:

1. พื้นที่จองงานใหม่ → `https://liff.line.me/2007938843-WTd19n2O`
2. พื้นที่ประวัติของฉัน → `https://liff.line.me/2007938843-kgwzlris/?tab=history`
3. พื้นที่ตารางงาน → `https://liff.line.me/2007938843-kgwzlris/?tab=schedule`

ชื่อข้อความบนภาพไม่จำเป็นต้องตรงกับชื่อฟังก์ชัน สิ่งที่สำคัญคือพื้นที่ที่กดต้องผูกกับ URL ให้ถูกต้อง ส่วนปุ่มอื่นให้คงการทำงานเดิมไว้ได้

ไฟล์ [line-rich-menu-config.json](./line-rich-menu-config.json) เป็นตัวอย่าง payload สำหรับเมนู 3 ช่องแนวตั้ง ไม่ใช่ข้อบังคับให้เปลี่ยนภาพ Rich Menu เดิม

## วิธีตั้งค่าผ่าน LINE Official Account Manager

การตั้งค่าผ่าน Official Account Manager เหมาะกับระบบนี้ เพราะไม่ต้องนำ Channel Access Token มาเก็บใน GitHub

1. ตรวจสอบว่า GitHub Pages ของ repository เปิดใช้งานและไฟล์ `liff/portal.html` อยู่บน `main`
2. เข้า LINE Official Account Manager ของ Bawmusic
3. เปิดเมนู Rich menu แล้วเลือกเมนูเดิมที่ต้องการแก้
4. เลือกพื้นที่ของปุ่ม แล้วตั้งการกระทำเป็น **เปิดเว็บไซต์**
5. วาง LIFF URL จากตารางด้านบนให้ตรงกับพื้นที่
6. บันทึกและเผยแพร่
7. เปิดห้องแชตของ LINE OA บนโทรศัพท์ แล้วกดทดสอบทีละปุ่ม

อย่านำ URL นี้ไปใส่ใน Rich Menu:

`https://aodxx.github.io/NN-Sound-Bawmusic/liff/portal.html`

URL ดังกล่าวใช้เฉพาะช่อง **Endpoint URL** ใน LINE Developers เท่านั้น

## การตรวจสอบ

1. กด URL ประวัติหรือตารางงานจากใน LINE ไม่ใช่เปิด Endpoint ตรงๆ
2. ครั้งแรกให้ยอมรับสิทธิ์ `openid` และ `profile`
3. หน้า Customer Portal ต้องเปิดและแสดงชื่อ LINE ได้
4. แท็บประวัติต้องโหลดรายการของบัญชี LINE ที่เชื่อมไว้
5. แท็บตารางงานต้องแสดงเฉพาะวันที่มีงานยืนยันแล้ว โดยไม่เปิดเผยรายละเอียดงานอื่น

การส่ง `?tab=history` หรือ `?tab=schedule` ต่อท้าย LIFF URL ใช้เลือกแท็บเริ่มต้น ระบบจะอ่านค่าหลังจาก LIFF initialization เสร็จ

## แก้ปัญหาเบื้องต้น

### ขึ้น Invalid LIFF ID

ตรวจสอบว่า Rich Menu ใช้ LIFF URL ใหม่ตามตาราง และไม่มี URL ของแอป A/B ที่ถูกลบไปแล้ว

### เปิดหน้าได้แต่ไม่เห็นชื่อหรือรูป LINE

ตรวจสอบว่า LIFF app ใหม่เปิด Scope `profile` แล้ว จากนั้นปิดหน้า LIFF เดิม เปิดใหม่ และยอมรับสิทธิ์อีกครั้ง

### เปิดแล้วเป็น 404

ตรวจสอบว่า GitHub Pages deploy จาก branch `main` และมีไฟล์:

- `liff/index.html`
- `liff/portal.html`

### ตารางงานไม่ขึ้น

ทดสอบ Web App API นี้ก่อน:

`https://script.google.com/macros/s/AKfycbwczdEBiHu3bECE1OeeOzMKcIpB7Ed8oLAD0O3DbjDeuFM5drKH0JW_aJtN_Y2uYfXDBA/exec?action=listPublicSchedule&month=2026-07`

ควรได้ `success: true` และมีข้อมูล `bookedDates`

## ข้อควรระวัง

- Rich Menu หนึ่งชุดควรแก้ด้วยเครื่องมือเดิมตลอด หากสร้างผ่าน Official Account Manager ให้แก้ผ่าน Manager ต่อไป
- อย่าใส่ Channel Access Token หรือข้อมูลลับใน GitHub
- Rich Menu ต้องทดสอบบนโทรศัพท์ในแอป LINE
- แอปจองงานเดิมกับ Customer Portal ใหม่ใช้คนละ LIFF ID ห้ามนำ ID ใหม่ไปแทนที่หน้า `liff/index.html`
