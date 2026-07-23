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

var MEMBERS_HEADERS = ['lineUserId', 'displayName', 'pictureUrl', 'isFriend', 'isBlocked', 'marketingConsent', 'lastActiveAt', 'createdAt', 'profileDriveFileId', 'profileDriveUpdatedAt'];
var EQUIPMENT_HEADERS = ['id', 'name', 'category', 'availableQty', 'unit', 'remarks', 'imageFileId', 'imageUrl', 'imageName', 'imageUpdatedAt'];
var PAYMENTS_HEADERS = ['id', 'bookingId', 'amount', 'type', 'paymentDate', 'evidenceUrl', 'notes', 'createdAt'];
var AUDIT_LOG_HEADERS = ['id', 'actorId', 'action', 'entity', 'beforeData', 'afterData', 'timestamp'];
var DB_SCHEMA_VERSION = '3.4.0';
var DRIVE_WRITE_SCOPE = 'https://www.googleapis.com/auth/drive';

// โฟลเดอร์ที่สร้างไว้ใน Google Drive ของ Bawmusic
// สามารถกำหนดค่าใหม่ผ่าน Script Properties ได้ภายหลัง โดยใช้ key เดิม
var DRIVE_DEFAULT_FOLDER_IDS = {
  // ไม่เก็บ Folder ID จริงไว้ใน repository สาธารณะ
  // ให้ตั้งค่าใน Apps Script > Project Settings > Script Properties
  EQUIPMENT: '',
  PROFILE_BACKUP: ''
};

// Action ที่เปิดให้เรียกได้โดยไม่ต้องมี session ของแอป (ใช้จากหน้า LIFF ของลูกค้า)
// การเรียกใช้งานระบบแอดมินต้องส่ง sessionToken ที่ออกโดย createSession
var PUBLIC_ACTIONS = ['createSession', 'submitLiffBooking', 'checkLiffAvailability', 'verifyAndUpsertMember', 'verifyLineToken', 'getBookingByToken', 'listPublicEquipment', 'getMyBookings', 'listPublicSchedule'];

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
    var params = method === 'GET' ? e.parameter : JSON.parse(e.postData.contents);
    var action = params.action;

    if (!action) {
      return jsonResponse({ success: false, error: 'Missing action parameter' }, 400);
    }

    // ตรวจ session ก่อนแตะ Spreadsheet เพื่อให้ session หมดอายุแล้วตอบกลับได้ทันที
    if (PUBLIC_ACTIONS.indexOf(action) === -1) {
      requireSession(params.sessionToken);
    }

    // createSession ไม่ควรถูกบล็อกด้วยการเริ่มฐานข้อมูล
    if (action !== 'createSession') ensureDatabaseInitialized();

    switch (action) {
      case 'createSession': result = createSession(params.accessCode); break;
      // Bookings
      case 'listBookings': result = listBookings(params); break;
      case 'getBooking': result = getBooking(params.id); break;
      case 'createBooking': result = createBooking(params.data, params.actorId); break;
      case 'updateBooking': result = updateBooking(params.id, params.data, params.actorId); break;
      case 'deleteBooking': result = deleteBooking(params.id, params.actorId); break;
      case 'checkConflicts': result = checkConflicts(params.data); break;
      case 'getBookingByToken': result = getBookingByToken(params.token); break;
      case 'getMyBookings': result = getMyBookings(params.idToken, params); break;
      case 'listPublicSchedule': result = listPublicSchedule(params.month); break;
      case 'checkLiffAvailability': result = checkLiffAvailability(params.date, params.startTime, params.endTime); break;

      // Customers
      case 'listCustomers': result = listCustomers(params); break;
      case 'getCustomer': result = getCustomer(params.id); break;
      case 'createCustomer': result = createCustomer(params.data, params.actorId); break;
      case 'updateCustomer': result = updateCustomer(params.id, params.data, params.actorId); break;
      case 'deleteCustomer': result = deleteCustomer(params.id, params.actorId); break;
      case 'searchCustomers': result = searchCustomers(params.query); break;

      // Equipment
      case 'listEquipment': result = listEquipment(); break;
      case 'listPublicEquipment': result = listPublicEquipment(); break;
      case 'createEquipment': result = createEquipment(params.data); break;
      case 'updateEquipment': result = updateEquipment(params.id, params.data); break;
      case 'deleteEquipment': result = deleteEquipment(params.id); break;
      case 'uploadEquipmentImage': result = uploadEquipmentImage(params.data); break;
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
      case 'verifyLineToken': result = verifyLineIdToken(params.idToken); break;
      case 'verifyAndUpsertMember': result = verifyAndUpsertMember(params.idToken); break;

      // Payments
      case 'listPayments': result = listPayments(params); break;
      case 'getPayment': result = getPayment(params.id); break;
      case 'createPayment': result = createPayment(params.data, params.actorId); break;
      case 'updatePayment': result = updatePayment(params.id, params.data, params.actorId); break;
      case 'deletePayment': result = deletePayment(params.id, params.actorId); break;

      // Audit Log
      case 'listAuditLog': result = listAuditLog(params); break;

      // LIFF (ลูกค้าจองผ่าน LINE)
      case 'submitLiffBooking': result = submitLiffBooking(params.idToken, params.data); break;

      // LINE Messaging
      case 'sendBookingConfirmation': result = sendBookingConfirmation(params.id); break;
      case 'sendCampaign': result = sendCampaign(params.segment, params.messages); break;
      case 'getMemberIdsBySegment': result = getMemberIdsBySegment(params.segment); break;

      // Dashboard / Analytics
      case 'getDashboard': result = getDashboardData(); break;
      case 'getAnalytics': result = getAnalytics(params); break;

      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action }, 400);
    }

    return jsonResponse({ success: true, data: result }, 200);

  } catch (err) {
    // ไม่ส่ง stack trace ออกไปยังผู้ใช้ เพราะอาจเปิดเผยชื่อฟังก์ชัน
    // โครงสร้างระบบ หรือรายละเอียดภายในของ Apps Script ได้
    console.error(err && err.stack ? err.stack : err);
    return jsonResponse({ success: false, error: err.message || 'เกิดข้อผิดพลาดภายในระบบ' }, 500);
  }
}

