/**
 * ============================================================
 * BAWMUSIC — Band Booking Operating System
 * Backend: Google Apps Script REST API
 * Database: Google Sheets
 * ============================================================
 * วิธีติดตั้ง: ดูไฟล์ INSTALL.md
 * ใช้ var แทน const/let เพื่อความเข้ากันได้กับ V8 runtime
 * ============================================================
 */

// ---------- CONFIG ----------
var SHEET_NAMES = {
  CUSTOMERS: 'Customers',
  BOOKINGS: 'Bookings',
  EQUIPMENT: 'Equipment',
  TEMPLATES: 'Templates',
  SETTINGS: 'Settings',
  STATS_CACHE: 'StatisticsCache',
  MEMBERS: 'Members',
  PAYMENTS: 'Payments',
  AUDIT_LOG: 'AuditLog'
};

var MEMBERS_HEADERS = ['lineUserId', 'displayName', 'pictureUrl', 'isFriend', 'isBlocked', 'marketingConsent', 'lastActiveAt', 'createdAt'];
var PAYMENTS_HEADERS = ['id', 'bookingId', 'amount', 'type', 'paymentDate', 'evidenceUrl', 'notes', 'createdAt'];
var AUDIT_LOG_HEADERS = ['id', 'actorId', 'action', 'entity', 'beforeData', 'afterData', 'timestamp'];

// ---------- ENTRY POINTS ----------

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  var result;
  try {
    ensureDatabaseInitialized();

    var params = method === 'GET' ? e.parameter : JSON.parse(e.postData.contents);
    var action = params.action;

    if (!action) {
      return jsonResponse({ success: false, error: 'Missing action parameter' }, 400);
    }

    switch (action) {
      // Bookings
      case 'listBookings': result = listBookings(params); break;
      case 'getBooking': result = getBooking(params.id); break;
      case 'createBooking': result = createBooking(params.data, params.actorId); break;
      case 'updateBooking': result = updateBooking(params.id, params.data, params.actorId); break;
      case 'deleteBooking': result = deleteBooking(params.id, params.actorId); break;
      case 'checkConflicts': result = checkConflicts(params.data); break;
      case 'getBookingByToken': result = getBookingByToken(params.token); break;

      // Customers
      case 'listCustomers': result = listCustomers(params); break;
      case 'getCustomer': result = getCustomer(params.id); break;
      case 'createCustomer': result = createCustomer(params.data, params.actorId); break;
      case 'updateCustomer': result = updateCustomer(params.id, params.data, params.actorId); break;
      case 'deleteCustomer': result = deleteCustomer(params.id, params.actorId); break;
      case 'searchCustomers': result = searchCustomers(params.query); break;

      // Equipment
      case 'listEquipment': result = listEquipment(); break;
      case 'createEquipment': result = createEquipment(params.data); break;
      case 'updateEquipment': result = updateEquipment(params.id, params.data); break;
      case 'deleteEquipment': result = deleteEquipment(params.id); break;
      case 'checkAvailability': result = checkAvailability(params.date, params.items); break;

      // Templates
      case 'listTemplates': result = listTemplates(); break;
      case 'createTemplate': result = createTemplate(params.data); break;
      case 'updateTemplate': result = updateTemplate(params.id, params.data); break;
      case 'deleteTemplate': result = deleteTemplate(params.id); break;

      // Settings
      case 'getSettings': result = getSettings(); break;
      case 'updateSettings': result = updateSettings(params.data); break;

      // Members (LINE)
      case 'listMembers': result = listMembers(); break;
      case 'getMemberByLineId': result = getMemberByLineId(params.lineUserId); break;
      case 'upsertMember': result = upsertMember(params.data); break;
      case 'verifyLineToken': result = verifyLineIdToken(params.idToken, params.clientId); break;
      case 'verifyAndUpsertMember': result = verifyAndUpsertMember(params.idToken); break;

      // Payments
      case 'listPayments': result = listPayments(params); break;
      case 'getPayment': result = getPayment(params.id); break;
      case 'createPayment': result = createPayment(params.data, params.actorId); break;
      case 'updatePayment': result = updatePayment(params.id, params.data, params.actorId); break;
      case 'deletePayment': result = deletePayment(params.id, params.actorId); break;

      // Audit Log
      case 'listAuditLog': result = listAuditLog(params); break;

      // Dashboard / Analytics
      case 'getDashboard': result = getDashboardData(); break;
      case 'getAnalytics': result = getAnalytics(params); break;

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action }, 400);
    }

    return jsonResponse({ success: true, data: result }, 200);

  } catch (err) {
    return jsonResponse({ success: false, error: err.message, stack: err.stack }, 500);
  }
}

