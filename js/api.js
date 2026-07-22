  async call(action, params = {}, isPost = false, timeoutMs = 30000) {
    let timeoutId = null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    try {
      const paramsWithAuth = { ...params };
      const token = BawmusicAPI.getSessionToken();
      if (token) paramsWithAuth.sessionToken = token;
      let url = API_URL;
      let options = {};

      if (isPost) {
        options = {
          method: 'POST',
          body: JSON.stringify({ action, ...paramsWithAuth }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        };
      } else {
        const query = new URLSearchParams({ action, ...flattenParams(paramsWithAuth) });
        url = `${API_URL}?${query.toString()}`;
      }

      if (controller && timeoutMs > 0) {
        options.signal = controller.signal;
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }

      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`);
      const json = await res.json();

      if (!json.success) {
        const apiError = json.error || 'API Error';
        if (BawmusicAPI.isSessionExpiredError(apiError)) BawmusicAPI.expireSession(apiError);
        throw new Error(apiError);
      }
      return json.data;
    } catch (err) {
      const normalizedError = err && err.name === 'AbortError'
        ? new Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
        : err;
      console.error(`API call failed [${action}]:`, normalizedError);
      throw normalizedError;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  },

  isSessionExpiredError(message) {
    return /เซสชันหมดอายุ|session.*expired|invalid session|session.*invalid/i.test(String(message || ''));
  },

  expireSession(message = 'เซสชันหมดอายุ กรุณาใส่รหัสเข้าใช้งานใหม่') {
    BawmusicAPI.setSessionToken('');
    const gate = document.getElementById('auth-gate');
    const input = document.getElementById('access-code');
    const error = document.getElementById('auth-error');
    const status = document.getElementById('auth-status');
    const submit = document.getElementById('access-submit');

    BawmusicAPI.bindAuthHandlers();
    if (gate) gate.classList.remove('hidden-init');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 0);
    }
    if (error) error.textContent = message || 'เซสชันหมดอายุ กรุณาใส่รหัสเข้าใช้งานใหม่';
    if (status) status.textContent = '';
    if (submit) submit.disabled = false;
    if (window.__app) window.__app.loading = false;
  },

  bindAuthHandlers() {
    const gate = document.getElementById('auth-gate');
    const input = document.getElementById('access-code');
    const error = document.getElementById('auth-error');
    const status = document.getElementById('auth-status');
    const submitButton = document.getElementById('access-submit');
    const form = document.getElementById('auth-form');

    if (!input || !submitButton) return;
    if (submitButton.dataset.authBound === 'true') return;

    const setStatus = (message) => { if (status) status.textContent = message || ''; };
    const setError = (message) => { if (error) error.textContent = message || ''; };

    const submit = async () => {
      if (submitButton.disabled) return;
      const accessCode = input.value.trim();
      if (!accessCode) {
        setStatus('');
        setError('กรุณากรอกรหัสเข้าใช้งาน');
        input.focus();
        return;
      }

      setError('');
      setStatus('กำลังตรวจสอบรหัส...');
      submitButton.disabled = true;

      try {
        // ใช้ GET เฉพาะขั้นตอนสร้าง session เพราะ Apps Script Web App
        // อาจ redirect คำขอ POST ระหว่างโดเมน ทำให้ body หายบนบางเบราว์เซอร์
        const data = await BawmusicAPI.call('createSession', { accessCode }, false, 20000);
        if (!data || !data.sessionToken) throw new Error('ระบบไม่ส่งข้อมูลยืนยันการเข้าสู่ระบบ');
        BawmusicAPI.setSessionToken(data.sessionToken);
        setStatus('เข้าสู่ระบบสำเร็จ กำลังเปิดระบบ...');
        if (gate) gate.classList.add('hidden-init');
        window.location.reload();
      } catch (e) {
        setStatus('');
        setError(e?.message || 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่');
        submitButton.disabled = false;
        input.focus();
      }
    };

    if (form) form.onsubmit = (event) => {
      event.preventDefault();
      submit();
    };
    submitButton.onclick = (event) => {
      event.preventDefault();
      submit();
    };
    input.oninput = () => {
      setError('');
      setStatus('');
    };
    input.onkeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    };
    submitButton.dataset.authBound = 'true';
  },

  async requireAuth() {
    const gate = document.getElementById('auth-gate');
    if (!gate) throw new Error('ไม่พบหน้าล็อกอิน');

    BawmusicAPI.bindAuthHandlers();
    if (BawmusicAPI.getSessionToken()) {
      gate.classList.add('hidden-init');
      return true;
    }

    gate.classList.remove('hidden-init');
    const error = document.getElementById('auth-error');
    const status = document.getElementById('auth-status');
    const submitButton = document.getElementById('access-submit');
    if (error) error.textContent = '';
    if (status) status.textContent = '';
    if (submitButton) submitButton.disabled = false;
    return false;
  },

  // Dashboard
  getDashboard: () => BawmusicAPI.call('getDashboard'),

  // Bookings
  listBookings: (filters = {}) => BawmusicAPI.call('listBookings', filters, true),
  getBooking: (id) => BawmusicAPI.call('getBooking', { id }, true),
  createBooking: (data) => BawmusicAPI.call('createBooking', { data }, true),
  updateBooking: (id, data) => BawmusicAPI.call('updateBooking', { id, data }, true),
  deleteBooking: (id) => BawmusicAPI.call('deleteBooking', { id }, true),
  checkConflicts: (data) => BawmusicAPI.call('checkConflicts', { data }, true),

  // Customers
  listCustomers: () => BawmusicAPI.call('listCustomers', {}, true),
  createCustomer: (data) => BawmusicAPI.call('createCustomer', { data }, true),
  updateCustomer: (id, data) => BawmusicAPI.call('updateCustomer', { id, data }, true),
  deleteCustomer: (id) => BawmusicAPI.call('deleteCustomer', { id }, true),
  searchCustomers: (query) => BawmusicAPI.call('searchCustomers', { query }, true),

  // Equipment
  listEquipment: () => BawmusicAPI.call('listEquipment', {}, true),
  listPublicEquipment: () => BawmusicAPI.call('listPublicEquipment', {}, true),
  createEquipment: (data) => BawmusicAPI.call('createEquipment', { data }, true),
  updateEquipment: (id, data) => BawmusicAPI.call('updateEquipment', { id, data }, true),
  deleteEquipment: (id) => BawmusicAPI.call('deleteEquipment', { id }, true),
  uploadEquipmentImage: (equipmentId, data) => BawmusicAPI.call('uploadEquipmentImage', { data: { equipmentId, ...data } }, true),

  // Templates
  listTemplates: () => BawmusicAPI.call('listTemplates', {}, true),
  createTemplate: (data) => BawmusicAPI.call('createTemplate', { data }, true),

  // Settings
  getSettings: () => BawmusicAPI.call('getSettings', {}, true),
  updateSettings: (data) => BawmusicAPI.call('updateSettings', { data }, true),

  // Payments
  listPayments: (bookingId) => BawmusicAPI.call('listPayments', { bookingId }, true),
  createPayment: (data) => BawmusicAPI.call('createPayment', { data }, true),

  // Analytics
  getAnalytics: (params = {}) => BawmusicAPI.call('getAnalytics', params, true)
};

function flattenParams(params) {
  const out = {};
  Object.keys(params).forEach(k => {
    out[k] = typeof params[k] === 'object' ? JSON.stringify(params[k]) : params[k];
  });
  return out;
}
