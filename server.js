require('dotenv').config();

const express = require('express');
const { scrapeByPhone } = require('./utils/steadfast_scrapper');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/get_status_by_phone', async (req, res) => {
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

  if (!phone) {
    return res.status(400).json({ error: 'phone is required.' });
  }

  if (!process.env.STEADFAST_COOKIE) {
    return res.status(503).json({ error: 'Steadfast session is not configured.' });
  }

  try {
    const result = await scrapeByPhone(phone, process.env.STEADFAST_COOKIE);
    return res.json(result);
  } catch (error) {
    console.error('Failed to get Steadfast status:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Unable to retrieve order status.',
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  return next(error);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Order management server listening on port ${port}`);
  });
}

module.exports = app;