(function (global) {
  const FIELD_CONFIG = {
    ORDER_TYPES: ['online', 'direct'],
    ORDER_ROWS: { first: 5, last: 500, occupiedBy: 'shoeModel' },
    FIELDS: {
      name: { label: 'Customer name', column: 'A', requiredForSteadfast: true, onlineOnly: true },
      mobile: { label: 'Mobile', column: 'B', requiredForSteadfast: true, onlineOnly: true },
      shoeModel: { label: 'Shoe model', column: 'C', exactPriceLookup: true },
      unitPrice: { label: 'Unit price', column: 'D', source: 'Price chart!A4:B100' },
      orderId: { label: 'ID', column: 'E', incrementFor: ['online', 'direct'] },
      deliveryCharge: { label: 'Delivery charge', column: 'F' },
      extraCost: { label: 'Extra cost (If any)', column: 'G' },
      parcelId: { label: 'Parcel ID', column: 'H' },
      sellingPrice: { label: 'Selling price', column: 'I' },
      profit: { label: 'Profit', column: 'J', formula: true, write: false },
      steadfastLink: { label: 'Steadfast link', column: 'K', formula: true, write: false },
      status: { label: 'Status', column: 'L' },
      address: { label: 'Delivery address', requiredForSteadfast: true, onlineOnly: true },
      size: { label: 'Size' },
    },
    PRICE_LIST: { sheet: 'Price chart', range: 'A4:B100', productColumn: 'A', unitPriceColumn: 'B' },
    STEADFAST: {
      createOrderEndpoint: 'https://portal.packzy.com/api/v1/create_order',
      invoiceField: 'orderId',
      credentialStorage: 'sessionStorage',
    },
  };
  global.ORDER_FIELD_CONFIG = FIELD_CONFIG;
  global.ORDER_MANAGEMENT = global.ORDER_MANAGEMENT || {};
  global.ORDER_MANAGEMENT.config = FIELD_CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = FIELD_CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