function jsonResponse(obj, code) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ---------- DATABASE INIT ----------

function ensureDatabaseInitialized() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('DB_INITIALIZED') === 'true') {
    migrateSchemaIfNeeded(ss);
    return;
  }

  createSheetIfMissing(ss, SHEET_NAMES.CUSTOMERS, [
    'id', 'name', 'phone', 'line', 'facebook', 'address', 'mapLink', 'notes', 'createdAt', 'memberId'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.BOOKINGS, [
    'id', 'customerId', 'customerName', 'phone', 'line', 'venue', 'mapLink', 'province',
    'date', 'startTime', 'endTime', 'jobType', 'package', 'price', 'deposit', 'remaining',
    'remarks', 'equipment', 'status', 'createdAt', 'updatedAt', 'bookingToken'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.EQUIPMENT, [
    'id', 'name', 'category', 'availableQty', 'unit', 'remarks'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.TEMPLATES, [
    'id', 'name', 'jobType', 'equipmentPreset', 'notes'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.SETTINGS, ['key', 'value']);
  createSheetIfMissing(ss, SHEET_NAMES.STATS_CACHE, ['key', 'value', 'updatedAt']);
  createSheetIfMissing(ss, SHEET_NAMES.MEMBERS, MEMBERS_HEADERS);
  createSheetIfMissing(ss, SHEET_NAMES.PAYMENTS, PAYMENTS_HEADERS);
  createSheetIfMissing(ss, SHEET_NAMES.AUDIT_LOG, AUDIT_LOG_HEADERS);

  seedSampleData(ss);
  seedDefaultSettings(ss);

  props.setProperty('DB_INITIALIZED', 'true');
}

// เติมชีต/คอลัมน์ที่เพิ่มใหม่ภายหลัง ให้ผู้ใช้ที่เคยสร้างฐานข้อมูลไปแล้วโดยไม่กระทบข้อมูลเดิม
function migrateSchemaIfNeeded(ss) {
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet) {
    var existingKeys = settingsSheet.getDataRange().getValues().slice(1).map(function (r) { return r[0]; });
    var requiredDefaults = {
      bannerImage: 'https://raw.githubusercontent.com/aodxx/NN-Sound-Bawmusic/b652dd18fe17ca9d81405d808792ba133ac6f508/100.png'
    };
    Object.keys(requiredDefaults).forEach(function (key) {
      if (existingKeys.indexOf(key) === -1) {
        settingsSheet.appendRow([key, requiredDefaults[key]]);
      }
    });
  }

  createSheetIfMissing(ss, SHEET_NAMES.MEMBERS, MEMBERS_HEADERS);
  createSheetIfMissing(ss, SHEET_NAMES.PAYMENTS, PAYMENTS_HEADERS);
  createSheetIfMissing(ss, SHEET_NAMES.AUDIT_LOG, AUDIT_LOG_HEADERS);

  var customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  if (customersSheet) addColumnIfMissing(customersSheet, 'memberId');

  var bookingsSheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
  if (bookingsSheet) addColumnIfMissing(bookingsSheet, 'bookingToken');
}

// เพิ่มคอลัมน์ใหม่ต่อท้ายชีตเดิม โดยไม่กระทบข้อมูล/คอลัมน์ที่มีอยู่แล้ว
function addColumnIfMissing(sheet, columnName) {
  var headers = getHeaders(sheet);
  if (headers.indexOf(columnName) === -1) {
    sheet.getRange(1, headers.length + 1).setValue(columnName);
  }
}

function createSheetIfMissing(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#d4af37');
  }
  return sheet;
}

function seedDefaultSettings(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (sheet.getLastRow() > 1) return;
  var defaults = [
    ['bandName', 'Bawmusic Band'],
    ['logo', ''],
    ['bannerImage', 'https://raw.githubusercontent.com/aodxx/NN-Sound-Bawmusic/b652dd18fe17ca9d81405d808792ba133ac6f508/100.png'],
    ['phone', '08X-XXX-XXXX'],
    ['line', '@bawmusic'],
    ['facebook', ''],
    ['primaryColor', '#1a1a2e'],
    ['accentColor', '#d4af37'],
    ['theme', 'dark']
  ];
  defaults.forEach(function (row) { sheet.appendRow(row); });
}

function seedSampleData(ss) {
  var eqSheet = ss.getSheetByName(SHEET_NAMES.EQUIPMENT);
  if (eqSheet.getLastRow() === 1) {
    var sampleEquipment = [
      [genId(), 'ชุดเครื่องเสียงเล็ก', 'Sound Systems', 3, 'ชุด', ''],
      [genId(), 'ชุดเครื่องเสียงกลาง', 'Sound Systems', 2, 'ชุด', ''],
      [genId(), 'ชุดเครื่องเสียงใหญ่', 'Sound Systems', 1, 'ชุด', ''],
      [genId(), 'ไฟ PAR', 'Lighting', 20, 'ตัว', ''],
      [genId(), 'Moving Head', 'Lighting', 8, 'ตัว', ''],
      [genId(), 'เวที', 'Stage', 2, 'ชุด', 'ขนาด 4x6 / 6x8'],
      [genId(), 'เต็นท์', 'Accessories', 5, 'หลัง', ''],
      [genId(), 'โต๊ะ', 'Accessories', 20, 'ตัว', ''],
      [genId(), 'เก้าอี้', 'Accessories', 100, 'ตัว', ''],
      [genId(), 'เครื่องปั่นไฟ', 'Support Equipment', 2, 'เครื่อง', '']
    ];
    sampleEquipment.forEach(function (row) { eqSheet.appendRow(row); });
  }

  var tplSheet = ss.getSheetByName(SHEET_NAMES.TEMPLATES);
  if (tplSheet.getLastRow() === 1) {
    var sampleTemplates = [
      [genId(), 'งานแต่งงาน', 'Wedding', JSON.stringify(['ชุดเครื่องเสียงกลาง', 'เวที', 'ไฟ PAR', 'Moving Head']), ''],
      [genId(), 'งานบวช', 'Ordination', JSON.stringify(['ชุดเครื่องเสียงเล็ก', 'เต็นท์', 'โต๊ะ', 'เก้าอี้']), ''],
      [genId(), 'งานศพ', 'Funeral', JSON.stringify(['ชุดเครื่องเสียงเล็ก', 'เต็นท์']), ''],
      [genId(), 'งานคอนเสิร์ต', 'Concert', JSON.stringify(['ชุดเครื่องเสียงใหญ่', 'เวที', 'ไฟ PAR', 'Moving Head', 'เครื่องปั่นไฟ']), '']
    ];
    sampleTemplates.forEach(function (row) { tplSheet.appendRow(row); });
  }

  var custSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  if (custSheet.getLastRow() === 1) {
    custSheet.appendRow([genId(), 'คุณสมชาย ใจดี', '081-234-5678', '@somchai', '', 'พัทลุง', '', 'ลูกค้าประจำ', new Date()]);
  }
}

// ---------- UTILITIES ----------

function genId() {
  return Utilities.getUuid();
}

// โทเค็นสั้นสำหรับใช้ในลิงก์ (เช่น ลิงก์ยืนยันการจองที่ส่งผ่าน LINE)
function genToken() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 10);
}

