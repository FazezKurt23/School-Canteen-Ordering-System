const CART_KEY = 'canteen_cart';
const ORDERS_KEY = 'canteen_orders';
const STOCK_KEY = 'canteen_stock';
const TAX_RATE = 0.06;
const MAX_QTY = 20;
const LOW_STOCK_THRESHOLD = 5;

function loadStockOverrides() {
  try {
    const raw = localStorage.getItem(STOCK_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function saveStockOverrides(overrides) {
  try {
    localStorage.setItem(STOCK_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn('Could not save stock.', err);
  }
}

function getProductStock(product) {
  const base = Number(product && product.stock);
  const baseStock = Number.isFinite(base) ? Math.max(0, Math.floor(base)) : Infinity;
  const overrides = loadStockOverrides();
  if (product && Object.prototype.hasOwnProperty.call(overrides, product.id)) {
    const v = Number(overrides[product.id]);
    if (Number.isFinite(v)) return Math.max(0, Math.floor(v));
  }
  return baseStock;
}

function getAvailableStock(id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return 0;
  return getProductStock(product);
}

function resetDemoStock() {
  try { localStorage.removeItem(STOCK_KEY); } catch (err) {}
  window.dispatchEvent(new CustomEvent('cart:updated'));
  window.dispatchEvent(new CustomEvent('stock:updated'));
}

function setProductStock(id, qty) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return null;
  const value = Math.max(0, Math.floor(Number(qty) || 0));
  const overrides = loadStockOverrides();
  overrides[id] = value;
  saveStockOverrides(overrides);
  window.dispatchEvent(new CustomEvent('stock:updated'));
  return value;
}

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
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.warn('Could not save cart (storage full/blocked).', err);
    showToast('Could not save cart — storage is full or blocked.', 'warn');
  }
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
        lineTotal: product.price * entry.qty,
        stock: getProductStock(product)
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
  if (!product) return { added: 0, capped: false, outOfStock: false, available: 0 };
  const stock = getProductStock(product);
  if (stock <= 0) return { added: 0, capped: false, outOfStock: true, available: 0 };
  const cart = loadCart();
  const existing = cart.find((entry) => entry.id === id);
  const already = existing ? Number(existing.qty) : 0;
  const remaining = stock - already;
  if (remaining <= 0) return { added: 0, capped: false, outOfStock: true, available: stock };
  let capped = false;
  let toAdd = qty;
  if (already + qty > stock) { toAdd = remaining; capped = true; }
  if (already + toAdd > MAX_QTY) { toAdd = MAX_QTY - already; capped = true; }
  if (toAdd <= 0) return { added: 0, capped: true, outOfStock: false, available: stock };
  if (existing) {
    existing.qty = already + toAdd;
  } else {
    cart.push({ id, qty: toAdd });
  }
  saveCart(cart);
  window.dispatchEvent(new CustomEvent('cart:updated'));
  return { added: toAdd, capped, outOfStock: false, available: stock };
}

function updateQty(id, qty) {
  let cart = loadCart();
  qty = Number(qty);
  if (!Number.isFinite(qty) || qty < 1) {
    cart = cart.filter((entry) => entry.id !== id);
  } else {
    const existing = cart.find((entry) => entry.id === id);
    if (existing) {
      const stock = getAvailableStock(id);
      const cap = Number.isFinite(stock) ? Math.min(MAX_QTY, stock) : MAX_QTY;
      existing.qty = Math.max(1, Math.min(cap, Math.floor(qty)));
    }
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
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₱0.00';
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  } catch (err) {
    return '₱' + amount.toFixed(2);
  }
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
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('Could not save orders (storage full/blocked).', err);
    showToast('Could not save order history — storage is full.', 'warn');
  }
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

function getTodayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function getQueueNumber() {
  const today = new Date().toISOString().slice(0, 10);
  const todays = loadOrders().filter((o) => getTodayKey(o.createdAt) === today);
  return todays.length + 1;
}

function createOrder(payload) {
  const lines = getCartLines();
  if (!lines.length) return null;
  // Re-validate stock at checkout time.
  for (const line of lines) {
    if (line.stock <= 0) return { error: 'out_of_stock', line };
    if (line.qty > line.stock) return { error: 'exceeds_stock', line };
  }
  const totals = getTotals(lines);
  const order = {
    orderNumber: generateOrderNumber(),
    queueNumber: getQueueNumber(),
    studentName: payload.studentName.trim(),
    studentId: payload.studentId.trim(),
    orderType: payload.orderType,
    paymentMethod: payload.paymentMethod || 'Pay at Counter (Cash)',
    status: 'To Pay at Counter',
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
  // Deduct stock so Sold Out actually happens after orders.
  const overrides = loadStockOverrides();
  lines.forEach((line) => {
    const product = PRODUCTS.find((p) => p.id === line.id);
    if (!product) return;
    const base = getProductStock(product);
    if (Number.isFinite(base)) overrides[line.id] = Math.max(0, base - line.qty);
  });
  saveStockOverrides(overrides);
  saveCart([]);
  window.dispatchEvent(new CustomEvent('cart:updated'));
  window.dispatchEvent(new CustomEvent('stock:updated'));
  return order;
}

function getOrders() {
  return loadOrders();
}

/* ===== Order status flow (Jollibee-style counter) ===== */
const ORDER_STATUS_FLOW = ['To Pay at Counter', 'Paid', 'Ready', 'Claimed'];

function normalizeOrder(order) {
  if (!order) return order;
  if (order.queueNumber == null) order.queueNumber = null;
  if (!order.status) order.status = 'To Pay at Counter';
  if (!order.paymentMethod) order.paymentMethod = 'Pay at Counter (Cash)';
  return order;
}

function getOrderByNumber(orderNumber) {
  return loadOrders().find((o) => o.orderNumber === orderNumber) || null;
}

function updateOrderStatus(orderNumber, newStatus) {
  const orders = loadOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return null;
  if (order.status === 'Cancelled' || order.status === 'Claimed') return normalizeOrder(order);
  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  saveOrders(orders);
  return normalizeOrder(order);
}

function advanceOrderStatus(orderNumber) {
  const order = getOrderByNumber(orderNumber);
  if (!order) return null;
  const idx = ORDER_STATUS_FLOW.indexOf(order.status);
  if (idx === -1 || idx >= ORDER_STATUS_FLOW.length - 1) return normalizeOrder(order);
  return updateOrderStatus(orderNumber, ORDER_STATUS_FLOW[idx + 1]);
}

function restoreStockForOrder(order) {
  if (!order || !Array.isArray(order.items)) return;
  const overrides = loadStockOverrides();
  order.items.forEach((item) => {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product) return;
    const baseDefault = Number(product.stock);
    const baseCap = Number.isFinite(baseDefault) ? Math.max(0, Math.floor(baseDefault)) : Infinity;
    const current = getProductStock(product);
    const restored = Number.isFinite(current) ? current + Number(item.qty || 0) : Number(item.qty || 0);
    if (product && Object.prototype.hasOwnProperty.call(overrides, product.id)) {
      overrides[product.id] = Number.isFinite(baseCap) ? Math.min(baseCap, Math.max(0, restored)) : Math.max(0, restored);
    }
    // If no override existed, stock was never deducted — nothing to restore.
  });
  saveStockOverrides(overrides);
  window.dispatchEvent(new CustomEvent('stock:updated'));
}

function cancelOrder(orderNumber) {
  const orders = loadOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return null;
  if (order.status === 'Claimed' || order.status === 'Cancelled') return normalizeOrder(order);
  restoreStockForOrder(order);
  order.status = 'Cancelled';
  order.updatedAt = new Date().toISOString();
  saveOrders(orders);
  return normalizeOrder(order);
}

function getTodayOrders() {
  const today = new Date().toISOString().slice(0, 10);
  return loadOrders()
    .map(normalizeOrder)
    .filter((o) => getTodayKey(o.createdAt) === today);
}

function deleteOrder(orderNumber) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.orderNumber === orderNumber);
  if (idx === -1) return null;
  const removed = orders.splice(idx, 1)[0];
  saveOrders(orders);
  return removed;
}

