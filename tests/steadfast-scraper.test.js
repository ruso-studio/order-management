const assert = require('assert');
const { parseCookieHeader } = require('../utils/steadfast_scrapper');

const cookies = parseCookieHeader(
  'cf_clearance=clearance-token; sfc_user_session=session%3Dvalue; XSRF-TOKEN=token'
);

assert.deepStrictEqual(
  cookies.map(({ name }) => name),
  ['cf_clearance', 'sfc_user_session', 'XSRF-TOKEN']
);
assert.strictEqual(cookies[1].value, 'session%3Dvalue');
assert.throws(() => parseCookieHeader('not-a-cookie'), /cookie header is missing or malformed/i);

console.log('Steadfast cookie parsing test passed');