function sheetToObjects(sheet) {
  return sheetToObjectsByKey(sheet, 'id');
}

// เหมือน sheetToObjects แต่กำหนด key column ที่ใช้กรองแถวว่างได้ (เช่น Members ใช้ lineUserId เป็น key)
function sheetToObjectsByKey(sheet, keyField) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  }).filter(function (obj) { return obj[keyField]; });
}

function findRowIndexById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) return i + 1; // 1-indexed row number
  }
  return -1;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// บันทึกประวัติการเปลี่ยนแปลงข้อมูลสำคัญ (ไม่ทำให้ transaction หลักล้มเหลวแม้ log ผิดพลาด)
function logAudit(actorId, action, entity, beforeData, afterData) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.AUDIT_LOG);
    if (!sheet) return;
    sheet.appendRow([
      genId(),
      actorId || 'admin',
      action,
      entity,
      beforeData ? JSON.stringify(beforeData) : '',
      afterData ? JSON.stringify(afterData) : '',
      new Date()
    ]);
  } catch (e) {
    Logger.log('logAudit failed: ' + e.message);
  }
}

// ---------- CUSTOMERS ----------

function listCustomers(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var customers = sheetToObjects(sheet);
  var bookings = sheetToObjects(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS));

  customers.forEach(function (c) {
    var custBookings = bookings.filter(function (b) { return b.customerId === c.id; });
    c.totalBookings = custBookings.length;
    c.totalRevenue = custBookings.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
    c.latestBooking = custBookings.length ? custBookings.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    })[0].date : null;
    var jobTypeCounts = {};
    custBookings.forEach(function (b) { jobTypeCounts[b.jobType] = (jobTypeCounts[b.jobType] || 0) + 1; });
    var favorite = Object.keys(jobTypeCounts).sort(function (a, b) { return jobTypeCounts[b] - jobTypeCounts[a]; })[0];
    c.favoriteJobType = favorite || null;
  });

  return customers.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}

