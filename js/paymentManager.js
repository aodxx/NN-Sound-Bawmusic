/**
 * BAWMUSIC — Payment Manager
 * จัดการรายการรับเงิน/คืนเงินจากการจองทั้งงานปัจจุบันและงานประวัติ
 */

const PAYMENT_TYPE_LABELS = {
  deposit: 'มัดจำ',
  partial: 'ชำระบางส่วน',
  final: 'ชำระเต็มจำนวน',
  refund: 'คืนเงิน'
};

const PAYMENT_METHOD_LABELS = {
  cash: 'เงินสด',
  transfer: 'โอนธนาคาร',
  promptpay: 'พร้อมเพย์',
  card: 'บัตร',
  other: 'อื่นๆ'
};

let __paymentFormContext = null;

function paymentHtmlEscape(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function paymentDateInputValue(value) {
  if (value) {
    const text = String(value).substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function paymentStatusBadge(summary) {
  const status = summary && summary.paymentStatus ? summary.paymentStatus : 'unpaid';
  const labels = { unpaid: 'ยังไม่ชำระ', partial: 'ชำระบางส่วน', paid: 'ชำระครบแล้ว' };
  const classes = {
    unpaid: 'border-red-400/30 bg-red-400/10 text-red-300',
    partial: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    paid: 'border-green-400/30 bg-green-400/10 text-green-300'
  };
  return `<span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.unpaid}"><i class="fa-solid fa-circle mr-1.5 text-[7px]"></i>${labels[status] || labels.unpaid}</span>`;
}

function openPaymentForm(bookingId, returnTo, paymentId) {
  __paymentFormContext = {
    bookingId,
    returnTo: returnTo || 'history',
    paymentId: paymentId || null
  };

  if (paymentId) {
    Utils.loading('กำลังเปิดรายการชำระเงิน...');
    BawmusicAPI.call('getPayment', { id: paymentId }, true)
      .then((payment) => {
        Utils.closeLoading();
        if (!payment) throw new Error('ไม่พบรายการชำระเงิน');
        renderPaymentForm(payment);
      })
      .catch((err) => {
        Utils.closeLoading();
        Utils.toast('error', 'เปิดรายการชำระเงินไม่สำเร็จ: ' + err.message);
      });
    return;
  }

  renderPaymentForm(null);
}

function editPaymentForm(paymentId, bookingId, returnTo) {
  openPaymentForm(bookingId, returnTo || 'history', paymentId);
}

function renderPaymentForm(payment) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const ctx = __paymentFormContext || {};
  const isEdit = !!payment;
  const type = payment && payment.type ? payment.type : 'deposit';
  const method = payment && payment.method ? payment.method : '';
  const typeOptions = Object.keys(PAYMENT_TYPE_LABELS).map((key) =>
    `<option value="${key}" ${type === key ? 'selected' : ''}>${PAYMENT_TYPE_LABELS[key]}</option>`
  ).join('');
  const methodOptions = `<option value="">ยังไม่ระบุ</option>` + Object.keys(PAYMENT_METHOD_LABELS).map((key) =>
    `<option value="${key}" ${method === key ? 'selected' : ''}>${PAYMENT_METHOD_LABELS[key]}</option>`
  ).join('');

  root.insertAdjacentHTML('beforeend', `
    <div class="history-detail-backdrop payment-form-backdrop" role="dialog" aria-modal="true">
      <div class="payment-form-modal">
        <header><h2>${isEdit ? 'แก้ไขรายการชำระเงิน' : 'บันทึกการชำระเงิน'}</h2><button onclick="closePaymentForm()" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button></header>
        <form onsubmit="submitPayment(event)">
          <label>จำนวนเงิน (บาท)<input id="payment-amount" type="number" min="0.01" step="0.01" required value="${paymentHtmlEscape(payment && payment.amount)}" placeholder="เช่น 2500"></label>
          <label>ประเภทการชำระ<select id="payment-type">${typeOptions}</select></label>
          <label>ช่องทางการชำระ<select id="payment-method">${methodOptions}</select></label>
          <label>วันที่ชำระ<input id="payment-date" type="date" value="${paymentDateInputValue(payment && payment.paymentDate)}" required></label>
          <label>ลิงก์หลักฐานการชำระเงิน (ถ้ามี)<input id="payment-evidence" type="url" value="${paymentHtmlEscape(payment && payment.evidenceUrl)}" placeholder="https://drive.google.com/..."></label>
          <label>หมายเหตุ<textarea id="payment-notes" rows="2" placeholder="เช่น โอนผ่านธนาคาร...">${paymentHtmlEscape(payment && payment.notes)}</textarea></label>
          <p class="payment-form-note"><i class="fa-solid fa-circle-info"></i> ระบบจะคำนวณยอดชำระแล้วและยอดคงเหลือของงานให้อัตโนมัติ</p>
          <button class="history-detail-primary" type="submit">${isEdit ? 'บันทึกการแก้ไข' : 'บันทึกการชำระเงิน'}</button>
        </form>
      </div>
    </div>
  `);
}

async function submitPayment(event) {
  event.preventDefault();
  const ctx = __paymentFormContext || {};
  const data = {
    bookingId: ctx.bookingId,
    amount: Number(document.getElementById('payment-amount').value),
    type: document.getElementById('payment-type').value,
    method: document.getElementById('payment-method').value,
    paymentDate: document.getElementById('payment-date').value,
    evidenceUrl: document.getElementById('payment-evidence').value.trim(),
    notes: document.getElementById('payment-notes').value.trim()
  };

  Utils.loading(ctx.paymentId ? 'กำลังแก้ไขรายการ...' : 'กำลังบันทึกยอดชำระ...');
  try {
    if (ctx.paymentId) {
      await BawmusicAPI.updatePayment(ctx.paymentId, data);
    } else {
      await BawmusicAPI.createPayment(data);
    }
    closePaymentForm();
    Utils.closeLoading();

    // ถ้ารีเฟรชหน้าจอหลังบันทึกล้มเหลว จะไม่เปลี่ยนผลลัพธ์ของการบันทึกเงินจริง
    try {
      if (ctx.returnTo === 'booking-form' && typeof openBookingForm === 'function') {
        await openBookingForm(ctx.bookingId);
      } else if (typeof openHistoryDetail === 'function') {
        await openHistoryDetail(ctx.bookingId);
      }
    } catch (refreshError) {
      console.error('Payment view refresh failed:', refreshError);
    }
    Utils.toast('success', ctx.paymentId ? 'แก้ไขรายการชำระเงินแล้ว' : 'บันทึกการชำระเงินแล้ว');
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'บันทึกไม่สำเร็จ: ' + err.message);
  }
}

async function deletePaymentConfirm(paymentId, bookingId, returnTo) {
  const ok = await Utils.confirm('ลบรายการชำระเงินนี้?', 'ยอดรวมและยอดคงเหลือของงานจะถูกคำนวณใหม่', 'ลบรายการ');
  if (!ok) return;

  Utils.loading('กำลังลบรายการ...');
  try {
    await BawmusicAPI.deletePayment(paymentId);
    Utils.closeLoading();
    if ((returnTo || 'history') === 'booking-form' && typeof openBookingForm === 'function') {
      await openBookingForm(bookingId);
    } else if (typeof openHistoryDetail === 'function') {
      await openHistoryDetail(bookingId);
    }
    Utils.toast('success', 'ลบรายการชำระเงินแล้ว');
  } catch (err) {
    Utils.closeLoading();
    Utils.toast('error', 'ลบรายการไม่สำเร็จ: ' + err.message);
  }
}

// override แถวรายการเดิมให้มีช่องทางและปุ่มแก้ไข/ลบ
function historyPaymentRow(payment) {
  const isRefund = payment.type === 'refund';
  const method = payment.method ? ` · ${PAYMENT_METHOD_LABELS[payment.method] || payment.method}` : '';
  const amount = `${isRefund ? '-' : '+'}${Utils.formatMoney(payment.amount)}`;
  return `<div class="history-payment-row">
    <span class="history-payment-icon ${isRefund ? 'refund' : ''}"><i class="fa-solid ${isRefund ? 'fa-arrow-rotate-left' : 'fa-check'}"></i></span>
    <span class="history-payment-copy"><strong>${paymentHtmlEscape(PAYMENT_TYPE_LABELS[payment.type] || payment.type || 'ชำระเงิน')}</strong><small>${Utils.formatDate(payment.paymentDate)}${paymentHtmlEscape(method)}${payment.notes ? ' · ' + paymentHtmlEscape(payment.notes) : ''}</small></span>
    <strong class="${isRefund ? 'refund' : ''}">${amount}</strong>
    <span class="history-payment-actions">
      <button type="button" onclick="event.stopPropagation(); editPaymentForm('${paymentHtmlEscape(payment.id)}','${paymentHtmlEscape(payment.bookingId)}','history')" aria-label="แก้ไข"><i class="fa-solid fa-pen"></i></button>
      <button type="button" onclick="event.stopPropagation(); deletePaymentConfirm('${paymentHtmlEscape(payment.id)}','${paymentHtmlEscape(payment.bookingId)}','history')" aria-label="ลบ"><i class="fa-solid fa-trash"></i></button>
    </span>
  </div>`;
}

function closePaymentForm() {
  const modal = document.querySelector('.payment-form-backdrop');
  if (modal) modal.remove();
  __paymentFormContext = null;
}
