/**
 * BAWMUSIC — Dashboard View
 */

async function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    const data = await BawmusicAPI.getDashboard();

    const bannerUrl = (window.__app && window.__app.settings && window.__app.settings.bannerImage) || '';
    const bandName = (window.__app && window.__app.settings && window.__app.settings.bandName) || 'Bawmusic';

    container.innerHTML = `
      <!-- Hero Banner -->
      <div class="relative w-full h-36 rounded-3xl overflow-hidden mb-4 shadow-lg shadow-black/20 border border-gold/10 shadow-sm shadow-black/5">
        ${bannerUrl ? `
          <img src="${bannerUrl}" alt="banner" class="absolute inset-0 w-full h-full object-cover"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div style="display:none" class="hero-fallback absolute inset-0 w-full h-full items-center justify-center bg-gradient-to-br from-navy-light to-navy-dark">
            <i class="fa-solid fa-image-slash text-2xl text-gray-600"></i>
          </div>
        ` : `
          <div class="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-navy-light via-navy to-navy-dark">
            <i class="fa-solid fa-music text-4xl text-gold/20"></i>
          </div>
        `}
        <div class="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/30 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4">
          <p class="text-white text-lg font-bold leading-tight drop-shadow-md">${bandName}</p>
          <p class="text-gold text-base font-medium drop-shadow-md">ระบบจัดการการจองงานวงดนตรี</p>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gradient-to-br from-gold to-gold-dark rounded-2xl p-4 text-navy-dark">
          <p class="text-base font-medium opacity-80">รายได้เดือนนี้</p>
          <p class="text-xl font-bold mt-1">${Utils.formatMoney(data.monthlyIncome)}</p>
        </div>
        <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
          <p class="text-base font-medium text-gray-400">งานเดือนนี้</p>
          <p class="text-xl font-bold mt-1 text-gold">${data.thisMonthCount} งาน</p>
        </div>
      </div>

      <!-- Today's Jobs -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-base font-semibold text-gold"><i class="fa-solid fa-calendar-day mr-1.5"></i>งานวันนี้</h2>
          <span class="text-base text-gray-400">${data.todayJobs.length} งาน</span>
        </div>
        ${data.todayJobs.length === 0 ? emptyState('ไม่มีงานในวันนี้', 'fa-mug-hot') :
          data.todayJobs.map(jobCard).join('')}
      </div>

      <!-- Upcoming -->
      <div class="mb-4">
        <h2 class="text-base font-semibold text-gold mb-2"><i class="fa-solid fa-clock mr-1.5"></i>งานที่กำลังจะมาถึง</h2>
        ${data.upcomingJobs.length === 0 ? emptyState('ยังไม่มีงานที่จองไว้', 'fa-calendar-plus') :
          data.upcomingJobs.map(jobCard).join('')}
      </div>

      <!-- Pending Deposits -->
      ${data.pendingDepositsCount > 0 ? `
      <div class="mb-4">
        <h2 class="text-base font-semibold text-gold mb-2"><i class="fa-solid fa-hand-holding-dollar mr-1.5"></i>รอชำระยอดคงเหลือ (${data.pendingDepositsCount})</h2>
        <div class="bg-navy-light rounded-2xl p-3 border border-gold/10 space-y-2">
          ${data.pendingDeposits.slice(0, 3).map(b => `
            <div class="flex items-center justify-between text-base">
              <span class="text-gray-300">${b.customerName}</span>
              <span class="text-red-400 font-medium">${Utils.formatMoney(b.remaining)}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Quick Actions -->
      <div class="grid grid-cols-4 gap-2 mb-4">
        ${quickAction('fa-calendar-plus', 'จองงาน', "window.openBookingForm()")}
        ${quickAction('fa-user-plus', 'ลูกค้าใหม่', "window.__app.setView('customers')")}
        ${quickAction('fa-boxes-stacked', 'อุปกรณ์', "window.__app.setView('equipment')")}
        ${quickAction('fa-chart-line', 'สถิติ', "window.__app.setView('analytics')")}
      </div>

      <!-- Recent Activity -->
      <div>
        <h2 class="text-base font-semibold text-gold mb-2"><i class="fa-solid fa-clock-rotate-left mr-1.5"></i>กิจกรรมล่าสุด</h2>
        <div class="space-y-2">
          ${data.recentActivities.slice(0, 5).map(a => `
            <div class="flex items-center gap-3 bg-navy-light/50 rounded-xl p-2.5">
              <div class="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-gold text-base">
                <i class="fa-solid ${Utils.jobTypeIcon(a.jobType)}"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base text-gray-200 truncate">${a.customerName} — ${Utils.jobTypeLabel(a.jobType)}</p>
                <p class="text-base text-gray-500">${Utils.formatDateShort(a.date)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    Utils.fadeIn(container);
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function jobCard(b) {
  return `
    <div class="bg-navy-light rounded-2xl p-3 mb-2 border border-gold/10 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
         onclick="window.openBookingForm('${b.id}')">
      <div class="relative w-11 h-11 rounded-xl bg-navy flex flex-col items-center justify-center text-gold flex-shrink-0">
        <i class="fa-solid ${Utils.jobTypeIcon(b.jobType)} text-base"></i>
        ${b.status === 'pending' ? '<span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-navy-light pulse-dot"></span>' : ''}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-base font-medium text-gray-100 truncate">${b.customerName}</p>
        <p class="text-base text-gray-400">${Utils.jobTypeLabel(b.jobType)} · ${b.venue || 'ไม่ระบุสถานที่'}</p>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-base text-gold font-medium">${Utils.formatDateShort(b.date)}</p>
        <p class="text-base text-gray-500">${b.startTime || ''}</p>
      </div>
    </div>
  `;
}

function quickAction(icon, label, onclick) {
  return `
    <button onclick="${onclick}" class="flex flex-col items-center gap-1.5 bg-navy-light rounded-2xl py-3 border border-gold/10 active:scale-95 transition-transform">
      <i class="fa-solid ${icon} text-gold"></i>
      <span class="text-base text-gray-300">${label}</span>
    </button>
  `;
}

function emptyState(text, icon = 'fa-inbox') {
  return `
    <div class="flex flex-col items-center justify-center py-8 text-gray-500">
      <i class="fa-solid ${icon} text-2xl mb-2 opacity-50"></i>
      <p class="text-base">${text}</p>
    </div>
  `;
}

function errorState(err) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-gray-500">
      <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 text-red-400"></i>
      <p class="text-base text-center">โหลดข้อมูลไม่สำเร็จ<br>${err.message || err}</p>
    </div>
  `;
}
