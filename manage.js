/**
 * NEW OVERHAUL — STATIC COMPILER & CONTENT MANAGER
 * Compiles index.html, checkout.html, and products/*.html using data/products.json & data/settings.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_JSON = path.join(DATA_DIR, 'products.json');
const SETTINGS_JSON = path.join(DATA_DIR, 'settings.json');
const OUT_PRODUCTS_DIR = path.join(__dirname, 'products');

export function loadProducts() {
  if (!fs.existsSync(PRODUCTS_JSON)) return [];
  return JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'));
}

export function loadSettings() {
  if (!fs.existsSync(SETTINGS_JSON)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_JSON, 'utf-8'));
}

// Clean title formatter
export function formatTitle(rawName) {
  let name = (rawName || '').trim();
  name = name.replace(/\s*#\d+\b/g, '');
  name = name.replace(/^Pop!?\s*/i, '');
  name = name.replace(/^(DC Comics|Marvel|Anime|Sports|Godzilla|Welcome to Derry|Harry Potter|Television|Movies|Games|Gaming|Animation):\s*/i, '');
  name = name.replace(/\s*\((?:LE\s*\d+|LE\d+|Signed|2017 Summer Convention Exclusive|Funko Fundays\d*\s*SE)\)/gi, '');
  return `Pop! ${name.trim()}`;
}

// Subtitle generator
export function getSubtitle(name, category) {
  const n = (name || '').toLowerCase();
  if (n.includes('riddler')) return 'Gotham Enigma • Special Edition';
  if (n.includes('groot')) return 'Wild Fusion • Limited Series';
  if (n.includes('captain america')) return 'First Avenger • Convention Grail';
  if (n.includes('justice armor') || n.includes('batman')) return 'Dark Knight • Armored Edition';
  if (n.includes('hulk')) return 'Chrome Alloy • Special Finish';
  if (n.includes('spider-man')) return 'Web Slinger • Vintage Series';
  if (n.includes('thor')) return 'Asgardian Core • Glow Edition';
  if (n.includes('stark') || n.includes('iron man')) return 'Stark Archive • Infinity Saga';
  if (n.includes('sung jinwoo')) return 'Shadow Monarch • Solo Leveling';
  if (n.includes('choi jong-in')) return 'Ultimate Soldier • Solo Leveling';
  if (n.includes('pain')) return 'Six Paths • Signed Collectible';
  if (n.includes('superman')) return 'Man of Steel • Iconic Edition';
  if (n.includes('periwinkle')) return 'Derry Archive • Signed Edition';
  if (n.includes('messi')) return 'World Champion • Sports Legends';
  if (n.includes('aquaman')) return 'Seven Seas • Justice League';
  if (n.includes('harry potter')) return 'Golden Snitch • Wizarding World';
  if (n.includes('godzilla')) return 'Fundays Grail • Atomic Edition';
  if (n.includes('gyokko')) return 'Upper Moon • Demon Slayer';
  if (n.includes('nezuko')) return 'Awakened Demon • Demon Slayer';
  if (n.includes('wolverine')) return 'Viral Archive • Deluxe Series';
  if (n.includes('naruto')) return 'Forbidden Scroll • Hidden Leaf';
  if (n.includes('sakamoto')) return 'Retired Hitman • Sakamoto Days';
  if (n.includes('takamura')) return 'Order Swordsman • Katana Master';
  if (n.includes('goku')) return 'Super Saiyan • Dragon Ball';
  if (n.includes('clicker')) return 'Cordyceps Fungal • The Last of Us';
  if (n.includes('wolf')) return 'Snow Companion • Ghost of Yōtei';
  if (n.includes('rengoku')) return 'Flame Hashira • Sumi Deco';
  if (n.includes('zenitsu')) return 'Thunder Breathing • Lightning Master';
  if (n.includes('tanjiro')) return 'Hinokami Kagura • Dance of Fire';
  if (n.includes('invincible')) return 'Skybound Hero • Flying Kick';
  if (n.includes('doom')) return 'Latverian Monarch • Doomsday';
  if (n.includes('wednesday')) return 'Nevermore Academy • Gothic Icon';
  if (n.includes('leon')) return 'Survival Horror • Resident Evil';
  if (n.includes('anakin')) return 'Chosen One • Jedi Order';
  if (n.includes('stewie')) return 'Infant Mastermind • Family Guy';
  if (n.includes('sanji')) return 'Egghead Tech • Black Leg Cook';
  if (n.includes('zoro')) return 'Three Swords • Live Action';
  if (n.includes('saitama')) return 'One-Punch Hero • Hero Association';
  if (n.includes('genos')) return 'Demon Cyborg • Incineration Cannon';
  if (n.includes('midoriya') || n.includes('deku')) return 'Full Cowl • My Hero Academia';
  if (n.includes('punisher')) return 'Vigilante Justice • Tactical Blade';
  if (n.includes('cyclops')) return 'Optic Blast • X-Men Resistance';
  if (n.includes('magneto')) return 'Magnetic Master • Doomsday';
  if (n.includes('yelena')) return 'White Widow • Tactical Combat';
  if (n.includes('fantastic')) return 'Elastic Intellect • First Steps';

  // Category fallbacks
  if (category === 'Anime') return 'Japanese Animation • Curated Vinyl';
  if (category === 'Marvel') return 'Marvel Multiverse • Signature Edition';
  if (category === 'DC Comics') return 'DC Universe • Collector Archive';
  if (category === 'Gaming') return 'Gaming Legends • Iconic Series';
  if (category === 'Television') return 'Television Legends • Vault Edition';
  if (category === 'Movies') return 'Cinematic Vault • Classic Collectible';
  if (category === 'Sports') return 'Sports Legends • Pitch Icon';
  return 'Collector Archive • Vinyl Edition';
}

