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
    <button class="dashboard-job-card history-job-card" onclick="openHistoryDetail('${b.id}')">
      <span class="dashboard-job-date"><strong>${Utils.parseDate(b.date) ? Utils.parseDate(b.date).getDate() : '--'}</strong><small>${Utils.formatDateShort(b.date).split(' ')[1] || ''}</small></span>
      <span class="dashboard-job-copy"><strong>${b.customerName || 'ไม่ระบุชื่อลูกค้า'}</strong><small><i class="fa-solid ${Utils.jobTypeIcon(b.jobType)}"></i>${Utils.jobTypeLabel(b.jobType)} · ${b.venue || 'ไม่ระบุสถานที่'}</small></span>
      <span class="history-job-price"><strong>${Utils.formatMoney(b.price)}</strong><small>เสร็จสิ้นแล้ว</small></span>
      <i class="fa-solid fa-chevron-right dashboard-job-arrow"></i>
    </button>
  `;
}

async function openHistoryDetail(bookingId) {
  Utils.loading('กำลังเปิดรายละเอียดงาน...');
  try {
    const booking = await BawmusicAPI.getBooking(bookingId);
    Utils.closeLoading();
    if (!booking) throw new Error('ไม่พบข้อมูลงานนี้');
    paintHistoryDetail(booking);
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เปิดประวัติงานไม่สำเร็จ: ' + err.message);
  }
}

function paintHistoryDetail(b) {
  const root = document.getElementById('modal-root');
  const equipment = (b.equipment || []).map(e => `<span class="history-detail-chip"><i class="fa-solid fa-box"></i>${e.name}${e.qty > 1 ? ' ×' + e.qty : ''}</span>`).join('');
  root.innerHTML = `
    <div class="history-detail-backdrop" role="dialog" aria-modal="true">
      <div class="history-detail-modal">
        <header class="history-detail-header">
          <div><p class="dashboard-eyebrow"><span></span>COMPLETED JOB</p><h2>รายละเอียดประวัติงาน</h2></div>
          <button onclick="closeHistoryDetail()" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="history-detail-status"><span><i class="fa-solid fa-circle-check"></i></span><div><strong>งานเสร็จสิ้นแล้ว</strong><small>รายการนี้อยู่ในประวัติและไม่ใช่คิวงานปัจจุบัน</small></div></div>

        <section class="history-detail-section">
          <h3><i class="fa-solid fa-calendar-check"></i> สรุปงาน</h3>
          <div class="history-detail-grid">
            ${historyDetailItem('วันที่จัดงาน', Utils.formatDate(b.date), 'fa-calendar')}
            ${historyDetailItem('เวลา', `${b.startTime || '-'} - ${b.endTime || '-'}`, 'fa-clock')}
            ${historyDetailItem('ประเภทงาน', Utils.jobTypeLabel(b.jobType), 'fa-tag')}
            ${historyDetailItem('แพ็กเกจ', b.package, 'fa-layer-group')}
            ${historyDetailItem('สถานที่', b.venue, 'fa-location-dot', true)}
            ${historyDetailItem('จังหวัด', b.province, 'fa-map')}
          </div>
          ${b.mapLink ? `<a class="history-detail-map" href="${b.mapLink}" target="_blank" rel="noopener"><i class="fa-solid fa-map-location-dot"></i> เปิดแผนที่สถานที่จัดงาน</a>` : ''}
        </section>

        <section class="history-detail-section">
          <h3><i class="fa-solid fa-user"></i> ข้อมูลลูกค้า</h3>
          <div class="history-detail-grid">
            ${historyDetailItem('ชื่อลูกค้า', b.customerName, 'fa-user', true)}
            ${historyDetailItem('เบอร์โทร', b.phone, 'fa-phone')}
            ${historyDetailItem('LINE', b.line, 'fa-comment')}
          </div>
        </section>

        <section class="history-detail-section">
          <h3><i class="fa-solid fa-boxes-stacked"></i> อุปกรณ์ที่ใช้</h3>
          <div class="history-detail-chips">${equipment || '<span class="history-detail-muted">ไม่ได้ระบุอุปกรณ์</span>'}</div>
        </section>

        <section class="history-detail-section history-detail-finance">
          <h3><i class="fa-solid fa-chart-line"></i> สรุปการเงิน</h3>
          ${historyFinanceRow('ราคารวม', b.price, 'normal')}
          ${historyFinanceRow('มัดจำแล้ว', b.deposit, 'success')}
          ${historyFinanceRow('ยอดคงเหลือ', b.remaining, Number(b.remaining) > 0 ? 'warning' : 'success')}
        </section>

        ${b.remarks ? `<section class="history-detail-section"><h3><i class="fa-solid fa-note-sticky"></i> หมายเหตุ</h3><p class="history-detail-remarks">${b.remarks}</p></section>` : ''}

        <footer class="history-detail-actions">
          <button onclick="openJobSummary('${b.id}')" class="history-detail-primary"><i class="fa-solid fa-share-nodes"></i> ดูสรุปงาน / แชร์</button>
          <button onclick="closeHistoryDetail()" class="history-detail-secondary">ปิดรายละเอียด</button>
        </footer>
      </div>
    </div>
  `;
}

function historyDetailItem(label, value, icon, wide) {
  return `<div class="history-detail-item ${wide ? 'history-detail-item-wide' : ''}"><small><i class="fa-solid ${icon}"></i>${label}</small><strong>${value || '-'}</strong></div>`;
}

function historyFinanceRow(label, value, type) {
  return `<div class="history-finance-row ${type}"><span>${label}</span><strong>${Utils.formatMoney(value)}</strong></div>`;
}

function closeHistoryDetail() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}
