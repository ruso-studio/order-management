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

1. Keep `cred.js` alongside `app.js` in the GitHub Pages deployment, exporting `password` and `api_creds` with `apiKey` and `apiSecret` fields. `cred.js` credentials take priority.
2. Deploy the updated static app to GitHub Pages.
3. Open the app and sign in.
4. If `cred.js` credentials are unavailable, use **Settings** to enter backup keys; they are kept in `sessionStorage` for that browser session.
5. Select an Online order and enable **Create Steadfast parcel** to submit the documented `POST https://portal.packzy.com/api/v1/create_order` request.  The invoice is the next order ID returned by Apps Script (`ORD-1001`, `ORD-1002`, and so on, continuing after existing numeric or `ORD-` IDs in occupied rows). The app saves Steadfast's returned consignment ID to column H and status to column L; if the response omits a status, it saves `Pending`.

`cred.js` is shipped with the frontend, so its keys are visible to anyone who can access the deployed app; use this only if that exposure is acceptable. Settings are a session-only fallback. Browser access to Steadfast also depends on the API allowing cross-origin requests from the Pages origin.

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

The optional Order ID / invoice field is written to column E and used as the Steadfast invoice. If blank, Apps Script generates an `ORD-` ID by incrementing the highest numeric or `ORD-` ID among rows with a product in column C. New orders are written below the last row with a product in column C, even if there are blank rows between earlier orders. Item description is generated from the shoe, size, unit price, selling price (shown as “Price” in the description), delivery charge, and extra cost; it remains editable and is sent as Steadfast `item_description`. COD amount is the entered selling price only; the delivery charge is not added. The optional Note is sent as Steadfast `note`. These two text fields are not saved in the Current sheet because it has no columns for them.
