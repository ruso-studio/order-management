# Deployment and Testing Guide

This project has a static frontend for GitHub Pages and a Node/Express backend for the Steadfast scraper. GitHub Pages cannot execute the backend API.

## Project path

- Workspace: `/workspaces/order-management`
- Main app file: `/workspaces/order-management/index.html`
- Frontend logic: `/workspaces/order-management/app.js`
- Styling: `/workspaces/order-management/styles.css`
- Google Apps Script: `/workspaces/order-management/apps-script/Code.gs`
- Sheet link: `https://docs.google.com/spreadsheets/d/1_3r-eRoJKzeS985_7Bc1Sruv28q1WOsRstFo_K5a2-E/edit?gid=204875660#gid=204875660`

## 1. Local run and test

From the project folder:

```bash
cd /workspaces/order-management
npm install
cp .env.example .env
# Set STEADFAST_COOKIE in .env, then:
npm start
```

Then open:

- `http://localhost:3000`

Check the backend with `http://localhost:3000/health`.

Default login details:

- Username: `admin`
- Password: `order123`

The login is stored in a browser cookie for 7 days.

## 2. Deploy the scraper API

1. Create a web service on Render connected to `ruso-studio/order-management`, or use the included `render.yaml` blueprint. The Dockerfile installs Puppeteer's Chromium runtime libraries.
2. Set the secret environment variable `STEADFAST_COOKIE` in the hosting provider dashboard. Never commit `.env` or place the cookie in frontend JavaScript.
3. Deploy using the Dockerfile (configured automatically by the blueprint). The image explicitly installs the Chrome version required by Puppeteer.
   If the existing Render service is configured with the Node runtime instead, set its build command to `npm ci` so the `postinstall` script installs Chrome, or recreate it from the `render.yaml` Docker blueprint.
4. Confirm `https://YOUR-BACKEND-URL/health` returns `{"status":"ok"}`.

Call the live API at `https://YOUR-BACKEND-URL/api/get_status_by_phone`:

```bash
curl -X POST https://YOUR-BACKEND-URL/api/get_status_by_phone \
   -H 'Content-Type: application/json' \
   -d '{"phone":"01717754195"}'
```

The Steadfast cookie is a browser session and can expire. Update the hosting provider secret when that happens.

## 3. Configure the Google Sheets endpoint

1. Open the Google Sheet linked above.
2. Open Apps Script from the sheet or from the script project.
3. Paste the content of `/workspaces/order-management/apps-script/Code.gs` into the script editor.
4. Save the project.
5. Deploy it as a Web App:
   - Execute as: Me
   - Who has access: Anyone
   - Copy the final Web App URL after deployment
6. Update the frontend value in `/workspaces/order-management/app.js`:

```js
const APP_CONFIG = {
  SHEET_WEB_APP_URL: 'https://script.google.com/macros/s/PASTE_YOUR_DEPLOYED_WEB_APP_ID/exec',
};
```

Important: if the browser still shows a CORS error, it usually means the script was not deployed as a public web app, or the URL in the frontend is still the old script URL.

## 4. GitHub Pages deployment

1. Push the repo to GitHub.
2. Open the repo settings.
3. Go to Pages.
4. Under Source, choose the main branch and root folder.
5. Save the settings.
6. GitHub Pages will give a public URL like:

```text
https://ruso-studio.github.io/order-management/
```

7. Open the deployed page.
8. Log in with:
   - Username: `admin`
   - Password: `order123`
9. Confirm the Apps Script URL is the current public web app URL before submitting.

## 5. Sheet structure and matching

The Google Sheet header row must contain these columns in order:

- Order ID
- Customer name
- Product
- Size
- Delivary address
- Delivary charge paid status
- Order Price
- Order date
- Additional accessories
- Package ready
- Out for delivary
- Order status
- Delivary ID
- Delivary status link
- Order delivered date
- Customer no
- Note

The app maps the values using the constants in the frontend and script code.

## 6. Test flow

1. Run the app locally or on GitHub Pages.
2. Login with the static credentials.
3. Paste a sample order message in any freeform line-by-line format, for example:

```text
John Doe
john@example.com
Acme Corporation
This is a description
40
2500
```

4. Click Parse order.
5. Confirm the values map into the editable field rows.
6. Change the field dropdown from the left-hand label if needed.
7. Click Submit order.
8. Confirm the API responds with a success message and order ID.

## 7. Useful notes

- The app is intentionally simple and mobile-first.
- The login is static and not secure by design, because this is a single-user workflow.
- The cookie lasts 7 days.
- All field mappings and defaults are kept in constants so they are easy to maintain.
- The Google Apps Script does an OPTIONS preflight response so browser submissions from GitHub Pages do not fail on CORS.