function getCustomer(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var customers = sheetToObjects(sheet);
  return customers.find(function (c) { return c.id === id; }) || null;
}

function createCustomer(data, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var id = genId();
  sheet.appendRow([id, data.name, data.phone, data.line || '', data.facebook || '', data.address || '', data.mapLink || '', data.notes || '', new Date(), data.memberId || '']);
  logAudit(actorId, 'create_customer', 'Customer:' + id, null, data);
  return { id: id };
}

function updateCustomer(id, data, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Customer not found');
  var before = getCustomer(id);
  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  logAudit(actorId, 'update_customer', 'Customer:' + id, before, data);
  return { id: id };
}

function deleteCustomer(id, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Customer not found');
  var before = getCustomer(id);
  sheet.deleteRow(rowIdx);
  logAudit(actorId, 'delete_customer', 'Customer:' + id, before, null);
  return { id: id };
}

function searchCustomers(query) {
  var customers = listCustomers({});
  if (!query) return customers;
  query = query.toLowerCase();
  return customers.filter(function (c) {
    return (c.name && c.name.toLowerCase().indexOf(query) !== -1) ||
           (c.phone && String(c.phone).indexOf(query) !== -1) ||
           (c.line && c.line.toLowerCase().indexOf(query) !== -1);
  });
}

// ---------- BOOKINGS ----------

function listBookings(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var bookings = sheetToObjects(sheet);

  bookings.forEach(function (b) {
    try { b.equipment = JSON.parse(b.equipment || '[]'); } catch (e) { b.equipment = []; }
  });

  if (params) {
    if (params.month && params.year) {
      bookings = bookings.filter(function (b) {
        var d = new Date(b.date);
        return (d.getMonth() + 1) == Number(params.month) && d.getFullYear() == Number(params.year);
      });
    }
    if (params.province) {
      bookings = bookings.filter(function (b) { return b.province === params.province; });
    }
    if (params.jobType) {
      bookings = bookings.filter(function (b) { return b.jobType === params.jobType; });
    }
    if (params.status) {
      bookings = bookings.filter(function (b) { return b.status === params.status; });
    }
  }

  return bookings.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
}

function getBooking(id) {
  var bookings = listBookings({});
  return bookings.find(function (b) { return b.id === id; }) || null;
}

// สำหรับ LIFF: ลูกค้าดูรายละเอียดการจองของตัวเองผ่านลิงก์ที่มี token แนบมา โดยไม่ต้องรู้ id จริง
function getBookingByToken(token) {
  var bookings = listBookings({});
  return bookings.find(function (b) { return b.bookingToken === token; }) || null;
}

function createBooking(data, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var id = genId();
  var price = Number(data.price) || 0;
  var deposit = Number(data.deposit) || 0;
  var remaining = price - deposit;
  var token = genToken();

  sheet.appendRow([
    id, data.customerId || '', data.customerName || '', data.phone || '', data.line || '',
    data.venue || '', data.mapLink || '', data.province || '', data.date, data.startTime || '',
    data.endTime || '', data.jobType || '', data.package || '', price, deposit, remaining,
    data.remarks || '', JSON.stringify(data.equipment || []), data.status || 'confirmed',
    new Date(), new Date(), token
  ]);
  logAudit(actorId, 'create_booking', 'Booking:' + id, null, data);
  return { id: id, bookingToken: token };
}

