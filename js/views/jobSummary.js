/**
 * BAWMUSIC — Job Summary (Module 5)
 * แสดงสรุปงานแบบหน้าเดียว พร้อม export PNG
 */

async function openJobSummary(bookingId) {
  Utils.loading('กำลังสร้างสรุปงาน...');
  try {
    const b = await BawmusicAPI.getBooking(bookingId);
    const settings = await BawmusicAPI.getSettings();
    Utils.closeLoading();
    paintJobSummary(b, settings);
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'สร้างสรุปงานไม่สำเร็จ');
  }
}

function paintJobSummary(b, settings) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
  <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
    <div class="w-full max-w-md">
      <div class="flex justify-end gap-2 mb-2">
        <button onclick="exportJobSummaryPNG()" class="bg-gold text-navy-dark text-sm font-semibold px-3 py-2 rounded-lg"><i class="fa-solid fa-image mr-1"></i>บันทึกรูป</button>
        <button onclick="window.print()" class="bg-navy-light text-gray-200 text-sm font-semibold px-3 py-2 rounded-lg"><i class="fa-solid fa-print mr-1"></i>พิมพ์</button>
        <button onclick="closeBookingForm()" class="bg-navy-light text-gray-400 text-sm px-3 py-2 rounded-lg"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="job-summary-card" class="bg-gradient-to-b from-navy to-navy-dark rounded-2xl p-6 border-2 border-gold">
        <div class="text-center mb-4 pb-4 border-b border-gold/30">
          <p class="text-gold text-lg font-bold">${settings.bandName || 'Bawmusic'}</p>
          <p class="text-gray-400 text-sm">ใบสรุปการจองงาน</p>
        </div>

        <div class="space-y-2.5 text-sm">
          ${summaryRow('fa-user', 'ลูกค้า', b.customerName)}
          ${summaryRow('fa-phone', 'โทร', b.phone)}
          ${summaryRow('fa-calendar', 'วันที่', Utils.formatDate(b.date))}
          ${summaryRow('fa-clock', 'เวลา', `${b.startTime || '-'} - ${b.endTime || '-'}`)}
          ${summaryRow('fa-location-dot', 'สถานที่', b.venue)}
          ${b.mapLink ? summaryRow('fa-map', 'แผนที่', b.mapLink) : ''}
          ${summaryRow('fa-tag', 'ประเภทงาน', Utils.jobTypeLabel(b.jobType))}
        </div>

        ${b.equipment && b.equipment.length ? `
        <div class="mt-4 pt-4 border-t border-gold/20">
          <p class="text-gold text-sm font-semibold mb-2">อุปกรณ์ที่ใช้</p>
          <div class="flex flex-wrap gap-1.5">
            ${b.equipment.map(e => `<span class="bg-navy-light text-gray-300 text-sm px-2 py-1 rounded-full">${e.name} ${e.qty > 1 ? '×' + e.qty : ''}</span>`).join('')}
          </div>
        </div>` : ''}

        <div class="mt-4 pt-4 border-t border-gold/20 space-y-1.5">
          <div class="flex justify-between text-sm"><span class="text-gray-400">ราคารวม</span><span class="text-gray-200">${Utils.formatMoney(b.price)}</span></div>
          <div class="flex justify-between text-sm"><span class="text-gray-400">มัดจำแล้ว</span><span class="text-green-400">${Utils.formatMoney(b.deposit)}</span></div>
          <div class="flex justify-between text-sm font-semibold"><span class="text-gray-200">ยอดคงเหลือ</span><span class="text-gold">${Utils.formatMoney(b.remaining)}</span></div>
        </div>

        ${b.remarks ? `<div class="mt-4 pt-4 border-t border-gold/20"><p class="text-gray-400 text-sm">${b.remarks}</p></div>` : ''}

        <div class="mt-4 pt-4 border-t border-gold/30 text-center">
          <p class="text-sm text-gray-500">${settings.phone || ''} ${settings.line ? '· LINE: ' + settings.line : ''}</p>
        </div>
      </div>
    </div>
  </div>
  `;
}

function summaryRow(icon, label, value) {
  return `
    <div class="flex items-start gap-2">
      <i class="fa-solid ${icon} text-gold w-4 mt-0.5 text-sm"></i>
      <span class="text-gray-500 text-sm w-16 flex-shrink-0">${label}</span>
      <span class="text-gray-200 text-sm flex-1">${value || '-'}</span>
    </div>
  `;
}

async function exportJobSummaryPNG() {
  const card = document.getElementById('job-summary-card');
  Utils.loading('กำลังสร้างรูปภาพ...');
  try {
    const canvas = await html2canvas(card, { backgroundColor: '#0f0f1e', scale: 2 });
    const link = document.createElement('a');
    link.download = `bawmusic-summary-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    Utils.closeLoading();
    Utils.toast('success', 'บันทึกรูปสำเร็จ');
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'บันทึกรูปไม่สำเร็จ');
  }
}
