/**
 * NN' SOUND MUSIC — Dashboard View
 */

async function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    const data = await BawmusicAPI.getDashboard();
    const settings = (window.__app && window.__app.settings) || {};
    const bannerUrl = settings.bannerImage || '';
    const bandName = settings.bandName || "NN' SOUND MUSIC";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
    const nextJob = data.todayJobs[0] || data.upcomingJobs[0] || null;

    container.innerHTML = `
      <section class="dashboard-hero mb-5">
        <div class="dashboard-hero-media">
          ${bannerUrl ? `
            <img src="${bannerUrl}" alt="${bandName}" class="dashboard-hero-image"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display:none" class="dashboard-hero-fallback">
              <i class="fa-solid fa-wave-square"></i>
            </div>
          ` : `
            <div class="dashboard-hero-fallback">
              <i class="fa-solid fa-wave-square"></i>
            </div>
          `}
        </div>
        <div class="dashboard-hero-overlay"></div>
        <div class="dashboard-stage-light dashboard-stage-light-cyan"></div>
        <div class="dashboard-stage-light dashboard-stage-light-pink"></div>
        <div class="dashboard-hero-content">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="dashboard-eyebrow"><span></span>${greeting}</p>
              <h2 class="dashboard-brand-name">${bandName}</h2>
              <p class="dashboard-brand-subtitle">Booking & Event Control Center</p>
            </div>
            <div class="dashboard-live-badge"><span></span> LIVE</div>
          </div>
          <div class="dashboard-next-job">
            <div class="dashboard-next-job-icon"><i class="fa-solid ${nextJob ? Utils.jobTypeIcon(nextJob.jobType) : 'fa-music'}"></i></div>
            <div class="min-w-0 flex-1">
              <p class="dashboard-next-label">${nextJob ? 'คิวงานถัดไป' : 'สถานะวันนี้'}</p>
              <p class="dashboard-next-title">${nextJob ? nextJob.customerName : 'พร้อมรับงานใหม่'}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="dashboard-next-date">${nextJob ? Utils.formatDateShort(nextJob.date) : 'ว่าง'}</p>
              <p class="dashboard-next-time">${nextJob && nextJob.startTime ? nextJob.startTime + ' น.' : 'เปิดรับจอง'}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="dashboard-metrics mb-5">
        <button class="dashboard-metric dashboard-metric-primary" onclick="window.__app.setView('analytics')">
          <span class="dashboard-metric-icon"><i class="fa-solid fa-arrow-trend-up"></i></span>
          <span class="dashboard-metric-label">รายได้เดือนนี้</span>
          <strong>${Utils.formatMoney(data.monthlyIncome)}</strong>
          <small>ดูรายงานทั้งหมด <i class="fa-solid fa-arrow-right"></i></small>
        </button>
        <div class="dashboard-metric-stack">
          <button class="dashboard-metric dashboard-metric-compact" onclick="window.__app.setView('bookings')">
            <span class="dashboard-metric-icon"><i class="fa-solid fa-calendar-check"></i></span>
            <span><small>งานเดือนนี้</small><strong>${data.thisMonthCount}</strong></span>
            <em>งาน</em>
          </button>
          <button class="dashboard-metric dashboard-metric-compact dashboard-metric-alert" onclick="window.__app.setView('bookings')">
            <span class="dashboard-metric-icon"><i class="fa-solid fa-wallet"></i></span>
            <span><small>รอชำระยอด</small><strong>${data.pendingDepositsCount}</strong></span>
            <em>รายการ</em>
          </button>
        </div>
      </section>

      <section class="mb-5">
        ${dashboardSectionHeader('fa-bolt', 'คำสั่งด่วน', 'จัดการงานได้ทันที')}
        <div class="dashboard-actions">
          ${quickAction('fa-plus', 'เพิ่มงาน', 'สร้างการจองใหม่', "window.openBookingForm()", 'primary')}
          ${quickAction('fa-calendar-days', 'ปฏิทิน', 'ดูตารางทั้งหมด', "window.__app.setView('bookings')")}
          ${quickAction('fa-users', 'ลูกค้า', 'ข้อมูลลูกค้า', "window.__app.setView('customers')")}
          ${quickAction('fa-chart-pie', 'รายงาน', 'ดูผลประกอบการ', "window.__app.setView('analytics')")}
        </div>
      </section>

      <section class="mb-5">
        ${dashboardSectionHeader('fa-calendar-day', 'งานวันนี้', `${data.todayJobs.length} งาน`, "window.__app.setView('bookings')")}
        <div class="dashboard-card-list">
          ${data.todayJobs.length === 0 ? emptyState('วันนี้ยังไม่มีคิวงาน', 'เพิ่มการจองใหม่ได้ทันที', 'fa-calendar-check') : data.todayJobs.map(jobCard).join('')}
        </div>
      </section>

      <section class="mb-5">
        ${dashboardSectionHeader('fa-forward', 'งานที่กำลังจะมาถึง', '5 งานล่าสุด', "window.__app.setView('bookings')")}
        <div class="dashboard-card-list">
          ${data.upcomingJobs.length === 0 ? emptyState('ยังไม่มีงานที่จองไว้', 'เมื่อเพิ่มงานใหม่ รายการจะแสดงที่นี่', 'fa-calendar-plus') : data.upcomingJobs.map(jobCard).join('')}
        </div>
      </section>

      <button class="dashboard-history-link mb-5" onclick="window.__app.setView('history')">
        <span class="dashboard-history-link-icon"><i class="fa-solid fa-box-archive"></i></span>
        <span><strong>ประวัติงานที่เสร็จสิ้นแล้ว</strong><small>เก็บงานเก่าไว้ดูย้อนหลังและตรวจสอบรายได้</small></span>
        <em>${data.completedCount || 0} งาน</em><i class="fa-solid fa-chevron-right"></i>
      </button>

      ${data.pendingDepositsCount > 0 ? `
        <section class="dashboard-payment-panel mb-5">
          <div class="dashboard-payment-heading">
            <div><span><i class="fa-solid fa-hand-holding-dollar"></i></span><div><h3>ยอดคงเหลือที่ต้องติดตาม</h3><p>${data.pendingDepositsCount} รายการรอชำระ</p></div></div>
            <strong>${Utils.formatMoney(data.pendingDeposits.reduce((sum, item) => sum + (Number(item.remaining) || 0), 0))}</strong>
          </div>
          <div class="dashboard-payment-list">
            ${data.pendingDeposits.slice(0, 3).map(b => `
              <button onclick="window.openBookingForm('${b.id}')"><span>${b.customerName}<small>${Utils.formatDateShort(b.date)}</small></span><strong>${Utils.formatMoney(b.remaining)}</strong><i class="fa-solid fa-chevron-right"></i></button>
            `).join('')}
          </div>
        </section>` : ''}

      <section>
        ${dashboardSectionHeader('fa-clock-rotate-left', 'กิจกรรมล่าสุด', 'อัปเดตล่าสุด')}
        <div class="dashboard-activity-list">
          ${data.recentActivities.length ? data.recentActivities.slice(0, 5).map(a => `
            <button onclick="window.openBookingForm('${a.id}')">
              <span class="dashboard-activity-icon"><i class="fa-solid ${Utils.jobTypeIcon(a.jobType)}"></i></span>
              <span class="dashboard-activity-copy"><strong>${a.customerName}</strong><small>${Utils.jobTypeLabel(a.jobType)} · ${Utils.formatDateShort(a.date)}</small></span>
              ${Utils.statusBadge(a.status)}
            </button>
          `).join('') : emptyState('ยังไม่มีกิจกรรม', 'รายการล่าสุดจะแสดงที่นี่', 'fa-clock')}
        </div>
      </section>
    `;
    Utils.fadeIn(container);
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function dashboardSectionHeader(icon, title, meta, onclick) {
  return `
    <div class="dashboard-section-heading">
      <div><span><i class="fa-solid ${icon}"></i></span><h3>${title}</h3></div>
      ${onclick ? `<button onclick="${onclick}">${meta}<i class="fa-solid fa-chevron-right"></i></button>` : `<p>${meta}</p>`}
    </div>
  `;
}

