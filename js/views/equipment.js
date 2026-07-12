/**
 * BAWMUSIC — Equipment Center View
 */

let __equipmentCache = [];

const EQUIPMENT_CATEGORIES = ['Sound Systems', 'Lighting', 'Stage', 'Accessories', 'Support Equipment'];
const CATEGORY_LABELS = {
  'Sound Systems': 'ระบบเสียง', 'Lighting': 'ไฟ/แสง', 'Stage': 'เวที',
  'Accessories': 'อุปกรณ์เสริม', 'Support Equipment': 'อุปกรณ์สนับสนุน'
};
const CATEGORY_ICONS = {
  'Sound Systems': 'fa-volume-high', 'Lighting': 'fa-lightbulb', 'Stage': 'fa-drum',
  'Accessories': 'fa-table', 'Support Equipment': 'fa-plug'
};

async function renderEquipment() {
  const container = document.getElementById('view-equipment');
  if (!container) { console.error('view-equipment container not found in DOM'); return; }
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    const result = await BawmusicAPI.listEquipment();
    __equipmentCache = Array.isArray(result) ? result : [];
    paintEquipment();
  } catch (err) {
    console.error('renderEquipment failed:', err);
    container.innerHTML = errorState(err);
  }
}

function paintEquipment() {
  const container = document.getElementById('view-equipment');
  if (!container) return;
  try {
    container.innerHTML = `
      <button onclick="window.__openEquipmentForm()" class="w-full mb-3 bg-gold/10 border border-gold/30 text-gold text-base font-medium rounded-xl py-3">
        <i class="fa-solid fa-plus mr-1.5"></i>เพิ่มอุปกรณ์ใหม่
      </button>
      ${EQUIPMENT_CATEGORIES.map(cat => {
        const items = __equipmentCache.filter(e => e && e.category === cat);
        if (items.length === 0) return '';
        return `
          <div class="mb-4">
            <h3 class="text-base font-semibold text-gold mb-2"><i class="fa-solid ${CATEGORY_ICONS[cat] || 'fa-box'} mr-1.5"></i>${CATEGORY_LABELS[cat] || cat}</h3>
            <div class="space-y-2">
              ${items.map(equipmentRow).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${(() => {
        const knownCats = new Set(EQUIPMENT_CATEGORIES);
        const uncategorized = __equipmentCache.filter(e => e && !knownCats.has(e.category));
        if (uncategorized.length === 0) return '';
        return `
          <div class="mb-4">
            <h3 class="text-base font-semibold text-gold mb-2"><i class="fa-solid fa-box mr-1.5"></i>อื่นๆ</h3>
            <div class="space-y-2">${uncategorized.map(equipmentRow).join('')}</div>
          </div>
        `;
      })()}
      ${__equipmentCache.length === 0 ? emptyState('ยังไม่มีอุปกรณ์ในระบบ', 'fa-boxes-stacked') : ''}
    `;
    Utils.fadeIn(container);
  } catch (err) {
    console.error('paintEquipment failed:', err);
    container.innerHTML = errorState(err);
  }
}

function equipmentRow(e) {
  const qty = Number(e.availableQty) || 0;
  const lowStock = qty <= 1;
  return `
    <div class="bg-navy-light rounded-xl p-4 border border-gold/10 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer" onclick="window.__openEquipmentForm('${e.id}')">
      <div>
        <p class="text-base text-gray-100 font-semibold">${e.name}</p>
        ${e.remarks ? `<p class="text-sm text-gray-500 mt-0.5">${e.remarks}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-lg font-bold ${lowStock ? 'text-red-400' : 'text-gold'}">${qty} ${e.unit || ''}</p>
        <p class="text-sm text-gray-500">พร้อมใช้งาน</p>
      </div>
    </div>
  `;
}

window.__openEquipmentForm = async (id) => {
  let existing = null;
  if (id) existing = __equipmentCache.find(e => e.id === id);

  const categoryOptions = EQUIPMENT_CATEGORIES.map(c =>
    `<option value="${c}" ${existing?.category === c ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`
  ).join('');

  const { value: formValues } = await Swal.fire({
    title: existing ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่',
    background: Utils.swalBg(), color: Utils.swalColor(),
    html: `
      <input id="sw-name" class="swal2-input" placeholder="ชื่ออุปกรณ์" value="${existing?.name || ''}">
      <select id="sw-category" class="swal2-select" style="display:flex;">${categoryOptions}</select>
      <input id="sw-qty" type="number" class="swal2-input" placeholder="จำนวนที่มี" value="${existing?.availableQty ?? ''}">
      <input id="sw-unit" class="swal2-input" placeholder="หน่วย (ชิ้น/ชุด/ตัว)" value="${existing?.unit || 'ชิ้น'}">
      <input id="sw-remarks" class="swal2-input" placeholder="หมายเหตุ" value="${existing?.remarks || ''}">
    `,
    focusConfirm: false,
    showCancelButton: true,
    showDenyButton: !!existing,
    denyButtonText: 'ลบ',
    denyButtonColor: '#dc2626',
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#22d3ee',
    preConfirm: () => ({
      name: document.getElementById('sw-name').value,
      category: document.getElementById('sw-category').value,
      availableQty: Number(document.getElementById('sw-qty').value) || 0,
      unit: document.getElementById('sw-unit').value,
      remarks: document.getElementById('sw-remarks').value
    })
  }).then(async (result) => {
    if (result.isDenied && existing) {
      const ok = await Utils.confirm('ลบอุปกรณ์นี้?', existing.name, 'ลบ');
      if (ok) {
        Utils.loading('กำลังลบ...');
        await BawmusicAPI.deleteEquipment(existing.id);
        Utils.closeLoading();
        Utils.toast('success', 'ลบสำเร็จ');
        renderEquipment();
      }
      return {};
    }
    return result;
  });

  if (!formValues || !formValues.name) return;

  Utils.loading('กำลังบันทึก...');
  try {
    if (existing) await BawmusicAPI.updateEquipment(existing.id, formValues);
    else await BawmusicAPI.createEquipment(formValues);
    Utils.closeLoading();
    Utils.toast('success', 'บันทึกสำเร็จ');
    renderEquipment();
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด');
  }
};