function updateBooking(id, data, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Booking not found');

  var before = getBooking(id);
  if (data.equipment) data.equipment = JSON.stringify(data.equipment);
  if (data.price !== undefined || data.deposit !== undefined) {
    var current = getBooking(id);
    var price = data.price !== undefined ? Number(data.price) : Number(current.price);
    var deposit = data.deposit !== undefined ? Number(data.deposit) : Number(current.deposit);
    data.remaining = price - deposit;
  }
  data.updatedAt = new Date();

  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  logAudit(actorId, 'update_booking', 'Booking:' + id, before, data);
  return { id: id };
}

function deleteBooking(id, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Booking not found');
  var before = getBooking(id);
  sheet.deleteRow(rowIdx);
  logAudit(actorId, 'delete_booking', 'Booking:' + id, before, null);
  return { id: id };
}

function checkConflicts(data) {
  var bookings = listBookings({});
  var sameDate = bookings.filter(function (b) {
    return b.date && new Date(b.date).toDateString() === new Date(data.date).toDateString() && b.id !== data.id;
  });

  var dateConflict = sameDate.length > 0;
  var equipmentConflicts = [];

  if (sameDate.length && data.equipment && data.equipment.length) {
    var usage = {};
    sameDate.forEach(function (b) {
      (b.equipment || []).forEach(function (item) {
        usage[item.name] = (usage[item.name] || 0) + (Number(item.qty) || 1);
      });
    });

    var equipmentList = listEquipment();
    data.equipment.forEach(function (item) {
      var stock = equipmentList.find(function (e) { return e.name === item.name; });
      var alreadyUsed = usage[item.name] || 0;
      var requested = Number(item.qty) || 1;
      if (stock && (alreadyUsed + requested) > Number(stock.availableQty)) {
        equipmentConflicts.push({
          name: item.name,
          available: stock.availableQty,
          alreadyBooked: alreadyUsed,
          requested: requested
        });
      }
    });
  }

  return {
    dateConflict: dateConflict,
    conflictingBookings: sameDate.map(function (b) { return { id: b.id, customerName: b.customerName, jobType: b.jobType }; }),
    equipmentConflicts: equipmentConflicts,
    hasConflict: dateConflict || equipmentConflicts.length > 0
  };
}

// ---------- EQUIPMENT ----------

function listEquipment() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  return sheetToObjects(sheet);
}

function createEquipment(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  var id = genId();
  sheet.appendRow([id, data.name, data.category || '', data.availableQty || 0, data.unit || 'ชิ้น', data.remarks || '']);
  return { id: id };
}

function updateEquipment(id, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Equipment not found');
  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  return { id: id };
}

function deleteEquipment(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Equipment not found');
  sheet.deleteRow(rowIdx);
  return { id: id };
}

function checkAvailability(date, items) {
  var conflict = checkConflicts({ date: date, equipment: items, id: null });
  return conflict.equipmentConflicts;
}

// ---------- TEMPLATES ----------

function listTemplates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATES);
  var templates = sheetToObjects(sheet);
  templates.forEach(function (t) {
    try { t.equipmentPreset = JSON.parse(t.equipmentPreset || '[]'); } catch (e) { t.equipmentPreset = []; }
  });
  return templates;
}

function createTemplate(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATES);
  var id = genId();
  sheet.appendRow([id, data.name, data.jobType, JSON.stringify(data.equipmentPreset || []), data.notes || '']);
  return { id: id };
}

function updateTemplate(id, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATES);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Template not found');
  if (data.equipmentPreset) data.equipmentPreset = JSON.stringify(data.equipmentPreset);
  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  return { id: id };
}

function deleteTemplate(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TEMPLATES);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Template not found');
  sheet.deleteRow(rowIdx);
  return { id: id };
}

// ---------- SETTINGS ----------

function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}

function updateSettings(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  var rows = sheet.getDataRange().getValues();
  Object.keys(data).forEach(function (key) {
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(data[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, data[key]]);
  });
  return getSettings();
}

// ---------- MEMBERS (LINE) ----------

function listMembers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  return sheetToObjectsByKey(sheet, 'lineUserId');
}

