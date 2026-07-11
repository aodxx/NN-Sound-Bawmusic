/**
 * BAWMUSIC — Utility functions
 */

const Utils = {
  // ---------- Theme helpers ----------
  isLightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  },
  swalBg() {
    return Utils.isLightTheme() ? '#ffffff' : '#1a1a2e';
  },
  swalColor() {
    return Utils.isLightTheme() ? '#1a1a2e' : '#ffffff';
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

  formatMoney(num) {
    num = Number(num) || 0;
    return num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ฿';
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
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
      confirmed: '<span class="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">ยืนยันแล้ว</span>',
      pending: '<span class="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">รอยืนยัน</span>',
      cancelled: '<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">ยกเลิก</span>',
      completed: '<span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">เสร็จสิ้น</span>'
    };
    return map[status] || map.confirmed;
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
      confirmButtonColor: '#d4af37', cancelButtonColor: '#3a3a55',
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
