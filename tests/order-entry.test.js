const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appsScript = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'Code.gs'),
  'utf8',
);
const sheetRows = [
  ['Product A', '', '1001'],
  ['Product B', '', 'ORD-1003'],
  ['', '', ''],
  ['Product C', '', 'ORD-1002'],
];
const sheetWrites = [];
const sheet = {
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      getDisplayValues() {
        if (column === 3 && columnCount === 1)
          return sheetRows.map(([product]) => [product]);
        if (column === 3 && columnCount === 3)
          return sheetRows.map((values) => values);
        return [];
      },
      getDisplayValue() {
        return row === 5 && column === 5 ? 'ORD-1001' : '';
      },
      setValue(value) {
        sheetWrites.push({ row, column, value });
      },
    };
  },
};
const appsSandbox = {
  LockService: {
    getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
  },
  SpreadsheetApp: {
    openById: () => ({ getSheetByName: () => sheet }),
    flush() {},
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput(text) {
      return { text, setMimeType() { return this; } };
    },
  },
};
vm.createContext(appsSandbox);
vm.runInContext(appsScript, appsSandbox);
assert.strictEqual(appsSandbox.findNextOrderRow(sheet), 9);
assert.strictEqual(appsSandbox.getNextOrderId(sheet), 'ORD-1004');
assert.strictEqual(
  appsSandbox.getNextOrderId({
    getRange() {
      return { getDisplayValues: () => [['Product A', '', '']] };
    },
  }),
  'ORD-1001',
);

const parcelResponse = appsSandbox.doPost({
  postData: {
    contents: JSON.stringify({
      action: 'updateParcel',
      row: 5,
      orderId: 'ORD-1001',
      parcelId: '123456',
      status: 'in_review',
    }),
  },
});
assert.strictEqual(JSON.parse(parcelResponse.text).success, true);
assert.deepStrictEqual(sheetWrites, [
  { row: 5, column: 8, value: '123456' },
  { row: 5, column: 12, value: 'in_review' },
]);

let submittedOrder;
const appSource = fs
  .readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8')
  .replace(
    /^import \{ password, api_creds \} from "\.\/cred\.js";\s*/,
    'const password = ""; const api_creds = { apiKey: "api", apiSecret: "secret" };',
  )
  .concat('\nglobalThis.__createParcel = createParcel;');
const appSandbox = {
  document: { addEventListener() {} },
  sessionStorage: { getItem: () => 'test-key' },
  fetch: async (_url, options) => {
    submittedOrder = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        status: 200,
        consignment: {
          consignment_id: 123456,
          tracking_code: 'TRK123',
          tracking_link: 'https://example.test/track',
          status: 'in_review',
        },
      }),
    };
  },
};
vm.createContext(appSandbox);
vm.runInContext(appSource, appSandbox);

(async () => {
  const parcel = await appSandbox.__createParcel(
    {
      sellingPrice: '2500',
      deliveryCharge: '120',
      mobile: '01712345678',
      name: 'Customer',
      address: 'Dhaka',
      description: 'Shoe',
      note: '',
    },
    'ORD-1004',
  );
  assert.strictEqual(submittedOrder.cod_amount, 2500);
  assert.strictEqual(parcel.consignmentId, 123456);
  assert.strictEqual(parcel.parcelStatus, 'in_review');
  console.log('Order entry regression tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
