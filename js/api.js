/**
 * BAWMUSIC — API Wrapper
 * เชื่อมต่อกับ Google Apps Script Web App
 */

// ⚠️ แก้ URL นี้เป็น Web App URL ของคุณหลัง Deploy Apps Script (ดู INSTALL.md)
const API_URL = 'https://script.google.com/macros/s/AKfycbykgZIfxTQ3652WNWaES0ZPWubbv62IlXYqgar27u-S8a0nNZ8yiinFj_BZd8Dg1ow5/exec';

// ⚠️ ต้องตรงกับค่า Script Property "ADMIN_TOKEN" ที่ตั้งไว้ใน Apps Script (ดู INSTALL.md)
// ใช้ยืนยันว่าเรียกมาจากแอปแอดมินจริง ป้องกันคนอื่นเรียก API ที่ไม่ใช่ public ได้
const GOOGLE_CLIENT_ID = '173827802086-hhiicdrer9uefbhrof0laioddoabmdmb.apps.googleusercontent.com';
const AUTH_STORAGE_KEY = 'bawmusic_google_id_token';

const BawmusicAPI = {
  async call(action, params = {}, isPost = false) {
    try {
      const paramsWithAuth = { ...params };
      const token = BawmusicAPI.getGoogleIdToken();
      if (token) paramsWithAuth.googleIdToken = token;
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

  getGoogleIdToken() {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) { localStorage.removeItem(AUTH_STORAGE_KEY); return ''; }
    } catch (e) { localStorage.removeItem(AUTH_STORAGE_KEY); return ''; }
    return token;
  },
  setGoogleIdToken(token) { if (token) localStorage.setItem(AUTH_STORAGE_KEY, token); else localStorage.removeItem(AUTH_STORAGE_KEY); },
  async requireAuth() {
    if (BawmusicAPI.getGoogleIdToken()) return true;
    const gate = document.getElementById('auth-gate');
    if (!gate) throw new Error('ไม่พบหน้าล็อกอิน');
    gate.classList.remove('hidden-init');
    const button = document.getElementById('google-signin-button');
    const error = document.getElementById('auth-error');
    const retry = document.getElementById('auth-retry');
    if (button) button.innerHTML = '';
    if (error) error.textContent = 'กำลังโหลดปุ่มเข้าสู่ระบบ...';
    if (retry) retry.classList.add('hidden');

    // Google Identity Services ถูกโหลดแบบ async/defer จึงอาจยังไม่พร้อม
    // ในจังหวะที่ Alpine เรียก init() ครั้งแรก
    await new Promise((resolve) => {
      const startedAt = Date.now();
      const waitForGoogle = () => {
        if (window.google && google.accounts && google.accounts.id) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              BawmusicAPI.setGoogleIdToken(response.credential);
              gate.classList.add('hidden-init');
              resolve();
              window.location.reload();
            }
          });
          google.accounts.id.renderButton(button, { theme: 'filled_black', size: 'large', width: 280, text: 'signin_with' });
          if (error) error.textContent = '';
          return;
        }
        if (Date.now() - startedAt >= 10000) {
          if (error) error.textContent = 'โหลด Google Sign-In ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตหรือเปิดหน้านี้ใน Chrome';
          if (retry) retry.classList.remove('hidden');
          resolve();
          return;
        }
        window.setTimeout(waitForGoogle, 200);
      };
      waitForGoogle();
    });
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
