const CATEGORY_EMOJIS = {
  Meals: '\uD83C\uDF5B',
  Snacks: '\uD83C\uDF6F',
  Drinks: '\uD83E\uDDC3',
  Desserts: '\uD83C\uDF70'
};

const PRODUCT_EMOJIS = {
  'meal-chicken-rice': '\uD83C\uDF57',
  'meal-nasi-lemak': '\uD83C\uDF5B',
  'meal-fried-rice': '\uD83C\uDF5A',
  'meal-pasta': '\uD83C\uDF5D',
  'snack-fries': '\uD83C\uDF5F',
  'snack-nuggets': '\uD83E\uDD69',
  'snack-sandwich': '\uD83C\uDF5E',
  'snack-spring-rolls': '\uD83E\uDD5F',
  'drink-orange-juice': '\uD83C\uDF4A',
  'drink-iced-tea': '\uD83C\uDF75',
  'drink-milk': '\uD83E\uDD5B',
  'drink-water': '\uD83E\uDDB7',
  'dessert-muffin': '\uD83E\uDDC1',
  'dessert-fruit-cup': '\uD83C\uDF53',
  'dessert-chocolate-bar': '\uD83C\uDF6B'
};

const CATEGORY_BADGE_CLASSES = {
  Meals: 'badge-meals',
  Snacks: 'badge-snacks',
  Drinks: 'badge-drinks',
  Desserts: 'badge-desserts'
};

let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

function categoryLabel(category) {
  return (CATEGORY_EMOJIS[category] || '') + ' ' + category;
}

function showToast(message, type) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'warn' ? ' toast-warn' : '');
  toast.textContent = message;
  const action = document.createElement('a');
  action.href = 'cart.html';
  action.className = 'toast-action';
  action.textContent = 'View Cart';
  toast.appendChild(action);
  region.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.productId = product.id;

  const badge = document.createElement('span');
  badge.className = 'product-badge ' + (CATEGORY_BADGE_CLASSES[product.category] || '');
  badge.textContent = product.category;

  const tile = document.createElement('div');
  tile.className = 'product-tile';

  if (product.isBestSeller) {
    const star = document.createElement('span');
    star.className = 'bestseller-badge';
    star.textContent = '★ Best Seller';
    tile.appendChild(star);
  }

  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      const emoji = document.createElement('span');
      emoji.className = 'emoji-fallback';
      emoji.textContent = PRODUCT_EMOJIS[product.id] || product.name.charAt(0);
      tile.appendChild(emoji);
    });
    tile.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'emoji-fallback';
    emoji.textContent = PRODUCT_EMOJIS[product.id] || product.name.charAt(0);
    tile.appendChild(emoji);
  }

  const body = document.createElement('div');
  body.className = 'product-body';

  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.name;

  const desc = document.createElement('p');
  desc.className = 'product-desc';
  desc.textContent = product.description;

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = formatMoney(product.price);

  const actions = document.createElement('div');
  actions.className = 'product-actions';

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.className = 'qty-input';
  qtyInput.min = '1';
  qtyInput.max = String(typeof MAX_QTY !== 'undefined' ? MAX_QTY : 20);
  qtyInput.value = '1';
  qtyInput.setAttribute('aria-label', 'Quantity for ' + product.name);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary add-btn';
  addBtn.textContent = 'Add to Cart';

  addBtn.addEventListener('click', () => {
    const maxQ = typeof MAX_QTY !== 'undefined' ? MAX_QTY : 20;
    const qty = Math.max(1, Math.min(maxQ, parseInt(qtyInput.value, 10) || 1));
    qtyInput.value = String(qty);
    const result = addItem(product.id, qty);
    if (result && result.capped) {
      showToast(product.name + ' capped at ' + maxQ + ' per order', 'warn');
    } else {
      showToast('Added ' + product.name + ' x' + qty);
    }
    addBtn.textContent = '\u2713 Added';
    addBtn.classList.add('added');
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.classList.remove('added');
      addBtn.disabled = false;
    }, 1000);
  });

  actions.appendChild(qtyInput);
  actions.appendChild(addBtn);

  body.appendChild(name);
  body.appendChild(desc);
  body.appendChild(price);
  body.appendChild(actions);

  card.appendChild(badge);
  card.appendChild(tile);
  card.appendChild(body);
  return card;
}

function getFilteredProducts() {
  const q = searchQuery.trim().toLowerCase();
  let items = PRODUCTS.slice();
  if (activeCategory !== 'all') {
    items = items.filter((p) => p.category === activeCategory);
  }
  if (q) {
    items = items.filter((p) =>
      (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(q)
    );
  }
  if (sortMode === 'name-asc') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === 'price-asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (sortMode === 'price-desc') {
    items.sort((a, b) => b.price - a.price);
  } else {
    items.sort((a, b) => Number(b.isBestSeller || false) - Number(a.isBestSeller || false));
  }
  return items;
}

function renderMenu() {
  const container = document.getElementById('menu');
  if (!container) return;

  const items = getFilteredProducts();
  container.innerHTML = '';

  const countEl = document.getElementById('menu-result-count');
  if (countEl) {
    if (searchQuery.trim() || activeCategory !== 'all') {
      countEl.textContent = items.length
        ? 'Showing ' + items.length + ' item' + (items.length === 1 ? '' : 's')
        : 'No items found. Try another search or category.';
    } else {
      countEl.textContent = '';
    }
  }

  if (!items.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px 0;">No items found. Try another search or category.</p>';
    return;
  }

  if (activeCategory === 'all' && !searchQuery.trim() && sortMode === 'default') {
    const categories = [];
    PRODUCTS.forEach((product) => {
      if (!categories.includes(product.category)) categories.push(product.category);
    });
    categories.forEach((cat) => {
      const catItems = items.filter((p) => p.category === cat);
      if (!catItems.length) return;
      const section = document.createElement('section');
      section.className = 'menu-section';
      const heading = document.createElement('h2');
      heading.className = 'menu-heading';
      heading.textContent = categoryLabel(cat);
      section.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'product-grid';
      catItems.forEach((product) => grid.appendChild(createProductCard(product)));
      section.appendChild(grid);
      container.appendChild(section);
    });
  } else {
    const grid = document.createElement('div');
    grid.className = 'product-grid';
    items.forEach((product) => grid.appendChild(createProductCard(product)));
    container.appendChild(grid);
  }
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

function initCategoryTabs() {
  const tabs = document.getElementById('category-tabs');
  if (!tabs) return;

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    tabs.querySelectorAll('.tab-btn').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    activeCategory = btn.dataset.cat;
    renderMenu();
  });
}

function initSearchSort() {
  const search = document.getElementById('menu-search');
  const clear = document.getElementById('search-clear');
  const sort = document.getElementById('menu-sort');
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value;
      if (clear) clear.classList.toggle('hidden', !search.value);
      renderMenu();
    });
  }
  if (clear) {
    clear.addEventListener('click', () => {
      if (search) search.value = '';
      searchQuery = '';
      clear.classList.add('hidden');
      renderMenu();
      if (search) search.focus();
    });
  }
  if (sort) {
    sort.addEventListener('change', () => {
      sortMode = sort.value;
      renderMenu();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCategoryTabs();
  initSearchSort();
  renderMenu();
  updateBadge();
  window.addEventListener('cart:updated', updateBadge);
});
