const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function updateBadge() {
  const badge = $('#cart-count');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.classList.toggle('is-empty', count === 0);
}

function createLineRow(line) {
  const row = document.createElement('div');
  row.className = 'cart-line';

  const info = document.createElement('div');
  info.className = 'cart-line-info';
  const name = document.createElement('span');
  name.className = 'cart-line-name';
  name.textContent = line.name;
  const meta = document.createElement('span');
  meta.className = 'cart-line-meta';
  meta.textContent = formatMoney(line.unitPrice) + ' each';
  info.appendChild(name);
  info.appendChild(meta);

  const controls = document.createElement('div');
  controls.className = 'cart-line-controls';

  const stepper = document.createElement('div');
  stepper.className = 'stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'step-btn';
  minus.setAttribute('aria-label', 'Decrease quantity of ' + line.name);
  minus.textContent = '-';

  const qtySpan = document.createElement('span');
  qtySpan.className = 'step-qty';
  qtySpan.textContent = line.qty;

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'step-btn';
  plus.setAttribute('aria-label', 'Increase quantity of ' + line.name);
  plus.textContent = '+';

  minus.addEventListener('click', () => updateQty(line.id, line.qty - 1));
  plus.addEventListener('click', () => updateQty(line.id, line.qty + 1));

  stepper.appendChild(minus);
  stepper.appendChild(qtySpan);
  stepper.appendChild(plus);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-ghost btn-sm remove-btn';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => removeItem(line.id));

  controls.appendChild(stepper);
  controls.appendChild(removeBtn);

  const lineTotal = document.createElement('span');
  lineTotal.className = 'cart-line-total';
  lineTotal.textContent = formatMoney(line.lineTotal);

  row.appendChild(info);
  row.appendChild(controls);
  row.appendChild(lineTotal);
  return row;
}

function renderTotals(lines) {
  const totals = getTotals(lines);
  $('#totals').innerHTML = '';
  const rows = [
    ['Subtotal', formatMoney(totals.subtotal)],
    ['Service Tax (6%)', formatMoney(totals.tax)],
    ['Total', formatMoney(totals.total)]
  ];
  rows.forEach(([label, value], index) => {
    const row = document.createElement('div');
    row.className = index === 2 ? 'totals-row totals-total' : 'totals-row';
    const spanLabel = document.createElement('span');
    spanLabel.textContent = label;
    const spanValue = document.createElement('span');
    spanValue.textContent = value;
    row.appendChild(spanLabel);
    row.appendChild(spanValue);
    $('#totals').appendChild(row);
  });
}

function renderCart() {
  const lines = getCartLines();
  const cartView = $('#cart-view');
  const emptyView = $('#empty-view');

  if (!lines.length) {
    cartView.classList.add('hidden');
    emptyView.classList.remove('hidden');
    $('#receipt-view').classList.add('hidden');
    return;
  }

  emptyView.classList.add('hidden');
  cartView.classList.remove('hidden');

  const container = $('#cart-lines');
  container.innerHTML = '';
  lines.forEach((line) => container.appendChild(createLineRow(line)));
  renderTotals(lines);
}

function setFieldError(field, message) {
  const wrap = field.closest('.field');
  wrap.classList.toggle('has-error', Boolean(message));
  let error = wrap.querySelector('.field-error');
  if (message) {
    if (!error) {
      error = document.createElement('p');
      error.className = 'field-error';
      wrap.appendChild(error);
    }
    error.textContent = message;
  } else if (error) {
    error.remove();
  }
}