function jsonResponse(obj, code) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ออก session ชั่วคราวจากรหัสที่เก็บใน Script Properties
function createSession(accessCode) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_ACCESS_CODE');
  if (!expected) throw new Error('ยังไม่ได้ตั้งค่า APP_ACCESS_CODE ใน Script Properties');
  if (!accessCode || String(accessCode) !== String(expected)) throw new Error('รหัสเข้าใช้งานไม่ถูกต้อง');
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('session_' + token, 'admin', 21600);
  return { sessionToken: token, expiresIn: 21600 };
}

function requireSession(token) {
  if (!token || CacheService.getScriptCache().get('session_' + token) !== 'admin') {
    throw new Error('เซสชันหมดอายุ กรุณาใส่รหัสเข้าใช้งานใหม่');
  }
}

// ---------- DATABASE INIT ----------

function ensureDatabaseInitialized() {
  var props = PropertiesService.getScriptProperties();
  var initialized = props.getProperty('DB_INITIALIZED') === 'true';
  var schemaVersion = props.getProperty('DB_SCHEMA_VERSION') || '';

  // ไม่อ่าน Spreadsheet ซ้ำทุก request เมื่อ schema รุ่นปัจจุบันพร้อมแล้ว
  if (initialized && schemaVersion === DB_SCHEMA_VERSION) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (initialized) {
    migrateSchemaIfNeeded(ss);
    props.setProperty('DB_SCHEMA_VERSION', DB_SCHEMA_VERSION);
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
  createSheetIfMissing(ss, SHEET_NAMES.EQUIPMENT, EQUIPMENT_HEADERS);
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

  // รองรับกรณีมีชีตเดิมอยู่แล้วแต่ฐานข้อมูลยังไม่เคยบันทึกสถานะ initialized
  migrateSchemaIfNeeded(ss);

  props.setProperty('DB_INITIALIZED', 'true');
  props.setProperty('DB_SCHEMA_VERSION', DB_SCHEMA_VERSION);
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

  var equipmentSheet = ss.getSheetByName(SHEET_NAMES.EQUIPMENT);
  if (equipmentSheet) {
    EQUIPMENT_HEADERS.slice(6).forEach(function (header) { addColumnIfMissing(equipmentSheet, header); });
  }

  var membersSheet = ss.getSheetByName(SHEET_NAMES.MEMBERS);
  if (membersSheet) {
    MEMBERS_HEADERS.slice(8).forEach(function (header) { addColumnIfMissing(membersSheet, header); });
  }
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
    custSheet.appendRow([genId(), 'ลูกค้าตัวอย่าง', '08X-XXX-XXXX', '@example', '', 'พัทลุง', '', 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ', new Date()]);
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
    headers.forEach(function (h, i) {
      // รองรับชีตเก่าที่อาจมีชื่อคอลัมน์ซ้ำ โดยเก็บค่าที่ไม่ว่างไว้ก่อน
      var value = normalizeApiDate(h, row[i]);
      if (!Object.prototype.hasOwnProperty.call(obj, h) || obj[h] === '' || obj[h] === null || obj[h] === undefined) {
        obj[h] = value;
      }
    });
    return obj;
  }).filter(function (obj) { return obj[keyField]; });
}

// Google Sheets ส่งค่าช่องวันที่เป็น Date object ซึ่ง JSON.stringify จะกลายเป็น
// ISO string แบบ UTC และบางกรณีทำให้หน้าเว็บเห็นวันที่ 1899 หรือเวลาเพี้ยน
// แปลงเป็นรูปแบบที่ API และหน้าเว็บใช้ร่วมกันได้ตั้งแต่ต้นทาง
function normalizeApiDate(fieldName, value) {
  if (!(value instanceof Date) || isNaN(value.getTime())) return value;
  var dateFields = ['date', 'createdAt', 'updatedAt', 'paymentDate', 'timestamp', 'lastActiveAt', 'profileDriveUpdatedAt', 'imageUpdatedAt'];
  if (dateFields.indexOf(fieldName) === -1) return value;
  var timezone = Session.getScriptTimeZone() || 'Asia/Bangkok';
  if (fieldName === 'date') {
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }
  return Utilities.formatDate(value, timezone, "yyyy-MM-dd'T'HH:mm:ss");
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
  var members = listMembers();
  var membersById = {};
  members.forEach(function (member) {
    if (member.lineUserId) membersById[member.lineUserId] = member;
  });

  customers.forEach(function (c) {
    var lineMember = c.memberId ? membersById[c.memberId] : null;
    var fallbackPictureUrl = lineMember && lineMember.profileDriveFileId
      ? driveImageDataUrl_(lineMember.profileDriveFileId)
      : '';
    c.lineProfile = lineMember ? {
      lineUserId: lineMember.lineUserId,
      displayName: lineMember.displayName || '',
      pictureUrl: lineMember.pictureUrl || '',
      fallbackPictureUrl: fallbackPictureUrl,
      isFriend: lineMember.isFriend,
      isBlocked: lineMember.isBlocked
    } : null;
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

// สำหรับ Customer Portal: ตรวจสอบตัวตนจาก LINE ID Token แล้วคืนเฉพาะประวัติของบัญชีนั้น
// ห้ามรับ lineUserId จาก client เพราะผู้เรียกสามารถปลอมค่าได้
function getMyBookings(idToken, params) {
  var profile = verifyLineIdToken(idToken);
  var customers = listCustomers({});
  var customer = customers.find(function (c) {
    return c.memberId && c.memberId === profile.lineUserId;
  });
  var bookings = [];

  if (customer) {
    bookings = listBookings({}).filter(function (b) {
      return b.customerId === customer.id;
    }).sort(function (a, b) {
      var dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return String(b.startTime || '').localeCompare(String(a.startTime || ''));
    });
  }

  var totalCount = bookings.length;
  var requestedLimit = params && params.limit;
  var limit = Number(requestedLimit);
  if (!isFinite(limit) || limit <= 0) limit = 50;
  limit = Math.min(Math.floor(limit), 100);

  return {
    profile: {
      displayName: profile.displayName || '',
      pictureUrl: profile.pictureUrl || ''
    },
    linked: !!customer,
    bookingCount: totalCount,
    bookings: bookings.slice(0, limit).map(publicBookingSummary_)
  };
}

// ข้อมูลประวัติที่ปลอดภัยสำหรับ Customer Portal
// ไม่ส่ง customerId, bookingToken, equipment ภายใน หรือข้อมูล Audit ออกไป
function publicBookingSummary_(booking) {
  return {
    date: booking.date || '',
    startTime: booking.startTime || '',
    endTime: booking.endTime || '',
    jobType: booking.jobType || '',
    status: booking.status || '',
    venue: booking.venue || '',
    package: booking.package || '',
    price: Number(booking.price) || 0,
    deposit: Number(booking.deposit) || 0,
    remaining: Number(booking.remaining) || 0,
    createdAt: booking.createdAt || '',
    updatedAt: booking.updatedAt || ''
  };
}

// Customer Portal เห็นเฉพาะวันที่มีงานยืนยันแล้วในเดือนที่ร้องขอ
// ไม่ส่งชื่อ สถานที่ เวลา ราคา หรือรายละเอียดการจองออกไป
function listPublicSchedule(month) {
  var monthKey = normalizePublicScheduleMonth_(month);
  var cache = CacheService.getScriptCache();
  var cacheKey = 'public_schedule_' + monthKey;
  var cached = cache.get(cacheKey);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (ignoreCacheError) {
      // ถ้า cache เสีย ให้คำนวณจาก Spreadsheet ใหม่
    }
  }

  var bookedDates = {};
  listBookings({}).forEach(function (booking) {
    var date = String(booking.date || '').substring(0, 10);
    if (booking.status === 'confirmed' && date.indexOf(monthKey) === 0) {
      bookedDates[date] = true;
    }
  });

  var result = {
    month: monthKey,
    bookedDates: Object.keys(bookedDates).sort()
  };

  // ยอมให้ข้อมูลสาธารณะเก่าที่สุดประมาณ 5 นาที เพื่อลดการอ่านชีตซ้ำ
  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

function normalizePublicScheduleMonth_(month) {
  var value = String(month || '').trim();
  if (!value) {
    var timezone = Session.getScriptTimeZone() || 'Asia/Bangkok';
    value = Utilities.formatDate(new Date(), timezone, 'yyyy-MM');
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error('month ต้องอยู่ในรูปแบบ YYYY-MM');
  }
  return value;
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

  // ส่งข้อความยืนยันอัตโนมัติเมื่อสถานะเปลี่ยนเป็น "ยืนยันแล้ว" (ไม่ทำให้การอัปเดตล้มเหลวแม้ส่งไม่สำเร็จ)
  if (data.status === 'confirmed' && before && before.status !== 'confirmed') {
    try { sendBookingConfirmation(id); } catch (e) { Logger.log('sendBookingConfirmation failed: ' + e.message); }
  }

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
  // ไม่นับงานที่ยกเลิกแล้วเป็นการชนคิว
  var bookings = listBookings({}).filter(function (b) { return b.status !== 'cancelled'; });

  var sameDate = bookings.filter(function (b) {
    return b.date && new Date(b.date).toDateString() === new Date(data.date).toDateString() && b.id !== data.id;
  });

  // ตรวจเฉพาะรายการที่ช่วงเวลาทับกันจริง (เช่น งานเช้า 08:00-11:00 กับงานเย็น 18:00-22:00 ไม่ถือว่าชน)
  var timeOverlapping = sameDate.filter(function (b) {
    return timeRangesOverlap(data.startTime, data.endTime, b.startTime, b.endTime);
  });

  var dateConflict = timeOverlapping.length > 0;
  var equipmentConflicts = [];

  // อุปกรณ์ยังพิจารณาจากทุกงานในวันเดียวกัน (ไม่ใช่แค่ช่วงเวลาที่ทับกัน) เพราะอุปกรณ์ชุดเดียว
  // มักใช้ 2 งานในวันเดียวไม่ได้จริงในทางปฏิบัติ (เวลาเดินทาง/เก็บของ)
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
    conflictingBookings: timeOverlapping.map(function (b) { return { id: b.id, customerName: b.customerName, jobType: b.jobType }; }),
    equipmentConflicts: equipmentConflicts,
    hasConflict: dateConflict || equipmentConflicts.length > 0
  };
}

// ตรวจว่าช่วงเวลาสองช่วงทับกันหรือไม่ (รูปแบบ "HH:MM")
// ถ้าข้อมูลเวลาไม่ครบฝั่งใดฝั่งหนึ่ง ถือว่าเป็นทั้งวันไว้ก่อนเพื่อความปลอดภัย (กันแจ้งเตือนพลาด)
function timeRangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return true;
  return startA < endB && startB < endA;
}

// ---------- EQUIPMENT ----------

function listEquipment() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  return sheetToObjects(sheet);
}

// ข้อมูลอุปกรณ์แบบปลอดภัยสำหรับหน้า LIFF ลูกค้า (ไม่เปิดเผยจำนวนสต็อก/รหัสไฟล์ Drive)
function listPublicEquipment() {
  return listEquipment().filter(function (e) { return e && e.name; }).map(function (e) {
    return {
      id: e.id,
      name: e.name,
      category: e.category || '',
      unit: e.unit || '',
      imageUrl: e.imageUrl || ''
    };
  });
}

function createEquipment(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EQUIPMENT);
  var id = genId();
  var values = {
    id: id,
    name: data.name,
    category: data.category || '',
    availableQty: data.availableQty || 0,
    unit: data.unit || 'ชิ้น',
    remarks: data.remarks || ''
  };
  var headers = getHeaders(sheet);
  sheet.appendRow(headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(values, header) ? values[header] : '';
  }));
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
  var existing = listEquipment().find(function (e) { return e.id === id; });
  sheet.deleteRow(rowIdx);
  if (existing && existing.imageFileId) trashDriveFile_(existing.imageFileId);
  return { id: id };
}

