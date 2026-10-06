const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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
  meta.textContent = formatMoney(line.unitPrice) + ' each'
    + (Number.isFinite(line.stock) ? ' · ' + line.stock + ' in stock' : '');
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
  plus.addEventListener('click', () => {
    const maxQ = typeof MAX_QTY !== 'undefined' ? MAX_QTY : 20;
    const cap = Number.isFinite(line.stock) ? Math.min(maxQ, line.stock) : maxQ;
    if (line.qty >= cap) {
      showToast(line.stock <= 0 ? line.name + ' is sold out.' : 'Only ' + line.stock + ' available for ' + line.name + '.', 'warn');
      return;
    }
    updateQty(line.id, line.qty + 1);
  });
  const maxQ2 = typeof MAX_QTY !== 'undefined' ? MAX_QTY : 20;
  const cap2 = Number.isFinite(line.stock) ? Math.min(maxQ2, line.stock) : maxQ2;
  if (line.qty >= cap2) {
    plus.disabled = true;
    plus.classList.add('is-disabled');
  }

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
  let lines = getCartLines();
  // Auto-prune items that became sold out / over stock (e.g. ordered in another tab).
  const cart = loadCart();
  let pruned = false;
  lines.forEach((line) => {
    if (line.stock <= 0) {
      const i = cart.findIndex((e) => e.id === line.id);
      if (i !== -1) { cart.splice(i, 1); pruned = true; }
    } else if (line.qty > line.stock) {
      const entry = cart.find((e) => e.id === line.id);
      if (entry) { entry.qty = line.stock; pruned = true; }
    }
  });
  if (pruned) {
    saveCart(cart);
    lines = getCartLines();
    showToast('Some items were updated — stock changed.', 'warn');
  }
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
  const slot = $('#pickup-slot');
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

  if (!slot.value) {
    setFieldError(slot, 'Please select a pickup time.');
    valid = false;
  } else {
    setFieldError(slot, '');
  }

  return valid;
}

function formatOrderDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  } catch (err) {
    const date = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
}

