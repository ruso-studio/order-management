(function (global) {
  const FIELD_ALIASES = {
    name: ['name', 'customer name', 'নাম', 'ক্রেতার নাম'],
    mobile: ['mobile', 'phone', 'phone number', 'contact', 'মোবাইল', 'মোবাইল নম্বর', 'ফোন', 'ফোন নম্বর'],
    address: ['address', 'delivery address', 'ঠিকানা', 'ডেলিভারি ঠিকানা'],
    shoeModel: ['shoe', 'shoe model', 'shoe name', 'product', 'model', 'জুতা', 'জুতার মডেল', 'মডেল'],
    size: ['size', 'সাইজ'],
    sellingPrice: ['price', 'selling price', 'amount', 'দাম', 'মূল্য', 'বিক্রয় মূল্য'],
    deliveryCharge: ['delivery amount', 'delivery charge', 'delivery fee', 'ডেলিভারি চার্জ', 'ডেলিভারি খরচ'],
    unitPrice: ['unit price', 'raw price', 'ক্রয় মূল্য'],
    extraCost: ['extra cost', 'অতিরিক্ত খরচ'],
    parcelId: ['parcel id', 'consignment id', 'পার্সেল আইডি'],
  };
  const clean = (value) => String(value || '').trim().toLocaleLowerCase().replace(/[：]/g, ':').replace(/\s+/g, ' ');
  const normalizeDigits = (value) => String(value || '').replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
  const normalizeAmount = (value) => normalizeDigits(value).replace(/[,৳\s]/g, '').replace(/[^0-9.-]/g, '');
  function detectFieldKey(label) {
    const key = clean(label).replace(/[:\-]+$/, '');
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((alias) => key === clean(alias))) return field;
    }
    return null;
  }
  function detectOrderType(message) {
    const text = String(message || '').toLocaleLowerCase();
    if (/direct\s*(sale|order)|direct sell|ড(?:ি|াই)রেক্ট\s*(সেল|অর্ডার)|সরাসরি\s*(বিক্রি|অর্ডার)/i.test(text)) return 'direct';
    if (/to place an order|online order|অর্ডারটি নিশ্চিত|অর্ডার করতে|অর্ডার দিতে/i.test(text)) return 'online';
    const lines = String(message).split(/\r?\n/);
    const hasCustomerFields = ['name', 'mobile', 'address'].some((field) => lines.some((line) => {
      const match = line.match(/^\s*([^:：]+)\s*[:：]/);
      return match && detectFieldKey(match[1]) === field;
    }));
    if (hasCustomerFields) return 'online';
    const hasShoeAndPrice = ['shoeModel', 'sellingPrice'].every((field) => lines.some((line) => {
      const match = line.match(/^\s*([^:：]+)\s*[:：]/);
      return match && detectFieldKey(match[1]) === field;
    }));
    return hasShoeAndPrice ? 'direct' : 'online';
  }
  function parseOrderMessage(message = '') {
    const result = { name: '', mobile: '', address: '', shoeModel: '', size: '', sellingPrice: '', deliveryCharge: '', unitPrice: '', extraCost: '', parcelId: '', orderType: detectOrderType(message) };
    for (const line of String(message || '').split(/\r?\n/)) {
      const match = line.match(/^\s*([^:：]+?)\s*[:：]\s*(.*?)\s*$/);
      if (!match) continue;
      const field = detectFieldKey(match[1]);
      if (field) result[field] = ['sellingPrice', 'deliveryCharge', 'unitPrice', 'extraCost'].includes(field) ? normalizeAmount(match[2]) : field === 'mobile' ? normalizeDigits(match[2].trim()) : match[2].trim();
    }
    return result;
  }
  const api = { FIELD_ALIASES, detectFieldKey, detectOrderType, parseOrderMessage };
  global.ORDER_PARSER = api;
  global.ORDER_MANAGEMENT = global.ORDER_MANAGEMENT || {};
  global.ORDER_MANAGEMENT.parser = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