// Build index.html
export function buildIndex(products, settings) {
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const categoryPillsHtml = categories.map(cat => {
    const isAll = cat === 'All';
    const filterVal = isAll ? 'all' : cat.toLowerCase();
    return `<button type="button" class="shelf-pill ${isAll ? 'active' : ''}" data-filter="${filterVal}">${cat}</button>`;
  }).join('\n          ');

  const cardsHtml = products.map((p, idx) => {
    const isAvailable = p.status === 'Available';
    const isPreOrder = p.status === 'Pre-Order' || p.status === 'Preorder';
    const statusClass = isAvailable ? 'available' : (isPreOrder ? 'preorder' : 'out-of-stock');
    const statusLabel = isAvailable ? 'In Stock' : (isPreOrder ? 'Pre-Order' : 'Vaulted');

    const cleanName = formatTitle(p.name);
    const subtitle = getSubtitle(p.name, p.category);
    const specsJson = JSON.stringify(Array.isArray(p.description) ? p.description : [p.description || 'Exclusive official Funko Pop figure.']).replace(/"/g, '&quot;');

    // Use transparent Pop person image or product image
    const imgSrc = p.mainImage && fs.existsSync(path.join(__dirname, p.mainImage))
      ? p.mainImage
      : 'Pics/pop_person_transparent.png';

    const initialDisplay = idx < 25 ? 'flex' : 'none';

    return `
        <article class="collector-card" 
          data-id="${p.id}" 
          data-slug="${p.slug}" 
          data-name="${cleanName}" 
          data-price="${p.price}" 
          data-category="${p.category || 'Collectibles'}" 
          data-status="${statusClass}"
          data-image="${imgSrc}"
          data-specs="${specsJson}"
          style="display: ${initialDisplay};">
          
          <div class="card-visual-frame">
            <span class="card-status-pill ${statusClass}">
              <span class="indicator-dot"></span>
              ${statusLabel}
            </span>
            <a href="products/${p.slug}.html" class="card-visual-link" aria-label="${cleanName}">
              <img src="${imgSrc}" alt="${cleanName}" class="card-visual-img" loading="lazy">
            </a>
            <div class="card-action-deck">
              <button type="button" class="btn-card-quickview">Quick View</button>
              <button type="button" class="btn-card-quickadd" aria-label="Add to Bag">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="card-info-body">
            <a href="products/${p.slug}.html" class="card-title-link">
              <h3 class="card-title">${cleanName}</h3>
            </a>
            <span class="card-category-tag">${subtitle}</span>
            <div class="card-price-row">
              <span class="card-price">${p.price}</span>
              ${p.originalPrice ? `<span class="card-original-price">${p.originalPrice}</span>` : ''}
            </div>
          </div>

        </article>`;
  }).join('\n');

  const cleanPhone = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.storeName || 'MFU'} — ${settings.tagline || 'Curated Vault Collectibles'}</title>
  <meta name="description" content="Discover rare, verified authentic Funko Pop vinyl figures, grails, and limited editions. Complete with free 0.5mm Pop Protector Shields.">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/images/favicon.png">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" href="assets/images/mfu-logo.png">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/images/favicon.png">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" href="assets/images/mfu-logo.png">
  <link rel="stylesheet" href="assets/css/app.css">
  <script>
    window.__STORE_SETTINGS__ = ${JSON.stringify(settings)};
  </script>
</head>
<body>

  <!-- Top Utility Marquee Bar -->
  <aside class="utility-bar">
    <span>${settings.announcementText || 'Complimentary 0.5mm Pop Protector Shield on All Figures • Worldwide Dispatch'}</span>
  </aside>

  <!-- Floating Tech Header -->
  <header class="tech-header">
    <div class="container tech-header-inner">
      
      <!-- Brand Identity -->
      <a href="index.html" class="brand-identity">
        <div class="brand-badge">
          <img src="assets/images/mfu-logo.png" alt="MFU Collectibles Logo">
        </div>
        <div class="brand-text">
          <span class="brand-title">${settings.storeName || 'MFU'}</span>
          <span class="brand-subtitle">COLLECTIBLES</span>
        </div>
      </a>

      <!-- Instant Keyboard-Aware Search Field -->
      <div class="header-search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" id="searchInput" class="search-field" placeholder="Search verified grails, characters, series..." aria-label="Search catalog">
        <kbd class="search-kbd">/</kbd>
      </div>

      <!-- Actions -->
      <div class="header-actions">
        <a href="https://wa.me/${cleanPhone}" target="_blank" rel="noopener" class="btn-desk-concierge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <span>VIP Desk</span>
        </a>

        <button type="button" class="btn-cart-trigger" id="cartTrigger" aria-label="Open Collector Bag">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
          <span class="cart-count-badge" id="cartBadge">0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- Hero Banner & Live Stats -->
  <section class="hero-deck">
    <div class="container hero-deck-content">
      <div class="hero-headline-wrap">
        <div class="hero-pill-badge">
          <span class="dot"></span>
          Vault Archive • Authenticated Curations
        </div>
        <h1 class="hero-headline">Curated Rare Vinyl & Grail Archive</h1>
        <p class="hero-lead">Museum-grade Pop collectibles, rare convention exclusives, and vaulted vinyl figurines. Every piece ships in a complimentary 0.5mm UV-filtering shield.</p>
      </div>

      <div class="hero-metrics-strip">
        <div class="metric-card">
          <div class="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">${products.length} Grails</span>
            <span class="metric-label">In Live Archive</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">0.5mm Shield</span>
            <span class="metric-label">Included on All Pops</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">Fast Dispatch</span>
            <span class="metric-label">Pan-India Express</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">100% Genuine</span>
            <span class="metric-label">Inspected & Verified</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Shelf Control Bar -->
  <section class="shelf-bar">
    <div class="container shelf-bar-inner">
      <div class="shelf-categories" id="shelfCategories">
        ${categoryPillsHtml}
      </div>

      <div class="shelf-tools">
        <label class="stock-toggle-label">
          <input type="checkbox" id="stockToggle" class="stock-toggle-input">
          <span class="stock-toggle-switch"></span>
          <span>In Stock Only</span>
        </label>

        <select id="sortSelect" class="shelf-select" aria-label="Sort products">
          <option value="featured">Sort: Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="title-az">Name: A to Z</option>
        </select>

        <span class="results-count-badge" id="resultsCounter">Showing 1–25 of ${products.length} Vault Pieces (Page 1 of ${Math.ceil(products.length / 25)})</span>
      </div>
    </div>
  </section>

  <!-- 5-Column Product Grid with 5x5 Pagination -->
  <main class="catalog-section">
    <div class="container">
      <div class="collector-grid" id="collectorGrid">
        ${cardsHtml}
      </div>

      <!-- 5x5 Pagination Navigation -->
      <nav class="pagination-nav" id="paginationNav" aria-label="Catalog Navigation">
        <!-- Dynamically managed via app.js -->
      </nav>
    </div>
  </main>

  <!-- Slide-Out Cart / Bag Drawer -->
  <div class="cart-backdrop" id="cartBackdrop"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-label="Shopping Bag">
    <div class="cart-drawer-header">
      <h3 class="cart-drawer-title">Collector Bag</h3>
      <button type="button" class="btn-drawer-close" id="cartClose" aria-label="Close Bag">✕</button>
    </div>

    <div class="cart-drawer-items" id="cartItems">
      <!-- Populated via app.js -->
    </div>

    <div class="cart-drawer-footer">
      <div class="cart-subtotal-row">
        <span>Estimated Subtotal</span>
        <span class="cart-subtotal-val" id="cartSubtotal">₹0</span>
      </div>
      <a href="#" class="btn-whatsapp-checkout" id="cartWhatsappBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"/>
        </svg>
        <span>Checkout with WhatsApp</span>
      </a>
      <a href="checkout.html" style="text-align: center; font-size: 11.5px; color: var(--text-muted); text-decoration: underline;">
        Or view detailed order summary
      </a>
    </div>
  </aside>

  <!-- Floating Quick-View Modal -->
  <div class="modal-backdrop" id="quickViewBackdrop">
    <div class="quickview-card" role="dialog" aria-modal="true">
      <button type="button" class="btn-modal-close" id="qvClose" aria-label="Close modal">✕</button>
      
      <div class="quickview-gallery">
        <img id="qvImage" src="" alt="" class="quickview-main-img">
      </div>

      <div class="quickview-info">
        <span class="quickview-category" id="qvCategory"></span>
        <h2 class="quickview-title" id="qvTitle"></h2>
        
        <div class="quickview-price-row">
          <span class="quickview-price" id="qvPrice"></span>
          <span style="font-size: 11.5px; color: var(--accent-mint); font-weight: 700;">● Ready for Express Dispatch</span>
        </div>

        <ul class="quickview-specs" id="qvSpecs">
          <!-- Populated dynamically -->
        </ul>

        <div class="quickview-actions">
          <a href="#" class="btn-qv-whatsapp" id="qvWhatsappBtn" target="_blank" rel="noopener">
            Order via WhatsApp
          </a>
          <button type="button" class="btn-qv-bag" id="qvBagBtn">
            Add to Bag
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification Deck -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Tech Footer -->
  <footer class="tech-footer">
    <div class="container">
      <div class="tech-footer-grid">
        <div>
          <h4 class="footer-brand-title">${settings.storeName || 'MFU'} Collectibles</h4>
          <p class="footer-brand-desc">${settings.tagline || 'Curated rare Pop vinyl figures, limited grails, and authenticated collector editions.'}</p>
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">${settings.atelierLocation || 'Bangalore • Delhi • Mumbai'}</p>
        </div>

        <div>
          <h5 class="footer-section-title">Direct Concierge</h5>
          <ul class="footer-link-list">
            <li><a href="https://wa.me/${cleanPhone}" target="_blank" rel="noopener">WhatsApp: ${settings.whatsappNumber}</a></li>
            <li><a href="mailto:${settings.contactEmail}">${settings.contactEmail}</a></li>
            <li><a href="${settings.instagramUrl || '#'}" target="_blank" rel="noopener">Instagram: ${settings.instagramHandle || '@mfu.pop'}</a></li>
          </ul>
        </div>

        <div>
          <h5 class="footer-section-title">Collector Standards</h5>
          <ul class="footer-link-list">
            <li><a>0.5mm Pop Protector Shields Included</a></li>
            <li><a>Bubble-Wrapped Double-Box Packing</a></li>
            <li><a>100% Verified Authentic Packaging</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom-strip">
        <span>&copy; ${new Date().getFullYear()} ${settings.storeName || 'MFU'}. All rights reserved.</span>
        <span>Obsidian Tech Storefront Engine</span>
      </div>
    </div>
  </footer>

  <script src="assets/js/app.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf-8');
  console.log('✔ index.html compiled successfully');
}

