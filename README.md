# Order Management

A simple mobile-first order entry app for a single user.

## Quick start

```bash
cd /workspaces/order-management
cp .env.example .env
# Set STEADFAST_COOKIE in .env, then:
npm start
```

Open:

- `http://localhost:3000`

The API endpoint is `POST /api/get_status_by_phone` with a JSON body such as:

```json
{ "phone": "01717754195" }
```

Set `STEADFAST_COOKIE` to the raw authenticated cookie header from Steadfast. Keep it server-side; it is not sent in API requests.

The API runs on the Node backend, not on GitHub Pages. Deploy the backend using `render.yaml` and `Dockerfile` or another Node hosting service with Puppeteer system libraries, then call its URL:

```text
POST https://your-backend-host.example/api/get_status_by_phone
Content-Type: application/json
```

GitHub Pages remains available at `https://ruso-studio.github.io/order-management/` for the static frontend. The API cannot use that URL because GitHub Pages cannot run Express or Puppeteer.

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

