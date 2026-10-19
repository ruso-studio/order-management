# Order Management

Desktop order entry for Direct sales and Online orders, backed by Google Sheets. The GitHub Pages app talks to Google Apps Script for sheet operations and calls the Steadfast API directly from the browser when parcel creation is selected.

## Order entry

- Bilingual English/Bengali templates with parsing for Direct and Online orders.
- Product suggestions and unit prices loaded from `Price chart!A4:B100` into browser memory.
- Orders written to rows 5–500 of the `Current` tab. Formula columns J (Profit) and K (Steadfast link) are left untouched.
- Steadfast parcels use the documented `POST https://portal.packzy.com/api/v1/create_order` request. Enter the API and Secret keys from **Settings** in the app; they are held in browser `sessionStorage` and are not part of the deployed source or Apps Script.

## Configure and deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Google Apps Script deployment steps, GitHub Pages setup, and Steadfast credential configuration.

For local development:

```powershell
npm install
npm start
```

The Node service remains only for the separate parcel status lookup. It is not used for parcel creation.
