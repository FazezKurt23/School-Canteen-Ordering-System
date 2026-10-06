# School Canteen Ordering System (CCTC)

Simple static web app for browsing the canteen menu, adding items to cart, and checking out for pickup. No build step — just open the HTML files. Data is stored in `localStorage`.

## Team
- Heraldez, Kurt John D.
- Doria, Christian Mark M.
- Cañalita, Jhon Niño
- Cabillar, Garnet

## How to run
1. Clone/download this folder.
2. Open `index.html` in a browser (or serve with `python -m http.server` then visit `http://localhost:8000`).
3. Browse menu → Add to Cart → open `cart.html` → Place Order → Print receipt.

No backend or `npm install` needed.

## Features
- Menu with categories (Meals / Snacks / Drinks / Desserts), search (debounced) + sort
- Cart with stepper, max 20 per item, subtotal + 6% service tax
- Checkout validation (name, student ID, pickup slot, order type)
- Printable receipt + recent order history + re-order
- Toasts with Undo (clear cart), responsive layout, `prefers-reduced-motion` support

## Project structure
- `index.html` — menu + search/sort + sticky cart
- `cart.html` — cart review, checkout form, claim stub, history
- `admin.html` — cashier queue (To Pay → Paid → Ready → Claimed, cancel with stock restore)
- `board.html` — Now Serving display (auto-refresh, for projector/TV)
- `data/products.js` — product catalog (with `stock`)
- `js/cart.js` — cart storage, totals, stock engine, order status flow, shared `showToast` + `updateBadge`
- `js/menu.js` — menu rendering, filtering
- `js/checkout.js` — cart page rendering, validation, receipts, history
- `js/admin.js` — cashier queue rendering
- `style.css` — all styles
- `images/` — product photos

## Notes / limitations
- Orders live only in the browser (`localStorage` keys `canteen_cart`, `canteen_orders`). Different device = different history.
- Prices formatted with `Intl.NumberFormat('en-PH', { currency: 'PHP' })`.