// Build Individual Product Pages
export function buildProductPages(products, settings) {
  if (!fs.existsSync(OUT_PRODUCTS_DIR)) {
    fs.mkdirSync(OUT_PRODUCTS_DIR, { recursive: true });
  }

  const cleanPhone = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');

  products.forEach(p => {
    const cleanName = formatTitle(p.name);
    const subtitle = getSubtitle(p.name, p.category);
    const specs = Array.isArray(p.description) ? p.description : [p.description || 'Exclusive Pop vinyl collectible.'];
    const specsHtml = specs.map(s => `<li>${s}</li>`).join('\n              ');

    const imgSrc = p.mainImage && fs.existsSync(path.join(__dirname, p.mainImage))
      ? `../${p.mainImage}`
      : '../Pics/pop_person_transparent.png';

    const waMsg = encodeURIComponent(`Hello MFU Desk, I want to purchase ${cleanName} (${p.price}). Please confirm stock & shipping.`);
    const waUrl = `https://wa.me/${cleanPhone}?text=${waMsg}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanName} — ${settings.storeName || 'MFU'}</title>
  <meta name="description" content="${p.summary || cleanName}">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon.png">
  <link rel="icon" type="image/x-icon" href="../favicon.ico">
  <link rel="apple-touch-icon" href="../assets/images/mfu-logo.png">
  <link rel="stylesheet" href="../assets/css/app.css">
</head>
<body>

  <!-- Top Utility Bar -->
  <aside class="utility-bar">
    <span>Free 0.5mm Pop Protector Shield Included on Every Order</span>
  </aside>

  <!-- Sticky Header -->
  <header class="tech-header">
    <div class="container tech-header-inner">
      <a href="../index.html" class="brand-identity">
        <div class="brand-badge">
          <img src="../assets/images/mfu-logo.png" alt="Logo">
        </div>
        <div class="brand-text">
          <span class="brand-title">${settings.storeName || 'MFU'}</span>
          <span class="brand-subtitle">COLLECTIBLES</span>
        </div>
      </a>

      <div class="header-actions">
        <a href="../index.html" class="btn-desk-concierge">
          ← Back to Catalog
        </a>
      </div>
    </div>
  </header>

  <main class="detail-stage">
    <div class="container">
      <div class="detail-split">
        
        <!-- Left: Figure Display -->
        <div class="detail-gallery">
          <img src="${imgSrc}" alt="${cleanName}" class="detail-main-img">
        </div>

        <!-- Right: Information & Actions -->
        <div class="detail-info">
          <span class="detail-category-eyebrow">${p.category || 'Collectibles'} • ${subtitle}</span>
          <h1 class="detail-title">${cleanName}</h1>

          <div class="detail-price-stack">
            <span class="detail-price">${p.price}</span>
            ${p.originalPrice ? `<span class="card-original-price" style="font-size: 15px;">${p.originalPrice}</span>` : ''}
          </div>

          <p style="font-size: 14.5px; color: var(--text-secondary); line-height: 1.6;">
            ${p.summary || 'Premium Funko Pop collectible, sculpted with authentic detailing and packaged with collector-grade protection.'}
          </p>

          <div class="detail-specs-box">
            <h4 class="detail-specs-title">Item Specifications</h4>
            <ul class="detail-specs-list">
              ${specsHtml}
            </ul>
          </div>

          <div class="detail-actions-group">
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn-detail-order">
              Order via WhatsApp (${p.price})
            </a>
          </div>
        </div>

      </div>
    </div>
  </main>

  <footer class="tech-footer">
    <div class="container">
      <div class="footer-bottom-strip">
        <span>&copy; ${new Date().getFullYear()} ${settings.storeName || 'MFU'}. Authenticated Funko Grails.</span>
        <a href="../index.html" style="color: var(--accent-gold);">Return to Storefront</a>
      </div>
    </div>
  </footer>

</body>
</html>`;

    fs.writeFileSync(path.join(OUT_PRODUCTS_DIR, `${p.slug}.html`), html, 'utf-8');
  });

  console.log(`✔ Generated ${products.length} product detail pages in products/`);
}

