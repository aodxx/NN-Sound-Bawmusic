/**
 * BAWMUSIC — Settings View
 */

async function renderSettings() {
  const container = document.getElementById('view-settings');
  container.innerHTML = `<div class="space-y-3 animate-pulse"><div class="h-40 bg-navy-light rounded-2xl"></div></div>`;

  try {
    const settings = await BawmusicAPI.getSettings();

    container.innerHTML = `
      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-music mr-1.5"></i>ข้อมูลวงดนตรี</h3>
        <div class="space-y-3">
          ${settingField('bandName', 'ชื่อวง', settings.bandName)}
          ${settingField('phone', 'เบอร์โทร', settings.phone)}
          ${settingField('line', 'LINE ID', settings.line)}
          ${settingField('facebook', 'Facebook', settings.facebook)}
        </div>
        <button onclick="window.__saveSettings()" class="w-full mt-4 bg-gold text-navy-dark text-sm font-semibold rounded-xl py-2.5">
          บันทึกการตั้งค่า
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-mobile-screen-button mr-1.5"></i>ติดตั้งเป็นแอป</h3>
        <p class="text-xs text-gray-400 mb-3">ติดตั้ง Bawmusic ลงหน้าจอหลักมือถือ ใช้งานได้เหมือนแอปจริงและออฟไลน์ได้บางส่วน</p>
        <button onclick="window.__app.installApp()" class="w-full bg-gold text-navy-dark text-sm font-semibold rounded-xl py-2.5">
          <i class="fa-solid fa-arrow-down-to-bracket mr-1.5"></i>ติดตั้งแอปตอนนี้
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-circle-half-stroke mr-1.5"></i>ธีมหน้าจอ</h3>
        <p class="text-xs text-gray-400 mb-3">สลับอัตโนมัติ: โหมดสว่าง 06:00–18:00 น. / โหมดมืดช่วงกลางคืน</p>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="window.__app.resetThemeToAuto()" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-clock"></i><span class="text-xs">อัตโนมัติ</span>
          </button>
          <button onclick="window.__setManualTheme('light')" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-sun"></i><span class="text-xs">สว่าง</span>
          </button>
          <button onclick="window.__setManualTheme('dark')" class="flex flex-col items-center gap-1 py-3 rounded-xl bg-navy border border-gold/10 text-gray-300">
            <i class="fa-solid fa-moon"></i><span class="text-xs">มืด</span>
          </button>
        </div>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-file-invoice mr-1.5"></i>เทมเพลตงาน</h3>
        <div id="templates-list" class="space-y-2">กำลังโหลด...</div>
        <button onclick="window.__openTemplateForm()" class="w-full mt-3 bg-gold/10 border border-gold/30 text-gold text-sm font-medium rounded-xl py-2">
          <i class="fa-solid fa-plus mr-1"></i>เพิ่มเทมเพลต
        </button>
      </div>

      <div class="bg-navy-light rounded-2xl p-4 border border-gold/10 mb-4">
        <h3 class="text-sm font-semibold text-gold mb-3"><i class="fa-solid fa-circle-info mr-1.5"></i>เกี่ยวกับ</h3>
        <p class="text-sm text-gray-400">Bawmusic v1.0 — Band Booking Operating System</p>
        <p class="text-sm text-gray-500 mt-1">Powered by Google Sheets + Apps Script</p>
      </div>
    `;

    loadTemplatesIntoSettings();
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function settingField(key, label, value) {
  return `
    <div>
      <label class="text-sm text-gray-500 block mb-1">${label}</label>
      <input id="setting-${key}" type="text" value="${value || ''}"
        class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gold/40">
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

async function loadTemplatesIntoSettings() {
  try {
    const templates = await BawmusicAPI.listTemplates();
    const el = document.getElementById('templates-list');
    if (!el) return;
    el.innerHTML = templates.length === 0 ? '<p class="text-sm text-gray-500">ยังไม่มีเทมเพลต</p>' :
      templates.map(t => `
        <div class="flex items-center justify-between bg-navy rounded-lg px-3 py-2">
          <span class="text-sm text-gray-200">${t.name}</span>
          <span class="text-sm text-gray-500">${Utils.jobTypeLabel(t.jobType)}</span>
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
    confirmButtonColor: '#d4af37',
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
