/**
 * BAWMUSIC — Bookings List View
 */

let __bookingsCache = [];
let __bookingsFilter = { status: '', jobType: '' };

async function renderBookings() {
  const container = document.getElementById('view-bookings');
  container.innerHTML = `<div class="space-y-3 animate-pulse"><div class="h-16 bg-navy-light rounded-2xl"></div><div class="h-16 bg-navy-light rounded-2xl"></div></div>`;

  try {
    __bookingsCache = await BawmusicAPI.listBookings({});
    paintBookings();
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function paintBookings() {
  const container = document.getElementById('view-bookings');
  let list = __bookingsCache.filter(b => {
    if (__bookingsFilter.status && b.status !== __bookingsFilter.status) return false;
    if (__bookingsFilter.jobType && b.jobType !== __bookingsFilter.jobType) return false;
    return true;
  });

  container.innerHTML = `
    <div class="mb-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      ${filterChip('ทั้งหมด', '', 'status')}
      ${filterChip('ยืนยันแล้ว', 'confirmed', 'status')}
      ${filterChip('รอยืนยัน', 'pending', 'status')}
      ${filterChip('เสร็จสิ้น', 'completed', 'status')}
    </div>
    <p class="text-sm text-gray-500 mb-2">${list.length} รายการ</p>
    <div class="space-y-2">
      ${list.length === 0 ? emptyState('ไม่พบรายการจอง', 'fa-calendar-xmark') :
        list.map(bookingRow).join('')}
    </div>
  `;
}

function filterChip(label, value, key) {
  const active = __bookingsFilter[key] === value;
  return `
    <button onclick="window.__setBookingFilter('${key}','${value}')"
      class="px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${active ? 'bg-gold text-navy-dark' : 'bg-navy-light text-gray-400'}">
      ${label}
    </button>
  `;
}

window.__setBookingFilter = (key, value) => {
  __bookingsFilter[key] = value;
  paintBookings();
};

function bookingRow(b) {
  return `
    <div class="bg-navy-light rounded-2xl p-3.5 border border-gold/10 active:scale-[0.98] transition-transform cursor-pointer"
         onclick="window.openBookingForm('${b.id}')">
      <div class="flex items-start justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${Utils.jobTypeIcon(b.jobType)} text-gold text-sm"></i>
          <span class="text-sm font-medium text-gray-100">${b.customerName}</span>
        </div>
        ${Utils.statusBadge(b.status)}
      </div>
      <p class="text-sm text-gray-400 mb-1"><i class="fa-solid fa-location-dot mr-1 w-3"></i>${b.venue || 'ไม่ระบุสถานที่'} ${b.province ? '· ' + b.province : ''}</p>
      <div class="flex items-center justify-between mt-2 text-sm">
        <span class="text-gray-400"><i class="fa-regular fa-calendar mr-1 w-3"></i>${Utils.formatDate(b.date)}</span>
        <span class="text-gold font-medium">${Utils.formatMoney(b.price)}</span>
      </div>
    </div>
  `;
}
