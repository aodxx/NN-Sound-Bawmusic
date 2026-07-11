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
  STATS_CACHE: 'StatisticsCache'
};

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
      case 'createBooking': result = createBooking(params.data); break;
      case 'updateBooking': result = updateBooking(params.id, params.data); break;
      case 'deleteBooking': result = deleteBooking(params.id); break;
      case 'checkConflicts': result = checkConflicts(params.data); break;

      // Customers
      case 'listCustomers': result = listCustomers(params); break;
      case 'getCustomer': result = getCustomer(params.id); break;
      case 'createCustomer': result = createCustomer(params.data); break;
      case 'updateCustomer': result = updateCustomer(params.id, params.data); break;
      case 'deleteCustomer': result = deleteCustomer(params.id); break;
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
  if (props.getProperty('DB_INITIALIZED') === 'true') return;

  createSheetIfMissing(ss, SHEET_NAMES.CUSTOMERS, [
    'id', 'name', 'phone', 'line', 'facebook', 'address', 'mapLink', 'notes', 'createdAt'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.BOOKINGS, [
    'id', 'customerId', 'customerName', 'phone', 'line', 'venue', 'mapLink', 'province',
    'date', 'startTime', 'endTime', 'jobType', 'package', 'price', 'deposit', 'remaining',
    'remarks', 'equipment', 'status', 'createdAt', 'updatedAt'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.EQUIPMENT, [
    'id', 'name', 'category', 'availableQty', 'unit', 'remarks'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.TEMPLATES, [
    'id', 'name', 'jobType', 'equipmentPreset', 'notes'
  ]);
  createSheetIfMissing(ss, SHEET_NAMES.SETTINGS, ['key', 'value']);
  createSheetIfMissing(ss, SHEET_NAMES.STATS_CACHE, ['key', 'value', 'updatedAt']);

  seedSampleData(ss);
  seedDefaultSettings(ss);

  props.setProperty('DB_INITIALIZED', 'true');
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

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  }).filter(function (obj) { return obj.id; });
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

function createCustomer(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var id = genId();
  sheet.appendRow([id, data.name, data.phone, data.line || '', data.facebook || '', data.address || '', data.mapLink || '', data.notes || '', new Date()]);
  return { id: id };
}

function updateCustomer(id, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Customer not found');
  var headers = getHeaders(sheet);
  headers.forEach(function (h, i) {
    if (data.hasOwnProperty(h) && h !== 'id') {
      sheet.getRange(rowIdx, i + 1).setValue(data[h]);
    }
  });
  return { id: id };
}

function deleteCustomer(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CUSTOMERS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Customer not found');
  sheet.deleteRow(rowIdx);
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

function createBooking(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var id = genId();
  var price = Number(data.price) || 0;
  var deposit = Number(data.deposit) || 0;
  var remaining = price - deposit;

  sheet.appendRow([
    id, data.customerId || '', data.customerName || '', data.phone || '', data.line || '',
    data.venue || '', data.mapLink || '', data.province || '', data.date, data.startTime || '',
    data.endTime || '', data.jobType || '', data.package || '', price, deposit, remaining,
    data.remarks || '', JSON.stringify(data.equipment || []), data.status || 'confirmed',
    new Date(), new Date()
  ]);
  return { id: id };
}

function updateBooking(id, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Booking not found');

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
  return { id: id };
}

function deleteBooking(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.BOOKINGS);
  var rowIdx = findRowIndexById(sheet, id);
  if (rowIdx === -1) throw new Error('Booking not found');
  sheet.deleteRow(rowIdx);
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
