# Order Management

A simple mobile-first order entry app for a single user.

## Quick start

```bash
cd /workspaces/order-management
STEADFAST_COOKIE='your Steadfast browser cookie' npm start
```

Open:

- `http://localhost:3000`

The API endpoint is `POST /api/get_status_by_phone` with a JSON body such as:

```json
{ "phone": "01717754195" }
```

Set `STEADFAST_COOKIE` to the raw authenticated cookie header from Steadfast. Keep it server-side; it is not sent in API requests.

Login:

- Username: `admin`
- Password: `order123`

## Deploy

- Update the Google Apps Script URL in `app.js`
- Deploy the Apps Script as a Web App with:
  - Execute as: Me
  - Who has access: Anyone
- Publish the static app on GitHub Pages

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full production and testing instructions.