function jobCard(b) {
  return `
    <button class="dashboard-job-card" onclick="window.openBookingForm('${b.id}')">
      <span class="dashboard-job-date"><strong>${Utils.parseDate(b.date) ? Utils.parseDate(b.date).getDate() : '--'}</strong><small>${Utils.formatDateShort(b.date).split(' ')[1] || ''}</small></span>
      <span class="dashboard-job-copy"><strong>${b.customerName}</strong><small><i class="fa-solid ${Utils.jobTypeIcon(b.jobType)}"></i>${Utils.jobTypeLabel(b.jobType)} · ${b.venue || 'ไม่ระบุสถานที่'}</small></span>
      <span class="dashboard-job-time"><strong>${b.startTime || '--:--'}</strong><small>${Utils.statusBadge(b.status)}</small></span>
      <i class="fa-solid fa-chevron-right dashboard-job-arrow"></i>
    </button>
  `;
}

function quickAction(icon, label, detail, onclick, variant = '') {
  return `
    <button onclick="${onclick}" class="dashboard-action ${variant === 'primary' ? 'dashboard-action-primary' : ''}">
      <span><i class="fa-solid ${icon}"></i></span><strong>${label}</strong><small>${detail}</small>
    </button>
  `;
}

function emptyState(title, detail, icon = 'fa-inbox') {
  return `
    <div class="dashboard-empty-state">
      <span><i class="fa-solid ${icon}"></i></span><div><strong>${title}</strong><p>${detail}</p></div>
    </div>
  `;
}

function errorState(err) {
  return `
    <div class="dashboard-empty-state dashboard-error-state">
      <span><i class="fa-solid fa-triangle-exclamation"></i></span><div><strong>โหลดข้อมูลไม่สำเร็จ</strong><p>${err.message || err}</p></div>
    </div>
  `;
}
