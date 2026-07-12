/**
 * BAWMUSIC — Bookings View
 * แสดงผลแบบปฏิทิน (ค่าเริ่มต้น) พร้อมสลับดูเป็นรายการได้
 */

let __bookingsCache = [];
let __bookingsFilter = { status: '', jobType: '' };
let __bookingsViewMode = 'calendar'; // 'calendar' | 'list'
let __calendarCursor = new Date(); // เดือน/ปีที่กำลังดูอยู่บนปฏิทิน

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

async function renderBookings() {
  const container = document.getElementById('view-bookings');
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    __bookingsCache = await BawmusicAPI.listBookings({});
    paintBookingsRoot();
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function paintBookingsRoot() {
  const container = document.getElementById('view-bookings');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <button onclick="window.__setBookingsView('calendar')"
        class="flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${__bookingsViewMode === 'calendar' ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400'}">
        <i class="fa-regular fa-calendar mr-1.5"></i>ปฏิทิน
      </button>
      <button onclick="window.__setBookingsView('list')"
        class="flex-1 py-3 rounded-xl text-base font-semibold transition-colors ${__bookingsViewMode === 'list' ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400'}">
        <i class="fa-solid fa-list mr-1.5"></i>รายการ
      </button>
    </div>
    <div id="bookings-view-content"></div>
  `;
  Utils.fadeIn(container);

  if (__bookingsViewMode === 'calendar') paintCalendarView();
  else paintBookingsListView();
}

window.__setBookingsView = (mode) => {
  __bookingsViewMode = mode;
  paintBookingsRoot();
};

// ================== CALENDAR VIEW ==================

function bookingsByDateKey() {
  const map = {};
  __bookingsCache.forEach(b => {
    if (!b.date) return;
    const d = new Date(b.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (map[key] = map[key] || []).push(b);
  });
  return map;
}

function paintCalendarView() {
  const el = document.getElementById('bookings-view-content');
  if (!el) return;

  const year = __calendarCursor.getFullYear();
  const month = __calendarCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = bookingsByDateKey();
  const today = new Date();

  let cells = '';
  for (let i = 0; i < firstWeekday; i++) cells += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    const dayBookings = byDate[key] || [];
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    cells += calendarCell(day, dayBookings, isToday, year, month);
  }

  el.innerHTML = `
    <div class="bg-navy-light rounded-2xl p-3 border border-gold/10 shadow-sm shadow-black/5 mb-3">
      <div class="flex items-center justify-between mb-3 px-1">
        <button onclick="window.__calendarNav(-1)" class="w-11 h-11 rounded-xl bg-navy flex items-center justify-center text-gold text-lg active:scale-90 transition-transform">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="flex items-center gap-2">
          <p class="text-base font-bold text-gold">${THAI_MONTHS_FULL[month]} ${year + 543}</p>
          <button onclick="window.__calendarToday()" class="text-base text-gray-500 underline py-1">วันนี้</button>
        </div>
        <button onclick="window.__calendarNav(1)" class="w-11 h-11 rounded-xl bg-navy flex items-center justify-center text-gold text-lg active:scale-90 transition-transform">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-1">
        ${THAI_WEEKDAYS.map(w => `<div class="text-center text-base text-gray-500 font-medium py-1">${w}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${cells}
      </div>
    </div>
    <div id="calendar-day-detail"></div>
  `;
  Utils.fadeIn(el);

  // ถ้าวันนี้มีงาน ให้เปิดรายละเอียดวันนี้ให้อัตโนมัติเมื่อเข้ามาหน้าปฏิทินครั้งแรก
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (year === today.getFullYear() && month === today.getMonth() && byDate[todayKey]) {
    window.__showCalendarDayDetail(year, month, today.getDate());
  }
}

function calendarCell(day, dayBookings, isToday, year, month) {
  const has = dayBookings.length > 0;
  const firstName = has ? (dayBookings[0].customerName || '').split(' ')[0] : '';

  return `
    <button onclick="window.__showCalendarDayDetail(${year}, ${month}, ${day})"
      class="relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-colors
        ${isToday ? 'ring-2 ring-gold' : ''}
        ${has ? 'bg-gold/10' : 'bg-navy hover:bg-navy-light'}">
      ${has ? `<span class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-gold pulse-dot"></span>` : ''}
      <span class="text-base font-semibold ${isToday ? 'text-gold font-bold' : 'text-gray-300'}">${day}</span>
      ${has ? `<span class="text-xs text-gold/90 leading-tight truncate w-full px-1 font-medium">${firstName}</span>` : ''}
      ${dayBookings.length > 1 ? `<span class="text-xs text-gray-500 leading-none">+${dayBookings.length - 1}</span>` : ''}
    </button>
  `;
}

window.__calendarNav = (delta) => {
  __calendarCursor = new Date(__calendarCursor.getFullYear(), __calendarCursor.getMonth() + delta, 1);
  const detailEl = document.getElementById('calendar-day-detail');
  if (detailEl) detailEl.innerHTML = '';
  paintCalendarView();
};

window.__calendarToday = () => {
  __calendarCursor = new Date();
  paintCalendarView();
};

window.__showCalendarDayDetail = (year, month, day) => {
  const dayBookings = __bookingsCache.filter(b => {
    if (!b.date) return false;
    const d = new Date(b.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const detailEl = document.getElementById('calendar-day-detail');
  if (!detailEl) return;

  const dateObj = new Date(year, month, day);

  if (dayBookings.length === 0) {
    detailEl.innerHTML = `
      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 text-center">
        <p class="text-base text-gray-400 mb-3">${Utils.formatDate(dateObj)} — ยังไม่มีงาน</p>
        <button onclick="window.__newBookingOnDate(${year}, ${month}, ${day})"
          class="bg-gold/10 border border-gold/30 text-gold text-base font-semibold rounded-xl px-5 py-3">
          <i class="fa-solid fa-plus mr-1.5"></i>จองงานวันนี้
        </button>
      </div>
    `;
    Utils.fadeIn(detailEl);
    return;
  }

  detailEl.innerHTML = `
    <p class="text-base text-gray-500 mb-2 px-1">${Utils.formatDate(dateObj)} — ${dayBookings.length} งาน</p>
    <div class="space-y-2">${dayBookings.map(bookingRow).join('')}</div>
  `;
  Utils.fadeIn(detailEl);
};

window.__newBookingOnDate = (year, month, day) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  window.openBookingForm(null, dateStr);
};

// ================== LIST VIEW ==================

function paintBookingsListView() {
  const el = document.getElementById('bookings-view-content');
  if (!el) return;

  let list = __bookingsCache.filter(b => {
    if (__bookingsFilter.status && b.status !== __bookingsFilter.status) return false;
    if (__bookingsFilter.jobType && b.jobType !== __bookingsFilter.jobType) return false;
    return true;
  });

  el.innerHTML = `
    <div class="mb-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      ${filterChip('ทั้งหมด', '', 'status')}
      ${filterChip('ยืนยันแล้ว', 'confirmed', 'status')}
      ${filterChip('รอยืนยัน', 'pending', 'status')}
      ${filterChip('เสร็จสิ้น', 'completed', 'status')}
    </div>
    <p class="text-base text-gray-500 mb-2">${list.length} รายการ</p>
    <div class="space-y-2">
      ${list.length === 0 ? emptyState('ไม่พบรายการจอง', 'fa-calendar-xmark') :
        list.map(bookingRow).join('')}
    </div>
  `;
  Utils.fadeIn(el);
}

function filterChip(label, value, key) {
  const active = __bookingsFilter[key] === value;
  return `
    <button onclick="window.__setBookingFilter('${key}','${value}')"
      class="px-3 py-3 rounded-full text-base font-medium whitespace-nowrap flex-shrink-0 transition-colors ${active ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400'}">
      ${label}
    </button>
  `;
}

window.__setBookingFilter = (key, value) => {
  __bookingsFilter[key] = value;
  paintBookingsListView();
};

function bookingRow(b) {
  return `
    <div class="bg-navy-light rounded-2xl p-3.5 border border-gold/10 shadow-sm shadow-black/5 active:scale-[0.98] transition-transform cursor-pointer"
         onclick="window.openBookingForm('${b.id}')">
      <div class="flex items-start justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${Utils.jobTypeIcon(b.jobType)} text-gold text-base"></i>
          <span class="text-base font-medium text-gray-100">${b.customerName}</span>
        </div>
        ${Utils.statusBadge(b.status)}
      </div>
      <p class="text-base text-gray-400 mb-1"><i class="fa-solid fa-location-dot mr-1 w-3"></i>${b.venue || 'ไม่ระบุสถานที่'} ${b.province ? '· ' + b.province : ''}</p>
      <div class="flex items-center justify-between mt-2 text-base">
        <span class="text-gray-400"><i class="fa-regular fa-calendar mr-1 w-3"></i>${Utils.formatDate(b.date)}</span>
        <span class="text-gold font-medium">${Utils.formatMoney(b.price)}</span>
      </div>
    </div>
  `;
}
