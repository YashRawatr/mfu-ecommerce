import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  loadProducts,
  saveProducts,
  loadSettings,
  saveSettings,
  compileProductPage,
  compileIndexPage,
  slugify
} from './manage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 30 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-passcode'
  });
  res.end(JSON.stringify(data));
}

function isAuthorized(req, settings) {
  const masterPass = settings.adminPasscode || 'mfu2026';
  const headerPass = req.headers['x-admin-passcode'];
  const authHeader = req.headers['authorization'];
  
  if (headerPass && headerPass === masterPass) return true;
  if (authHeader && authHeader === `Bearer ${masterPass}`) return true;
  return false;
}

function saveBase64Image(base64Str, originalFileName) {
  if (!base64Str) return null;
  try {
    const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const imagesDir = path.join(__dirname, 'assets', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const ext = path.extname(originalFileName) || '.webp';
    const baseName = path.basename(originalFileName, ext);
    const safeFileName = `${slugify(baseName)}-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    const targetFilePath = path.join(imagesDir, safeFileName);
    
    fs.writeFileSync(targetFilePath, buffer);
    return `assets/images/${safeFileName}`;
  } catch (err) {
    console.error('saveBase64Image error:', err);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-passcode'
    });
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // ==================== RESTRICTED ADMIN API ENDPOINTS ====================
  if (reqPath.startsWith('/api/')) {
    const settings = loadSettings();

    // 1. Admin Login Verification
    if (reqPath === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const masterPass = settings.adminPasscode || 'mfu2026';
        if (body.passcode && body.passcode === masterPass) {
          sendJson(res, 200, { success: true, message: 'Authentication successful' });
        } else {
          sendJson(res, 401, { success: false, error: 'Incorrect admin passcode. Access denied.' });
        }
      } catch (err) {
        sendJson(res, 400, { success: false, error: 'Invalid request body' });
      }
      return;
    }

    // Guard all subsequent /api/ routes with admin authentication
    if (!isAuthorized(req, settings)) {
      sendJson(res, 401, { success: false, error: 'Unauthorized: Admin passcode required' });
      return;
    }

    // 2. Fetch Catalog for Admin Desk
    if (reqPath === '/api/products' && req.method === 'GET') {
      const products = loadProducts();
      sendJson(res, 200, { success: true, products });
      return;
    }

    // 3. Create New Product with Multiple Images & Discounted Prices
    if (reqPath === '/api/products/create' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const {
          name,
          price,
          originalPrice,
          category,
          status,
          summary,
          description,
          mainImage,
          mainImageBase64,
          mainImageFileName,
          galleryImages,
          galleryUploads
        } = body;

        if (!name || !price) {
          sendJson(res, 400, { success: false, error: 'Figure title and price are required' });
          return;
        }

        // 1. Resolve Front Cover Image
        let resolvedFrontImage = mainImage || 'assets/images/spiderman-no-way-home.webp';
        if (mainImageBase64 && mainImageFileName) {
          const uploadedFront = saveBase64Image(mainImageBase64, mainImageFileName);
          if (uploadedFront) resolvedFrontImage = uploadedFront;
        }

        // 2. Resolve Gallery Images (Front Image + Additional angles)
        let resolvedGallery = [resolvedFrontImage];
        if (Array.isArray(galleryImages)) {
          galleryImages.forEach(img => {
            if (img && !resolvedGallery.includes(img)) resolvedGallery.push(img);
          });
        }
        if (Array.isArray(galleryUploads)) {
          galleryUploads.forEach(item => {
            if (item && item.base64 && item.fileName) {
              const uploaded = saveBase64Image(item.base64, item.fileName);
              if (uploaded && !resolvedGallery.includes(uploaded)) resolvedGallery.push(uploaded);
            }
          });
        }

        // Generate clean unique slug
        let baseSlug = slugify(name);
        let slug = baseSlug;
        const products = loadProducts();
        let counter = 1;
        while (products.some(p => p.slug === slug)) {
          slug = `${baseSlug}-${counter++}`;
        }

        const newProduct = {
          id: `pop-${Date.now()}`,
          slug,
          name: name.trim(),
          price: price.trim(),
          originalPrice: originalPrice ? originalPrice.trim() : '',
          category: category || 'Anime',
          status: status || 'Available',
          mainImage: resolvedFrontImage,
          galleryImages: resolvedGallery,
          summary: summary || 'An authentic vault piece in mint box condition.',
          description: Array.isArray(description) && description.length > 0 ? description : [summary || 'Authentic Funko Pop! collectible.'],
          createdAt: new Date().toISOString()
        };

        // Prepend to top of catalog
        products.unshift(newProduct);
        saveProducts(products);

        // Compile static product page and refresh index.html
        compileProductPage(newProduct, settings);
        compileIndexPage(products, settings);

        console.log(`[ADMIN] Created figure "${newProduct.name}" (products/${newProduct.slug}.html)`);
        sendJson(res, 201, { success: true, product: newProduct });
      } catch (err) {
        console.error('Create product error:', err);
        sendJson(res, 500, { success: false, error: 'Server error creating product' });
      }
      return;
    }

    // 4. Update Existing Product (Prices, Multiple Images, Front Image, Details)
    if (reqPath === '/api/products/update' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const {
          id,
          name,
          price,
          originalPrice,
          category,
          status,
          summary,
          description,
          mainImage,
          mainImageBase64,
          mainImageFileName,
          galleryImages,
          galleryUploads
        } = body;

        const products = loadProducts();
        const target = products.find(p => p.id === id);

        if (!target) {
          sendJson(res, 404, { success: false, error: 'Product not found' });
          return;
        }

        if (name) target.name = name.trim();
        if (price) target.price = price.trim();
        if (originalPrice !== undefined) target.originalPrice = originalPrice.trim();
        if (category) target.category = category.trim();
        if (status) target.status = status.trim();
        if (summary) target.summary = summary.trim();
        if (description) {
          target.description = Array.isArray(description) ? description : [description];
        }

        // Handle Front Image update
        if (mainImageBase64 && mainImageFileName) {
          const uploadedFront = saveBase64Image(mainImageBase64, mainImageFileName);
          if (uploadedFront) target.mainImage = uploadedFront;
        } else if (mainImage) {
          target.mainImage = mainImage;
        }

        // Handle Gallery Images update
        let updatedGallery = Array.isArray(galleryImages) ? [...galleryImages] : (target.galleryImages || []);
        // Ensure mainImage is always in gallery
        if (!updatedGallery.includes(target.mainImage)) {
          updatedGallery.unshift(target.mainImage);
        }

        // Append any new gallery uploads
        if (Array.isArray(galleryUploads)) {
          galleryUploads.forEach(item => {
            if (item && item.base64 && item.fileName) {
              const uploaded = saveBase64Image(item.base64, item.fileName);
              if (uploaded && !updatedGallery.includes(uploaded)) {
                updatedGallery.push(uploaded);
              }
            }
          });
        }
        target.galleryImages = updatedGallery;

        saveProducts(products);

        // Recompile static product page and index.html
        compileProductPage(target, settings);
        compileIndexPage(products, settings);

        console.log(`[ADMIN] Updated figure "${target.name}" [Price: ${target.price}, Orig: ${target.originalPrice || 'none'}]`);
        sendJson(res, 200, { success: true, product: target });
      } catch (err) {
        console.error('Update product error:', err);
        sendJson(res, 500, { success: false, error: 'Server error updating product' });
      }
      return;
    }

    // 5. Delete Product & Remove Compiled Static Page
    if (reqPath === '/api/products/delete' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { id, slug } = body;

        let products = loadProducts();
        const initialLen = products.length;
        products = products.filter(p => p.id !== id && p.slug !== slug);

        if (products.length === initialLen) {
          sendJson(res, 404, { success: false, error: 'Product not found' });
          return;
        }

        saveProducts(products);

        // Delete compiled product HTML file
        if (slug) {
          const targetHtml = path.join(__dirname, 'products', `${slug}.html`);
          if (fs.existsSync(targetHtml)) {
            try {
              fs.unlinkSync(targetHtml);
              console.log(`[ADMIN] Removed compiled file: products/${slug}.html`);
            } catch (unlinkErr) {
              console.error('Error deleting static HTML file:', unlinkErr);
            }
          }
        }

        // Recompile homepage catalog & pagination
        compileIndexPage(products, settings);

        console.log(`[ADMIN] Successfully deleted product ${id || slug}`);
        sendJson(res, 200, { success: true, message: 'Product deleted' });
      } catch (err) {
        console.error('Delete product error:', err);
        sendJson(res, 500, { success: false, error: 'Server error deleting product' });
      }
      return;
    }

    // 6. Toggle Product Availability
    if (reqPath === '/api/products/toggle' && req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { id, status } = body;

        const products = loadProducts();
        const target = products.find(p => p.id === id);

        if (!target) {
          sendJson(res, 404, { success: false, error: 'Product not found' });
          return;
        }

        target.status = status;
        saveProducts(products);

        // Recompile product page & homepage
        compileProductPage(target, settings);
        compileIndexPage(products, settings);

        console.log(`[ADMIN] Toggled status for "${target.name}" -> ${status}`);
        sendJson(res, 200, { success: true, product: target });
      } catch (err) {
        sendJson(res, 500, { success: false, error: 'Server error updating status' });
      }
      return;
    }

    // If an unknown /api/ route is requested
    sendJson(res, 404, { success: false, error: 'API route not found' });
    return;
  }

  // ==================== STATIC FILE SERVING ====================
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/admin') {
    reqPath = '/admin.html';
  } else if (reqPath === '/checkout') {
    reqPath = '/checkout.html';
  }

  let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  // If path has no extension and a .html file exists, serve it (clean URLs)
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const networks = getNetworkAddresses();
  console.log(`\n=============================================================`);
  console.log(`  MFU — HOSTED DIRECTLY FROM YOUR PC WITH ADMIN CONTROL DESK`);
  console.log(`=============================================================`);
  console.log(`  > Public Storefront:     http://localhost:${PORT}`);
  console.log(`  > Admin Control Panel:   http://localhost:${PORT}/admin`);
  console.log(`  > Default Passcode:      mfu2026`);
  networks.forEach(net => {
    console.log(`  > On your Wi-Fi / Phone: http://${net.address}:${PORT}`);
  });
  console.log(`-------------------------------------------------------------`);
  console.log(`  Normal visitors can browse the store; /admin is passcode locked!`);
  console.log(`=============================================================\n`);
});
