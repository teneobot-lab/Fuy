
/**
 * POWER INVENTORY BACKEND - GOOGLE APPS SCRIPT
 * Versi: 3.0 (Flattened Row Format - No JSON Blobs)
 * Deskripsi: Menyimpan data per baris detail untuk Transaksi dan Reject.
 */

const HEADERS = {
  Inventory: ['id', 'sku', 'name', 'category', 'quantity', 'baseUnit', 'minLevel', 'unitPrice', 'location', 'status', 'lastUpdated', 'altUnit1', 'ratio1', 'altUnit2', 'ratio2'],
  Transactions: ['id', 'date', 'type', 'notes', 'timestamp', 'supplierName', 'poNumber', 'riNumber', 'itemId', 'itemName', 'qtyInput', 'unit', 'totalBase'],
  RejectInventory: ['id', 'sku', 'name', 'baseUnit', 'unit2', 'ratio2', 'unit3', 'ratio3', 'lastUpdated'],
  Rejects: ['id', 'date', 'notes', 'timestamp', 'itemId', 'itemName', 'sku', 'qty', 'unit', 'reason'],
  Suppliers: ['id', 'name', 'contactPerson', 'email', 'phone', 'address'],
  Users: ['id', 'name', 'username', 'password', 'role', 'status', 'lastLogin'],
  Settings: ['key', 'value']
};

