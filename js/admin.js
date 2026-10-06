const STATUS_NEXT_ACTION = {
  'To Pay at Counter': { next: 'Paid', label: 'Mark as Paid' },
  'Paid': { next: 'Ready', label: 'Mark as Ready' },
  'Ready': { next: 'Claimed', label: 'Mark as Claimed' }
};

let activeFilter = 'active';

function fmtQueue(order) {
  return order.queueNumber != null ? '#' + String(order.queueNumber).padStart(3, '0') : order.orderNumber;
}

function renderStats(orders) {
  const box = document.getElementById('admin-stats');
  if (!box) return;
  const today = getTodayOrders();
  const active = today.filter((o) => !['Claimed', 'Cancelled'].includes(o.status));
  const revenue = today
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const stats = [
    ['Active queue', active.length],
    ['Orders today', today.length],
    ['Revenue (excl. cancelled)', formatMoney(revenue)]
  ];
  box.innerHTML = '';
  stats.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const v = document.createElement('span');
    v.className = 'stat-value';
    v.textContent = value;
    const l = document.createElement('span');
    l.className = 'stat-label';
    l.textContent = label;
    card.appendChild(v);
    card.appendChild(l);
    box.appendChild(card);
  });
  void orders;
}

function orderMatchesFilter(order) {
  if (activeFilter === 'active') return !['Claimed', 'Cancelled'].includes(order.status);
  if (activeFilter === 'today') return true;
  return order.status === activeFilter;
}

function renderAdmin() {
  const list = document.getElementById('admin-list');
  const count = document.getElementById('admin-count');
  if (!list) return;
  const today = getTodayOrders();
  renderStats(today);
  const items = today.filter(orderMatchesFilter);
  list.innerHTML = '';
  if (count) {
    count.textContent = items.length
      ? 'Showing ' + items.length + ' order' + (items.length === 1 ? '' : 's')
      : 'No orders in this view.';
  }
  if (!items.length) {
    list.innerHTML = '<p class="history-empty">No orders here yet. New customer orders will appear automatically.</p>';
    return;
  }
  items.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'history-card admin-card status-' + order.status.replace(/\s/g, '-');

    const head = document.createElement('div');
    head.className = 'history-head';
    const q = document.createElement('span');
    q.className = 'history-queue';
    q.textContent = fmtQueue(order);
    const badge = document.createElement('span');
    badge.className = 'status-badge ' + statusClass(order.status);
    badge.textContent = order.status;
    head.appendChild(q);
    head.appendChild(badge);

    const meta = document.createElement('p');
    meta.className = 'history-summary';
    meta.textContent =
      order.studentName + ' (ID: ' + order.studentId + ')' +
      (order.gradeSection ? ' · ' + order.gradeSection : '') +
      ' · ' + order.orderType +
      (order.pickupSlot ? ' · ' + order.pickupSlot : '');

    const itemsLine = document.createElement('p');
    itemsLine.className = 'history-summary';
    itemsLine.textContent = order.items.map((i) => i.name + ' x' + i.qty).join(', ') +
      ' — ' + formatMoney(order.total);

    const row = document.createElement('div');
    row.className = 'history-btn-row';

    const step = STATUS_NEXT_ACTION[order.status];
    if (step) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-primary btn-sm';
      nextBtn.textContent = step.label + ' →';
      nextBtn.addEventListener('click', () => {
        updateOrderStatus(order.orderNumber, step.next);
        showToast(fmtQueue(order) + ' moved to ' + step.next + '.');
        renderAdmin();
      });
      row.appendChild(nextBtn);
    }
    if (!['Claimed', 'Cancelled'].includes(order.status)) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-ghost btn-sm';
      cancelBtn.textContent = 'Cancel (restore stock)';
      cancelBtn.addEventListener('click', () => {
        cancelOrder(order.orderNumber);
        showToast(fmtQueue(order) + ' cancelled — stock restored.', 'warn');
        renderAdmin();
      });
      row.appendChild(cancelBtn);
    }
    const num = document.createElement('span');
    num.className = 'history-date';
    num.textContent = order.orderNumber;

    card.appendChild(head);
    card.appendChild(meta);
    card.appendChild(itemsLine);
    card.appendChild(row);
    card.appendChild(num);
    list.appendChild(card);
  });
}

