/**
 * BAWMUSIC — Analytics View
 */

let __analyticsCharts = {};

async function renderAnalytics() {
  const container = document.getElementById('view-analytics');
  container.innerHTML = `<div class="space-y-3 animate-pulse"><div class="h-40 bg-navy-light rounded-2xl"></div></div>`;

  const year = new Date().getFullYear();

  try {
    const data = await BawmusicAPI.getAnalytics({ year });

    container.innerHTML = `
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gradient-to-br from-gold to-gold-dark rounded-2xl p-4 text-navy-dark">
          <p class="text-sm font-medium opacity-80">รายได้ปี ${year + 543}</p>
          <p class="text-lg font-bold mt-1">${Utils.formatMoney(data.yearlyRevenue)}</p>
        </div>
        <div class="bg-navy-light rounded-2xl p-4 border border-gold/10">
          <p class="text-sm font-medium text-gray-400">งานทั้งปี</p>
          <p class="text-lg font-bold mt-1 text-gold">${data.yearlyJobs} งาน</p>
        </div>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <p class="text-sm font-medium text-gray-300 mb-1">รายได้เฉลี่ยต่องาน</p>
        <p class="text-xl font-bold text-gold">${Utils.formatMoney(data.avgIncomePerJob)}</p>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3">รายได้รายเดือน</h3>
        <canvas id="chart-revenue" height="180"></canvas>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3">ประเภทงานยอดนิยม</h3>
        <canvas id="chart-jobtypes" height="180"></canvas>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-crown mr-1.5"></i>ลูกค้าทำรายได้สูงสุด</h3>
        <div class="space-y-2">
          ${data.topCustomers.slice(0, 5).map((c, i) => `
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-300"><span class="text-gold font-medium mr-1">#${i + 1}</span>${c.name}</span>
              <span class="text-gold font-medium">${Utils.formatMoney(c.revenue)}</span>
            </div>
          `).join('') || '<p class="text-sm text-gray-500">ยังไม่มีข้อมูล</p>'}
        </div>
      </div>
    `;

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    if (__analyticsCharts.revenue) __analyticsCharts.revenue.destroy();
    __analyticsCharts.revenue = new Chart(document.getElementById('chart-revenue'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ data: data.monthlyRevenue, backgroundColor: '#d4af37', borderRadius: 4 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    if (__analyticsCharts.jobtypes) __analyticsCharts.jobtypes.destroy();
    const jtLabels = Object.keys(data.jobTypeCounts).map(Utils.jobTypeLabel);
    const jtValues = Object.values(data.jobTypeCounts);
    __analyticsCharts.jobtypes = new Chart(document.getElementById('chart-jobtypes'), {
      type: 'doughnut',
      data: {
        labels: jtLabels,
        datasets: [{ data: jtValues, backgroundColor: ['#d4af37', '#e8c766', '#a8862a', '#6b5b1f', '#3a3a55', '#25253f'] }]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: '#d1d5db', font: { size: 10 }, padding: 10 } } }
      }
    });

  } catch (err) {
    container.innerHTML = errorState(err);
  }
}
