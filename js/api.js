/**
 * BAWMUSIC — API Wrapper
 * เชื่อมต่อกับ Google Apps Script Web App
 */

// ⚠️ แก้ URL 'https Web App URL ของคุณหลัง Deploy Apps Script (ดู INSTALL.md)
const API_URL = 'https://script.google.com/macros/s/AKfycbxkZ53Olropa7NNvFDpD3bHhVKlXlmjBVY-DQlpxSS2L6wSNXyFUZMDCaHBpNprpkpBDw/exec'

const BawmusicAPI = {
  async call(action, params = {}, isPost = false) {
    try {
      let url = API_URL;
      let options = {};

      if (isPost) {
        options = {
          method: 'POST',
          body: JSON.stringify({ action, ...params }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        };
      } else {
        const query = new URLSearchParams({ action, ...flattenParams(params) });
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
