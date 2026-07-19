/**
 * NN' SOUND MUSIC — Completed Jobs History
 */

let __historyBookings = [];

async function renderHistory() {
  const container = document.getElementById('view-history');
  container.innerHTML = Utils.skeletonLoader(4);

  try {
    __historyBookings = await BawmusicAPI.listBookings({ status: 'completed' });
    paintHistory(__historyBookings);
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function paintHistory(bookings) {
  const container = document.getElementById('view-history');
  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const years = [...new Set(bookings.map(b => {
    const d = Utils.parseDate(b.date);
    return d ? d.getFullYear() : null;
  }).filter(Boolean))].sort((a, b) => b - a);

  container.innerHTML = `
    <div class="dashboard-history-head mb-5">
      <div>
        <p class="dashboard-eyebrow"><span></span>ARCHIVE</p>
        <h2>ประวัติงานที่เสร็จสิ้นแล้ว</h2>
        <p>งานที่ปิดงานแล้วจะถูกเก็บไว้ที่นี่ ไม่ปะปนกับคิวงานปัจจุบัน</p>
      </div>
      <span><i class="fa-solid fa-box-archive"></i></span>
    </div>

    <div class="history-summary-grid mb-5">
      <div><small>งานที่เสร็จสิ้น</small><strong>${bookings.length}</strong><em>งาน</em></div>
      <div><small>รายได้รวม</small><strong>${Utils.formatMoney(totalRevenue)}</strong><em>จากงานที่ปิดแล้ว</em></div>
    </div>

    <div class="history-toolbar mb-4">
      <label><i class="fa-solid fa-magnifying-glass"></i><input id="history-search" type="search" placeholder="ค้นหาชื่อลูกค้าหรือสถานที่" oninput="filterHistory()"></label>
      <select id="history-year" onchange="filterHistory()"><option value="">ทุกปี</option>${years.map(y => `<option value="${y}">${y + 543}</option>`).join('')}</select>
    </div>

    <div id="history-list" class="dashboard-card-list"></div>
  `;
  renderHistoryList(bookings);
  Utils.fadeIn(container);
}

function filterHistory() {
  const query = (document.getElementById('history-search').value || '').trim().toLowerCase();
  const year = document.getElementById('history-year').value;
  const filtered = __historyBookings.filter(b => {
    const d = Utils.parseDate(b.date);
    const haystack = `${b.customerName || ''} ${b.venue || ''} ${b.province || ''}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!year || (d && d.getFullYear() === Number(year)));
  });
  renderHistoryList(filtered);
}

function renderHistoryList(bookings) {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = bookings.length ? bookings.map(historyCard).join('') : emptyState('ไม่พบประวัติงาน', 'ลองเปลี่ยนคำค้นหาหรือปีที่เลือก', 'fa-box-open');
}

function historyCard(b) {
  return `
    <button class="dashboard-job-card history-job-card" onclick="window.openBookingForm('${b.id}')">
      <span class="dashboard-job-date"><strong>${Utils.parseDate(b.date) ? Utils.parseDate(b.date).getDate() : '--'}</strong><small>${Utils.formatDateShort(b.date).split(' ')[1] || ''}</small></span>
      <span class="dashboard-job-copy"><strong>${b.customerName || 'ไม่ระบุชื่อลูกค้า'}</strong><small><i class="fa-solid ${Utils.jobTypeIcon(b.jobType)}"></i>${Utils.jobTypeLabel(b.jobType)} · ${b.venue || 'ไม่ระบุสถานที่'}</small></span>
      <span class="history-job-price"><strong>${Utils.formatMoney(b.price)}</strong><small>เสร็จสิ้นแล้ว</small></span>
      <i class="fa-solid fa-chevron-right dashboard-job-arrow"></i>
    </button>
  `;
}
