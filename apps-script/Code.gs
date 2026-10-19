const SPREADSHEET_ID = "1_3r-eRoJKzeS985_7Bc1Sruv28q1WOsRstFo_K5a2-E";
const ORDER_SHEET_NAME = "Current";
const PRICE_SHEET_NAME = "Price chart";
const ORDER_START_ROW = 5;
const ORDER_END_ROW = 500;
const PRICE_RANGE_A1 = "A4:B100";

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "products") {
    try {
      return jsonResponse({ success: true, products: getProducts() });
    } catch (error) {
      return jsonResponse({
        success: false,
        message: error.message || "Unable to read product prices.",
      });
    }
  }
  return jsonResponse({ success: true, message: "Order API ready." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const payload = parsePostBody(e);
    if (payload.action === "updateParcel") {
      const sheet = getOrdersSheet();
      const row = Number(payload.row);
      const orderId = clean(payload.orderId);
      if (
        !Number.isInteger(row) ||
        row < ORDER_START_ROW ||
        row > ORDER_END_ROW
      )
        throw new Error("Invalid order row for parcel update.");
      if (clean(sheet.getRange(row, 5).getDisplayValue()) !== orderId)
        throw new Error(
          "Order ID no longer matches the target row. Parcel details were not written to the sheet.",
        );
      sheet.getRange(row, 8).setValue(clean(payload.parcelId));
      sheet.getRange(row, 12).setValue(clean(payload.status));
      SpreadsheetApp.flush();
      return jsonResponse({
        success: true,
        orderId: orderId,
        row: row,
        message: "Parcel details saved.",
      });
    }
    if (payload.orderType !== "direct" && payload.orderType !== "online") {
      throw new Error("Choose an order type before saving.");
    }
    if (payload.createSteadfast && payload.orderType !== "online") {
      throw new Error(
        "Steadfast parcel creation is only available for online orders.",
      );
    }

    const sheet = getOrdersSheet();
    const targetRow = findNextOrderRow(sheet);
    if (targetRow > ORDER_END_ROW)
      throw new Error(
        `The Current tab is full. Orders can be entered through row ${ORDER_END_ROW}.`,
      );
    const orderId = clean(payload.orderId) || getNextOrderId(sheet, targetRow - 1);
    // Product is the sheet's occupancy marker (column C); preserve blank form submissions with an explicit marker.
    const model = clean(payload.shoeModel) || "Unspecified product";
    const customerName =
      clean(payload.name) ||
      (payload.orderType === "direct" ? "Direct sell" : "");
    const values = [
      customerName,
      clean(payload.mobile),
      model,
      clean(payload.unitPrice),
      orderId,
      clean(payload.deliveryCharge),
      clean(payload.extraCost),
      clean(payload.parcelId),
      clean(payload.sellingPrice),
    ];

    // J (Profit) and K (Steadfast link) are formula columns. Write around them.
    sheet.getRange(targetRow, 1, 1, 9).setValues([values]);
    sheet.getRange(targetRow, 12).setValue(clean(payload.status));
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      orderId: orderId,
      row: targetRow,
      message: "Order saved to Current.",
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : "Unable to save order.",
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrdersSheet() {
  const sheet = getSpreadsheet().getSheetByName(ORDER_SHEET_NAME);
  if (!sheet)
    throw new Error(
      "The Current tab was not found. Create it and add the specified columns in A:L before submitting orders.",
    );
  return sheet;
}

function getProducts() {
  const sheet = getSpreadsheet().getSheetByName(PRICE_SHEET_NAME);
  if (!sheet) throw new Error("The Price chart tab was not found.");
  return sheet
    .getRange(PRICE_RANGE_A1)
    .getDisplayValues()
    .filter(
      (row) =>
        clean(row[0]) &&
        clean(row[1]) &&
        !/^product name$/i.test(clean(row[0])),
    )
    .map((row) => ({ name: clean(row[0]), price: normalizeAmount(row[1]) }));
}

function findNextOrderRow(sheet) {
  const values = sheet
    .getRange(ORDER_START_ROW, 3, ORDER_END_ROW - ORDER_START_ROW + 1, 1)
    .getDisplayValues();
  let lastOccupied = ORDER_START_ROW - 1;
  values.forEach((row, index) => {
    if (clean(row[0])) lastOccupied = ORDER_START_ROW + index;
  });
  return lastOccupied + 1;
}

function getNextOrderId(sheet, lastOccupiedRow) {
  if (lastOccupiedRow < ORDER_START_ROW) return 1;
  const value = Number(
    clean(sheet.getRange(lastOccupiedRow, 5).getDisplayValue()),
  );
  if (!Number.isFinite(value))
    return 1000
  return value + 1;
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}
function normalizeAmount(value) {
  return clean(value)
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[,৳\s]/g, "")
    .replace(/[^0-9.-]/g, "");
}