// รับรูปอุปกรณ์จากหน้าแอดมินเป็น base64 ที่ถูกย่อแล้ว แล้วบันทึกเป็นไฟล์ใน Drive
function uploadEquipmentImage(data) {
  if (!data || !data.equipmentId) throw new Error('equipmentId is required');
  if (!data.base64) throw new Error('ไม่พบข้อมูลรูปภาพ');

  var equipment = listEquipment().find(function (e) { return e.id === data.equipmentId; });
  if (!equipment) throw new Error('ไม่พบอุปกรณ์ที่ต้องการใส่รูป');

  var mimeType = String(data.mimeType || 'image/jpeg').toLowerCase();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) {
    throw new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF');
  }

  var rawBase64 = String(data.base64).replace(/^data:[^,]+,/, '');
  if (rawBase64.length > 8 * 1024 * 1024) throw new Error('รูปใหญ่เกินไป กรุณาเลือกรูปที่เล็กกว่า 6 MB');

  var fileName = sanitizeDriveFileName_(data.fileName || ('equipment-' + equipment.id + extensionForMime_(mimeType)));
  var blob;
  try {
    blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, fileName);
  } catch (decodeError) {
    throw new Error('ข้อมูลรูปภาพจากแอปไม่สมบูรณ์ กรุณาเลือกรูปใหม่: ' + decodeError.message);
  }
  var folder;
  try {
    folder = DriveApp.getFolderById(requireDriveFolderId_(getDriveConfig_(), 'equipmentFolderId', 'DRIVE_EQUIPMENT_FOLDER_ID'));
  } catch (driveError) {
    throw new Error(formatDriveError_('เข้าถึงโฟลเดอร์ Google Drive สำหรับอุปกรณ์ไม่ได้', driveError));
  }
  var file;
  try {
    file = folder.createFile(blob);
  } catch (createError) {
    throw new Error(formatDriveError_('สร้างไฟล์ใน Google Drive ไม่สำเร็จ', createError));
  }

  try {
    // รูปอุปกรณ์ต้องเปิดดูได้จากหน้า GitHub Pages/LIFF ของลูกค้า
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    trashDriveFile_(file.getId());
    throw new Error(formatDriveError_('สร้างไฟล์แล้ว แต่เปิดสิทธิ์ดูรูปจาก Google Drive ไม่สำเร็จ', sharingError));
  }

  var update = {
    imageFileId: file.getId(),
    imageUrl: driveImageUrl_(file.getId()),
    imageName: file.getName(),
    imageUpdatedAt: new Date()
  };
  try {
    updateEquipment(equipment.id, update);
  } catch (sheetError) {
    trashDriveFile_(file.getId());
    throw new Error('อัปโหลดไฟล์แล้ว แต่บันทึกลิงก์ลง Google Sheets ไม่สำเร็จ: ' + sheetError.message);
  }
  if (equipment.imageFileId && equipment.imageFileId !== file.getId()) trashDriveFile_(equipment.imageFileId);

  return { id: equipment.id, imageFileId: update.imageFileId, imageUrl: update.imageUrl, imageName: update.imageName };
}

function getDriveConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    equipmentFolderId: props.getProperty('DRIVE_EQUIPMENT_FOLDER_ID') || DRIVE_DEFAULT_FOLDER_IDS.EQUIPMENT,
    profileBackupFolderId: props.getProperty('DRIVE_PROFILE_BACKUP_FOLDER_ID') || DRIVE_DEFAULT_FOLDER_IDS.PROFILE_BACKUP
  };
}

function requireDriveFolderId_(config, key, propertyName) {
  var folderId = config && config[key];
  if (!folderId) {
    throw new Error('ยังไม่ได้ตั้งค่า ' + propertyName + ' ใน Script Properties ของ Apps Script');
  }
  return folderId;
}

function authorizeDriveAccess() {
  var config = getDriveConfig_();
  var equipmentFolder;
  var profileFolder;
  var equipmentProbe = null;
  var profileProbe = null;

  try {
    equipmentFolder = DriveApp.getFolderById(requireDriveFolderId_(config, 'equipmentFolderId', 'DRIVE_EQUIPMENT_FOLDER_ID'));
    profileFolder = DriveApp.getFolderById(requireDriveFolderId_(config, 'profileBackupFolderId', 'DRIVE_PROFILE_BACKUP_FOLDER_ID'));
    // ทดสอบสิทธิ์ที่จำเป็นจริง: สร้างไฟล์ ลองเปิดลิงก์ และลบไฟล์ทดสอบ
    equipmentProbe = equipmentFolder.createFile(
      Utilities.newBlob('Bawmusic Drive access test', 'text/plain', '.bawmusic-equipment-access-test-' + Utilities.getUuid() + '.txt')
    );
    equipmentProbe.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    profileProbe = profileFolder.createFile(
      Utilities.newBlob('Bawmusic Drive access test', 'text/plain', '.bawmusic-profile-access-test-' + Utilities.getUuid() + '.txt')
    );

    return {
      authorized: true,
      writeTest: true,
      publicViewTest: true,
      equipmentFolder: equipmentFolder.getName(),
      profileBackupFolder: profileFolder.getName()
    };
  } catch (driveError) {
    throw new Error(formatDriveError_('เข้าถึง Drive ได้ แต่ทดสอบสร้าง/เปิดสิทธิ์ไฟล์ไม่สำเร็จ', driveError));
  } finally {
    try { if (equipmentProbe) equipmentProbe.setTrashed(true); } catch (ignoreEquipment) {}
    try { if (profileProbe) profileProbe.setTrashed(true); } catch (ignoreProfile) {}
  }
}

