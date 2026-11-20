/**
 * NEW OVERHAUL — STORE ENGINE
 * Live Search • Shelf Filters • Interactive Cart Drawer • Floating Quick-View Modal
 */

(function () {
  'use strict';

  // State
  let allProducts = [];
  let cart = [];
  let activeFilter = 'all';
  let inStockOnly = false;
  let activeSort = 'featured';
  let searchQuery = '';

  // DOM Elements
  const productGrid = document.getElementById('collectorGrid');
  const searchInput = document.getElementById('searchInput');
  const shelfPills = document.querySelectorAll('.shelf-pill');
  const stockToggle = document.getElementById('stockToggle');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCounter = document.getElementById('resultsCounter');

  // Cart Elements
  const cartBackdrop = document.getElementById('cartBackdrop');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartTrigger = document.getElementById('cartTrigger');
  const cartClose = document.getElementById('cartClose');
  const cartItemsContainer = document.getElementById('cartItems');
  const cartBadge = document.getElementById('cartBadge');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartWhatsappBtn = document.getElementById('cartWhatsappBtn');

  // Modal Elements
  const qvBackdrop = document.getElementById('quickViewBackdrop');
  const qvClose = document.getElementById('qvClose');
  const qvImage = document.getElementById('qvImage');
  const qvCategory = document.getElementById('qvCategory');
  const qvTitle = document.getElementById('qvTitle');
  const qvPrice = document.getElementById('qvPrice');
  const qvSpecs = document.getElementById('qvSpecs');
  const qvWhatsappBtn = document.getElementById('qvWhatsappBtn');
  const qvBagBtn = document.getElementById('qvBagBtn');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    parseDOMProducts();
    bindEvents();
    renderFilteredProducts();
  });

  // Parse server-rendered products from DOM cards
  function parseDOMProducts() {
    const cards = document.querySelectorAll('.collector-card');
    allProducts = Array.from(cards).map(card => {
      return {
        id: card.dataset.id,
        slug: card.dataset.slug,
        name: card.dataset.name,
        price: card.dataset.price,
        rawPrice: parseFloat(card.dataset.price.replace(/[^0-9.]/g, '')) || 0,
        category: card.dataset.category || 'Collectibles',
        status: card.dataset.status || 'available',
        image: card.dataset.image,
        specs: JSON.parse(card.dataset.specs || '[]'),
        element: card
      };
    });
  }

  // Event Listeners
  function bindEvents() {
    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderFilteredProducts();
      });

      // Keyboard shortcut '/' to search
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }

    // Shelf Category Pills
    shelfPills.forEach(pill => {
      pill.addEventListener('click', () => {
        shelfPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.dataset.filter || 'all';
        renderFilteredProducts();
      });
    });

    // Stock Toggle
    if (stockToggle) {
      stockToggle.addEventListener('change', (e) => {
        inStockOnly = e.target.checked;
        renderFilteredProducts();
      });
    }

    // Sorting
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderFilteredProducts();
      });
    }

    // Cart Drawer Toggle
    if (cartTrigger) cartTrigger.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

    // Quick View Modal Close
    if (qvClose) qvClose.addEventListener('click', closeQuickView);
    if (qvBackdrop) {
      qvBackdrop.addEventListener('click', (e) => {
        if (e.target === qvBackdrop) closeQuickView();
      });
    }

    // Delegate Card Buttons
    if (productGrid) {
      productGrid.addEventListener('click', (e) => {
        const qvBtn = e.target.closest('.btn-card-quickview');
        if (qvBtn) {
          const card = qvBtn.closest('.collector-card');
          const product = allProducts.find(p => p.id === card.dataset.id);
          if (product) openQuickView(product);
          return;
        }

        const addBtn = e.target.closest('.btn-card-quickadd');
        if (addBtn) {
          const card = addBtn.closest('.collector-card');
          const product = allProducts.find(p => p.id === card.dataset.id);
          if (product) {
            addToCart(product);
            showToast(`Added ${product.name} to Bag`);
          }
        }
      });
    }
  }

  // Filter & Render
  function renderFilteredProducts() {
    let visible = allProducts.filter(item => {
      // Category filter
      if (activeFilter !== 'all' && item.category.toLowerCase() !== activeFilter.toLowerCase()) {
        return false;
      }
      // In-stock toggle
      if (inStockOnly && item.status !== 'available') {
        return false;
      }
      // Search
      if (searchQuery) {
        const titleMatch = item.name.toLowerCase().includes(searchQuery);
        const catMatch = item.category.toLowerCase().includes(searchQuery);
        if (!titleMatch && !catMatch) return false;
      }
      return true;
    });

    // Sorting
    if (activeSort === 'price-low') {
      visible.sort((a, b) => a.rawPrice - b.rawPrice);
    } else if (activeSort === 'price-high') {
      visible.sort((a, b) => b.rawPrice - a.rawPrice);
    } else if (activeSort === 'title-az') {
      visible.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Hide all, re-order and show matching
    allProducts.forEach(p => {
      p.element.style.display = 'none';
    });

    visible.forEach(p => {
      p.element.style.display = 'flex';
      productGrid.appendChild(p.element);
    });

    if (resultsCounter) {
      resultsCounter.textContent = `Showing ${visible.length} Vault Pieces`;
    }
  }

  // Quick View Modal
  let currentModalProduct = null;

  function openQuickView(product) {
    currentModalProduct = product;
    qvImage.src = product.image;
    qvImage.alt = product.name;
    qvCategory.textContent = product.category + ' • ARCHIVE COLLECTIBLE';
    qvTitle.textContent = product.name;
    qvPrice.textContent = product.price;

    // Render Specs
    qvSpecs.innerHTML = (product.specs || []).map(spec => `<li>${spec}</li>`).join('');

    // Pre-fill WhatsApp DM Order Link
    const waPhone = window.__STORE_SETTINGS__?.whatsappNumber?.replace(/[^0-9]/g, '') || '916366196633';
    const waMsg = encodeURIComponent(`Hello MFU Desk, I would like to order: ${product.name} (${product.price}). Is it ready for same-day dispatch?`);
    qvWhatsappBtn.href = `https://wa.me/${waPhone}?text=${waMsg}`;

    qvBagBtn.onclick = () => {
      addToCart(product);
      closeQuickView();
      openCart();
    };

    qvBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    qvBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Cart Management
  function loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('mfu_new_cart');
      if (saved) cart = JSON.parse(saved);
    } catch (e) {
      cart = [];
    }
    updateCartUI();
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem('mfu_new_cart', JSON.stringify(cart));
    } catch (e) {}
    updateCartUI();
  }

  function addToCart(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        rawPrice: product.rawPrice,
        image: product.image,
        qty: 1
      });
    }
    saveCartToStorage();
  }

  function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
    saveCartToStorage();
  }

  function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCartToStorage();
  }

  function openCart() {
    cartBackdrop.classList.add('open');
    cartDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartBackdrop.classList.remove('open');
    cartDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateCartUI() {
    const totalCount = cart.reduce((acc, i) => acc + i.qty, 0);
    const totalAmount = cart.reduce((acc, i) => acc + (i.rawPrice * i.qty), 0);

    if (cartBadge) cartBadge.textContent = totalCount;

    if (cartItemsContainer) {
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
          <div style="text-align: center; padding: 48px 0; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            <p style="font-size: 13px;">Your Collector Bag is currently empty</p>
          </div>
        `;
      } else {
        cartItemsContainer.innerHTML = cart.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
              <span class="cart-item-name">${item.name}</span>
              <span class="cart-item-price">${item.price}</span>
              <div class="cart-item-qty">
                <button class="qty-btn" onclick="window.__updateCartQty('${item.id}', -1)">-</button>
                <span class="qty-count">${item.qty}</span>
                <button class="qty-btn" onclick="window.__updateCartQty('${item.id}', 1)">+</button>
                <button class="btn-remove-item" onclick="window.__removeCartItem('${item.id}')">Remove</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    if (cartSubtotal) {
      cartSubtotal.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    }

    // Configure WhatsApp Bag Checkout
    if (cartWhatsappBtn) {
      const waPhone = window.__STORE_SETTINGS__?.whatsappNumber?.replace(/[^0-9]/g, '') || '916366196633';
      if (cart.length === 0) {
        cartWhatsappBtn.href = '#';
        cartWhatsappBtn.onclick = (e) => {
          e.preventDefault();
          showToast('Please add items to your bag first');
        };
      } else {
        const itemsList = cart.map((i, idx) => `${idx + 1}. ${i.name} (Qty: ${i.qty}) — ${i.price}`).join('\n');
        const text = encodeURIComponent(`Hello MFU Desk, I would like to order the following from my Bag:\n\n${itemsList}\n\nTotal: ₹${totalAmount.toLocaleString('en-IN')}\n\nPlease share delivery details and payment link.`);
        cartWhatsappBtn.href = `https://wa.me/${waPhone}?text=${text}`;
        cartWhatsappBtn.onclick = null;
      }
    }
  }

  // Expose global cart handlers for inline buttons
  window.__updateCartQty = updateQty;
  window.__removeCartItem = removeFromCart;

  // Toast System
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

})();
