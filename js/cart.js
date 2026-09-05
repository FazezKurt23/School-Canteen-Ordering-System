const CART_KEY = 'canteen_cart';
const ORDERS_KEY = 'canteen_orders';
const TAX_RATE = 0.06;
const MAX_QTY = 20;

function clampQty(qty) {
  qty = Number(qty);
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && entry.id && Number.isFinite(Number(entry.qty)) && Number(entry.qty) > 0);
  } catch (err) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCart() {
  return loadCart();
}

function getCartLines() {
  const cart = loadCart();
  return cart
    .map((entry) => {
      const product = PRODUCTS.find((p) => p.id === entry.id);
      if (!product) return null;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        unitPrice: product.price,
        qty: entry.qty,
        lineTotal: product.price * entry.qty
      };
    })
    .filter(Boolean);
}

function getCartCount() {
  return loadCart().reduce((sum, entry) => sum + entry.qty, 0);
}

function addItem(id, qty = 1) {
  qty = clampQty(qty);
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return { added: 0, capped: false };
  const cart = loadCart();
  const existing = cart.find((entry) => entry.id === id);
  let capped = false;
  if (existing) {
    const next = Number(existing.qty) + qty;
    if (next > MAX_QTY) capped = true;
    existing.qty = Math.min(MAX_QTY, next);
  } else {
    cart.push({ id, qty });
  }
  saveCart(cart);
  window.dispatchEvent(new CustomEvent('cart:updated'));
  return { added: qty, capped };
}

function updateQty(id, qty) {
  let cart = loadCart();
  qty = Number(qty);
  if (!Number.isFinite(qty) || qty < 1) {
    cart = cart.filter((entry) => entry.id !== id);
  } else {
    const existing = cart.find((entry) => entry.id === id);
    if (existing) existing.qty = Math.min(MAX_QTY, Math.floor(qty));
  }
  saveCart(cart);
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

function removeItem(id) {
  saveCart(loadCart().filter((entry) => entry.id !== id));
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

function getTotals(lines) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function formatMoney(value) {
  return '₱' + value.toFixed(2);
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function generateOrderNumber() {
  const existing = new Set(loadOrders().map((order) => order.orderNumber));
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let suffix = '';
  do {
    suffix = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
  } while (existing.has('CNT-' + datePart + '-' + suffix));
  return 'CNT-' + datePart + '-' + suffix;
}

function createOrder(payload) {
  const lines = getCartLines();
  if (!lines.length) return null;
  const totals = getTotals(lines);
  const order = {
    orderNumber: generateOrderNumber(),
    studentName: payload.studentName.trim(),
    studentId: payload.studentId.trim(),
    orderType: payload.orderType,
    pickupSlot: (payload.pickupSlot || '').trim(),
    gradeSection: (payload.gradeSection || '').trim(),
    notes: (payload.notes || '').trim(),
    items: lines.map((line) => ({
      id: line.id,
      name: line.name,
      unitPrice: line.unitPrice,
      qty: line.qty,
      lineTotal: line.lineTotal
    })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    createdAt: new Date().toISOString()
  };
  const orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);
  saveCart([]);
  window.dispatchEvent(new CustomEvent('cart:updated'));
  return order;
}

function getOrders() {
  return loadOrders();
}