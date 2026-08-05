function categoryLabel(category) {
  return category;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.productId = product.id;

  const tile = document.createElement('div');
  tile.className = 'product-tile';

  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      tile.textContent = product.name.charAt(0).toUpperCase();
    });
    tile.appendChild(img);
  } else {
    tile.textContent = product.name.charAt(0).toUpperCase();
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
    const original = addBtn.textContent;
    addBtn.textContent = 'Added';
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.textContent = original;
      addBtn.disabled = false;
    }, 900);
  });

  actions.appendChild(qtyInput);
  actions.appendChild(addBtn);

  body.appendChild(name);
  body.appendChild(desc);
  body.appendChild(price);
  body.appendChild(actions);

  card.appendChild(tile);
  card.appendChild(body);
  return card;
}

function renderMenu() {
  const container = document.getElementById('menu');
  if (!container) return;

  const categories = [];
  PRODUCTS.forEach((product) => {
    if (!categories.includes(product.category)) categories.push(product.category);
  });

  container.innerHTML = '';

  categories.forEach((category) => {
    const section = document.createElement('section');
    section.className = 'menu-section';

    const heading = document.createElement('h2');
    heading.className = 'menu-heading';
    heading.textContent = categoryLabel(category);
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'product-grid';

    PRODUCTS.filter((product) => product.category === category).forEach((product) => {
      grid.appendChild(createProductCard(product));
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function updateBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.classList.toggle('is-empty', count === 0);
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  updateBadge();
  window.addEventListener('cart:updated', updateBadge);
});