// --- MAIN HANDLERS ---

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    return responseJSON({ 
      status: 'success', 
      data: {
        inventory: getInventoryData(ss),
        transactions: getTransactionData(ss),
        reject_inventory: getSimpleSheetData(ss, 'RejectInventory'),
        rejects: getRejectData(ss),
        suppliers: getSimpleSheetData(ss, 'Suppliers'),
        users: getSimpleSheetData(ss, 'Users'),
        settings: getSheetSettings(ss)
      }, 
      source: 'google_sheets' 
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { type, data } = payload;
    const ss = getSpreadsheet();

    if (type === 'full_sync') {
      saveInventoryData(ss, data.inventory);
      saveTransactionData(ss, data.transactions);
      saveSimpleSheetData(ss, 'RejectInventory', data.rejectItems);
      saveRejectData(ss, data.rejectLogs);
      saveSimpleSheetData(ss, 'Suppliers', data.suppliers);
      saveSimpleSheetData(ss, 'Users', data.users);
      saveSheetSettings(ss, data.settings);
      return responseJSON({ status: 'success', message: 'Full Sync Berhasil (Format Row)' });
    }

    // Individual Sync Mapping
    if (type === 'inventory') saveInventoryData(ss, data);
    else if (type === 'transactions') saveTransactionData(ss, data);
    else if (type === 'reject_inventory') saveSimpleSheetData(ss, 'RejectInventory', data);
    else if (type === 'rejects') saveRejectData(ss, data);
    else if (type === 'suppliers') saveSimpleSheetData(ss, 'Suppliers', data);
    else if (type === 'users') saveSimpleSheetData(ss, 'Users', data);
    else if (type === 'settings') saveSheetSettings(ss, data);

    return responseJSON({ status: 'success', message: 'Sync ' + type + ' Berhasil' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// --- LOGIKA KHUSUS INVENTORY (Flatten Alternative Units) ---

function saveInventoryData(ss, data) {
  const sheet = ss.getSheetByName('Inventory');
  clearSheet(sheet);
  if (!data || data.length === 0) return;

  const rows = data.map(item => {
    const alts = item.alternativeUnits || [];
    return [
      item.id, item.sku, item.name, item.category, item.quantity, item.baseUnit,
      item.minLevel, item.unitPrice, item.location, item.status, item.lastUpdated,
      alts[0] ? alts[0].name : '', alts[0] ? alts[0].ratio : '',
      alts[1] ? alts[1].name : '', alts[1] ? alts[1].ratio : ''
    ];
  });
  sheet.getRange(2, 1, rows.length, HEADERS.Inventory.length).setValues(rows);
}

function getInventoryData(ss) {
  const values = ss.getSheetByName('Inventory').getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).map(row => {
    const alts = [];
    if (row[11]) alts.push({ name: row[11], ratio: Number(row[12]) });
    if (row[13]) alts.push({ name: row[13], ratio: Number(row[14]) });
    return {
      id: row[0], sku: row[1], name: row[2], category: row[3], quantity: Number(row[4]),
      baseUnit: row[5], minLevel: Number(row[6]), unitPrice: Number(row[7]),
      location: row[8], status: row[9], lastUpdated: row[10], alternativeUnits: alts
    };
  });
}

// --- LOGIKA KHUSUS TRANSAKSI (Flatten Items to Rows) ---

function saveTransactionData(ss, data) {
  const sheet = ss.getSheetByName('Transactions');
  clearSheet(sheet);
  if (!data || data.length === 0) return;

  const rows = [];
  data.forEach(tx => {
    tx.items.forEach(it => {
      rows.push([
        tx.id, tx.date, tx.type, tx.notes || '', tx.timestamp, tx.supplierName || '',
        tx.poNumber || '', tx.riNumber || '', it.itemId, it.itemName,
        it.quantityInput, it.selectedUnit, it.totalBaseQuantity
      ]);
    });
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, HEADERS.Transactions.length).setValues(rows);
}

function getTransactionData(ss) {
  const values = ss.getSheetByName('Transactions').getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const txMap = {};
  values.slice(1).forEach(row => {
    const id = row[0];
    if (!txMap[id]) {
      txMap[id] = {
        id: id, date: row[1], type: row[2], notes: row[3], timestamp: row[4],
        supplierName: row[5], poNumber: row[6], riNumber: row[7], items: []
      };
    }
    txMap[id].items.push({
      itemId: row[8], itemName: row[9], quantityInput: Number(row[10]),
      selectedUnit: row[11], totalBaseQuantity: Number(row[12])
    });
  });
  return Object.values(txMap);
}

// --- LOGIKA KHUSUS REJECT (Flatten Items to Rows) ---

function saveRejectData(ss, data) {
  const sheet = ss.getSheetByName('Rejects');
  clearSheet(sheet);
  if (!data || data.length === 0) return;

  const rows = [];
  data.forEach(log => {
    log.items.forEach(it => {
      rows.push([
        log.id, log.date, log.notes || '', log.timestamp, it.itemId, 
        it.itemName, it.sku, it.quantity, it.unit, it.reason
      ]);
    });
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, HEADERS.Rejects.length).setValues(rows);
}

function getRejectData(ss) {
  const values = ss.getSheetByName('Rejects').getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const logMap = {};
  values.slice(1).forEach(row => {
    const id = row[0];
    if (!logMap[id]) {
      logMap[id] = { id: id, date: row[1], notes: row[2], timestamp: row[3], items: [] };
    }
    logMap[id].items.push({
      itemId: row[4], itemName: row[5], sku: row[6],
      quantity: Number(row[7]), unit: row[8], reason: row[9]
    });
  });
  return Object.values(logMap);
}

// --- UTILS DATABASE ---

function getSimpleSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = HEADERS[name];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function saveSimpleSheetData(ss, name, data) {
  const sheet = ss.getSheetByName(name);
  clearSheet(sheet);
  if (!data || data.length === 0) return;
  const headers = HEADERS[name];
  const rows = data.map(item => headers.map(h => item[h] || ''));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function getSheetSettings(ss) {
  const values = ss.getSheetByName('Settings').getDataRange().getValues();
  const settings = {};
  values.slice(1).forEach(row => settings[row[0]] = row[1]);
  return settings;
}

function saveSheetSettings(ss, settings) {
  const sheet = ss.getSheetByName('Settings');
  clearSheet(sheet);
  const rows = Object.keys(settings).map(k => [k, settings[k]]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => {
    if (!ss.getSheetByName(name)) {
      const s = ss.insertSheet(name);
      s.appendRow(HEADERS[name]);
      s.setFrozenRows(1);
    }
  });
  return ss;
}

function clearSheet(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