function formatDriveError_(prefix, error) {
  var message = String(error && error.message ? error.message : error || 'ไม่ทราบสาเหตุ');
  if (/Required permissions:\s*https:\/\/www\.googleapis\.com\/auth\/drive|permission to call DriveApp\.(Folder\.)?createFile/i.test(message)) {
    return prefix + ': Apps Script ยังไม่ได้รับ OAuth Scope สำหรับเขียน Google Drive (' + DRIVE_WRITE_SCOPE + ') กรุณาเปิด appsscript.json เพิ่ม scope นี้ บันทึกโปรเจกต์ แล้วกด Run authorizeDriveAccess ด้วยบัญชีเดียวกับ Execute as ก่อน Deploy ใหม่. รายละเอียดเดิม: ' + message;
  }
  if (/setSharing|sharing|domain policy|Access denied/i.test(message)) {
    return prefix + ': บัญชีที่ Deploy ไม่มีสิทธิ์ตั้งค่าไฟล์เป็น Anyone with the link หรือถูกนโยบาย Google Workspace บล็อก: ' + message;
  }
  return prefix + ': ' + message;
}

// ส่งสำเนารูปจากโฟลเดอร์สำรองกลับไปยังหน้าแอดมินแบบ data URL
// ใช้เฉพาะใน API ที่ต้องมี session แอดมิน จึงไม่เปิดไฟล์สำรองเป็นสาธารณะ
function driveImageDataUrl_(fileId) {
  if (!fileId) return '';
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    var contentType = String(blob.getContentType() || 'image/jpeg').toLowerCase();
    if (contentType.indexOf('image/') !== 0) return '';
    return 'data:' + contentType + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    Logger.log('driveImageDataUrl failed: ' + e.message);
    return '';
  }
}

function driveImageUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1000';
}

function extensionForMime_(mimeType) {
  var map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
  return map[mimeType] || '.jpg';
}

