#!/usr/bin/env node

/**
 * ============================================================================
 * ATELIER CLOUD DANCER — ZERO-CODE TERMINAL CLI MANAGEMENT SYSTEM
 * Local Interactive Management for Products, Availability, and Static Generation
 * ============================================================================
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_JSON_PATH = path.join(DATA_DIR, 'products.json');
const SETTINGS_JSON_PATH = path.join(DATA_DIR, 'settings.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const PRODUCT_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'product-template.html');
const INDEX_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'index-template.html');
const PRODUCTS_OUT_DIR = path.join(__dirname, 'products');
const INDEX_HTML_PATH = path.join(__dirname, 'index.html');
const CHECKOUT_HTML_PATH = path.join(__dirname, 'checkout.html');

// Helper: ANSI colors for high-fashion terminal styling
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  obsidian: '\x1b[38;2;20;20;19m',
  taupe: '\x1b[38;2;120;116;108m',
  cloudDancerBg: '\x1b[48;2;240;238;233m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

// Slugify helper
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Relative URL path normalizers for subfolder (products/) vs root (index.html)
function toProductPagePath(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('/')) {
    return url;
  }
  return '../' + url.replace(/^\.\.\//, '');
}

function toRootPagePath(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('/')) {
    return url;
  }
  return url.replace(/^\.\.\//, '');
}

// Load Data
function loadProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`${c.red}Error loading products.json: ${err.message}${c.reset}`);
    return [];
  }
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`${c.red}Error saving products.json: ${err.message}${c.reset}`);
    return false;
  }
}

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_JSON_PATH)) {
      return {
        storeName: "MFU",
        tagline: "Curated Funko Pop! Vinyl Figures & Rare Chase Editions",
        whatsappNumber: "+91 6366196633",
        contactEmail: "mfucollectibles@gmail.com",
        instagramHandle: "@mfu.pop",
        instagramUrl: "https://www.instagram.com/mfu.pop",
        currencySymbol: "$",
        atelierLocation: "Bangalore &bull; Delhi &bull; Mumbai",
        announcementText: "Complimentary 0.5mm Pop Protector Shield on All Figures &bull; Worldwide Dispatch"
      };
    }
    const raw = fs.readFileSync(SETTINGS_JSON_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`${c.red}Error loading settings.json: ${err.message}${c.reset}`);
    return {};
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_JSON_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`${c.red}Error saving settings.json: ${err.message}${c.reset}`);
    return false;
  }
}

// ============================================================================
// TEMPLATE SYNC ENGINE: Rebuilding Static HTML
// ============================================================================

function compileProductPage(product, settings) {
  if (!fs.existsSync(PRODUCT_TEMPLATE_PATH)) {
    throw new Error(`Master template not found at ${PRODUCT_TEMPLATE_PATH}`);
  }

  const template = fs.readFileSync(PRODUCT_TEMPLATE_PATH, 'utf-8');
  const cleanWhatsApp = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
  const isAvailable = product.status === 'Available';
  const isPreOrder = product.status === 'Pre-Order' || product.status === 'Preorder';
  let statusClass = 'out-of-stock';
  let statusLabel = 'OUT OF STOCK';
  if (isAvailable) {
    statusClass = 'available';
    statusLabel = 'AVAILABLE';
  } else if (isPreOrder) {
    statusClass = 'pre-order';
    statusLabel = 'PRE-ORDER';
  }

  // Build Thumbnail Strip
  const galleryList = (product.galleryImages && product.galleryImages.length > 0)
    ? product.galleryImages
    : [product.mainImage];

  const thumbsHtml = galleryList.map((imgUrl, index) => {
    const thumbSrc = toProductPagePath(imgUrl);
    return `<div class="gallery-thumb-item ${index === 0 ? 'active' : ''}" data-full-src="${thumbSrc}">
      <img src="${thumbSrc}" alt="${product.name} view ${index + 1}" loading="lazy">
    </div>`;
  }).join('\n            ');

  // Build Price Display with Discounts
  let priceStackHtml = `<span class="product-price-large">${product.price}</span>`;
  if (product.originalPrice) {
    const numPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
    const numOrig = parseFloat(product.originalPrice.replace(/[^0-9.]/g, ''));
    let pillHtml = '';
    if (numOrig > numPrice) {
      const diff = Math.round(numOrig - numPrice);
      const pct = Math.round(((numOrig - numPrice) / numOrig) * 100);
      pillHtml = `<span class="product-discount-pill">SAVE ₹${diff.toLocaleString('en-IN')} (${pct}% OFF)</span>`;
    }
    priceStackHtml = `
      <div class="price-stack">
        <span class="product-price-large">${product.price}</span>
        <span class="product-price-original">${product.originalPrice}</span>
        ${pillHtml}
      </div>
    `;
  }

  // Build Specs List
  const specs = Array.isArray(product.description)
    ? product.description
    : [product.description];

  const specsHtml = specs.map(item => `<li>${item}</li>`).join('\n              ');

  // Build Call to Action Button
  let actionsHtml = '';
  if (isAvailable || isPreOrder) {
    const checkoutQuery = new URLSearchParams({
      product: product.name,
      price: product.price,
      slug: product.slug,
      image: toRootPagePath(product.mainImage),
      status: isPreOrder ? 'preorder' : 'available'
    }).toString();

    const btnText = isPreOrder ? 'PRE-ORDER NOW' : 'PROCEED TO CHECKOUT';

    actionsHtml = `
      <a href="../checkout.html?${checkoutQuery}" class="btn-cta btn-cta-primary">
        ${btnText}
      </a>
    `;
    if (isPreOrder) {
      actionsHtml += `
        <div style="margin-top: 12px; text-align: center;">
          <span class="caption" style="color: #78350F; letter-spacing: 0.12em;">Official Pre-Order Reservation &bull; Mint 10/10 Box Protected</span>
        </div>
      `;
    }
  } else {
    const waText = encodeURIComponent(`Hello, I would like to inquire about restock / bespoke order for: ${product.name} (${product.price}).`);
    const emailSubject = encodeURIComponent(`Restock Inquiry: ${product.name}`);
    const emailBody = encodeURIComponent(`Hello Atelier,\n\nI am interested in acquiring ${product.name} listed at ${product.price}.\n\nPlease let me know when this edition becomes available again or if a bespoke piece can be commissioned.\n\nThank you.`);

    actionsHtml = `
      <button class="btn-cta btn-cta-disabled" disabled>
        CURRENTLY UNAVAILABLE
      </button>
      <div class="restock-inquiry-box">
        <p>This edition is currently spoken for. To join the priority waitlist or request a bespoke commission, reach out directly to the atelier:</p>
        <div class="inquiry-buttons-group">
          <a href="https://wa.me/${cleanWhatsApp}?text=${waText}" target="_blank" rel="noopener" class="btn-inquire">
            <span>WhatsApp Concierge</span>
          </a>
          <a href="mailto:${settings.contactEmail}?subject=${emailSubject}&body=${emailBody}" class="btn-inquire">
            <span>Email Inquiries</span>
          </a>
        </div>
      </div>
    `;
  }

  // Replace placeholders
  let html = template
    .replaceAll('{{STORE_NAME}}', settings.storeName || 'MFU')
    .replaceAll('{{STORE_TAGLINE}}', settings.tagline || 'Curated Funko Pop! Vinyl Figures & Rare Chase Editions')
    .replaceAll('{{STORE_WHATSAPP}}', settings.whatsappNumber || '')
    .replaceAll('{{STORE_WHATSAPP_CLEAN}}', cleanWhatsApp)
    .replaceAll('{{STORE_EMAIL}}', settings.contactEmail || '')
    .replaceAll('{{INSTAGRAM_HANDLE}}', settings.instagramHandle || '@mfu.pop')
    .replaceAll('{{INSTAGRAM_URL}}', settings.instagramUrl || 'https://www.instagram.com/mfu.pop')
    .replaceAll('{{ATELIER_LOCATION}}', settings.atelierLocation || 'Bangalore &bull; Delhi &bull; Mumbai')
    .replaceAll('{{ANNOUNCEMENT_TEXT}}', settings.announcementText || 'Complimentary 0.5mm Pop Protector Shield on All Figures &bull; Worldwide Dispatch')
    .replaceAll('{{PRODUCT_NAME}}', product.name)
    .replaceAll('{{PRODUCT_SLUG}}', product.slug)
    .replaceAll('{{PRODUCT_PRICE}}', product.price)
    .replaceAll('{{PRODUCT_PRICE_STACK}}', priceStackHtml)
    .replaceAll('{{PRODUCT_CATEGORY}}', product.category)
    .replaceAll('{{PRODUCT_CATEGORY_SLUG}}', slugify(product.category))
    .replaceAll('{{PRODUCT_STATUS}}', product.status)
    .replaceAll('{{PRODUCT_STATUS_CLASS}}', statusClass)
    .replaceAll('{{PRODUCT_STATUS_LABEL}}', statusLabel)
    .replaceAll('{{PRODUCT_MAIN_IMAGE}}', toProductPagePath(product.mainImage))
    .replaceAll('{{PRODUCT_GALLERY_THUMBS}}', thumbsHtml)
    .replaceAll('{{PRODUCT_SUMMARY}}', product.summary)
    .replaceAll('{{PRODUCT_SPECS_HTML}}', specsHtml)
    .replaceAll('{{PRODUCT_ACTIONS_HTML}}', actionsHtml)
    .replaceAll('{{YEAR}}', new Date().getFullYear().toString());

  // Ensure products directory exists
  if (!fs.existsSync(PRODUCTS_OUT_DIR)) {
    fs.mkdirSync(PRODUCTS_OUT_DIR, { recursive: true });
  }

  const outFilePath = path.join(PRODUCTS_OUT_DIR, `${product.slug}.html`);
  fs.writeFileSync(outFilePath, html, 'utf-8');
  return outFilePath;
}

function compileIndexPage(products, settings) {
  if (!fs.existsSync(INDEX_TEMPLATE_PATH)) {
    throw new Error(`Master index template not found at ${INDEX_TEMPLATE_PATH}`);
  }

  const template = fs.readFileSync(INDEX_TEMPLATE_PATH, 'utf-8');
  const cleanWhatsApp = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');

  // Extract unique categories
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
  const filterPillsHtml = categories.map(cat => {
    return `<button type="button" class="filter-pill" data-filter="${cat.toLowerCase()}">${cat}</button>`;
  }).join('\n        ');

  // Build Product Cards
  const cardsHtml = products.map(product => {
    const isAvailable = product.status === 'Available';
    const isPreOrder = product.status === 'Pre-Order' || product.status === 'Preorder';
    let statusClass = 'out-of-stock';
    let statusLabel = 'OUT OF STOCK';
    if (isAvailable) {
      statusClass = 'available';
      statusLabel = 'AVAILABLE';
    } else if (isPreOrder) {
      statusClass = 'pre-order';
      statusLabel = 'PRE-ORDER';
    }

    // Build Price with Strikethrough & Discount Tag
    let priceBlockHtml = `<span class="product-card-price">${product.price}</span>`;
    if (product.originalPrice) {
      const numPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
      const numOrig = parseFloat(product.originalPrice.replace(/[^0-9.]/g, ''));
      let badgeHtml = '';
      if (numOrig > numPrice) {
        const pct = Math.round(((numOrig - numPrice) / numOrig) * 100);
        badgeHtml = `<span class="badge-discount">${pct}% OFF</span>`;
      }
      priceBlockHtml = `
              <div class="product-card-price-wrap">
                <span class="product-card-price">${product.price}</span>
                <span class="product-card-original-price">${product.originalPrice}</span>
                ${badgeHtml}
              </div>`;
    }

    return `
        <article class="product-card" data-category="${product.category}" data-status="${statusClass}">
          <a href="products/${product.slug}.html" class="product-card-figure">
            <div class="product-card-badge">
              <span class="badge-status ${statusClass}">${statusLabel}</span>
            </div>
            <img src="${toRootPagePath(product.mainImage)}" alt="${product.name}" class="product-card-img" loading="lazy">
          </a>
          <div class="product-card-body">
            <div class="product-card-meta">
              <span class="caption">${product.category}</span>
            </div>
            <a href="products/${product.slug}.html">
              <h3 class="product-card-title">${product.name}</h3>
            </a>
            <p class="product-card-summary">${product.summary}</p>
            <div class="product-card-footer">
              ${priceBlockHtml}
              <a href="products/${product.slug}.html" class="product-card-cta">
                <span>${isPreOrder ? 'Pre-Order Piece' : 'View Collector Piece'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        </article>`;
  }).join('\n');

  // Replace placeholders
  let html = template
    .replaceAll('{{STORE_NAME}}', settings.storeName || 'MFU')
    .replaceAll('{{STORE_TAGLINE}}', settings.tagline || 'Curated Funko Pop! Vinyl Figures & Rare Chase Editions')
    .replaceAll('{{STORE_WHATSAPP}}', settings.whatsappNumber || '')
    .replaceAll('{{STORE_WHATSAPP_CLEAN}}', cleanWhatsApp)
    .replaceAll('{{STORE_EMAIL}}', settings.contactEmail || '')
    .replaceAll('{{INSTAGRAM_HANDLE}}', settings.instagramHandle || '@mfu.pop')
    .replaceAll('{{INSTAGRAM_URL}}', settings.instagramUrl || 'https://www.instagram.com/mfu.pop')
    .replaceAll('{{ATELIER_LOCATION}}', settings.atelierLocation || 'Bangalore &bull; Delhi &bull; Mumbai')
    .replaceAll('{{ANNOUNCEMENT_TEXT}}', settings.announcementText || 'Complimentary 0.5mm Pop Protector Shield on All Figures &bull; Worldwide Dispatch')
    .replaceAll('{{CATEGORY_FILTER_PILLS}}', filterPillsHtml)
    .replaceAll('{{PRODUCT_GRID_CARDS}}', cardsHtml)
    .replaceAll('{{YEAR}}', new Date().getFullYear().toString());

  fs.writeFileSync(INDEX_HTML_PATH, html, 'utf-8');
  return INDEX_HTML_PATH;
}

function syncCheckoutPage(settings) {
  if (!fs.existsSync(CHECKOUT_HTML_PATH)) return;

  try {
    let content = fs.readFileSync(CHECKOUT_HTML_PATH, 'utf-8');
    content = content.replace(/data-whatsapp="[^"]*"/, `data-whatsapp="${settings.whatsappNumber}"`);
    content = content.replace(/data-email="[^"]*"/, `data-email="${settings.contactEmail}"`);
    fs.writeFileSync(CHECKOUT_HTML_PATH, content, 'utf-8');
  } catch (err) {
    // Non-fatal
  }
}

function rebuildAll(products, settings) {
  console.log(`\n${c.cyan}⚡ Rebuilding all static editorial pages from master template...${c.reset}`);
  
  let count = 0;
  for (const prod of products) {
    compileProductPage(prod, settings);
    count++;
  }

  compileIndexPage(products, settings);
  syncCheckoutPage(settings);

  console.log(`${c.green}✔ Successfully generated ${count} product pages and updated index.html & checkout.html!${c.reset}`);
}

// ============================================================================
// INTERACTIVE CLI COMMAND HANDLERS
// ============================================================================

async function handleAddProduct(rl) {
  console.log(`\n${c.bold}========================================${c.reset}`);
  console.log(`${c.bold}       [1] ADD NEW PRODUCT PAGE         ${c.reset}`);
  console.log(`${c.bold}========================================${c.reset}`);

  const name = await rl.question(`${c.cyan}1. Product Name:${c.reset} `);
  if (!name.trim()) {
    console.log(`${c.red}Product name cannot be empty.${c.reset}`);
    return;
  }

  const defaultSlug = slugify(name);
  const slugInput = await rl.question(`${c.cyan}   Slug [Press Enter for '${defaultSlug}']:${c.reset} `);
  const slug = slugInput.trim() ? slugify(slugInput) : defaultSlug;

  const products = loadProducts();
  if (products.some(p => p.slug === slug)) {
    console.log(`${c.red}A product with slug '${slug}' already exists. Please choose another name.${c.reset}`);
    return;
  }

  const price = await rl.question(`${c.cyan}2. Offer Price (e.g. ₹2,499):${c.reset} `);
  const originalPrice = await rl.question(`${c.cyan}3. Original MRP Price (optional, e.g. ₹3,299):${c.reset} `);
  const category = await rl.question(`${c.cyan}4. Category / Fandom (e.g. Anime, Marvel & DC, Gaming):${c.reset} `);
  const mainImage = await rl.question(`${c.cyan}5. Front Image URL or local path:${c.reset} `);
  const galleryInput = await rl.question(`${c.cyan}6. Additional Gallery Images (comma-separated, optional):${c.reset} `);
  const summary = await rl.question(`${c.cyan}7. Short Editorial Summary:${c.reset} `);
  const detailsInput = await rl.question(`${c.cyan}8. Specifications / Details (comma-separated):${c.reset} `);
  
  console.log(`${c.cyan}9. Availability Status:${c.reset}`);
  console.log(`   [1] Available (In Stock)`);
  console.log(`   [2] Pre-Order`);
  console.log(`   [3] Out of Stock`);
  const statusChoice = await rl.question(`   Select [1/2/3, default 1]: `);
  let status = 'Available';
  if (statusChoice.trim() === '2') status = 'Pre-Order';
  else if (statusChoice.trim() === '3') status = 'Out of Stock';

  // Parse gallery & specs
  const galleryImages = [mainImage.trim()];
  if (galleryInput.trim()) {
    const extras = galleryInput.split(',').map(s => s.trim()).filter(Boolean);
    galleryImages.push(...extras);
  }

  const description = detailsInput.trim()
    ? detailsInput.split(',').map(s => s.trim()).filter(Boolean)
    : [summary];

  const newProduct = {
    id: `prod-${Date.now()}`,
    slug,
    name: name.trim(),
    price: price.trim() || '₹0',
    originalPrice: originalPrice.trim() || '',
    category: category.trim() || 'Anime',
    status,
    mainImage: mainImage.trim() || 'assets/images/spiderman-no-way-home.webp',
    galleryImages,
    summary: summary.trim() || 'An authentic vault piece in mint box condition.',
    description,
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);
  saveProducts(products);

  const settings = loadSettings();
  compileProductPage(newProduct, settings);
  compileIndexPage(products, settings);

  console.log(`\n${c.green}✔ Created product: ${newProduct.name}${c.reset}`);
  console.log(`${c.green}✔ Static HTML generated at: products/${newProduct.slug}.html${c.reset}`);
  console.log(`${c.green}✔ Homepage catalog refreshed.${c.reset}`);
}

async function handleToggleAvailability(rl) {
  const products = loadProducts();
  if (products.length === 0) {
    console.log(`\n${c.yellow}No products found in data/products.json.${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}========================================${c.reset}`);
  console.log(`${c.bold}    [2] TOGGLE PRODUCT AVAILABILITY     ${c.reset}`);
  console.log(`${c.bold}========================================${c.reset}`);

  products.forEach((p, idx) => {
    let statusText = `${c.red}[OUT OF STOCK]${c.reset}`;
    if (p.status === 'Available') statusText = `${c.green}[AVAILABLE]${c.reset}`;
    else if (p.status === 'Pre-Order' || p.status === 'Preorder') statusText = `${c.yellow}[PRE-ORDER]${c.reset}`;
    console.log(`[${idx + 1}] ${p.name.padEnd(34)} ${statusText}`);
  });

  const choiceStr = await rl.question(`\n${c.cyan}Enter product number to update status (or 0 to cancel):${c.reset} `);
  const choice = parseInt(choiceStr, 10);

  if (isNaN(choice) || choice < 1 || choice > products.length) {
    console.log(`${c.taupe}Action cancelled.${c.reset}`);
    return;
  }

  const target = products[choice - 1];
  console.log(`\n${c.cyan}Select new status for "${target.name}":${c.reset}`);
  console.log(`  [1] Available (In Stock)`);
  console.log(`  [2] Pre-Order`);
  console.log(`  [3] Out of Stock`);
  console.log(`  [Enter] Cycle to next status`);
  const statusSelect = await rl.question(`Select [1/2/3 or Enter]: `);

  if (statusSelect.trim() === '1') {
    target.status = 'Available';
  } else if (statusSelect.trim() === '2') {
    target.status = 'Pre-Order';
  } else if (statusSelect.trim() === '3') {
    target.status = 'Out of Stock';
  } else {
    // Cycle
    if (target.status === 'Available') target.status = 'Pre-Order';
    else if (target.status === 'Pre-Order' || target.status === 'Preorder') target.status = 'Out of Stock';
    else target.status = 'Available';
  }

  saveProducts(products);
  const settings = loadSettings();
  compileProductPage(target, settings);
  compileIndexPage(products, settings);

  let newStatusColored = `${c.red}OUT OF STOCK${c.reset}`;
  if (target.status === 'Available') newStatusColored = `${c.green}AVAILABLE${c.reset}`;
  else if (target.status === 'Pre-Order') newStatusColored = `${c.yellow}PRE-ORDER${c.reset}`;

  console.log(`\n${c.green}✔ Updated "${target.name}" -> ${newStatusColored}`);
  console.log(`${c.green}✔ Static page 'products/${target.slug}.html' & homepage updated instantly!${c.reset}`);
}

async function handleEditProduct(rl) {
  const products = loadProducts();
  if (products.length === 0) {
    console.log(`\n${c.yellow}No products available to edit.${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}========================================${c.reset}`);
  console.log(`${c.bold}        [3] EDIT EXISTING PRODUCT        ${c.reset}`);
  console.log(`${c.bold}========================================${c.reset}`);

  products.forEach((p, idx) => {
    console.log(`[${idx + 1}] ${p.name} (${p.price}) [${p.status}]`);
  });

  const choiceStr = await rl.question(`\n${c.cyan}Select product number to edit (or 0 to cancel):${c.reset} `);
  const choice = parseInt(choiceStr, 10);

  if (isNaN(choice) || choice < 1 || choice > products.length) {
    console.log(`${c.taupe}Action cancelled.${c.reset}`);
    return;
  }

  const p = products[choice - 1];
  console.log(`\n${c.taupe}Press [Enter] on any field to keep its existing value.${c.reset}\n`);

  const name = await rl.question(`${c.cyan}Name [${p.name}]:${c.reset} `);
  if (name.trim()) p.name = name.trim();

  const price = await rl.question(`${c.cyan}Price [${p.price}]:${c.reset} `);
  if (price.trim()) p.price = price.trim();

  const category = await rl.question(`${c.cyan}Category [${p.category}]:${c.reset} `);
  if (category.trim()) p.category = category.trim();

  const mainImage = await rl.question(`${c.cyan}Main Image [${p.mainImage}]:${c.reset} `);
  if (mainImage.trim()) {
    p.mainImage = mainImage.trim();
    if (!p.galleryImages || p.galleryImages.length === 0) {
      p.galleryImages = [p.mainImage];
    } else {
      p.galleryImages[0] = p.mainImage;
    }
  }

  const summary = await rl.question(`${c.cyan}Editorial Summary [${p.summary}]:${c.reset} `);
  if (summary.trim()) p.summary = summary.trim();

  const specsStr = await rl.question(`${c.cyan}Specifications (comma-separated, Enter to keep current):${c.reset} `);
  if (specsStr.trim()) {
    p.description = specsStr.split(',').map(s => s.trim()).filter(Boolean);
  }

  saveProducts(products);
  const settings = loadSettings();
  compileProductPage(p, settings);
  compileIndexPage(products, settings);

  console.log(`\n${c.green}✔ Updated ${p.name} and regenerated static pages.${c.reset}`);
}

async function handleDeleteProduct(rl) {
  const products = loadProducts();
  if (products.length === 0) {
    console.log(`\n${c.yellow}No products available to delete.${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}========================================${c.reset}`);
  console.log(`${c.bold}          [4] DELETE PRODUCT            ${c.reset}`);
  console.log(`${c.bold}========================================${c.reset}`);

  products.forEach((p, idx) => {
    console.log(`[${idx + 1}] ${p.name} (${p.slug})`);
  });

  const choiceStr = await rl.question(`\n${c.cyan}Select product number to DELETE (or 0 to cancel):${c.reset} `);
  const choice = parseInt(choiceStr, 10);

  if (isNaN(choice) || choice < 1 || choice > products.length) {
    console.log(`${c.taupe}Action cancelled.${c.reset}`);
    return;
  }

  const target = products[choice - 1];
  const confirm = await rl.question(`${c.red}Are you sure you want to permanently delete "${target.name}"? (y/N):${c.reset} `);

  if (confirm.trim().toLowerCase() !== 'y') {
    console.log(`${c.taupe}Deletion aborted.${c.reset}`);
    return;
  }

  // Remove html file
  const htmlPath = path.join(PRODUCTS_OUT_DIR, `${target.slug}.html`);
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }

  // Remove from array
  products.splice(choice - 1, 1);
  saveProducts(products);

  const settings = loadSettings();
  compileIndexPage(products, settings);

  console.log(`\n${c.green}✔ Product "${target.name}" deleted and catalog rebuilt.${c.reset}`);
}

async function handleUpdateContact(rl) {
  const settings = loadSettings();

  console.log(`\n${c.bold}========================================${c.reset}`);
  console.log(`${c.bold}     [6] UPDATE CONCIERGE CONTACT       ${c.reset}`);
  console.log(`${c.bold}========================================${c.reset}`);
  console.log(`Current WhatsApp: ${settings.whatsappNumber}`);
  console.log(`Current Email:    ${settings.contactEmail}\n`);

  const newWa = await rl.question(`${c.cyan}New WhatsApp number (e.g. +12125550198, Enter to keep):${c.reset} `);
  if (newWa.trim()) settings.whatsappNumber = newWa.trim();

  const newEmail = await rl.question(`${c.cyan}New Contact Email (e.g. orders@atelier.com, Enter to keep):${c.reset} `);
  if (newEmail.trim()) settings.contactEmail = newEmail.trim();

  saveSettings(settings);

  // Rebuild all pages so new contact links are active everywhere
  const products = loadProducts();
  rebuildAll(products, settings);

  console.log(`\n${c.green}✔ Contact details saved and synced across all pages.${c.reset}`);
}

// ============================================================================
// MAIN CLI LOOP
// ============================================================================

async function main() {
  const rl = readline.createInterface({ input, output });

  // Banner
  console.clear();
  console.log(`\n${c.bold}------------------------------------------------------------${c.reset}`);
  console.log(`${c.bold}            MFU — CONTENT MANAGEMENT TERMINAL CLI            ${c.reset}`);
  console.log(`${c.dim}  Zero-Code Static Commerce System & Master Template Engine ${c.reset}`);
  console.log(`${c.bold}------------------------------------------------------------${c.reset}`);

  let running = true;
  while (running) {
    console.log(`\n${c.bold}MANAGEMENT MENU:${c.reset}`);
    console.log(`  ${c.cyan}[1]${c.reset} Add New Product Page`);
    console.log(`  ${c.cyan}[2]${c.reset} Toggle Product Availability (Available / Out of Stock)`);
    console.log(`  ${c.cyan}[3]${c.reset} Edit Existing Product`);
    console.log(`  ${c.cyan}[4]${c.reset} Delete Product`);
    console.log(`  ${c.cyan}[5]${c.reset} Rebuild All Pages from Master Template`);
    console.log(`  ${c.cyan}[6]${c.reset} Update Contact Details (WhatsApp Number & Email)`);
    console.log(`  ${c.yellow}[0]${c.reset} Exit`);

    const action = await rl.question(`\n${c.bold}Select option [0-6]:${c.reset} `);

    switch (action.trim()) {
      case '1':
        await handleAddProduct(rl);
        break;
      case '2':
        await handleToggleAvailability(rl);
        break;
      case '3':
        await handleEditProduct(rl);
        break;
      case '4':
        await handleDeleteProduct(rl);
        break;
      case '5': {
        const products = loadProducts();
        const settings = loadSettings();
        rebuildAll(products, settings);
        break;
      }
      case '6':
        await handleUpdateContact(rl);
        break;
      case '0':
        running = false;
        console.log(`\n${c.taupe}Exiting Atelier CLI. Have a wonderful day.${c.reset}\n`);
        break;
      default:
        console.log(`${c.red}Invalid option. Please choose between 0 and 6.${c.reset}`);
        break;
    }
  }

  rl.close();
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(`CLI Error:`, err);
    process.exit(1);
  });
}

export {
  loadProducts,
  saveProducts,
  loadSettings,
  saveSettings,
  compileProductPage,
  compileIndexPage,
  rebuildAll,
  slugify
};