function getMemberByLineId(lineUserId) {
  var members = listMembers();
  return members.find(function (m) { return m.lineUserId === lineUserId; }) || null;
}

function findMemberRowIndex(sheet, lineUserId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === lineUserId) return i + 1;
  }
  return -1;
}

// สร้างสมาชิกใหม่ หรืออัปเดตข้อมูล/เวลาใช้งานล่าสุด ถ้ามี lineUserId นี้อยู่แล้ว
function upsertMember(data) {
  if (!data || !data.lineUserId) throw new Error('lineUserId is required');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  var rowIdx = findMemberRowIndex(sheet, data.lineUserId);
  var now = new Date();

  if (rowIdx === -1) {
    sheet.appendRow([
      data.lineUserId,
      data.displayName || '',
      data.pictureUrl || '',
      data.isFriend !== undefined ? data.isFriend : true,
      data.isBlocked !== undefined ? data.isBlocked : false,
      data.marketingConsent !== undefined ? data.marketingConsent : false,
      now,
      now
    ]);
    logAudit(data.lineUserId, 'create_member', 'Member:' + data.lineUserId, null, data);
  } else {
    var before = getMemberByLineId(data.lineUserId);
    var headers = getHeaders(sheet);
    headers.forEach(function (h, i) {
      if (h === 'lastActiveAt') {
        sheet.getRange(rowIdx, i + 1).setValue(now);
      } else if (data.hasOwnProperty(h) && h !== 'lineUserId') {
        sheet.getRange(rowIdx, i + 1).setValue(data[h]);
      }
    });
    logAudit(data.lineUserId, 'update_member', 'Member:' + data.lineUserId, before, data);
  }
  return getMemberByLineId(data.lineUserId);
}

// ---------- LINE TOKEN VERIFICATION ----------

function getLineConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    loginChannelId: props.getProperty('LINE_LOGIN_CHANNEL_ID') || '',
    messagingChannelAccessToken: props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || ''
  };
}

// ตรวจสอบ ID Token จาก LINE Login (LIFF) กับเซิร์ฟเวอร์ LINE โดยตรง ป้องกันข้อมูลปลอมจากฝั่ง client
// ต้องตั้งค่า Script Property "LINE_LOGIN_CHANNEL_ID" ก่อนใช้งาน (ดู INSTALL.md)
function verifyLineIdToken(idToken, clientId) {
  if (!idToken) throw new Error('idToken is required');
  var config = getLineConfig();
  var targetClientId = clientId || config.loginChannelId;
  if (!targetClientId) throw new Error('LINE_LOGIN_CHANNEL_ID is not configured in Script Properties');

  var response = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: targetClientId },
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200) {
    throw new Error('Invalid LINE ID Token: ' + (result.error_description || result.error || 'unknown error'));
  }

  return {
    lineUserId: result.sub,
    displayName: result.name || '',
    pictureUrl: result.picture || '',
    email: result.email || ''
  };
}

// ใช้จากหน้า LIFF: verify token แล้วบันทึก/อัปเดต Member ในขั้นตอนเดียว
function verifyAndUpsertMember(idToken) {
  var profile = verifyLineIdToken(idToken);
  return upsertMember(profile);
}

// ---------- PAYMENTS ----------

function listPayments(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  var payments = sheetToObjects(sheet);
  if (params && params.bookingId) {
    payments = payments.filter(function (p) { return p.bookingId === params.bookingId; });
  }
  return payments.sort(function (a, b) { return new Date(b.paymentDate) - new Date(a.paymentDate); });
}

function getPayment(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  var payments = sheetToObjects(sheet);
  return payments.find(function (p) { return p.id === id; }) || null;
}

function createPayment(data, actorId) {
  if (!data || !data.bookingId) throw new Error('bookingId is required');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  var id = genId();
  var amount = Number(data.amount) || 0;

  sheet.appendRow([
    id, data.bookingId, amount, data.type || 'deposit',
    data.paymentDate || new Date(), data.evidenceUrl || '', data.notes || '', new Date()
  ]);
  logAudit(actorId, 'create_payment', 'Payment:' + id, null, data);

  recalcBookingPayments(data.bookingId, actorId);
  return { id: id };
}

function updatePayment(id, data, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Payment not found');

  var before = getPayment(id);
  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  logAudit(actorId, 'update_payment', 'Payment:' + id, before, data);

  var bookingId = data.bookingId || (before && before.bookingId);
  if (bookingId) recalcBookingPayments(bookingId, actorId);
  return { id: id };
}

