# Deployment and setup

## Google Sheet

The spreadsheet needs these tabs and ranges:

- `Current`: order table in A:L, rows 5–500. C (Product) marks a row as occupied. J (Profit) and K (Steadfast link) are formula columns and the app never writes to them.
- `Price chart`: product names and unit prices in A4:B100.

## Configure Google Apps Script

Apps Script only reads the price list and writes order data to `Current`. Parcel creation is done by the browser app directly against Steadfast.

1. Open the Google Sheet and choose **Extensions → Apps Script**.
2. Replace the project code with `apps-script/Code.gs` and save. `apps-script/sheetConfig.gs` is a schema reference; the deployed `Code.gs` already includes the needed configuration.
3. Choose **Deploy → New deployment → Web app**.
4. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then deploy and authorize the requested spreadsheet access.
5. Copy the deployed URL ending in `/exec` into `SHEET_WEB_APP_URL` in `app.js`.
6. Whenever Apps Script code changes, choose **Deploy → Manage deployments → Edit → New version → Deploy**.

There is no installable trigger. Do not add one for order entry. Apps Script does not need Steadfast keys, and no code needs to be added to create courier parcels. Its endpoints are `GET /exec?action=products`, `POST /exec` for a new order, and a second `POST /exec` with `action: "updateParcel"` after the browser receives a successful parcel response.

## Configure Steadfast in the app

1. Deploy the updated static app to GitHub Pages.
2. Open the app and sign in.
3. Open **Settings**, enter the API Key and Secret Key from the Steadfast merchant API settings, and save. The app retains them in `sessionStorage` for that browser session; closing the session clears them.
4. Select an Online order and enable **Create Steadfast parcel** to submit the documented `POST https://portal.packzy.com/api/v1/create_order` request. The invoice is the next order ID returned by Apps Script. The app uses Steadfast's returned consignment ID, tracking code, tracking link, and status.

The published frontend must not contain hard-coded API credentials. A direct browser request necessarily sends the keys to Steadfast from the user's browser; they are visible to that browser session and can be inspected by its user. Browser access to Steadfast also depends on the API allowing cross-origin requests from the Pages origin. If Steadfast blocks browser CORS, a direct request from a static Pages app cannot work; the API owner would need to allow the origin or the app would need a trusted server-side proxy.

The Render/Node service is not involved in parcel creation. It remains available for the independent parcel status lookup and scraper.

## GitHub Pages

Commit and push the app files to the branch/folder configured in repository **Settings → Pages**. The app uses the Apps Script `/exec` URL configured in `app.js`. The existing frontend login (`admin` / `order123`) is static and intended only for this single-user tool.

## Local development

```powershell
npm install
npm start
```

Open `http://localhost:3000`. The Node service provides the app locally and the separate status lookup; parcel creation still calls Steadfast from the browser.

## Order ID, description, and note

The optional Order ID / invoice field is written to column E and used as the Steadfast invoice. If blank, Apps Script keeps its normal increment-from-last-ID behavior. Item description is generated from the shoe, size, unit price, selling price, delivery charge, and extra cost; it remains editable and is sent as Steadfast `item_description`. The optional Note is sent as Steadfast `note`. These two text fields are not saved in the Current sheet because it has no columns for them.
