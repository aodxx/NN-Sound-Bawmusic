/**
 * BAWMUSIC — Utility functions
 */

const Utils = {
  // ---------- Theme helpers ----------
  isLightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  },
  swalBg() {
    return Utils.isLightTheme() ? '#ffffff' : '#08080d';
  },
  swalColor() {
    return Utils.isLightTheme() ? '#201c33' : '#ffffff';
  },

  // ---------- Environment detection (for install instructions) ----------
  detectEnvironment() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isLine = /Line\//i.test(ua);
    const isFacebook = /FBAN|FBAV|FB_IAB/i.test(ua);
    const isInstagram = /Instagram/i.test(ua);
    const isInAppBrowser = isLine || isFacebook || isInstagram;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua) && isIOS;
    const isChrome = /Chrome/i.test(ua) && !isInAppBrowser;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    let inAppName = '';
    if (isLine) inAppName = 'LINE';
    else if (isFacebook) inAppName = 'Facebook';
    else if (isInstagram) inAppName = 'Instagram';

    return { isIOS, isAndroid, isInAppBrowser, inAppName, isSafari, isChrome, isStandalone };
  },

  // ---------- Loading state helpers (แก้ปัญหาจอขาวตอนสลับหน้า) ----------
  skeletonLoader(rows = 3) {
    return `
      <div class="flex flex-col items-center justify-center py-6">
        <div class="bawmusic-spinner"></div>
      </div>
      <div class="space-y-3 animate-pulse">
        ${Array.from({ length: rows }).map(() => '<div class="h-20 bg-navy-light rounded-2xl"></div>').join('')}
      </div>
    `;
  },

  // เรียกหลัง set innerHTML ของเนื้อหาจริงแล้ว เพื่อให้ fade-in นุ่มนวลแทนการตัดฉับ
  fadeIn(el) {
    if (!el) return;
    el.classList.remove('view-fade-in');
    void el.offsetWidth; // force reflow เพื่อ trigger animation ใหม่ทุกครั้ง
    el.classList.add('view-fade-in');
  },

  formatMoney(num) {
    num = Number(num) || 0;
    return num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ฿';
  },

  // Google Sheets อาจส่งเบอร์โทรกลับมาเป็นตัวเลข ทำให้เลข 0 ด้านหน้าหาย
  formatPhone(phone) {
    if (phone === null || phone === undefined || phone === '') return '-';
    let digits = String(phone).replace(/\D/g, '');
    if (!digits) return '-';
    if (digits.length === 9 && /^[689]/.test(digits)) digits = '0' + digits;
    if (digits.length === 10 && digits.charAt(0) === '0') {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return digits;
  },

  // แปลงวันที่แบบ date-only โดยไม่ให้ timezone ทำให้วันเลื่อน
  parseDate(dateValue) {
    if (dateValue === null || dateValue === undefined || dateValue === '') return null;
    if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? null : dateValue;
    if (typeof dateValue === 'number') {
      // รองรับ Google Sheets serial date (epoch: 1899-12-30)
      const serial = new Date(Date.UTC(1899, 11, 30) + dateValue * 86400000);
      return isNaN(serial.getTime()) ? null : serial;
    }
    const value = String(dateValue).trim();
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  },

  formatDate(dateStr) {
    const d = Utils.parseDate(dateStr);
    if (!d || d.getFullYear() < 2000) return '-';
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  },

  formatDateShort(dateStr) {
    const d = Utils.parseDate(dateStr);
    if (!d || d.getFullYear() < 2000) return '-';
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  },

  jobTypeLabel(type) {
    const map = {
      Wedding: 'งานแต่งงาน', Ordination: 'งานบวช', Funeral: 'งานศพ',
      Corporate: 'งานองค์กร', Birthday: 'งานวันเกิด', Concert: 'คอนเสิร์ต', Custom: 'อื่นๆ'
    };
    return map[type] || type || '-';
  },

  jobTypeIcon(type) {
    const map = {
      Wedding: 'fa-rings-wedding', Ordination: 'fa-om', Funeral: 'fa-fire-flame-simple',
      Corporate: 'fa-briefcase', Birthday: 'fa-cake-candles', Concert: 'fa-guitar', Custom: 'fa-star'
    };
    return map[type] || 'fa-calendar';
  },

  statusBadge(status) {
    const map = {
      confirmed: '<span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-base font-medium">ยืนยันแล้ว</span>',
      pending: '<span class="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-base font-medium">รอยืนยัน</span>',
      cancelled: '<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-base font-medium">ยกเลิก</span>',
      completed: '<span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-base font-medium">เสร็จสิ้น</span>'
    };
    // ไม่รู้จักสถานะ (ว่าง/ผิดพลาด) ให้ถือว่า "รอยืนยัน" ไว้ก่อนเพื่อความปลอดภัย
    // (ปลอดภัยกว่าเข้าใจผิดว่ายืนยันแล้วทั้งที่จริงยังไม่ได้ยืนยัน)
    return map[status] || map.pending;
  },

  toast(icon, title) {
    Swal.mixin({
      toast: true, position: 'top', showConfirmButton: false, timer: 2200, timerProgressBar: true,
      background: Utils.swalBg(), color: Utils.swalColor()
    }).fire({ icon, title });
  },

  async confirm(title, text, confirmText = 'ยืนยัน') {
    const result = await Swal.fire({
      title, text, icon: 'warning', showCancelButton: true,
      confirmButtonText: confirmText, cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#22d3ee', cancelButtonColor: '#2a2a3f',
      background: Utils.swalBg(), color: Utils.swalColor()
    });
    return result.isConfirmed;
  },

  loading(title = 'กำลังโหลด...') {
    Swal.fire({
      title, allowOutsideClick: false, background: Utils.swalBg(), color: Utils.swalColor(),
      didOpen: () => Swal.showLoading()
    });
  },

  closeLoading() {
    Swal.close();
  },

  provinces: [
    'พัทลุง', 'สงขลา', 'นครศรีธรรมราช', 'ตรัง', 'สตูล', 'ปัตตานี', 'ยะลา', 'นราธิวาส',
    'กระบี่', 'พังงา', 'ภูเก็ต', 'สุราษฎร์ธานี', 'ชุมพร', 'ระนอง'
  ],

  el(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }
};