function deletePayment(id, actorId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Payment not found');

  var before = getPayment(id);
  sheet.deleteRow(rowIdx);
  logAudit(actorId, 'delete_payment', 'Payment:' + id, before, null);

  if (before && before.bookingId) recalcBookingPayments(before.bookingId, actorId);
  return { id: id };
}

// รวมยอดชำระทั้งหมดของ booking แล้วอัปเดตมัดจำ/ยอดคงเหลือให้อัตโนมัติ
// เรียกทุกครั้งที่มีการสร้าง/แก้ไข/ลบ payment เพื่อให้ Bookings sheet ตรงกับ Payments เสมอ
function recalcBookingPayments(bookingId, actorId) {
  var booking = getBooking(bookingId);
  if (!booking) return;
  var payments = listPayments({ bookingId: bookingId });
  var totalPaid = payments.reduce(function (sum, p) { return sum + (Number(p.amount) || 0); }, 0);
  updateBooking(bookingId, { deposit: totalPaid }, actorId || 'system');
}

// ---------- AUDIT LOG ----------

function listAuditLog(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.AUDIT_LOG);
  var logs = sheetToObjectsByKey(sheet, 'id');

  if (params) {
    if (params.entity) logs = logs.filter(function (l) { return l.entity === params.entity; });
    if (params.actorId) logs = logs.filter(function (l) { return l.actorId === params.actorId; });
  }

  logs = logs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

  if (params && params.limit) {
    logs = logs.slice(0, Number(params.limit));
  }
  return logs;
}

// ---------- DASHBOARD ----------

function getDashboardData() {
  var bookings = listBookings({});
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var todayJobs = bookings.filter(function (b) {
    var d = new Date(b.date); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  var upcoming = bookings.filter(function (b) { return new Date(b.date) > today; }).slice(0, 5);

  var thisMonth = bookings.filter(function (b) {
    var d = new Date(b.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  var monthlyIncome = thisMonth.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
  var pendingDeposits = bookings.filter(function (b) { return Number(b.remaining) > 0; });

  return {
    todayJobs: todayJobs,
    upcomingJobs: upcoming,
    thisMonthCount: thisMonth.length,
    monthlyIncome: monthlyIncome,
    pendingDeposits: pendingDeposits,
    pendingDepositsCount: pendingDeposits.length,
    recentActivities: bookings.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 8)
  };
}

// ---------- ANALYTICS ----------

function getAnalytics(params) {
  var bookings = listBookings({});
  var year = params.year ? Number(params.year) : new Date().getFullYear();

  var yearBookings = bookings.filter(function (b) { return new Date(b.date).getFullYear() === year; });

  var monthlyRevenue = new Array(12).fill(0);
  var monthlyJobs = new Array(12).fill(0);
  yearBookings.forEach(function (b) {
    var m = new Date(b.date).getMonth();
    monthlyRevenue[m] += Number(b.price) || 0;
    monthlyJobs[m] += 1;
  });

  var customerRevenue = {};
  var jobTypeCounts = {};
  var provinceCounts = {};

  bookings.forEach(function (b) {
    customerRevenue[b.customerName] = (customerRevenue[b.customerName] || 0) + (Number(b.price) || 0);
    jobTypeCounts[b.jobType] = (jobTypeCounts[b.jobType] || 0) + 1;
    provinceCounts[b.province] = (provinceCounts[b.province] || 0) + 1;
  });

  var topCustomers = Object.keys(customerRevenue).map(function (name) {
    return { name: name, revenue: customerRevenue[name] };
  }).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 10);

  var yearlyRevenue = yearBookings.reduce(function (sum, b) { return sum + (Number(b.price) || 0); }, 0);
  var avgIncome = yearBookings.length ? yearlyRevenue / yearBookings.length : 0;

  return {
    monthlyRevenue: monthlyRevenue,
    monthlyJobs: monthlyJobs,
    yearlyRevenue: yearlyRevenue,
    yearlyJobs: yearBookings.length,
    topCustomers: topCustomers,
    jobTypeCounts: jobTypeCounts,
    provinceCounts: provinceCounts,
    avgIncomePerJob: avgIncome
  };
}
