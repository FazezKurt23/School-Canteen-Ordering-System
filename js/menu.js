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

function categoryLabel(category) {
  return (CATEGORY_EMOJIS[category] || '') + ' ' + category;
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
  qtyInput.max = '20';
  qtyInput.value = '1';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary add-btn';
  addBtn.textContent = 'Add to Cart';

  addBtn.addEventListener('click', () => {
    const qty = Math.max(1, Math.min(20, parseInt(qtyInput.value, 10) || 1));
    addItem(product.id, qty);
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

function renderMenu(category) {
  const container = document.getElementById('menu');
  if (!container) return;

  const filter = category || activeCategory;

  const categories = [];
  PRODUCTS.forEach((product) => {
    if (!categories.includes(product.category)) categories.push(product.category);
  });

  container.innerHTML = '';

  const categoriesToRender = filter === 'all' ? categories : [filter];

  categoriesToRender.forEach((cat) => {
    const items = PRODUCTS.filter((p) => p.category === cat);
    if (!items.length) return;

    const section = document.createElement('section');
    section.className = 'menu-section';

    const heading = document.createElement('h2');
    heading.className = 'menu-heading';
    heading.innerHTML = categoryLabel(cat);
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'product-grid';

    items.forEach((product) => {
      grid.appendChild(createProductCard(product));
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  if (filter !== 'all') {
    const items = PRODUCTS.filter((p) => p.category === filter);
    if (!items.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px 0;">No items found in this category.</p>';
    }
  }
}

function updateBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.classList.toggle('is-empty', count === 0);
}

function initCategoryTabs() {
  const tabs = document.getElementById('category-tabs');
  if (!tabs) return;

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    tabs.querySelectorAll('.tab-btn').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');

    activeCategory = btn.dataset.cat;
    renderMenu();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCategoryTabs();
  renderMenu();
  updateBadge();
  window.addEventListener('cart:updated', updateBadge);
});
