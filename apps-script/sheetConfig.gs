// Reference schema for the deployed Apps Script endpoint (Code.gs).
const ORDER_ENTRY_CONFIG = {
  SPREADSHEET_ID: '1_3r-eRoJKzeS985_7Bc1Sruv28q1WOsRstFo_K5a2-E',
  ORDER_SHEET_NAME: 'Current',
  ORDER_START_ROW: 5,
  ORDER_END_ROW: 500,
  ORDER_COLUMNS: {
    name: 1,
    mobile: 2,
    product: 3,
    unitPrice: 4,
    id: 5,
    deliveryCharge: 6,
    extraCost: 7,
    parcelId: 8,
    sellingPrice: 9,
    profitFormula: 10,
    steadfastLinkFormula: 11,
    status: 12,
  },
  PRICE_SHEET_NAME: 'Price chart',
  PRICE_RANGE_A1: 'A4:B100',
};