/* ===== Shared UI helpers (used by menu.js & checkout.js) ===== */

function showToast(message, type, action) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  // Avoid stacking too many toasts.
  while (region.children.length >= 3) region.firstChild.remove();
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'warn' ? ' toast-warn' : '');
  const label = document.createElement('span');
  label.textContent = message;
  toast.appendChild(label);
  if (action && action.label) {
    const btn = document.createElement(action.href ? 'a' : 'button');
    btn.type = action.href ? undefined : 'button';
    if (action.href) btn.href = action.href;
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', (e) => {
      if (typeof action.onClick === 'function') {
        e.preventDefault();
        action.onClick();
      }
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });
    toast.appendChild(btn);
  } else if (region.id === 'toast-region' && document.getElementById('menu')) {
    // Menu page default: quick link to cart.
    const link = document.createElement('a');
    link.href = 'cart.html';
    link.className = 'toast-action';
    link.textContent = 'View Cart';
    toast.appendChild(link);
  }
  region.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, action && action.keepLonger ? 5000 : 2600);
}

function updateBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.classList.toggle('is-empty', count === 0);
  }
  const sticky = document.getElementById('sticky-cart');
  if (sticky) {
    const lines = typeof getCartLines === 'function' ? getCartLines() : [];
    const totals = typeof getTotals === 'function' ? getTotals(lines) : null;
    const count = getCartCount();
    if (!count) {
      sticky.classList.add('hidden');
    } else {
      sticky.classList.remove('hidden');
      const txt = document.getElementById('sticky-cart-text');
      const tot = document.getElementById('sticky-cart-total');
      if (txt) txt.textContent = 'View Cart (' + count + ')';
      if (tot && totals) tot.textContent = formatMoney(totals.total);
    }
  }
}