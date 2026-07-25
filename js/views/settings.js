/**
 * BAWMUSIC — Settings View
 */

async function renderSettings() {
  const container = document.getElementById('view-settings');
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    const settings = await BawmusicAPI.getSettings();

    container.innerHTML = `
      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-music mr-1.5"></i>ข้อมูลวงดนตรี</h3>
        <div class="space-y-3">
          ${settingField('bandName', 'ชื่อวง', settings.bandName)}
          ${settingField('bannerImage', 'URL รูปแบนเนอร์หัวแอป', settings.bannerImage)}
          ${settings.bannerImage ? `<img src="${settings.bannerImage}" class="w-full h-24 object-cover rounded-xl border border-gold/10 shadow-sm shadow-black/5" onerror="this.style.display='none'">` : ''}
          ${settingField('phone', 'เบอร์โทร', settings.phone)}
          ${settingField('line', 'LINE ID', settings.line)}
          ${settingField('facebook', 'Facebook', settings.facebook)}
        </div>
        <button onclick="window.__saveSettings()" class="w-full mt-4 bg-gold text-navy-dark text-base font-semibold rounded-xl py-3">
          บันทึกการตั้งค่า
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-2"><i class="fa-solid fa-shield-halved mr-1.5"></i>ป้องกันข้อมูลสูญหาย</h3>
        <p class="text-sm text-gray-400 mb-3">สำรอง Google Sheets ทั้งระบบไปยังโฟลเดอร์ Bawmusic Backups และส่งออกไฟล์ Excel ได้</p>
        <div id="backup-status" class="rounded-xl bg-navy p-3 text-sm text-gray-300 mb-3"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>กำลังตรวจสอบสถานะ...</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onclick="window.__installWeeklyBackup()" class="rounded-xl border border-gold/30 bg-gold/10 px-3 py-3 text-sm font-medium text-gold"><i class="fa-solid fa-calendar-check mr-1"></i>ติดตั้งสำรองรายสัปดาห์</button>
          <button onclick="window.__createBackupNow()" class="rounded-xl border border-gold/30 bg-gold/10 px-3 py-3 text-sm font-medium text-gold"><i class="fa-solid fa-copy mr-1"></i>สำรองตอนนี้</button>
          <button onclick="window.__exportFullBackup()" class="rounded-xl bg-gold px-3 py-3 text-sm font-semibold text-navy-dark"><i class="fa-solid fa-file-excel mr-1"></i>ดาวน์โหลดข้อมูลทั้งระบบ</button>
          <button onclick="window.__confirmVersionHistory()" class="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-3 text-sm font-medium text-emerald-300"><i class="fa-solid fa-clock-rotate-left mr-1"></i>ยืนยัน Version History</button>
        </div>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-mobile-screen-button mr-1.5"></i>ติดตั้งเป็นแอป</h3>
        <p class="text-base text-gray-400 mb-3">ติดตั้ง Bawmusic ลงหน้าจอหลักมือถือ ใช้งานได้เหมือนแอปจริงและออฟไลน์ได้บางส่วน</p>
        <button onclick="window.__app.installApp()" class="w-full bg-gold text-navy-dark text-base font-semibold rounded-xl py-3">
          <i class="fa-solid fa-arrow-down-to-bracket mr-1.5"></i>ติดตั้งแอปตอนนี้
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-circle-half-stroke mr-1.5"></i>ธีมหน้าจอ</h3>
        <p class="text-base text-gray-400 mb-3">สลับอัตโนมัติ: โหมดสว่าง 06:00–18:00 น. / โหมดมืดช่วงกลางคืน</p>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="window.__app.resetThemeToAuto()" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-clock"></i><span class="text-base font-medium">อัตโนมัติ</span>
          </button>
          <button onclick="window.__setManualTheme('light')" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-sun"></i><span class="text-base font-medium">สว่าง</span>
          </button>
          <button onclick="window.__setManualTheme('dark')" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-moon"></i><span class="text-base font-medium">มืด</span>
          </button>
        </div>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-file-invoice mr-1.5"></i>เทมเพลตงาน</h3>
        <div id="templates-list" class="space-y-2">กำลังโหลด...</div>
        <button onclick="window.__openTemplateForm()" class="w-full mt-3 bg-gold/10 border border-gold/30 text-gold text-base font-medium rounded-xl py-3">
          <i class="fa-solid fa-plus mr-1"></i>เพิ่มเทมเพลต
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-circle-info mr-1.5"></i>เกี่ยวกับ</h3>
        <p class="text-base text-gray-400">Bawmusic v1.0 — Band Booking Operating System</p>
        <p class="text-base text-gray-500 mt-1">Powered by Google Sheets + Apps Script</p>
      </div>
    `;
    Utils.fadeIn(container);

    loadTemplatesIntoSettings();
    loadBackupStatus();
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function settingField(key, label, value) {
  return `
    <div>
      <label class="text-base text-gray-500 block mb-1">${label}</label>
      <input id="setting-${key}" type="text" value="${value || ''}"
        class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-3 text-base text-gray-100 focus:outline-none focus:border-gold/40">
    </div>
  `;
}

window.__setManualTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bawmusic_theme_override', theme);
  window.__app.darkMode = theme === 'dark';
  window.__app.updateThemeColorMeta(theme);
  Utils.toast('success', theme === 'dark' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง');
};

window.__saveSettings = async () => {
  const data = {
    bandName: document.getElementById('setting-bandName').value,
    bannerImage: document.getElementById('setting-bannerImage').value,
    phone: document.getElementById('setting-phone').value,
    line: document.getElementById('setting-line').value,
    facebook: document.getElementById('setting-facebook').value
  };
  Utils.loading('กำลังบันทึก...');
  try {
    await BawmusicAPI.updateSettings(data);
    window.__app.settings = { ...window.__app.settings, ...data };
    Utils.closeLoading();
    Utils.toast('success', 'บันทึกสำเร็จ');
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด');
  }
};


function formatBackupDate_(value) {
  if (!value) return 'ยังไม่มี';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('th-TH');
}

async function loadBackupStatus() {
  const el = document.getElementById('backup-status');
  if (!el) return;
  try {
    const status = await BawmusicAPI.getBackupStatus();
    const triggerText = status.weeklyTriggerInstalled
      ? `<span class="text-emerald-300"><i class="fa-solid fa-circle-check mr-1"></i>ติดตั้งแล้ว</span><span class="text-gray-500"> — ${status.schedule}</span>`
      : '<span class="text-amber-300"><i class="fa-solid fa-triangle-exclamation mr-1"></i>ยังไม่ได้ติดตั้ง</span>';
    const historyText = status.versionHistoryCheckedAt
      ? `<span class="text-emerald-300">ตรวจแล้ว ${formatBackupDate_(status.versionHistoryCheckedAt)}</span>`
      : '<span class="text-amber-300">รอยืนยันการตรวจด้วยตนเอง</span>';
    el.innerHTML = `<div class="space-y-2">
      <div><span class="text-gray-500">สำรองรายสัปดาห์:</span> ${triggerText}</div>
      <div><span class="text-gray-500">สำรองล่าสุด:</span> ${formatBackupDate_(status.lastBackupAt)}</div>
      <div><span class="text-gray-500">Version History:</span> ${historyText}</div>
      <a href="${status.folderUrl}" target="_blank" rel="noopener" class="inline-flex items-center text-gold"><i class="fa-brands fa-google-drive mr-1"></i>เปิดโฟลเดอร์สำรอง</a>
    </div>`;
  } catch (err) {
    el.innerHTML = `<span class="text-rose-300">ตรวจสถานะไม่สำเร็จ: ${err.message || err}</span>`;
  }
}

window.__installWeeklyBackup = async () => {
  Utils.loading('กำลังติดตั้ง Trigger...');
  try {
    await BawmusicAPI.installWeeklyBackupTrigger();
    Utils.closeLoading(); Utils.toast('success', 'ติดตั้งการสำรองทุกสัปดาห์แล้ว');
    await loadBackupStatus();
  } catch (err) { Utils.closeLoading(); Utils.toast('error', err.message || 'ติดตั้ง Trigger ไม่สำเร็จ'); }
};

window.__createBackupNow = async () => {
  Utils.loading('กำลังสำรอง Google Sheets...');
  try {
    const backup = await BawmusicAPI.createBackupNow();
    Utils.closeLoading();
    const result = await Swal.fire({
      icon: 'success', title: 'สำรองข้อมูลสำเร็จ', text: backup.fileName,
      showCancelButton: true, confirmButtonText: 'เปิดไฟล์สำรอง', cancelButtonText: 'ปิด',
      background: Utils.swalBg(), color: Utils.swalColor()
    });
    if (result.isConfirmed && backup.fileUrl) window.open(backup.fileUrl, '_blank', 'noopener');
    await loadBackupStatus();
  } catch (err) { Utils.closeLoading(); Utils.toast('error', err.message || 'สำรองข้อมูลไม่สำเร็จ'); }
};

window.__exportFullBackup = async () => {
  Utils.loading('กำลังสร้างไฟล์ Excel ทั้งระบบ...');
  try {
    const exported = await BawmusicAPI.exportFullBackup();
    const binary = atob(exported.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: exported.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = exported.fileName;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    Utils.closeLoading(); Utils.toast('success', 'ดาวน์โหลดข้อมูลทั้งระบบแล้ว');
    await loadBackupStatus();
  } catch (err) { Utils.closeLoading(); Utils.toast('error', err.message || 'ส่งออกข้อมูลไม่สำเร็จ'); }
};

window.__confirmVersionHistory = async () => {
  const result = await Swal.fire({
    icon: 'question', title: 'ตรวจ Version History แล้วหรือยัง?',
    html: 'เปิด Google Sheets → <b>ไฟล์ → ประวัติเวอร์ชัน → ดูประวัติเวอร์ชัน</b><br>และยืนยันว่ามองเห็นเวอร์ชันย้อนหลัง ก่อนกดปุ่มยืนยัน',
    showCancelButton: true, confirmButtonText: 'ตรวจแล้ว ยืนยัน', cancelButtonText: 'ยังไม่ได้ตรวจ',
    confirmButtonColor: '#10b981', background: Utils.swalBg(), color: Utils.swalColor()
  });
  if (!result.isConfirmed) return;
  Utils.loading('กำลังบันทึกผลตรวจ...');
  try {
    await BawmusicAPI.confirmVersionHistoryCheck();
    Utils.closeLoading(); Utils.toast('success', 'บันทึกการตรวจ Version History แล้ว');
    await loadBackupStatus();
  } catch (err) { Utils.closeLoading(); Utils.toast('error', err.message || 'บันทึกผลตรวจไม่สำเร็จ'); }
};

async function loadTemplatesIntoSettings() {
  try {
    const templates = await BawmusicAPI.listTemplates();
    const el = document.getElementById('templates-list');
    if (!el) return;
    el.innerHTML = templates.length === 0 ? '<p class="text-base text-gray-500">ยังไม่มีเทมเพลต</p>' :
      templates.map(t => `
        <div class="flex items-center justify-between bg-navy rounded-lg px-3 py-3">
          <span class="text-base text-gray-200">${t.name}</span>
          <span class="text-base text-gray-500">${Utils.jobTypeLabel(t.jobType)}</span>
        </div>
      `).join('');
  } catch (e) { /* silent */ }
}

window.__openTemplateForm = async () => {
  const equipmentList = __equipmentCache && __equipmentCache.length ? __equipmentCache : await BawmusicAPI.listEquipment();
  const checkboxes = equipmentList.map(e =>
    `<label style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:13px;">
      <input type="checkbox" value="${e.name}" class="tpl-eq-check"> ${e.name}
    </label>`
  ).join('');

  const { value: formValues } = await Swal.fire({
    title: 'เพิ่มเทมเพลตงาน',
    background: Utils.swalBg(), color: Utils.swalColor(),
    html: `
      <input id="sw-name" class="swal2-input" placeholder="ชื่อเทมเพลต">
      <select id="sw-jobtype" class="swal2-select" style="display:flex;">
        <option value="Wedding">งานแต่งงาน</option>
        <option value="Ordination">งานบวช</option>
        <option value="Funeral">งานศพ</option>
        <option value="Corporate">งานองค์กร</option>
        <option value="Birthday">งานวันเกิด</option>
        <option value="Concert">คอนเสิร์ต</option>
        <option value="Custom">อื่นๆ</option>
      </select>
      <div style="text-align:left;max-height:150px;overflow-y:auto;margin-top:10px;">${checkboxes}</div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    confirmButtonColor: '#22d3ee',
    preConfirm: () => {
      const checked = Array.from(document.querySelectorAll('.tpl-eq-check:checked')).map(c => c.value);
      return {
        name: document.getElementById('sw-name').value,
        jobType: document.getElementById('sw-jobtype').value,
        equipmentPreset: checked
      };
    }
  });

  if (!formValues || !formValues.name) return;
  Utils.loading('กำลังบันทึก...');
  try {
    await BawmusicAPI.createTemplate(formValues);
    Utils.closeLoading();
    Utils.toast('success', 'บันทึกสำเร็จ');
    loadTemplatesIntoSettings();
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด');
  }
};