function showReceipt(order) {
  $('#receipt-view').classList.remove('hidden');
  $('#cart-view').classList.add('hidden');
  $('#empty-view').classList.add('hidden');

  $('#receipt-number').textContent = order.orderNumber;
  $('#receipt-date').textContent = formatOrderDate(order.createdAt);
  const gradeSuffix = order.gradeSection ? ' · ' + order.gradeSection : '';
  $('#receipt-student').textContent = order.studentName + ' (ID: ' + order.studentId + ')' + gradeSuffix;
  $('#receipt-type').textContent = order.orderType;
  const payEl = $('#receipt-payment');
  if (payEl) payEl.textContent = order.paymentMethod || 'Pay at Counter (Cash)';
  const queueEl = $('#receipt-queue');
  if (queueEl) {
    const q = order.queueNumber || '?';
    queueEl.textContent = '#' + String(q).padStart(3, '0');
  }
  const statusEl = $('#receipt-status');
  if (statusEl) statusEl.textContent = order.status || 'To Pay at Counter';
  $('#receipt-pickup').textContent = order.pickupSlot || '—';
  $('#receipt-notes').textContent = order.notes || '—';

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

function customerStatusClass(status) {
  if (status === 'Paid') return 'paid';
  if (status === 'Ready') return 'ready';
  if (status === 'Claimed') return 'claimed';
  if (status === 'Cancelled') return 'cancelled';
  return 'to-pay';
}

function statusIcon(status) {
  if (status === 'Paid') return '✅';
  if (status === 'Ready') return '🔔';
  if (status === 'Claimed') return '✔️';
  if (status === 'Cancelled') return '❌';
  return '💵';
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
    const qLabel = order.queueNumber ? '#' + String(order.queueNumber).padStart(3, '0') + ' · ' : '';
    number.textContent = qLabel + order.orderNumber;
    const date = document.createElement('span');
    date.className = 'history-date';
    date.textContent = formatOrderDate(order.createdAt);
    head.appendChild(number);
    head.appendChild(date);

    const statusRow = document.createElement('div');
    statusRow.className = 'history-status-row';
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge ' + customerStatusClass(order.status);
    statusBadge.textContent = statusIcon(order.status) + ' ' + (order.status || 'To Pay at Counter');
    const payBadge = document.createElement('span');
    payBadge.className = 'pay-badge';
    payBadge.textContent = order.paymentMethod || 'Pay at Counter (Cash)';
    statusRow.appendChild(statusBadge);
    statusRow.appendChild(payBadge);

    const summary = document.createElement('p');
    summary.className = 'history-summary';
    summary.textContent =
      order.orderType +
      (order.pickupSlot ? ' · ' + order.pickupSlot : '') +
      ' - ' +
      order.items.map((item) => item.name + ' x' + item.qty).join(', ') +
      ' - ' +
      formatMoney(order.total);

    const btnRow = document.createElement('div');
    btnRow.className = 'history-btn-row';
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn btn-ghost btn-sm';
    viewBtn.textContent = 'View Claim Stub';
    viewBtn.addEventListener('click', () => showReceipt(order));

    const reorderBtn = document.createElement('button');
    reorderBtn.type = 'button';
    reorderBtn.className = 'btn btn-primary btn-sm';
    reorderBtn.textContent = 'Re-order';
    reorderBtn.addEventListener('click', () => {
      const cart = loadCart();
      let addedCount = 0;
      let skippedCount = 0;
      const maxQ = typeof MAX_QTY !== 'undefined' ? MAX_QTY : 20;
      order.items.forEach((item) => {
        const product = typeof PRODUCTS !== 'undefined'
          ? PRODUCTS.find((p) => p.id === item.id)
          : null;
        if (!product) {
          skippedCount += 1;
          return;
        }
        const stock = typeof getProductStock === 'function' ? getProductStock(product) : (product.stock ?? Infinity);
        if (stock <= 0) {
          skippedCount += 1;
          return;
        }
        const existing = cart.find((e) => e.id === item.id);
        const already = existing ? Number(existing.qty) : 0;
        const canAdd = Math.min(item.qty, Math.max(0, Math.min(maxQ, stock) - already));
        if (canAdd <= 0) {
          skippedCount += 1;
          return;
        }
        if (existing) {
          existing.qty = already + canAdd;
        } else {
          cart.push({ id: item.id, qty: canAdd });
        }
        addedCount += 1;
      });
      if (!addedCount) {
        showToast('Those items are no longer available.', 'warn');
        return;
      }
      saveCart(cart);
      window.dispatchEvent(new CustomEvent('cart:updated'));
      showToast(
        skippedCount
          ? 'Re-added ' + addedCount + ' item(s), ' + skippedCount + ' unavailable skipped.'
          : 'Items re-added to cart.',
        skippedCount ? 'warn' : undefined,
        { label: 'View Cart', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), keepLonger: true }
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    card.appendChild(head);
    card.appendChild(statusRow);
    card.appendChild(summary);
    btnRow.appendChild(viewBtn);
    btnRow.appendChild(reorderBtn);
    if ((order.status || 'To Pay at Counter') === 'To Pay at Counter') {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-ghost btn-sm';
      cancelBtn.textContent = 'Cancel Order';
      cancelBtn.addEventListener('click', () => {
        cancelOrder(order.orderNumber);
        showToast('Order cancelled — stock restored.', 'warn');
        renderCart();
        renderHistory();
        updateBadge();
      });
      btnRow.appendChild(cancelBtn);
    }
    if (['Claimed', 'Cancelled'].includes(order.status)) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-ghost btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete ' + order.orderNumber + ' from history');
      deleteBtn.addEventListener('click', () => {
        const removed = deleteOrder(order.orderNumber);
        renderHistory();
        if (removed) {
          const orders = loadOrders();
          showToast('Order deleted from history.', 'warn', {
            label: 'Undo',
            keepLonger: true,
            onClick: () => {
              orders.unshift(removed);
              saveOrders(orders);
              renderHistory();
            }
          });
        }
      });
      btnRow.appendChild(deleteBtn);
    }
    card.appendChild(btnRow);
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
  // Live-update history when cashier changes status in another tab.
  window.addEventListener('storage', (e) => {
    if (e.key === 'canteen_orders') renderHistory();
  });

  $('#clear-cart').addEventListener('click', () => {
    const previous = loadCart();
    if (!previous.length) return;
    saveCart([]);
    window.dispatchEvent(new CustomEvent('cart:updated'));
    showToast('Cart cleared.', 'warn', {
      label: 'Undo',
      keepLonger: true,
      onClick: () => {
        saveCart(previous);
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
    });
  });

  $('#checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const submitBtn = event.target.querySelector('[type="submit"]');
    if (submitBtn && submitBtn.disabled) return;
    if (!validateForm(event.target)) return;

    if (submitBtn) submitBtn.disabled = true;
    try {
      const orderType = $('input[name="orderType"]:checked').value;
      const payInput = $('input[name="paymentMethod"]:checked');
      const order = createOrder({
        studentName: $('#student-name').value,
        studentId: $('#student-id').value,
        orderType: orderType,
        paymentMethod: payInput ? payInput.value : 'Pay at Counter (Cash)',
        pickupSlot: $('#pickup-slot').value,
        gradeSection: $('#grade-section').value,
        notes: $('#order-notes').value
      });

      if (!order) {
        showToast('Your cart is empty.', 'warn');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
      if (order.error) {
        if (order.error === 'out_of_stock') {
          showToast(order.line.name + ' is sold out. Removed from cart.', 'warn');
        } else {
          showToast('Only ' + order.line.stock + ' left for ' + order.line.name + '.', 'warn');
        }
        renderCart();
        updateBadge();
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
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  $('#print-receipt').addEventListener('click', () => window.print());

  $('#new-order').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});