function sanitizeDriveFileName_(name) {
  return String(name || 'image').replace(/[\\/:*?"<>|#%{}~&]/g, '-').substring(0, 120);
}

function trashDriveFile_(fileId) {
  try {
    if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
  } catch (e) {
    Logger.log('trashDriveFile failed: ' + e.message);
  }
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
      now,
      data.profileDriveFileId || '',
      data.profileDriveUpdatedAt || ''
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
// หมายเหตุด้านความปลอดภัย: ใช้เฉพาะค่าจาก Script Properties เท่านั้น ห้ามรับ client_id จากผู้เรียก
// (ไม่เช่นนั้นผู้เรียกอาจส่ง channel ID อื่นมาแล้วผ่านการตรวจสอบด้วย token ที่ไม่ได้ออกให้ Bawmusic)
function verifyLineIdToken(idToken) {
  if (!idToken) throw new Error('idToken is required');
  var config = getLineConfig();
  if (!config.loginChannelId) throw new Error('LINE_LOGIN_CHANNEL_ID is not configured in Script Properties');

  var response = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: config.loginChannelId },
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

// วิธี A: ใช้ URL จาก LINE เป็นรูปหลัก และเก็บสำเนาใน Drive แบบส่วนตัวเพื่อสำรอง/กู้คืน
// หาก Drive มีปัญหา จะไม่ทำให้การเข้าสู่ LIFF หรือการจองงานล้มเหลว
function prepareLineProfile_(profile) {
  if (!profile || !profile.lineUserId || !profile.pictureUrl) return profile;

  try {
    var current = getMemberByLineId(profile.lineUserId);
    if (current && current.pictureUrl === profile.pictureUrl && current.profileDriveFileId) {
      profile.profileDriveFileId = current.profileDriveFileId;
      profile.profileDriveUpdatedAt = current.profileDriveUpdatedAt || '';
      return profile;
    }

    var response = UrlFetchApp.fetch(profile.pictureUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) throw new Error('LINE รูปโปรไฟล์ตอบกลับสถานะ ' + response.getResponseCode());

    var blob = response.getBlob();
    var mimeType = String(blob.getContentType() || 'image/jpeg').toLowerCase();
    if (mimeType.indexOf('image/') !== 0) throw new Error('ไฟล์จาก LINE ไม่ใช่รูปภาพ');

    var fileName = sanitizeDriveFileName_('line-profile-' + profile.lineUserId + '-' + new Date().getTime() + extensionForMime_(mimeType));
    blob.setName(fileName);
    var file = DriveApp.getFolderById(requireDriveFolderId_(getDriveConfig_(), 'profileBackupFolderId', 'DRIVE_PROFILE_BACKUP_FOLDER_ID')).createFile(blob);
    profile.profileDriveFileId = file.getId();
    profile.profileDriveUpdatedAt = new Date();

    if (current && current.profileDriveFileId && current.profileDriveFileId !== file.getId()) {
      trashDriveFile_(current.profileDriveFileId);
    }
  } catch (e) {
    Logger.log('LINE profile backup skipped: ' + e.message);
  }
  return profile;
}

// ใช้จากหน้า LIFF: verify token แล้วบันทึก/อัปเดต Member ในขั้นตอนเดียว
function verifyAndUpsertMember(idToken) {
  var profile = prepareLineProfile_(verifyLineIdToken(idToken));
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

  var booking = getBooking(data.bookingId);
  if (!booking) throw new Error('ไม่พบ Booking ที่ระบุ (bookingId ไม่ถูกต้อง)');

  var amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);

  // ป้องกันยอดมัดจำเดิมหาย: ถ้านี่คือ payment แรกของ booking นี้ และมีมัดจำเดิมอยู่ก่อนแล้ว
  // (จากตอนที่ยังไม่มีระบบ Payments) ให้สร้างรายการย้อนหลังแทนมัดจำเดิมก่อน แล้วค่อยเพิ่มรายการใหม่
  var existingPayments = listPayments({ bookingId: data.bookingId });
  if (existingPayments.length === 0 && Number(booking.deposit) > 0) {
    var backfillId = genId();
    sheet.appendRow([
      backfillId, data.bookingId, Number(booking.deposit), 'deposit',
      booking.createdAt || new Date(), '', 'ยอดมัดจำเดิมก่อนใช้ระบบ Payments (สร้างอัตโนมัติ)', new Date()
    ]);
    logAudit(actorId, 'backfill_payment', 'Payment:' + backfillId, null, { bookingId: data.bookingId, amount: booking.deposit });
  }

  var id = genId();
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

  if (data.amount !== undefined) {
    var amt = Number(data.amount);
    if (!amt || amt <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');
  }
  if (data.bookingId && !getBooking(data.bookingId)) {
    throw new Error('ไม่พบ Booking ปลายทางที่ระบุ (bookingId ไม่ถูกต้อง)');
  }

  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  logAudit(actorId, 'update_payment', 'Payment:' + id, before, data);

  // คำนวณยอดใหม่ทั้ง booking เดิมและ booking ปลายทาง (ถ้าย้าย payment ไปคนละ booking)
  var oldBookingId = before && before.bookingId;
  var newBookingId = data.bookingId || oldBookingId;
  if (oldBookingId) recalcBookingPayments(oldBookingId, actorId);
  if (newBookingId && newBookingId !== oldBookingId) recalcBookingPayments(newBookingId, actorId);

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
// รายการประเภท "refund" จะถูกหักออกจากยอดรวมแทนที่จะบวกเพิ่ม
function recalcBookingPayments(bookingId, actorId) {
  var booking = getBooking(bookingId);
  if (!booking) return;
  var payments = listPayments({ bookingId: bookingId });
  var totalPaid = payments.reduce(function (sum, p) {
    var amt = Number(p.amount) || 0;
    return p.type === 'refund' ? sum - amt : sum + amt;
  }, 0);
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

// ---------- LIFF (ลูกค้าจองผ่าน LINE) ----------

// รับการจองจากหน้า LIFF: verify token กับ LINE ก่อนเสมอ (ห้ามเชื่อชื่อ/ข้อมูลจาก client ตรงๆ)
// จากนั้นผูก/สร้างลูกค้าให้อัตโนมัติ แล้วสร้างรายการจองสถานะ "pending" รอแอดมินยืนยันราคา
function submitLiffBooking(idToken, data) {
  if (!data || !data.date) throw new Error('กรุณาระบุวันที่จัดงาน');

  var profile = prepareLineProfile_(verifyLineIdToken(idToken)); // throws ถ้า token ไม่ถูกต้อง
  upsertMember(profile);

  var customers = listCustomers({});
  var existing = customers.find(function (c) { return c.memberId === profile.lineUserId; });
  if (!existing && data.phone) {
    existing = customers.find(function (c) { return c.phone && String(c.phone).trim() === String(data.phone).trim(); });
  }

  var customerId;
  var customerName = (data.customerName || profile.displayName || '').trim();

  if (existing) {
    var updates = {};
    if (!existing.memberId) updates.memberId = profile.lineUserId;
    if (data.phone && data.phone !== existing.phone) updates.phone = data.phone;
    if (customerName && customerName !== existing.name) updates.name = customerName;
    if (Object.keys(updates).length) updateCustomer(existing.id, updates, profile.lineUserId);
    customerId = existing.id;
  } else {
    var created = createCustomer({
      name: customerName || 'ลูกค้า LINE',
      phone: data.phone || '',
      line: profile.displayName || '',
      memberId: profile.lineUserId
    }, profile.lineUserId);
    customerId = created.id;
  }

  var booking = createBooking({
    customerId: customerId,
    customerName: customerName || 'ลูกค้า LINE',
    phone: data.phone || '',
    line: profile.displayName || '',
    venue: data.venue || '',
    mapLink: data.mapLink || '',
    province: data.province || '',
    date: data.date,
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    jobType: data.jobType || 'Custom',
    package: '',
    price: 0,
    deposit: 0,
    remarks: data.remarks || '',
    equipment: [],
    status: 'pending' // งานที่ลูกค้าจองเองผ่าน LIFF ต้องรอแอดมินยืนยันและแจ้งราคา
  }, profile.lineUserId);

  return { id: booking.id, bookingToken: booking.bookingToken, memberId: profile.lineUserId };
}

// ---------- LINE MESSAGING ----------

// ส่งข้อความ push ให้ผู้ใช้ LINE 1 คน (ต้องตั้ง Script Property "LINE_CHANNEL_ACCESS_TOKEN" ก่อนใช้งาน)
function sendLineMessage(lineUserId, messages) {
  var config = getLineConfig();
  if (!config.messagingChannelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured in Script Properties');
  }
  var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + config.messagingChannelAccessToken },
    payload: JSON.stringify({ to: lineUserId, messages: messages }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('LINE push failed (' + code + '): ' + response.getContentText());
  }
  return { success: true };
}

// ส่งข้อความให้หลายคนพร้อมกัน (สูงสุด 500 คน/ครั้ง ตามข้อจำกัดของ LINE — แบ่งชุดให้อัตโนมัติถ้าเกิน)
function pushToMembers(lineUserIds, messages) {
  var config = getLineConfig();
  if (!config.messagingChannelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured in Script Properties');
  }
  var chunks = [];
  for (var i = 0; i < lineUserIds.length; i += 500) {
    chunks.push(lineUserIds.slice(i, i + 500));
  }
  chunks.forEach(function (chunk) {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/multicast', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + config.messagingChannelAccessToken },
      payload: JSON.stringify({ to: chunk, messages: messages }),
      muteHttpExceptions: true
    });
  });
  return { success: true, recipientCount: lineUserIds.length };
}

// ส่งหาเพื่อนทุกคนของ LINE OA (ไม่เลือกกลุ่ม)
function broadcastToAllFriends(messages) {
  var config = getLineConfig();
  if (!config.messagingChannelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured in Script Properties');
  }
  var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + config.messagingChannelAccessToken },
    payload: JSON.stringify({ messages: messages }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('LINE broadcast failed (' + code + '): ' + response.getContentText());
  }
  return { success: true };
}

// ส่งข้อความยืนยันการจองแบบ Flex Message ให้ลูกค้า (เรียกอัตโนมัติเมื่อ status เปลี่ยนเป็น confirmed)
function sendBookingConfirmation(bookingId) {
  var booking = getBooking(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (!booking.customerId) return { skipped: true, reason: 'ไม่มีลูกค้าผูกกับการจองนี้' };

  var customer = getCustomer(booking.customerId);
  if (!customer || !customer.memberId) return { skipped: true, reason: 'ลูกค้ายังไม่ได้เชื่อมบัญชี LINE (ไม่ได้จองผ่าน LIFF)' };

  var settings = getSettings();
  var flexMessage = buildBookingConfirmationFlex(booking, settings);
  sendLineMessage(customer.memberId, [flexMessage]);
  logAudit('system', 'send_line_confirmation', 'Booking:' + bookingId, null, { to: customer.memberId });
  return { success: true };
}

function buildBookingConfirmationFlex(booking, settings) {
  return {
    type: 'flex',
    altText: 'ยืนยันการจองงาน — ' + (settings.bandName || 'Bawmusic'),
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#08080d', paddingAll: 'lg',
        contents: [
          { type: 'text', text: settings.bandName || 'Bawmusic', color: '#22d3ee', weight: 'bold', size: 'lg' },
          { type: 'text', text: '✓ ยืนยันการจองงานเรียบร้อยแล้ว', color: '#ffffff', size: 'sm', margin: 'sm' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: 'lg',
        contents: [
          flexRow('วันที่', formatThaiDate(booking.date)),
          flexRow('เวลา', (booking.startTime || '-') + ' - ' + (booking.endTime || '-')),
          flexRow('สถานที่', booking.venue || '-'),
          flexRow('ประเภทงาน', jobTypeLabelTh(booking.jobType)),
          { type: 'separator', margin: 'md' },
          flexRow('ราคา', formatMoneyTh(booking.price)),
          flexRow('มัดจำแล้ว', formatMoneyTh(booking.deposit)),
          flexRow('คงเหลือ', formatMoneyTh(booking.remaining))
        ]
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: 'ขอบคุณที่ไว้วางใจเราค่ะ 🙏', size: 'sm', color: '#888888', align: 'center', wrap: true }
        ]
      }
    }
  };
}

