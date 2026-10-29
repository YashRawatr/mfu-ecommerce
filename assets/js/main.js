/**
 * Atelier Cloud Dancer — Main Client Engine
 * Handles Category Filtering, Live Search, Dynamic Checkout,
 * 3D Holographic Card Tilt, Reading Progress Bar & Scroll Reveals
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==================== 0. Reading Progress Bar ====================
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress-bar';
  progressBar.id = 'scrollProgressBar';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight > 0) {
      const progress = (window.scrollY / totalHeight) * 100;
      progressBar.style.width = `${progress}%`;
    }
  }, { passive: true });

  // ==================== 1. Homepage Dynamic Pagination & Filter (6 Products Per Page) ====================
  const PRODUCTS_PER_PAGE = 6;
  const filterPills = document.querySelectorAll('.filter-pill');
  const searchInput = document.getElementById('catalogSearch');
  const productCards = Array.from(document.querySelectorAll('.editorial-grid .product-card'));
  const emptyState = document.getElementById('emptyStateNotice');
  const paginationNav = document.getElementById('catalogPagination') || document.querySelector('.catalog-pagination');
  const paginationNumbers = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('paginationPrev');
  const nextBtn = document.getElementById('paginationNext');

  let activeCategory = 'all';
  let searchQuery = '';
  let currentPage = 1;
  let matchingCards = [];

  function updatePaginationControls(totalPages) {
    if (!paginationNav) return;

    // When products fit on one page (<= 6 products), hide the pagination entirely
    if (totalPages <= 1) {
      paginationNav.style.display = 'none';
      return;
    }

    // When products exceed 6, show pagination with dynamic page buttons
    paginationNav.style.display = 'flex';

    if (paginationNumbers) {
      paginationNumbers.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        btn.setAttribute('data-page', i);
        btn.textContent = i;
        btn.addEventListener('click', () => {
          goToPage(i, true);
        });
        paginationNumbers.appendChild(btn);
      }
    }

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
  }

  function goToPage(targetPage, shouldScroll = false) {
    const totalMatching = matchingCards.length;
    const totalPages = Math.ceil(totalMatching / PRODUCTS_PER_PAGE) || 1;

    if (targetPage < 1) targetPage = 1;
    if (targetPage > totalPages) targetPage = totalPages;
    currentPage = targetPage;

    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;

    // First hide all product cards in DOM
    productCards.forEach(card => {
      card.style.display = 'none';
    });

    // Display only the 6 figures corresponding to the current page
    const visibleCards = matchingCards.slice(startIndex, endIndex);
    visibleCards.forEach((card, idx) => {
      card.style.display = 'flex';
      card.style.animation = 'none';
      void card.offsetHeight; // trigger reflow
      card.style.animation = `fadeInCard 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.04}s forwards`;
    });

    updatePaginationControls(totalPages);

    if (shouldScroll) {
      const vaultSection = document.getElementById('vault');
      if (vaultSection) {
        vaultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function applyFilters(resetPage = true) {
    if (resetPage) currentPage = 1;
    matchingCards = [];

    productCards.forEach(card => {
      const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
      const cardStatus = (card.getAttribute('data-status') || '').toLowerCase();
      const cardTitle = (card.querySelector('.product-card-title')?.textContent || '').toLowerCase();
      const cardSummary = (card.querySelector('.product-card-summary')?.textContent || '').toLowerCase();

      // Check category/status match
      let matchesCategory = false;
      if (activeCategory === 'all') {
        matchesCategory = true;
      } else if (activeCategory === 'available') {
        matchesCategory = (cardStatus === 'available');
      } else if (activeCategory === 'pre-order' || activeCategory === 'preorder') {
        matchesCategory = (cardStatus === 'pre-order' || cardStatus === 'preorder');
      } else {
        matchesCategory = (cardCategory === activeCategory.toLowerCase());
      }

      // Check search query match
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        matchesSearch = cardTitle.includes(searchQuery) || cardSummary.includes(searchQuery) || cardCategory.includes(searchQuery);
      }

      if (matchesCategory && matchesSearch) {
        matchingCards.push(card);
      }
    });

    if (emptyState) {
      emptyState.style.display = matchingCards.length === 0 ? 'block' : 'none';
    }

    goToPage(currentPage, false);
  }

  if (filterPills.length > 0) {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.getAttribute('data-filter') || 'all';
        applyFilters(true);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters(true);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        goToPage(currentPage - 1, true);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(matchingCards.length / PRODUCTS_PER_PAGE);
      if (currentPage < totalPages) {
        goToPage(currentPage + 1, true);
      }
    });
  }

  // Check URL parameters for direct category or search linking
  const homeParams = new URLSearchParams(window.location.search);
  const initialCategory = homeParams.get('category');
  if (initialCategory && filterPills.length > 0) {
    const matchingPill = Array.from(filterPills).find(p => (p.getAttribute('data-filter') || '').toLowerCase() === initialCategory.toLowerCase());
    if (matchingPill) {
      filterPills.forEach(p => p.classList.remove('active'));
      matchingPill.classList.add('active');
      activeCategory = matchingPill.getAttribute('data-filter') || 'all';
    }
  }

  const initialSearch = homeParams.get('q') || homeParams.get('search');
  if (initialSearch && searchInput) {
    searchInput.value = initialSearch;
    searchQuery = initialSearch.toLowerCase().trim();
  }

  // Initial filter & page setup
  if (productCards.length > 0) {
    applyFilters(false);
  }

  // ==================== 2. 3D Card Tilt & Holographic Glare Physics ====================
  productCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle high-fashion tilt angles (-6 to +6 degrees)
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  // ==================== 3. Staggered Scroll Reveal ====================
  const revealElements = document.querySelectorAll('.hero-section, .catalog-toolbar, .product-grid-section');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
      el.classList.add('reveal-on-scroll');
      revealObserver.observe(el);
    });
  }

  // ==================== 4. Checkout Page Dynamic Order Generator ====================
  const checkoutContainer = document.getElementById('checkoutOrderApp');
  if (checkoutContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const productName = urlParams.get('product') || 'Pop! Marvel: Spider-Man (Brand New Day / No Way Home Final Suit)';
    const productPrice = urlParams.get('price') || '₹2,799';
    const productSlug = urlParams.get('slug') || 'spiderman-no-way-home-final-suit';
    const productImage = urlParams.get('image') || 'assets/images/spiderman-no-way-home.webp';
    const isPreOrder = urlParams.get('status') === 'preorder' || urlParams.get('type') === 'preorder';

    // Elements
    const titleEl = document.getElementById('checkoutItemTitle');
    const priceEl = document.getElementById('checkoutItemPrice');
    const slugEl = document.getElementById('checkoutItemSlug');
    const imgEl = document.getElementById('checkoutItemImg');
    const clientNameInput = document.getElementById('clientName');
    const clientAddressInput = document.getElementById('clientAddress');
    const clientNoteInput = document.getElementById('clientNote');
    const whatsappBtn = document.getElementById('btnOrderWhatsApp');
    const emailBtn = document.getElementById('btnOrderEmail');

    // Pre-order badge customization
    if (isPreOrder) {
      const badge = document.querySelector('.checkout-badge-coming-soon');
      if (badge) badge.textContent = 'Official Pre-Order Reservation';
      const orderBtnWhatsAppSpan = document.querySelector('#btnOrderWhatsApp .channel-label');
      if (orderBtnWhatsAppSpan) orderBtnWhatsAppSpan.textContent = 'Pre-Order via WhatsApp (DM)';
      const orderBtnEmailSpan = document.querySelector('#btnOrderEmail .channel-label');
      if (orderBtnEmailSpan) orderBtnEmailSpan.textContent = 'Pre-Order via Email';
    }

    // Retrieve store contact settings embedded in DOM or defaults
    const rawWhatsApp = checkoutContainer.getAttribute('data-whatsapp') || '+916366196633';
    const rawEmail = checkoutContainer.getAttribute('data-email') || 'mfucollectibles@gmail.com';
    const cleanWhatsApp = rawWhatsApp.replace(/[^0-9]/g, '');

    // Set UI values
    if (titleEl) titleEl.textContent = productName;
    if (priceEl) priceEl.textContent = productPrice;
    if (slugEl) slugEl.textContent = productSlug ? `REF: ${productSlug.toUpperCase()}` : 'POP! VAULT OFFICIAL ORDER';
    if (imgEl && productImage) {
      const cleanImg = decodeURIComponent(productImage).replace(/^(\.\.[\/\\])+/, '');
      imgEl.src = cleanImg;
      imgEl.alt = productName;
    }

    function updateActionLinks() {
      const clientName = clientNameInput?.value.trim() || '';
      const clientAddress = clientAddressInput?.value.trim() || '';
      const clientNote = clientNoteInput?.value.trim() || '';
      const actionVerb = isPreOrder ? 'pre-order' : 'order';

      // Construct WhatsApp message
      let waMessage = `Hello, I would like to ${actionVerb}: ${productName} (${productPrice}).`;
      if (productSlug) waMessage += ` [Ref: ${productSlug}]`;
      if (clientName) waMessage += `\nName: ${clientName}`;
      if (clientAddress) waMessage += `\nShipping Address: ${clientAddress}`;
      if (clientNote) waMessage += `\nSpecial Request: ${clientNote}`;

      if (whatsappBtn) {
        whatsappBtn.href = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(waMessage)}`;
      }

      // Construct Email message
      const emailSubject = `${isPreOrder ? 'Pre-Order Reservation' : 'Order Request'}: ${productName}`;
      let emailBody = `Hello,\n\nI would like to ${actionVerb} ${productName} listed at ${productPrice}.\n`;
      if (productSlug) emailBody += `Reference: ${productSlug}\n`;
      if (clientName) emailBody += `Client Name: ${clientName}\n`;
      if (clientAddress) emailBody += `Delivery Address:\n${clientAddress}\n`;
      if (clientNote) emailBody += `Notes: ${clientNote}\n`;
      emailBody += `\nPlease confirm availability and payment settlement instructions.\n\nThank you.`;

      if (emailBtn) {
        emailBtn.href = `mailto:${rawEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      }
    }

    // Initial link generation
    updateActionLinks();

    // Listen to changes in personalization form
    [clientNameInput, clientAddressInput, clientNoteInput].forEach(input => {
      if (input) input.addEventListener('input', updateActionLinks);
    });
  }
});
