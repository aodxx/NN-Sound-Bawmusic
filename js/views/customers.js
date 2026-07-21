/**
 * BAWMUSIC — Customers View
 */

let __customersCache = [];

async function renderCustomers() {
  const container = document.getElementById('view-customers');
  container.innerHTML = Utils.skeletonLoader(3);

  try {
    __customersCache = await BawmusicAPI.listCustomers();
    paintCustomers(__customersCache);
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

function paintCustomers(list) {
  const container = document.getElementById('view-customers');
  container.innerHTML = `
    <div class="relative mb-3">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base"></i>
      <input type="text" placeholder="ค้นหาลูกค้า (ชื่อ, เบอร์, LINE)..." oninput="window.__searchCustomers(this.value)"
        class="w-full bg-navy-light border border-gold/10 rounded-xl pl-9 pr-3 py-3 text-base text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold/40">
    </div>
    <button onclick="window.__openCustomerForm()" class="w-full mb-3 bg-gold/10 border border-gold/30 text-gold text-base font-medium rounded-xl py-3">
      <i class="fa-solid fa-user-plus mr-1.5"></i>เพิ่มลูกค้าใหม่
    </button>
    <p class="text-base text-gray-500 mb-2">${list.length} คน</p>
    <div class="space-y-2" id="customers-list">
      ${list.length === 0 ? emptyState('ยังไม่มีข้อมูลลูกค้า', 'fa-users') : list.map(customerRow).join('')}
    </div>
  `;
  Utils.fadeIn(container);
}

window.__searchCustomers = (query) => {
  const filtered = !query ? __customersCache : __customersCache.filter(c =>
    (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
    String(c.phone || '').replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')) ||
    (c.line || '').toLowerCase().includes(query.toLowerCase())
  );
  document.getElementById('customers-list').innerHTML = filtered.length === 0 ?
    emptyState('ไม่พบลูกค้าที่ค้นหา', 'fa-user-slash') : filtered.map(customerRow).join('');
};

function escapeCustomerHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

window.__handleCustomerImageError = (img) => {
  const fallback = img.getAttribute('data-fallback-src');
  if (fallback) {
    img.removeAttribute('data-fallback-src');
    img.src = fallback;
    return;
  }
  img.style.display = 'none';
  if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
};

function customerAvatarMarkup(c, profile) {
  const primary = String(profile?.pictureUrl || '').trim();
  const fallback = String(profile?.fallbackPictureUrl || '').trim();
  const src = primary || fallback;
  const initial = escapeCustomerHtml((c.name || '?').charAt(0));
  if (!src) return `<span class="customer-avatar-fallback">${initial}</span>`;

  const fallbackAttr = primary && fallback
    ? ` data-fallback-src="${escapeCustomerHtml(fallback)}"`
    : '';
  return `
    <img src="${escapeCustomerHtml(src)}" alt="${escapeCustomerHtml(profile?.displayName || c.name || 'ลูกค้า')}" class="customer-avatar-image" loading="lazy"${fallbackAttr}
      onerror="window.__handleCustomerImageError(this)">
    <span class="customer-avatar-fallback" style="display:none">${initial}</span>
  `;
}

function customerRow(c) {
  const profile = c.lineProfile || null;
  const hasProfileImage = Boolean(profile && (profile.pictureUrl || profile.fallbackPictureUrl));
  const profileImage = customerAvatarMarkup(c, profile);
  return `
    <div class="bg-navy-light rounded-2xl p-3.5 border border-gold/10 shadow-sm shadow-black/5">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2.5">
          <div class="customer-avatar ${hasProfileImage ? 'customer-avatar-line' : ''}">${profileImage}</div>
          <div>
            <p class="text-base font-medium text-gray-100">${c.name}</p>
            <p class="text-base text-gray-500">${Utils.formatPhone(c.phone)} ${c.line ? '· ' + c.line : ''}</p>
            ${profile ? `<span class="customer-line-badge"><i class="fa-brands fa-line"></i>${profile.isBlocked ? 'บล็อก LINE' : 'เชื่อมต่อ LINE OA'}</span>` : ''}
          </div>
        </div>
        <button onclick="window.__openCustomerForm('${c.id}')" class="text-gray-400 px-2"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center border-t border-gold/10 pt-2">
        <div>
          <p class="text-base font-semibold text-gold">${c.totalBookings || 0}</p>
          <p class="text-base text-gray-500">งานทั้งหมด</p>
        </div>
        <div>
          <p class="text-base font-semibold text-gold">${Utils.formatMoney(c.totalRevenue)}</p>
          <p class="text-base text-gray-500">รายได้รวม</p>
        </div>
        <div>
          <p class="text-base font-semibold text-gold">${c.favoriteJobType ? Utils.jobTypeLabel(c.favoriteJobType) : '-'}</p>
          <p class="text-base text-gray-500">งานที่ชอบ</p>
        </div>
      </div>
    </div>
  `;
}

window.__openCustomerForm = async (id) => {
  let existing = null;
  if (id) existing = __customersCache.find(c => c.id === id);

  const { value: formValues } = await Swal.fire({
    title: existing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่',
    background: Utils.swalBg(), color: Utils.swalColor(),
    html: `
      <input id="sw-name" class="swal2-input" placeholder="ชื่อ-นามสกุล" value="${existing?.name || ''}">
      <input id="sw-phone" class="swal2-input" placeholder="เบอร์โทร" value="${existing?.phone || ''}">
      <input id="sw-line" class="swal2-input" placeholder="LINE ID" value="${existing?.line || ''}">
      <input id="sw-address" class="swal2-input" placeholder="ที่อยู่" value="${existing?.address || ''}">
      <textarea id="sw-notes" class="swal2-textarea" placeholder="โน้ตเพิ่มเติม">${existing?.notes || ''}</textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#22d3ee',
    preConfirm: () => ({
      name: document.getElementById('sw-name').value,
      phone: document.getElementById('sw-phone').value,
      line: document.getElementById('sw-line').value,
      address: document.getElementById('sw-address').value,
      notes: document.getElementById('sw-notes').value
    })
  });

  if (!formValues || !formValues.name) return;

  Utils.loading('กำลังบันทึก...');
  try {
    if (existing) await BawmusicAPI.updateCustomer(existing.id, formValues);
    else await BawmusicAPI.createCustomer(formValues);
    Utils.closeLoading();
    Utils.toast('success', 'บันทึกสำเร็จ');
    renderCustomers();
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'เกิดข้อผิดพลาด');
  }
};