function flexRow(label, value) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#999999', size: 'sm', flex: 2 },
      { type: 'text', text: String(value), color: '#333333', size: 'sm', flex: 3, wrap: true, align: 'end' }
    ]
  };
}

function formatThaiDate(dateVal) {
  if (!dateVal) return '-';
  var d = new Date(dateVal);
  var months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function formatMoneyTh(num) {
  num = Number(num) || 0;
  return num.toLocaleString('th-TH') + ' บาท';
}

function jobTypeLabelTh(type) {
  var map = {
    Wedding: 'งานแต่งงาน', Ordination: 'งานบวช', Funeral: 'งานศพ',
    Corporate: 'งานองค์กร', Birthday: 'งานวันเกิด', Concert: 'คอนเสิร์ต', Custom: 'อื่นๆ'
  };
  return map[type] || type || '-';
}

// ---------- CAMPAIGN / SEGMENTS ----------

// แบ่งกลุ่มลูกค้าสำหรับส่ง "แคมเปญ/โฆษณา" เท่านั้น — บังคับกรองเฉพาะสมาชิกที่ยินยอมรับการตลาดแล้วเสมอ
// (ข้อความเชิงธุรกรรม เช่น ยืนยันการจอง ไม่ผ่านฟังก์ชันนี้ ใช้ sendBookingConfirmation แยกต่างหาก จึงไม่ต้องเช็คความยินยอม)
function getMemberIdsBySegment(segment) {
  var members = listMembers().filter(function (m) {
    return m.isFriend && !m.isBlocked && m.marketingConsent;
  });
  var allowedIds = {};
  members.forEach(function (m) { allowedIds[m.lineUserId] = true; });

  var customers = listCustomers({});
  var bookings = listBookings({});

  function memberIdOfBooking(b) {
    var cust = customers.find(function (c) { return c.id === b.customerId; });
    return cust && cust.memberId ? cust.memberId : null;
  }

  switch (segment) {
    case 'all':
    case 'marketing_consent':
      return members.map(function (m) { return m.lineUserId; });

    case 'has_booked': {
      var bookedIds = {};
      bookings.forEach(function (b) {
        var mid = memberIdOfBooking(b);
        if (mid && allowedIds[mid]) bookedIds[mid] = true;
      });
      return Object.keys(bookedIds);
    }

    case 'never_booked': {
      var booked = {};
      bookings.forEach(function (b) {
        var mid = memberIdOfBooking(b);
        if (mid) booked[mid] = true;
      });
      return members.filter(function (m) { return !booked[m.lineUserId]; }).map(function (m) { return m.lineUserId; });
    }

    case 'inactive_6_months': {
      var sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      var lastBookingByMember = {};
      bookings.forEach(function (b) {
        var mid = memberIdOfBooking(b);
        if (!mid || !allowedIds[mid]) return;
        var d = new Date(b.date);
        if (!lastBookingByMember[mid] || d > lastBookingByMember[mid]) lastBookingByMember[mid] = d;
      });
      return Object.keys(lastBookingByMember).filter(function (id) { return lastBookingByMember[id] < sixMonthsAgo; });
    }

    default:
      return [];
  }
}

// ส่งแคมเปญให้กลุ่มลูกค้าที่กำหนด
function sendCampaign(segment, messages) {
  var ids = getMemberIdsBySegment(segment);
  if (ids.length === 0) return { success: true, recipientCount: 0, note: 'ไม่พบสมาชิกที่ตรงกลุ่มนี้' };
  var result = pushToMembers(ids, messages);
  logAudit('admin', 'send_campaign', 'Segment:' + segment, null, { recipientCount: ids.length });
  return result;
}

// ---------- DASHBOARD ----------

function getDashboardData() {
  var allBookings = listBookings({});
  // Dashboard แสดงเฉพาะงานที่ยังต้องดำเนินการ งานเสร็จแล้วไปอยู่ในหน้า "ประวัติงาน"
  // แต่ยังนับงานเสร็จแล้วในรายได้/จำนวนงานของเดือน และกิจกรรมล่าสุดได้ตามปกติ
  var bookings = allBookings.filter(function (b) { return b.status !== 'cancelled' && b.status !== 'completed'; });
  var reportBookings = allBookings.filter(function (b) { return b.status !== 'cancelled'; });
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var todayJobs = bookings.filter(function (b) {
    var d = new Date(b.date); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  var upcoming = bookings.filter(function (b) { return new Date(b.date) > today; }).slice(0, 5);

  var thisMonth = reportBookings.filter(function (b) {
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
    completedCount: allBookings.filter(function (b) { return b.status === 'completed'; }).length,
    recentActivities: allBookings.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 8)
  };
}

// ---------- ANALYTICS ----------

function getAnalytics(params) {
  // ไม่นับงานที่ยกเลิกแล้วในสถิติรายได้/จำนวนงาน/ลูกค้า/จังหวัด
  var bookings = listBookings({}).filter(function (b) { return b.status !== 'cancelled'; });
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