// Build checkout.html
export function buildCheckout(settings) {
  const cleanPhone = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout & Concierge Desk — ${settings.storeName || 'MFU'}</title>
  <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>

  <header class="tech-header">
    <div class="container tech-header-inner">
      <a href="index.html" class="brand-identity">
        <div class="brand-badge">
          <img src="assets/images/mfu-logo.png" alt="Logo">
        </div>
        <div class="brand-text">
          <span class="brand-title">${settings.storeName || 'MFU'}</span>
          <span class="brand-subtitle">COLLECTIBLES</span>
        </div>
      </a>
      <a href="index.html" class="btn-desk-concierge">← Back to Store</a>
    </div>
  </header>

  <main style="padding: 60px 0 100px;">
    <div class="container" style="max-width: 640px;">
      <div style="background: var(--bg-surface); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 36px; text-align: center;">
        <span class="hero-pill-badge" style="margin-bottom: 16px;">Direct VIP Ordering</span>
        <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--text-white); margin-bottom: 12px;">Instant Concierge Checkout</h1>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px;">
          For expedited processing, bank transfers, or UPI payments, connect directly with our collector desk on WhatsApp. We offer same-day dispatch and mint box verification.
        </p>

        <a href="https://wa.me/${cleanPhone}?text=Hello%20MFU%20Desk,%20I%20would%20like%20to%20complete%20an%20order." target="_blank" rel="noopener" class="btn-detail-order" style="display: block; padding: 16px;">
          Connect on WhatsApp (+91 6366196633)
        </a>
      </div>
    </div>
  </main>

  <footer class="tech-footer">
    <div class="container">
      <div class="footer-bottom-strip">
        <span>&copy; ${new Date().getFullYear()} ${settings.storeName || 'MFU'}</span>
        <a href="index.html" style="color: var(--accent-gold);">Return to Storefront</a>
      </div>
    </div>
  </footer>

</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'checkout.html'), html, 'utf-8');
  console.log('✔ checkout.html compiled successfully');
}

export function compileAll() {
  const products = loadProducts();
  const settings = loadSettings();
  buildIndex(products, settings);
  buildProductPages(products, settings);
  buildCheckout(settings);
  console.log('🎉 All pages compiled successfully!');
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  compileAll();
}