function validateForm(form) {
  let valid = true;

  const name = $('#student-name');
  const id = $('#student-id');
  const type = $('input[name="orderType"]:checked');

  const nameValue = name.value.trim();
  if (!nameValue) {
    setFieldError(name, 'Please enter your full name.');
    valid = false;
  } else if (nameValue.length < 2) {
    setFieldError(name, 'Name must be at least 2 characters.');
    valid = false;
  } else {
    setFieldError(name, '');
  }

  const idValue = id.value.trim();
  if (!idValue) {
    setFieldError(id, 'Please enter your student ID.');
    valid = false;
  } else if (!/^[A-Za-z0-9\-]{4,16}$/.test(idValue)) {
    setFieldError(id, 'Student ID must be 4-16 letters, numbers or dashes.');
    valid = false;
  } else {
    setFieldError(id, '');
  }

  const typeWrap = $('#order-type-field');
  const typeError = typeWrap.querySelector('.field-error');
  if (!type) {
    if (!typeError) {
      const error = document.createElement('p');
      error.className = 'field-error';
      typeWrap.appendChild(error);
    }
    typeWrap.querySelector('.field-error').textContent = 'Please choose an order type.';
    typeWrap.classList.add('has-error');
    valid = false;
  } else {
    if (typeError) typeError.remove();
    typeWrap.classList.remove('has-error');
  }

  return valid;
}

function formatOrderDate(iso) {
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function showReceipt(order) {
  $('#receipt-view').classList.remove('hidden');
  $('#cart-view').classList.add('hidden');
  $('#empty-view').classList.add('hidden');

  $('#receipt-number').textContent = order.orderNumber;
  $('#receipt-date').textContent = formatOrderDate(order.createdAt);
  $('#receipt-student').textContent = order.studentName + ' (ID: ' + order.studentId + ')';
  $('#receipt-type').textContent = order.orderType;

  const tbody = $('#receipt-items');
  tbody.innerHTML = '';
  order.items.forEach((item) => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = item.name;
    const tdQty = document.createElement('td');
    tdQty.textContent = item.qty;
    const tdUnit = document.createElement('td');
    tdUnit.textContent = formatMoney(item.unitPrice);
    const tdTotal = document.createElement('td');
    tdTotal.textContent = formatMoney(item.lineTotal);
    tr.appendChild(tdName);
    tr.appendChild(tdQty);
    tr.appendChild(tdUnit);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  $('#receipt-subtotal').textContent = formatMoney(order.subtotal);
  $('#receipt-tax').textContent = formatMoney(order.tax);
  $('#receipt-total').textContent = formatMoney(order.total);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHistory() {
  const container = $('#order-history');
  if (!container) return;
  const orders = getOrders();
  container.innerHTML = '';

  if (!orders.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'No orders yet. Your completed orders will appear here.';
    container.appendChild(empty);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'history-card';

    const head = document.createElement('div');
    head.className = 'history-head';
    const number = document.createElement('span');
    number.className = 'history-number';
    number.textContent = order.orderNumber;
    const date = document.createElement('span');
    date.className = 'history-date';
    date.textContent = formatOrderDate(order.createdAt);
    head.appendChild(number);
    head.appendChild(date);

    const summary = document.createElement('p');
    summary.className = 'history-summary';
    summary.textContent =
      order.orderType +
      ' - ' +
      order.items.map((item) => item.name + ' x' + item.qty).join(', ') +
      ' - ' +
      formatMoney(order.total);

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn btn-ghost btn-sm';
    viewBtn.textContent = 'View Receipt';
    viewBtn.addEventListener('click', () => showReceipt(order));

    card.appendChild(head);
    card.appendChild(summary);
    card.appendChild(viewBtn);
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  renderHistory();
  updateBadge();
  window.addEventListener('cart:updated', () => {
    renderCart();
    updateBadge();
  });

  $('#clear-cart').addEventListener('click', () => {
    if (confirm('Remove all items from your cart?')) {
      localStorage.setItem(CART_KEY, JSON.stringify([]));
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
  });

  $('#checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm(event.target)) return;

    const orderType = $('input[name="orderType"]:checked').value;
    const order = createOrder({
      studentName: $('#student-name').value,
      studentId: $('#student-id').value,
      orderType: orderType
    });

    if (!order) {
      alert('Your cart is empty.');
      return;
    }

    event.target.reset();
    $$('.has-error').forEach((el) => {
      const error = el.querySelector('.field-error');
      if (error) error.remove();
      el.classList.remove('has-error');
    });

    showReceipt(order);
    renderHistory();
    updateBadge();
  });

  $('#print-receipt').addEventListener('click', () => window.print());

  $('#new-order').addEventListener('click', () => {
    $('#receipt-view').classList.add('hidden');
    renderCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