function statusClass(status) {
  if (status === 'Paid') return 'paid';
  if (status === 'Ready') return 'ready';
  if (status === 'Claimed') return 'claimed';
  if (status === 'Cancelled') return 'cancelled';
  return 'to-pay';
}

function renderInventory() {
  const list = document.getElementById('inventory-list');
  if (!list || typeof PRODUCTS === 'undefined') return;
  list.innerHTML = '';
  const categories = [];
  PRODUCTS.forEach((p) => { if (!categories.includes(p.category)) categories.push(p.category); });
  categories.forEach((cat) => {
    const heading = document.createElement('h3');
    heading.className = 'menu-heading';
    heading.textContent = cat;
    list.appendChild(heading);
    PRODUCTS.filter((p) => p.category === cat).forEach((product) => {
      const stock = getProductStock(product);
      const row = document.createElement('div');
      row.className = 'inventory-row' + (stock <= 0 ? ' is-out' : '');

      const info = document.createElement('div');
      info.className = 'cart-line-info';
      const name = document.createElement('span');
      name.className = 'cart-line-name';
      name.textContent = product.name;
      const meta = document.createElement('span');
      meta.className = 'cart-line-meta';
      meta.textContent = stock <= 0 ? 'Sold out' : stock + ' in stock · ' + formatMoney(product.price);
      info.appendChild(name);
      info.appendChild(meta);

      const controls = document.createElement('div');
      controls.className = 'inventory-controls';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'step-btn';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'Decrease stock of ' + product.name);
      minus.addEventListener('click', () => { setProductStock(product.id, stock - 1); renderInventory(); });

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'qty-input inv-input';
      input.min = '0';
      input.max = '999';
      input.value = String(stock);
      input.setAttribute('aria-label', 'Stock for ' + product.name);
      input.addEventListener('change', () => {
        setProductStock(product.id, input.value);
        renderInventory();
        showToast(product.name + ' stock updated.');
      });

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'step-btn';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'Increase stock of ' + product.name);
      plus.addEventListener('click', () => { setProductStock(product.id, stock + 1); renderInventory(); });

      const soldBtn = document.createElement('button');
      soldBtn.type = 'button';
      soldBtn.className = 'btn btn-ghost btn-sm';
      soldBtn.textContent = stock <= 0 ? 'Restock +10' : 'Sold Out';
      soldBtn.addEventListener('click', () => {
        setProductStock(product.id, stock <= 0 ? 10 : 0);
        renderInventory();
        showToast(product.name + (stock <= 0 ? ' restocked.' : ' marked as sold out.'), stock <= 0 ? undefined : 'warn');
      });

      const stepper = document.createElement('div');
      stepper.className = 'stepper';
      stepper.appendChild(minus);
      stepper.appendChild(input);
      stepper.appendChild(plus);

      controls.appendChild(stepper);
      controls.appendChild(soldBtn);

      row.appendChild(info);
      row.appendChild(controls);
      list.appendChild(row);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdmin();
  renderInventory();
  const filters = document.getElementById('status-filters');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      filters.querySelectorAll('.tab-btn').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.dataset.filter;
      renderAdmin();
    });
  }
  const refresh = document.getElementById('admin-refresh');
  if (refresh) refresh.addEventListener('click', () => { renderAdmin(); renderInventory(); showToast('Queue refreshed.'); });
  const invReset = document.getElementById('inventory-reset');
  if (invReset) invReset.addEventListener('click', () => {
    resetDemoStock();
    renderInventory();
    renderAdmin();
    showToast('Stock reset to defaults.');
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'canteen_orders' || e.key === 'canteen_stock') { renderAdmin(); renderInventory(); }
  });
  setInterval(renderAdmin, 5000);
});
