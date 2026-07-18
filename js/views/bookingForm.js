/**
 * BAWMUSIC — Booking Form (Module 2: Core)
 * Full-screen modal for creating/editing bookings with equipment checklist
 */

const JOB_TYPES = [
  { value: 'Wedding', label: 'งานแต่งงาน', icon: 'fa-rings-wedding' },
  { value: 'Ordination', label: 'งานบวช', icon: 'fa-om' },
  { value: 'Funeral', label: 'งานศพ', icon: 'fa-fire-flame-simple' },
  { value: 'Corporate', label: 'งานองค์กร', icon: 'fa-briefcase' },
  { value: 'Birthday', label: 'งานวันเกิด', icon: 'fa-cake-candles' },
  { value: 'Concert', label: 'คอนเสิร์ต', icon: 'fa-guitar' },
  { value: 'Custom', label: 'อื่นๆ', icon: 'fa-star' }
];

let __bookingFormState = null;
let __bookingFormTemplates = [];
let __bookingFormCustomers = [];

async function openBookingForm(id, prefillDate) {
  Utils.loading('กำลังเตรียมฟอร์ม...');

  try {
    const [equipment, templates, customers, existing] = await Promise.all([
      __equipmentCache.length ? Promise.resolve(__equipmentCache) : BawmusicAPI.listEquipment(),
      BawmusicAPI.listTemplates(),
      BawmusicAPI.listCustomers(),
      id ? BawmusicAPI.getBooking(id) : Promise.resolve(null)
    ]);
    __equipmentCache = equipment;
    __bookingFormTemplates = templates || [];
    __bookingFormCustomers = customers || [];

    __bookingFormState = {
      id: existing?.id || null,
      customerId: existing?.customerId || '',
      customerName: existing?.customerName || '',
      phone: existing?.phone || '',
      line: existing?.line || '',
      venue: existing?.venue || '',
      mapLink: existing?.mapLink || '',
      province: existing?.province || '',
      date: existing?.date && Utils.parseDate(existing.date) ? (() => { const d = Utils.parseDate(existing.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : (prefillDate || ''),
      startTime: existing?.startTime || '',
      endTime: existing?.endTime || '',
      jobType: existing?.jobType || 'Wedding',
      package: existing?.package || '',
      price: existing?.price || '',
      deposit: existing?.deposit || '',
      remarks: existing?.remarks || '',
      status: existing?.status || 'confirmed',
      equipment: existing?.equipment || [] // [{name, qty}]
    };

    Utils.closeLoading();
    paintBookingForm(equipment, templates);
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'โหลดฟอร์มไม่สำเร็จ: ' + err.message);
  }
}

function paintBookingForm(equipment, templates) {
  const root = document.getElementById('modal-root');
  const s = __bookingFormState;

  const categorized = {};
  equipment.forEach(e => {
    categorized[e.category] = categorized[e.category] || [];
    categorized[e.category].push(e);
  });

  root.innerHTML = `
  <div class="fixed inset-0 z-50 bg-navy-dark overflow-y-auto" id="booking-modal">
    <div class="sticky top-0 bg-navy-dark/95 backdrop-blur border-b border-gold/20 px-4 py-3 flex items-center justify-between z-10">
      <button onclick="closeBookingForm()" class="text-gray-400"><i class="fa-solid fa-xmark text-lg"></i></button>
      <h2 class="text-base font-semibold text-gold">${s.id ? 'แก้ไขการจอง' : 'จองงานใหม่'}</h2>
      <button onclick="submitBookingForm()" class="text-gold text-base font-semibold">บันทึก</button>
    </div>

    <div class="px-4 py-4 max-w-2xl mx-auto space-y-4 pb-10">

      <!-- Booking Status -->
      ${s.id ? `
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-gold"><i class="fa-solid fa-clipboard-check mr-1.5"></i>สถานะการจอง</h3>
          ${Utils.statusBadge(s.status)}
        </div>
        <div class="grid grid-cols-2 gap-2" id="status-action-buttons">
          ${statusActionButtons(s.status)}
        </div>
      </section>
      ` : ''}

      <!-- Job Templates -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        ${templates.map((t, i) => `
          <button onclick="applyTemplateByIndex(${i})"
            class="flex-shrink-0 px-3 py-3 bg-navy-light border border-gold/20 rounded-xl text-base text-gray-200">
            <i class="fa-solid fa-wand-magic-sparkles text-gold mr-1"></i>${t.name}
          </button>
        `).join('')}
      </div>

      <!-- Customer Info -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-user mr-1.5"></i>ข้อมูลลูกค้า</h3>
        <div class="space-y-2.5">
          <div>
            <label class="text-base text-gray-500 block mb-1">ชื่อลูกค้า</label>
            <input id="field-customerName" type="text" list="customer-suggestions" value="${s.customerName || ''}"
              oninput="updateField('customerName', this.value); handleCustomerNameInput(this.value);"
              class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-3 text-base text-gray-100 focus:outline-none focus:border-gold/40">
            <datalist id="customer-suggestions">
              ${__bookingFormCustomers.map(c => `<option value="${c.name}">`).join('')}
            </datalist>
            <p id="customer-match-hint" class="text-base mt-1 ${s.customerId ? 'text-green-400' : 'text-gray-500'}">
              ${s.customerId ? '✓ ลูกค้าเดิม — จะอัปเดตข้อมูลอัตโนมัติ' : 'พิมพ์ชื่อ ถ้าเป็นลูกค้าใหม่ระบบจะบันทึกให้อัตโนมัติ'}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            ${formInput('phone', 'เบอร์โทร', s.phone, 'tel')}
            ${formInput('line', 'LINE ID', s.line, 'text')}
          </div>
        </div>
      </section>

      <!-- Venue -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-location-dot mr-1.5"></i>สถานที่จัดงาน</h3>
        <div class="space-y-2.5">
          ${formInput('venue', 'ชื่อสถานที่', s.venue, 'text')}
          ${formInput('mapLink', 'ลิงก์ Google Maps', s.mapLink, 'url')}
          ${selectInput('province', 'จังหวัด', s.province, Utils.provinces.map(p => ({ value: p, label: p })))}
        </div>
      </section>

      <!-- Date & Time -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-regular fa-calendar mr-1.5"></i>วันและเวลา</h3>
        <div class="space-y-2.5">
          ${formInput('date', 'วันที่จัดงาน', s.date, 'date')}
          <div class="grid grid-cols-2 gap-2.5">
            ${formInput('startTime', 'เวลาเริ่ม', s.startTime, 'time')}
            ${formInput('endTime', 'เวลาสิ้นสุด', s.endTime, 'time')}
          </div>
        </div>
        <div id="conflict-warning"></div>
      </section>

      <!-- Job Type -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-tag mr-1.5"></i>ประเภทงาน</h3>
        <div class="grid grid-cols-4 gap-2">
          ${JOB_TYPES.map(jt => `
            <button onclick="setJobType('${jt.value}')" id="jobtype-${jt.value}"
              class="flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${s.jobType === jt.value ? 'bg-gold/20 border-gold text-gold' : 'bg-navy border-gold/10 text-gray-400'}">
              <i class="fa-solid ${jt.icon} text-base"></i>
              <span class="text-base">${jt.label}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- Pricing -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-money-bill-wave mr-1.5"></i>ราคาและมัดจำ</h3>
        <div class="space-y-2.5">
          ${formInput('package', 'แพ็คเกจ', s.package, 'text')}
          <div class="grid grid-cols-2 gap-2.5">
            ${formInput('price', 'ราคาทั้งหมด (บาท)', s.price, 'number')}
            ${formInput('deposit', 'มัดจำ (บาท)', s.deposit, 'number')}
          </div>
          <p class="text-base text-gray-400">ยอดคงเหลือ: <span class="text-gold font-medium" id="remaining-display">${Utils.formatMoney((Number(s.price) || 0) - (Number(s.deposit) || 0))}</span></p>
        </div>
      </section>

      <!-- Equipment -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-boxes-stacked mr-1.5"></i>เลือกอุปกรณ์</h3>
        <div class="space-y-3">
          ${Object.keys(categorized).map(cat => `
            <div>
              <p class="text-base text-gray-500 mb-1.5 uppercase">${CATEGORY_LABELS[cat] || cat}</p>
              <div class="space-y-1.5">
                ${categorized[cat].map(e => equipmentCheckRow(e)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Remarks -->
      <section class="bg-navy-light rounded-2xl p-4 border border-gold/10 shadow-sm shadow-black/5">
        <h3 class="text-base font-semibold text-gold mb-3"><i class="fa-solid fa-note-sticky mr-1.5"></i>หมายเหตุ</h3>
        <textarea id="field-remarks" oninput="updateField('remarks', this.value)"
          class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-3 text-base text-gray-100 focus:outline-none focus:border-gold/40" rows="2">${s.remarks}</textarea>
      </section>

      ${s.id ? `
      <button onclick="openJobSummary('${s.id}')" class="w-full bg-gold/10 border border-gold/30 text-gold text-base font-medium rounded-xl py-3">
        <i class="fa-solid fa-file-invoice mr-1.5"></i>ดูสรุปงาน / แชร์
      </button>
      <button onclick="deleteBookingConfirm('${s.id}')" class="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-base font-medium rounded-xl py-3">
        <i class="fa-solid fa-trash mr-1.5"></i>ลบการจองนี้
      </button>` : ''}
    </div>
  </div>
  `;
}

function formInput(field, label, value, type) {
  return `
    <div>
      <label class="text-base text-gray-500 block mb-1">${label}</label>
      <input id="field-${field}" type="${type}" value="${value || ''}" oninput="updateField('${field}', this.value)"
        class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-3 text-base text-gray-100 focus:outline-none focus:border-gold/40">
    </div>
  `;
}

function selectInput(field, label, value, options) {
  return `
    <div>
      <label class="text-base text-gray-500 block mb-1">${label}</label>
      <select id="field-${field}" onchange="updateField('${field}', this.value)"
        class="w-full bg-navy border border-gold/10 rounded-lg px-3 py-3 text-base text-gray-100 focus:outline-none focus:border-gold/40">
        <option value="">เลือก${label}</option>
        ${options.map(o => `<option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
  `;
}

function equipmentCheckRow(e) {
  const s = __bookingFormState;
  const selected = s.equipment.find(item => item.name === e.name);
  return `
    <div class="flex items-center justify-between bg-navy rounded-lg px-3 py-3.5">
      <label class="flex items-center gap-3 flex-1">
        <input type="checkbox" ${selected ? 'checked' : ''} onchange="toggleEquipment('${e.name}', this.checked)" class="accent-gold w-6 h-6">
        <span class="text-base text-gray-200">${e.name}</span>
      </label>
      ${selected ? `
        <input type="number" min="1" max="${e.availableQty}" value="${selected.qty || 1}"
          onchange="updateEquipmentQty('${e.name}', this.value)"
          class="w-16 bg-navy-light border border-gold/20 rounded-lg px-2 py-2 text-base text-gray-100 text-center font-medium">
      ` : `<span class="text-base text-gray-500">มี ${e.availableQty} ${e.unit}</span>`}
    </div>
  `;
}

function updateField(field, value) {
  __bookingFormState[field] = value;
  if (field === 'price' || field === 'deposit') {
    const remaining = (Number(__bookingFormState.price) || 0) - (Number(__bookingFormState.deposit) || 0);
    const el = document.getElementById('remaining-display');
    if (el) el.textContent = Utils.formatMoney(remaining);
  }
}

function handleCustomerNameInput(name) {
  const hint = document.getElementById('customer-match-hint');
  const match = __bookingFormCustomers.find(c => c.name && c.name.trim() === name.trim());

  if (match) {
    __bookingFormState.customerId = match.id;
    __bookingFormState.phone = match.phone || '';
    __bookingFormState.line = match.line || '';
    const phoneEl = document.getElementById('field-phone');
    const lineEl = document.getElementById('field-line');
    if (phoneEl) phoneEl.value = match.phone || '';
    if (lineEl) lineEl.value = match.line || '';
    if (hint) {
      hint.textContent = '✓ ลูกค้าเดิม — ดึงเบอร์โทร/LINE ให้อัตโนมัติแล้ว';
      hint.className = 'text-base mt-1 text-green-400';
    }
  } else {
    __bookingFormState.customerId = '';
    if (hint) {
      hint.textContent = name.trim() ? 'ลูกค้าใหม่ — ระบบจะบันทึกเข้าหน้าลูกค้าให้อัตโนมัติ' : 'พิมพ์ชื่อ ถ้าเป็นลูกค้าใหม่ระบบจะบันทึกให้อัตโนมัติ';
      hint.className = 'text-base mt-1 text-gray-500';
    }
  }
}

function setJobType(value) {
  __bookingFormState.jobType = value;
  JOB_TYPES.forEach(jt => {
    const btn = document.getElementById('jobtype-' + jt.value);
    if (btn) btn.className = `flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${jt.value === value ? 'bg-gold/20 border-gold text-gold' : 'bg-navy border-gold/10 text-gray-400'}`;
  });
}

// สร้างปุ่ม action ตามสถานะปัจจุบันของการจอง (มาตรฐาน: รอยืนยัน → ยืนยันแล้ว → เสร็จสิ้น, ยกเลิกได้ทุกขั้น)
function statusActionButtons(status) {
  const buttons = [];

  if (status === 'pending') {
    buttons.push(`<button onclick="changeBookingStatus('confirmed')" class="col-span-2 bg-green-500/15 border border-green-500/40 text-green-400 text-base font-semibold rounded-xl py-3">
      <i class="fa-solid fa-check mr-1.5"></i>ยืนยันการจอง (ส่งแจ้งลูกค้าทาง LINE)
    </button>`);
    buttons.push(`<button onclick="changeBookingStatus('cancelled')" class="col-span-2 bg-red-500/10 border border-red-500/30 text-red-400 text-base font-medium rounded-xl py-2.5">
      <i class="fa-solid fa-xmark mr-1.5"></i>ปฏิเสธ/ยกเลิกคำขอนี้
    </button>`);
  } else if (status === 'confirmed') {
    buttons.push(`<button onclick="changeBookingStatus('completed')" class="bg-blue-500/15 border border-blue-500/40 text-blue-400 text-base font-medium rounded-xl py-2.5">
      <i class="fa-solid fa-flag-checkered mr-1.5"></i>งานเสร็จสิ้นแล้ว
    </button>`);
    buttons.push(`<button onclick="changeBookingStatus('cancelled')" class="bg-red-500/10 border border-red-500/30 text-red-400 text-base font-medium rounded-xl py-2.5">
      <i class="fa-solid fa-xmark mr-1.5"></i>ยกเลิกการจอง
    </button>`);
  } else if (status === 'completed') {
    buttons.push(`<button onclick="changeBookingStatus('confirmed')" class="col-span-2 bg-navy border border-gold/20 text-gray-400 text-base font-medium rounded-xl py-2.5">
      <i class="fa-solid fa-rotate-left mr-1.5"></i>เปลี่ยนกลับเป็น "ยืนยันแล้ว"
    </button>`);
  } else if (status === 'cancelled') {
    buttons.push(`<button onclick="changeBookingStatus('pending')" class="col-span-2 bg-navy border border-gold/20 text-gray-400 text-base font-medium rounded-xl py-2.5">
      <i class="fa-solid fa-rotate-left mr-1.5"></i>เปิดคำขอนี้อีกครั้ง (กลับเป็นรอยืนยัน)
    </button>`);
  }

  return buttons.join('');
}

async function changeBookingStatus(newStatus) {
  const s = __bookingFormState;
  const labels = { confirmed: 'ยืนยันแล้ว', pending: 'รอยืนยัน', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' };

  // เตือนถ้าจะยืนยันการจองแต่ยังไม่ได้ใส่ราคา (ข้อความแจ้งลูกค้าจะดูไม่สมบูรณ์)
  if (newStatus === 'confirmed' && (!s.price || Number(s.price) <= 0)) {
    const proceed = await Utils.confirm(
      'ยังไม่ได้ใส่ราคา',
      'คุณยังไม่ได้กรอกราคาในส่วน "ราคาและมัดจำ" ด้านล่าง — ต้องการยืนยันโดยไม่ใส่ราคาเลยหรือไม่?',
      'ยืนยันโดยไม่ใส่ราคา'
    );
    if (!proceed) return;
  }

  const confirmText = newStatus === 'confirmed'
    ? 'ระบบจะส่งข้อความสรุปวันที่/ราคา/ยอดคงเหลือไปให้ลูกค้าทาง LINE โดยอัตโนมัติ (เฉพาะลูกค้าที่จองผ่าน LIFF เท่านั้น)'
    : `เปลี่ยนสถานะเป็น "${labels[newStatus]}" ใช่หรือไม่?`;

  const ok = await Utils.confirm(`เปลี่ยนสถานะเป็น "${labels[newStatus]}"?`, confirmText, 'ยืนยัน');
  if (!ok) return;

  s.status = newStatus;
  Utils.loading('กำลังบันทึก...');
  try {
    await BawmusicAPI.updateBooking(s.id, { status: newStatus });
    Utils.closeLoading();
    Utils.toast('success', newStatus === 'confirmed' ? 'ยืนยันการจองแล้ว ส่งข้อความแจ้งลูกค้าเรียบร้อย' : `เปลี่ยนสถานะเป็น "${labels[newStatus]}" แล้ว`);
    closeBookingForm();
    if (window.__app.currentView === 'dashboard') renderDashboard();
    if (window.__app.currentView === 'bookings') renderBookings();
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เปลี่ยนสถานะไม่สำเร็จ: ' + err.message);
  }
}

function toggleEquipment(name, checked) {
  if (checked) {
    __bookingFormState.equipment.push({ name, qty: 1 });
  } else {
    __bookingFormState.equipment = __bookingFormState.equipment.filter(e => e.name !== name);
  }
  paintBookingForm(__equipmentCache, __bookingFormTemplates);
}

function updateEquipmentQty(name, qty) {
  const item = __bookingFormState.equipment.find(e => e.name === name);
  if (item) item.qty = Number(qty);
}

function applyTemplateByIndex(index) {
  const template = __bookingFormTemplates[index];
  if (!template) return;
  __bookingFormState.jobType = template.jobType;
  __bookingFormState.equipment = (template.equipmentPreset || []).map(name => ({ name, qty: 1 }));
  paintBookingForm(__equipmentCache, __bookingFormTemplates);
  Utils.toast('success', `ใช้เทมเพลต "${template.name}" แล้ว`);
}

// บันทึก/อัปเดตลูกค้าอัตโนมัติจากข้อมูลในฟอร์มจองงาน
// - ถ้าพบลูกค้าเดิม (จากเบอร์โทร หรือชื่อที่ตรงกัน) จะอัปเดตข้อมูลที่เปลี่ยนไป
// - ถ้าไม่พบ จะสร้างลูกค้าใหม่ในหน้าลูกค้าให้อัตโนมัติ
async function resolveCustomerRecord() {
  const s = __bookingFormState;
  if (!s.customerName) return '';

  let existing = null;
  if (s.customerId) {
    existing = __bookingFormCustomers.find(c => c.id === s.customerId);
  }
  if (!existing && s.phone) {
    const inputPhone = String(s.phone).replace(/[^0-9]/g, '');
    existing = __bookingFormCustomers.find(c => c.phone && String(c.phone).replace(/[^0-9]/g, '') === inputPhone);
  }
  if (!existing) {
    existing = __bookingFormCustomers.find(c => c.name && c.name.trim() === s.customerName.trim());
  }

  if (existing) {
    const updates = {};
    if (s.customerName && s.customerName.trim() !== (existing.name || '').trim()) updates.name = s.customerName.trim();
    if (s.phone && s.phone !== existing.phone) updates.phone = s.phone;
    if (s.line && s.line !== existing.line) updates.line = s.line;
    if (Object.keys(updates).length) {
      await BawmusicAPI.updateCustomer(existing.id, updates);
    }
    return existing.id;
  }

  const created = await BawmusicAPI.createCustomer({
    name: s.customerName.trim(),
    phone: s.phone || '',
    line: s.line || ''
  });
  return created.id;
}

function closeBookingForm() {
  document.getElementById('modal-root').innerHTML = '';
  __bookingFormState = null;
}

async function submitBookingForm() {
  const s = __bookingFormState;
  if (!s.customerName || !s.date) {
    Utils.toast('error', 'กรุณากรอกชื่อลูกค้าและวันที่');
    return;
  }

  Utils.loading('กำลังตรวจสอบคิว...');
  try {
    const conflicts = await BawmusicAPI.checkConflicts({ id: s.id, date: s.date, equipment: s.equipment });

    if (conflicts.hasConflict) {
      Utils.closeLoading();
      let msg = '';
      if (conflicts.dateConflict) {
        msg += `<p style="margin-bottom:8px;">⚠️ มีงานอื่นในวันเดียวกัน: ${conflicts.conflictingBookings.map(b => b.customerName).join(', ')}</p>`;
      }
      if (conflicts.equipmentConflicts.length) {
        msg += conflicts.equipmentConflicts.map(c => `<p style="margin-bottom:4px;">🔧 ${c.name}: ต้องการ ${c.requested} แต่มี ${c.available} (จองแล้ว ${c.alreadyBooked})</p>`).join('');
      }
      const proceed = await Swal.fire({
        title: 'พบความขัดแย้ง!', html: msg, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'บันทึกต่อไป', cancelButtonText: 'แก้ไข',
        confirmButtonColor: '#22d3ee', background: Utils.swalBg(), color: Utils.swalColor()
      });
      if (!proceed.isConfirmed) return;
      Utils.loading('กำลังบันทึก...');
    }

    Utils.loading('กำลังบันทึกข้อมูลลูกค้า...');
    try {
      s.customerId = await resolveCustomerRecord();
    } catch (custErr) {
      console.error('resolveCustomerRecord failed:', custErr);
      // ไม่ block การบันทึกการจอง แม้บันทึกลูกค้าไม่สำเร็จ
    }

    Utils.loading('กำลังบันทึก...');
    if (s.id) {
      await BawmusicAPI.updateBooking(s.id, s);
    } else {
      await BawmusicAPI.createBooking(s);
    }

    Utils.closeLoading();
    Utils.toast('success', 'บันทึกการจองสำเร็จ');
    closeBookingForm();
    if (window.__app.currentView === 'dashboard') renderDashboard();
    if (window.__app.currentView === 'bookings') renderBookings();

  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด: ' + err.message);
  }
}

async function deleteBookingConfirm(id) {
  const ok = await Utils.confirm('ลบการจองนี้?', 'การกระทำนี้ไม่สามารถย้อนกลับได้', 'ลบ');
  if (!ok) return;
  Utils.loading('กำลังลบ...');
  try {
    await BawmusicAPI.deleteBooking(id);
    Utils.closeLoading();
    Utils.toast('success', 'ลบสำเร็จ');
    closeBookingForm();
    if (window.__app.currentView === 'dashboard') renderDashboard();
    if (window.__app.currentView === 'bookings') renderBookings();
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด');
  }
}
