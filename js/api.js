/**
 * BAWMUSIC — API Wrapper
 * เชื่อมต่อกับ Google Apps Script Web App
 */

// ⚠️ แก้ URL นี้เป็น Web App URL ของคุณหลัง Deploy Apps Script (ดู INSTALL.md)
const API_URL = 'https://script.google.com/macros/s/AKfycbykgZIfxTQ3652WNWaES0ZPWubbv62IlXYqgar27u-S8a0nNZ8yiinFj_BZd8Dg1ow5/exec';

// ⚠️ ต้องตรงกับค่า Script Property "ADMIN_TOKEN" ที่ตั้งไว้ใน Apps Script (ดู INSTALL.md)
// ใช้ยืนยันว่าเรียกมาจากแอปแอดมินจริง ป้องกันคนอื่นเรียก API ที่ไม่ใช่ public ได้
const AUTH_STORAGE_KEY = 'bawmusic_session_token';

const BawmusicAPI = {
  async call(action, params = {}, isPost = false) {
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

      const res = await fetch(url, options);
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'API Error');
      return json.data;
    } catch (err) {
      console.error(`API call failed [${action}]:`, err);
      throw err;
    }
  },

  getSessionToken() {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) { localStorage.removeItem(AUTH_STORAGE_KEY); return ''; }
    } catch (e) { localStorage.removeItem(AUTH_STORAGE_KEY); return ''; }
    return token;
  },
  setSessionToken(token) { if (token) localStorage.setItem(AUTH_STORAGE_KEY, token); else localStorage.removeItem(AUTH_STORAGE_KEY); },
  async requireAuth() {
    if (BawmusicAPI.getSessionToken()) return true;
    const gate = document.getElementById('auth-gate');
    if (!gate) throw new Error('ไม่พบหน้าล็อกอิน');
    gate.classList.remove('hidden-init');
    const button = document.getElementById('access-code');
    const error = document.getElementById('auth-error');
    if (error) error.textContent = '';
    const submit = () => BawmusicAPI.call('createSession', { accessCode: button.value }, true).then(data => { BawmusicAPI.setSessionToken(data.sessionToken); gate.classList.add('hidden-init'); window.location.reload(); }).catch(e => { error.textContent = e.message; });
    document.getElementById('access-submit').onclick = submit;
    button.onkeydown = e => { if (e.key === 'Enter') submit(); };
    return true;
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
  createEquipment: (data) => BawmusicAPI.call('createEquipment', { data }, true),
  updateEquipment: (id, data) => BawmusicAPI.call('updateEquipment', { id, data }, true),
  deleteEquipment: (id) => BawmusicAPI.call('deleteEquipment', { id }, true),

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
