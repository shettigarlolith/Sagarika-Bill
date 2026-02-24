# Store Bill Generator

Frontend + backend app to create store bills with:
- Sl No
- Item
- Quantity
- Amount
- Total
- GST
- Discount
- Amount Payable

The backend stores and reads bills from an Excel file at `data/bills.xlsx`.

## Run

1. Install dependencies:
```bash
npm install
```

2. Start server:
```bash
npm start
```

3. Open:
`http://localhost:3000`

## API

- `POST /api/bills` -> save bill in Excel
- `GET /api/bills` -> read bills from Excel

## GitHub Pages + Backend

`github.io` is static hosting, so `/api/*` routes do not run there.

To use login/admin from GitHub Pages:
1. Deploy backend (`server.js`) to a Node host (Render/Railway/Vercel).
2. Edit `public/config.js` and set:
```js
window.SAGARIKA_BACKEND_URL = 'https://your-backend-domain';
```
3. Push changes and open your GitHub Pages URL.
