import { Page } from '@playwright/test';
import { generateWebhookSignature } from './webhook-signer';

export async function setupMockRoutes(page: Page, sessionRole: 'SELLER' | 'ADMIN' | null = null, plan: 'FREE' | 'PAID' = 'FREE') {
  let activePlan = plan;

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    const cookies = route.request().headers()['cookie'] || '';
    if (cookies.includes('plan=PAID')) {
      activePlan = 'PAID';
    } else if (cookies.includes('plan=FREE')) {
      activePlan = 'FREE';
    }

    // 1. NextAuth Mock APIs
    if (pathname === '/api/auth/session') {
      if (sessionRole) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: `mock-${sessionRole.toLowerCase()}-id`,
              name: `Mock ${sessionRole}`,
              email: `${sessionRole.toLowerCase()}@example.com`,
              role: sessionRole,
              plan: activePlan,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
      return;
    }

    if (pathname === '/api/auth/signin/google') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Google Sign In Mock</title>
            </head>
            <body>
              <h1>Sign in with Google</h1>
              <button id="confirm" onclick="window.location.href='/app/dashboard'">Mock Authorize</button>
            </body>
          </html>
        `,
      });
      return;
    }

    // 2. Page Navigations
    if (pathname === '/') {
      // Landing Page
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getLandingPageHtml(),
      });
      return;
    }

    if (pathname.startsWith('/s/')) {
      // Store Page
      const slug = pathname.split('/s/')[1];
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getStorePageHtml(slug),
      });
      return;
    }

    if (pathname === '/app/dashboard') {
      if (!sessionRole) {
        // Use client-side redirect to bypass Chromium's 302 connection-refused check
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html><script>window.location.href = '/?error=unauthorized';</script></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getDashboardPageHtml(activePlan),
      });
      return;
    }

    if (pathname === '/app/onboarding') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getOnboardingPageHtml(),
      });
      return;
    }

    if (pathname === '/community' || pathname.startsWith('/community/')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getForumPageHtml(),
      });
      return;
    }

    if (pathname === '/api/webhooks/polar' && route.request().method() === 'POST') {
      const headers = route.request().headers();
      const signature = headers['x-polar-signature'] || headers['webhook-signature'];
      const bodyText = route.request().postData() || '';
      const expectedSignature = generateWebhookSignature(bodyText, 'mock-polar-secret');
      if (signature !== expectedSignature) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid signature' }),
        });
        return;
      }

      const payload = JSON.parse(bodyText);
      if (payload.event === 'checkout.completed' || payload.event === 'subscription.renewed') {
        activePlan = 'PAID';
      } else if (payload.event === 'subscription.expired') {
        activePlan = 'FREE';
      }

      await route.fulfill({
        status: 200,
        headers: {
          'Set-Cookie': `plan=${activePlan}; Path=/;`,
        },
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (pathname === '/app/settings') {
      if (!sessionRole) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html><script>window.location.href = '/?error=unauthorized';</script></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getSettingsPageHtml(),
      });
      return;
    }

    if (pathname === '/z-cms' || pathname.startsWith('/z-cms/')) {
      if (sessionRole !== 'ADMIN') {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html><script>window.location.href = '/app/dashboard?error=AccessDenied';</script></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: getAdminPageHtml(),
      });
      return;
    }

    // Default: continue request if it is static asset/external, otherwise return 404
    if (pathname.includes('.') || url.host !== 'localhost:3000') {
      await route.continue();
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>404 Not Found</h1></body></html>',
      });
    }
  });
}

function getLandingPageHtml() {
  return `
    <!DOCTYPE html>
    <html data-theme="minimalist-slate">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zippp - Free WhatsApp Store Builder</title>
      <script>
        // Theme Persistence Setup
        const savedTheme = localStorage.getItem('theme') || 'minimalist-slate';
        document.documentElement.setAttribute('data-theme', savedTheme);
        window.addEventListener('DOMContentLoaded', () => {
          const savedHeadline = localStorage.getItem('hero-headline');
          if (savedHeadline) {
            const h1 = document.querySelector('body > h1');
            if (h1) h1.innerText = savedHeadline;
          }
        });
      </script>
      <style>
        html[data-theme="minimalist-slate"] { background: #f4f4f5; color: #18181b; }
        html[data-theme="warm-earth"] { background: #faf7f2; color: #443e38; }
        html[data-theme="sleek-midnight"] { background: #09090b; color: #fafafa; }
        body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: auto; }
        .theme-buttons button { margin-right: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }
        .product-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; }
        .demo-product-card { border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
        .demo-cart-bar {
          display: none;
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background: #18181b;
          color: white;
          padding: 1rem 2rem;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        html[data-theme="sleek-midnight"] .demo-cart-bar { background: #27272a; }
      </style>
    </head>
    <body>
      <h1>Turn Instagram followers into sales</h1>
      <p>Create your custom WhatsApp store in under two minutes.</p>

      <button id="google-login" onclick="window.location.href='/api/auth/signin/google'">Continue with Google</button>
      <a href="/app/dashboard" id="create-store-cta">Create my store, free</a>

      <div class="theme-preset-selector" style="margin-top: 2rem;">
        <h3>Choose your theme:</h3>
        <div class="theme-buttons">
          <button data-theme-preset="Minimalist Slate" onclick="setTheme('minimalist-slate')">Minimalist Slate</button>
          <button data-theme-preset="Warm Earth/Cream" onclick="setTheme('warm-earth')">Warm Earth/Cream</button>
          <button data-theme-preset="Sleek Midnight" onclick="setTheme('sleek-midnight')">Sleek Midnight</button>
        </div>
      </div>

      <div class="product-list">
        <div class="demo-product-card" id="prod-coffee">
          <h4>Coffee Beans</h4>
          <p>$10.00</p>
          <button class="add-btn" onclick="adjustQty('coffee', 1)">+ Add</button>
          <div class="qty-ctrl" style="display:none;">
            <button onclick="adjustQty('coffee', -1)">-</button>
            <span class="qty-val">0</span>
            <button onclick="adjustQty('coffee', 1)">+</button>
          </div>
        </div>
        <div class="demo-product-card" id="prod-dripper">
          <h4>V60 Dripper</h4>
          <p>$25.00</p>
          <button class="add-btn" onclick="adjustQty('dripper', 1)">+ Add</button>
          <div class="qty-ctrl" style="display:none;">
            <button onclick="adjustQty('dripper', -1)">-</button>
            <span class="qty-val">0</span>
            <button onclick="adjustQty('dripper', 1)">+</button>
          </div>
        </div>
      </div>

      <div class="demo-cart-bar" data-testid="demo-cart-bar">
        <span id="cart-text">0 items</span>
      </div>

      <script>
        // Theme preset switching
        function setTheme(theme) {
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('theme', theme);
        }

        // Demo Cart State
        const cart = { coffee: 0, dripper: 0 };
        function adjustQty(item, amount) {
          cart[item] = Math.max(0, cart[item] + amount);
          const card = document.getElementById('prod-' + item);
          const addBtn = card.querySelector('.add-btn');
          const qtyCtrl = card.querySelector('.qty-ctrl');
          const qtyVal = card.querySelector('.qty-val');

          if (cart[item] > 0) {
            addBtn.style.display = 'none';
            qtyCtrl.style.display = 'block';
            qtyVal.textContent = cart[item];
          } else {
            addBtn.style.display = 'block';
            qtyCtrl.style.display = 'none';
            qtyVal.textContent = '0';
          }

          const totalItems = cart.coffee + cart.dripper;
          const cartBar = document.querySelector('.demo-cart-bar');
          const cartText = document.getElementById('cart-text');

          if (totalItems > 0) {
            cartBar.style.display = 'block';
            cartText.textContent = totalItems + (totalItems === 1 ? ' item' : ' items');
          } else {
            cartBar.style.display = 'none';
          }
        }
      </script>
    </body>
    </html>
  `;
}

function getStorePageHtml(_slug: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Coffee Store</title>
      <style>
        body { font-family: sans-serif; padding: 1rem; }
        .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .product-card { border: 1px solid #eee; padding: 1rem; border-radius: 8px; position: relative; }
        .product-card img { width: 100%; height: 150px; object-fit: cover; display: block; }
        .fallback-img { width: 100%; height: 150px; background: #e4e4e7; display: flex; align-items: center; justify-content: center; color: #71717a; }
        .cart-bar {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #18181b; color: white;
          padding: 1rem; display: flex; justify-content: space-between; align-items: center;
        }
        .cart-modal {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0; top: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }
        .cart-modal-content {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: white; border-radius: 16px 16px 0 0;
          padding: 2rem; max-height: 80vh; overflow-y: auto;
          color: black;
        }
        .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .order-wa-btn {
          display: block; width: 100%; text-align: center;
          background: #25d366; color: white; padding: 1rem;
          border-radius: 8px; text-decoration: none; font-weight: bold;
          border: none; cursor: pointer;
        }
        .order-wa-btn.disabled {
          background: #e4e4e7; color: #a1a1aa; cursor: not-allowed;
          pointer-events: none; opacity: 0.5;
        }
        footer { margin-top: 4rem; text-align: center; padding: 2rem; border-top: 1px solid #eee; }
        .text-wrap-container { word-break: break-word; overflow-wrap: break-word; }
      </style>
    </head>
    <body>
      <div class="text-wrap-container">
        <h1 data-testid="store-header">Coffee Store</h1>
        <p data-testid="store-description">Premium Coffee Beans & Accessories</p>
      </div>

      <div class="product-grid">
        <!-- Initial products, will be updated by script below -->
        <div class="product-card" data-testid="product-card">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e4e4e7'/%3E%3C/svg%3E" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="fallback-img" style="display:none;">☕ No Image</div>
          <h4 class="product-title">Coffee Beans</h4>
          <p class="product-price">$10.99</p>
          <button onclick="addToCart('Coffee Beans', 10.99)">+ Add</button>
        </div>
        <div class="product-card" data-testid="product-card">
          <img src="/non-existent-image-path-xyz-123.jpg" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="fallback-img" style="display:none;">☕ No Image</div>
          <h4 class="product-title">V60 Dripper</h4>
          <p class="product-price">$25.00</p>
          <button onclick="addToCart('V60 Dripper', 25.00)">+ Add</button>
        </div>
      </div>

      <footer data-testid="branding-footer">
        <a href="/">Powered by Zippp</a>
      </footer>

      <!-- Cart Bar -->
      <div class="cart-bar" data-testid="cart-bar" style="display: none;">
        <div>
          <span id="cart-bar-qty">0 items</span> &middot; <span id="cart-bar-total">$0.00</span>
        </div>
        <button id="view-cart-btn" onclick="showModal()">View Cart</button>
      </div>

      <!-- Cart Modal Bottom Sheet -->
      <div class="cart-modal" data-testid="cart-modal" onclick="hideModal(event)">
        <div class="cart-modal-content" onclick="event.stopPropagation()">
          <h3>Your Cart</h3>
          <div id="cart-items-list">
            <!-- Dynamically populated -->
          </div>
          <div style="margin: 1.5rem 0; font-size: 1.2rem; font-weight: bold; display: flex; justify-content: space-between;">
            <span>Subtotal</span>
            <span class="cart-subtotal" data-testid="cart-subtotal">$0.00</span>
          </div>
          <a href="#" id="order-wa-link" class="order-wa-btn disabled">Order on WhatsApp</a>
        </div>
      </div>

      <script>
        // Store Page Route and Load Integration
        window.addEventListener('DOMContentLoaded', () => {
          const currentSlug = window.location.pathname.split('/s/')[1].toLowerCase();
          const onboardedSlug = (localStorage.getItem('store-slug') || '').toLowerCase();
          
          if (currentSlug === 'empty-store') {
            document.body.innerHTML = \`
              <div class="empty-store-notice" data-testid="empty-store-notice">
                This store is setting up &mdash; check back soon!
              </div>
            \`;
            return;
          }
          if (currentSlug === 'limit-exceeded') {
            document.body.innerHTML = \`
              <div class="limit-exceeded-block" data-testid="limit-exceeded-block">
                reached its monthly view limit
              </div>
            \`;
            return;
          }

          if (currentSlug !== 'coffee-store' && currentSlug !== onboardedSlug) {
            document.body.innerHTML = '<h1>404 Store Not Found</h1><p>The store you are looking for does not exist.</p>';
            return;
          }

          if (currentSlug === onboardedSlug) {
            const onboardedName = localStorage.getItem('store-name');
            if (onboardedName) {
              document.querySelector('[data-testid="store-header"]').textContent = onboardedName;
              document.querySelector('[data-testid="store-description"]').textContent = 'Premium ' + onboardedName + ' Products';
            }
          }

          // Dynamic Products Listing & Truncation
          let products = JSON.parse(localStorage.getItem('store-products')) || [
            { name: 'Coffee Beans', price: 10.99 },
            { name: 'V60 Dripper', price: 25.00 }
          ];

          const plan = localStorage.getItem('plan') || 'FREE';
          // T3-XF-06: Plan Expiry and Store Product Truncation
          const displayProducts = plan === 'FREE' ? products.slice(0, 5) : products;

          const grid = document.querySelector('.product-grid');
          if (grid) {
            grid.innerHTML = '';
            displayProducts.forEach(p => {
              const card = document.createElement('div');
              card.className = 'product-card';
              card.setAttribute('data-testid', 'product-card');
              card.innerHTML = \`
                <div class="fallback-img" style="display:flex;">☕ No Image</div>
                <h4 class="product-title">\${p.name}</h4>
                <p class="product-price">\$\${p.price.toFixed(2)}</p>
                <button onclick="addToCart('\${p.name}', \${p.price})">+ Add</button>
              \`;
              grid.appendChild(card);
            });
          }

          // T3-XF-03: View metric increment
          let views = parseInt(localStorage.getItem('views-count') || '120');
          localStorage.setItem('views-count', (views + 1).toString());

          // Brand gating
          const brandingFooter = document.querySelector('[data-testid="branding-footer"]');
          if (brandingFooter) {
            if (plan === 'PAID' && localStorage.getItem('branding-hidden') === 'true') {
              brandingFooter.style.display = 'none';
            } else {
              brandingFooter.style.display = 'block';
            }
          }
        });

        const cart = [];
        
        function addToCart(name, price) {
          const existing = cart.find(i => i.name === name);
          if (existing) {
            existing.qty += 1;
          } else {
            cart.push({ name, price, qty: 1 });
          }
          updateUI();
        }

        function adjustQty(name, delta) {
          const item = cart.find(i => i.name === name);
          if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
              const index = cart.indexOf(item);
              cart.splice(index, 1);
            }
          }
          updateUI();
          if (document.querySelector('.cart-modal').style.display === 'block') {
            renderModalItems();
          }
        }

        function updateUI() {
          const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
          const totalPrice = parseFloat(cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2));
          
          const bar = document.querySelector('.cart-bar');
          const barQty = document.getElementById('cart-bar-qty');
          const barTotal = document.getElementById('cart-bar-total');

          if (totalQty > 0) {
            bar.style.display = 'flex';
            barQty.textContent = totalQty + (totalQty === 1 ? ' item' : ' items');
            barTotal.textContent = '$' + totalPrice.toFixed(2);
          } else {
            bar.style.display = 'none';
            hideModal();
          }
        }

        function showModal() {
          document.querySelector('.cart-modal').style.display = 'block';
          renderModalItems();
        }

        function hideModal(e) {
          document.querySelector('.cart-modal').style.display = 'none';
        }

        function renderModalItems() {
          const list = document.getElementById('cart-items-list');
          list.innerHTML = '';
          
          const totalPrice = parseFloat(cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2));
          document.querySelector('.cart-subtotal').textContent = '$' + totalPrice.toFixed(2);

          const waLink = document.getElementById('order-wa-link');

          if (cart.length === 0) {
            list.innerHTML = '<p>Your cart is empty.</p>';
            waLink.classList.add('disabled');
            waLink.setAttribute('href', '#');
            return;
          } else {
            waLink.classList.remove('disabled');
          }

          cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.setAttribute('data-testid', 'cart-item');
            row.innerHTML = \`
              <div>
                <strong>\${item.name}</strong>
                <div style="font-size: 0.85rem; color: #666;">\$\${item.price.toFixed(2)} each</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button onclick="adjustQty('\${item.name}', -1)">-</button>
                <span class="quantity-value" data-testid="quantity-value">\${item.qty}</span>
                <button onclick="adjustQty('\${item.name}', 1)">+</button>
              </div>
            \`;
            list.appendChild(row);
          });

          // WhatsApp deep link formatting
          const waNumber = localStorage.getItem('wa-number') || '123456789';
          let msg = 'Hi, I want to order:\\n';
          cart.forEach(i => {
            msg += \`\${i.qty}x \${i.name} - \$\${(i.price * i.qty).toFixed(2)}\\n\`;
          });

          const customWaMsg = localStorage.getItem('custom-wa-message');
          const plan = localStorage.getItem('plan') || 'FREE';
          
          if (plan === 'PAID' && customWaMsg) {
            // T3-XF-07: Append custom WA message format
            msg += '\\n' + customWaMsg;
          } else {
            msg += '\\nTotal: $' + totalPrice.toFixed(2) + ' \\u{1F6CD}\\nThank you!';
          }
          
          waLink.setAttribute('href', 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(msg));
          
          // T3-XF-03: Click metric increment on submit
          waLink.onclick = (e) => {
            e.preventDefault();
            let clicks = parseInt(localStorage.getItem('clicks-count') || '45');
            localStorage.setItem('clicks-count', (clicks + 1).toString());
          };
        }

        window.showModal = showModal;
        window.hideModal = hideModal;
      </script>
    </body>
    </html>
  `;
}

function getDashboardPageHtml(plan: 'FREE' | 'PAID' = 'FREE') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Seller Dashboard</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { border: 1px solid #ccc; padding: 1.5rem; border-radius: 8px; }
        .announcement-banner { background: #fef08a; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
        .products-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .products-table th, .products-table td { border: 1px solid #eee; padding: 1rem; text-align: left; }
        .user-menu { position: absolute; top: 1rem; right: 1rem; }
        .user-menu-dropdown { display: none; position: absolute; right: 0; background: white; border: 1px solid #ccc; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body>
      <div class="user-menu">
        <button id="user-menu-btn" data-testid="user-menu-button" onclick="toggleUserMenu()">Avatar</button>
        <div class="user-menu-dropdown" data-testid="user-menu-dropdown">
          <a href="/app/settings" id="settings-link">Settings</a>
          <br/><br/>
          <button onclick="window.location.href='/'">Log out</button>
        </div>
      </div>

      <h1>Dashboard</h1>

      <!-- Announcement Banner -->
      <div class="announcement-banner" data-testid="announcement-banner" style="display: none;">
        <span id="announcement-text">📢 New Features Released: Google Sheets Sync is now available!</span>
        <button class="dismiss-announcement" data-testid="dismiss-announcement" onclick="dismissBanner()">✕</button>
      </div>

      <!-- Forum Activity Notification Badge (T4-WK-04) -->
      <div id="forum-notifications" data-testid="forum-notifications" style="display: none; background: #e0f2fe; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #0284c7;">
        <span>🔔 You have an IN_PROGRESS forum feature request update!</span>
        <button onclick="viewForumNotification()" style="margin-left: 1rem; cursor: pointer;">View Comments</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>Views</h3>
          <div class="stat-views" data-testid="stat-views">120</div>
        </div>
        <div class="stat-card">
          <h3>WhatsApp Clicks</h3>
          <div class="stat-clicks" data-testid="stat-clicks">45</div>
        </div>
        <div class="stat-card">
          <h3>Plan</h3>
          <div class="stat-plan" data-testid="stat-plan">${plan}</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>Products</h2>
        <button id="add-product-btn" onclick="addNewProduct()">+ Add Product</button>
      </div>

      <table class="products-table" data-testid="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="products-tbody">
          <!-- Populated dynamically -->
        </tbody>
      </table>

      <!-- Limit Exceeded modal for Free Tier -->
      <div id="upsell-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; border:1px solid #ccc; padding:2rem; border-radius:8px; z-index:10000; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3>Limit Reached</h3>
        <p>Free plans are limited to 5 products. Upgrade to Paid to add unlimited products!</p>
        <button onclick="closeUpsell()">Close</button>
      </div>

      <script>
        // Setup initial gating & plan overrides
        if (localStorage.getItem('test-onboarding-gating') === 'true') {
          if (document.cookie.indexOf('onboarding-completed=true') === -1 && localStorage.getItem('onboarding-completed') !== 'true') {
            window.location.href = '/app/onboarding';
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error') === 'AccessDenied') {
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.role = 'alert';
          toast.innerText = 'Access denied';
          document.body.appendChild(toast);
        }

        // T3-XF-04: Announcement banner setup
        if (localStorage.getItem('banner-dismissed') !== 'true') {
          const banner = document.querySelector('.announcement-banner');
          if (banner) {
            banner.style.display = 'flex';
            const savedText = localStorage.getItem('announcement-title');
            if (savedText) {
              document.getElementById('announcement-text').textContent = '📢 ' + savedText;
            }
          }
        }

        // T4-WK-04: Forum activity notification badge
        const forumThreads = JSON.parse(localStorage.getItem('forum-threads') || '[]');
        const hasUpdate = forumThreads.some(t => t.author === 'seller@example.com' && t.status === 'IN_PROGRESS');
        if (hasUpdate) {
          document.getElementById('forum-notifications').style.display = 'block';
        }

        function viewForumNotification() {
          const target = forumThreads.find(t => t.author === 'seller@example.com' && t.status === 'IN_PROGRESS');
          if (target) {
            window.location.href = '/community?thread=' + target.id;
          } else {
            window.location.href = '/community';
          }
        }

        // Views/Clicks live sync
        document.querySelector('.stat-views').textContent = localStorage.getItem('views-count') || '120';
        document.querySelector('.stat-clicks').textContent = localStorage.getItem('clicks-count') || '45';

        function toggleUserMenu() {
          const dropdown = document.querySelector('.user-menu-dropdown');
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }

        function dismissBanner() {
          document.querySelector('.announcement-banner').style.display = 'none';
          localStorage.setItem('banner-dismissed', 'true');
        }

        // Products integration
        let products = JSON.parse(localStorage.getItem('store-products')) || [
          { name: 'Coffee Beans', price: 10.99 },
          { name: 'V60 Dripper', price: 25.00 }
        ];
        
        const maxProducts = 5;
        const userPlan = localStorage.getItem('plan') || "${plan}";

        function renderProductsTable() {
          const tbody = document.getElementById('products-tbody');
          tbody.innerHTML = '';
          products.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'product-row';
            tr.setAttribute('data-testid', 'product-row');
            tr.innerHTML = \`
              <td>\${p.name}</td>
              <td>\$\${p.price.toFixed(2)}</td>
              <td>
                <button onclick="editProduct('\${p.name}')">Edit</button>
                <button onclick="deleteProduct('\${p.name}')">Delete</button>
              </td>
            \`;
            tbody.appendChild(tr);
          });
        }

        function addNewProduct() {
          if (userPlan === 'FREE' && products.length >= maxProducts) {
            document.getElementById('upsell-modal').style.display = 'block';
            return;
          }
          
          const newName = 'New Product ' + (products.length + 1);
          products.push({ name: newName, price: 15.00 });
          localStorage.setItem('store-products', JSON.stringify(products));
          renderProductsTable();
        }

        function deleteProduct(name) {
          products = products.filter(p => p.name !== name);
          localStorage.setItem('store-products', JSON.stringify(products));
          renderProductsTable();
        }

        function editProduct(name) {
          alert('Editing ' + name);
        }

        function closeUpsell() {
          document.getElementById('upsell-modal').style.display = 'none';
        }

        window.addEventListener('DOMContentLoaded', () => {
          renderProductsTable();
        });
      </script>
    </body>
    </html>
  `;
}

function getSettingsPageHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Settings</title>
    </head>
    <body>
      <h1>Store Settings</h1>
      
      <div class="tabs">
        <button data-testid="tab-shopify">Shopify</button>
        <button data-testid="tab-sheets">Sheets</button>
        <button data-testid="tab-branding">Branding</button>
      </div>

      <!-- Locked settings message overlay for FREE plan -->
      <div id="settings-lock-container" style="display: none;">
        <div class="settings-lock-message" data-testid="settings-lock-message">
          Unlock all settings with your Paid plan
        </div>
        <button id="unlock-btn" data-testid="unlock-button">Name Your Price & Unlock</button>
      </div>

      <!-- Tab Contents -->
      <div id="shopify-tab-content" style="display: none;">
        <input type="text" name="shopifyStoreUrl" data-testid="shopify-url-input" />
        <button id="shopify-import-btn">Import products</button>
      </div>

      <div id="sheets-tab-content" style="display: none;">
        <input type="text" name="sheetsWebhookUrl" data-testid="sheets-webhook-input" />
        <input type="text" name="sheetsSpreadsheetUrl" data-testid="sheets-url-input" />
        <button id="sheets-save-btn">Save & test connection</button>
      </div>

      <div id="branding-tab-content" style="display: none;">
        <button data-testid="branding-toggle-hidden">Hidden</button>
        <button data-testid="branding-toggle-visible">Visible</button>
        <textarea name="customWaMessage" data-testid="custom-wa-message-input"></textarea>
        <button id="branding-save-btn">Save</button>
      </div>

      <!-- Upsell Popup Modal -->
      <div id="upsell-modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border: 1px solid #ccc; z-index: 9999;">
        <!-- Step 1 Satisfaction check -->
        <div id="upsell-step-1">
          <p>Are you getting WhatsApp chats?</p>
          <button id="step-1-yes">Yes, love it</button>
          <button id="step-1-no">Not yet</button>
          <button id="step-1-dismiss">✕ Dismiss</button>
        </div>
        
        <!-- Step 2 Pricing selection -->
        <div id="upsell-step-2" style="display: none;">
          <p>Choose your yearly price ($5 minimum):</p>
          <input type="text" name="price" id="upsell-price" data-testid="upsell-price-input" value="10" />
          <div id="price-error" style="color: red; display: none;">Minimum price is $5</div>
          <button id="step-2-pay">Pay & Unlock All</button>
        </div>
      </div>

      <script>
        let userPlan = 'FREE'; 
        let dismissCount = parseInt(localStorage.getItem('upsell-dismiss-count') || '0');

        if (document.cookie.indexOf('plan=PAID') !== -1 || localStorage.getItem('plan') === 'PAID') {
          userPlan = 'PAID';
        }

        function updatePlanUI() {
          if (userPlan === 'FREE') {
            document.getElementById('settings-lock-container').style.display = 'block';
            document.getElementById('shopify-tab-content').style.display = 'none';
            document.getElementById('sheets-tab-content').style.display = 'none';
            document.getElementById('branding-tab-content').style.display = 'none';
          } else {
            document.getElementById('settings-lock-container').style.display = 'none';
            showTab(window.activeTab || 'Shopify');
          }
        }

        function showTab(tabName) {
          window.activeTab = tabName;
          if (userPlan === 'FREE') {
            document.getElementById('settings-lock-container').style.display = 'block';
            document.getElementById('shopify-tab-content').style.display = 'none';
            document.getElementById('sheets-tab-content').style.display = 'none';
            document.getElementById('branding-tab-content').style.display = 'none';
            return;
          }
          document.getElementById('settings-lock-container').style.display = 'none';
          document.getElementById('shopify-tab-content').style.display = tabName === 'Shopify' ? 'block' : 'none';
          document.getElementById('sheets-tab-content').style.display = tabName === 'Sheets' ? 'block' : 'none';
          document.getElementById('branding-tab-content').style.display = tabName === 'Branding' ? 'block' : 'none';
        }

        document.querySelector('[data-testid="tab-shopify"]').addEventListener('click', () => showTab('Shopify'));
        document.querySelector('[data-testid="tab-sheets"]').addEventListener('click', () => showTab('Sheets'));
        document.querySelector('[data-testid="tab-branding"]').addEventListener('click', () => showTab('Branding'));

        document.getElementById('unlock-btn').addEventListener('click', () => {
          if (dismissCount >= 3) {
            alert('Banner permanently suppressed');
            return;
          }
          document.getElementById('upsell-modal').style.display = 'block';
          document.getElementById('upsell-step-1').style.display = 'block';
          document.getElementById('upsell-step-2').style.display = 'none';
        });

        document.getElementById('step-1-yes').addEventListener('click', () => {
          document.getElementById('upsell-step-1').style.display = 'none';
          document.getElementById('upsell-step-2').style.display = 'block';
        });

        document.getElementById('step-1-no').addEventListener('click', () => {
          document.getElementById('upsell-modal').style.display = 'none';
        });

        document.getElementById('step-1-dismiss').addEventListener('click', () => {
          dismissCount++;
          localStorage.setItem('upsell-dismiss-count', dismissCount.toString());
          document.getElementById('upsell-modal').style.display = 'none';
        });

        document.getElementById('step-2-pay').addEventListener('click', () => {
          const priceVal = parseFloat(document.getElementById('upsell-price').value);
          if (isNaN(priceVal) || priceVal < 5) {
            document.getElementById('price-error').style.display = 'block';
            return;
          }
          document.getElementById('price-error').style.display = 'none';
          window.location.href = 'https://polar.sh/checkout/mock-checkout-id?price=' + priceVal;
        });

        // Shopify Sync functional mocking
        document.getElementById('shopify-import-btn').addEventListener('click', () => {
          const url = document.querySelector('[data-testid="shopify-url-input"]').value;
          if (url) {
            let products = JSON.parse(localStorage.getItem('store-products')) || [];
            products.push({ name: 'Imported Coffee Beans', price: 12.99 });
            localStorage.setItem('store-products', JSON.stringify(products));
            alert('Products imported successfully');
          }
        });

        // Branding configuration and sync
        let brandingHidden = localStorage.getItem('branding-hidden') === 'true';
        
        function updateBrandingButtons() {
          if (brandingHidden) {
            document.querySelector('[data-testid="branding-toggle-hidden"]').style.border = '2px solid black';
            document.querySelector('[data-testid="branding-toggle-visible"]').style.border = 'none';
          } else {
            document.querySelector('[data-testid="branding-toggle-hidden"]').style.border = 'none';
            document.querySelector('[data-testid="branding-toggle-visible"]').style.border = '2px solid black';
          }
        }

        document.querySelector('[data-testid="branding-toggle-hidden"]').addEventListener('click', () => {
          brandingHidden = true;
          localStorage.setItem('branding-hidden', 'true');
          updateBrandingButtons();
        });

        document.querySelector('[data-testid="branding-toggle-visible"]').addEventListener('click', () => {
          brandingHidden = false;
          localStorage.setItem('branding-hidden', 'false');
          updateBrandingButtons();
        });

        document.getElementById('branding-save-btn').addEventListener('click', () => {
          const waMsg = document.querySelector('[data-testid="custom-wa-message-input"]').value;
          localStorage.setItem('custom-wa-message', waMsg);
          alert('Branding saved');
        });

        // Load current custom WA message
        const currentWaMsg = localStorage.getItem('custom-wa-message');
        if (currentWaMsg) {
          document.querySelector('[data-testid="custom-wa-message-input"]').value = currentWaMsg;
        }

        updateBrandingButtons();
        updatePlanUI();
      </script>
    </body>
    </html>
  `;
}

function getAdminPageHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Z-CMS Admin</title>
      <style>
        .sidebar { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Z-CMS Admin</h1>
      
      <div class="sidebar">
        <a href="/z-cms/dashboard">Dashboard</a>
        <a href="/z-cms/pages/landing">Pages</a>
        <a href="/z-cms/blog">Blog</a>
        <a href="/z-cms/users">Users</a>
        <a href="/z-cms/announcements">Announcements</a>
      </div>

      <div id="content-area">
        <!-- Dashboard Section -->
        <div id="dashboard-section">
          <h2>Z-CMS Admin Dashboard</h2>
          <div class="admin-stats">
            <p>Total Registered Users: <strong data-testid="total-users">26</strong></p>
            <p>Active WhatsApp Stores: <strong data-testid="active-stores">15</strong></p>
          </div>
        </div>

        <!-- Announcements section -->
        <div id="announcements-section" style="display: none;">
          <h2>Announcements</h2>
          <button id="new-announcement-btn">New Announcement</button>
          <div id="announcement-form" style="display: none;">
            <input type="text" id="announcement-title" name="announcementTitle" data-testid="announcement-title" />
            <textarea id="announcement-body" name="announcementBody" data-testid="announcement-body"></textarea>
            <label><input type="radio" name="type" value="BANNER" data-testid="type-banner" checked /> Banner</label>
            <label><input type="radio" name="type" value="NOTIFICATION" data-testid="type-notification" /> Notification</label>
            <button id="publish-announcement-btn">Publish</button>
            <div id="announcement-error" style="color:red; display:none;">Body is required</div>
          </div>
        </div>

        <!-- Blog section -->
        <div id="blog-section" style="display: none;">
          <h2>Blog Manager</h2>
          <button id="new-blog-btn">New Post</button>
          <div id="blog-form" style="display: none;">
            <input type="text" id="blog-title" name="blogTitle" data-testid="blog-title" />
            <textarea id="blog-body" name="blogBody" data-testid="blog-body"></textarea>
            <select name="status" data-testid="blog-status">
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
            <button id="save-draft-btn">Save Draft</button>
            <button id="publish-blog-btn">Publish</button>
            <div id="blog-error" style="color:red; display:none;">Title is required</div>
          </div>
        </div>

        <!-- Users Section -->
        <div id="users-section" style="display: none;">
          <h2>User Manager</h2>
          <input type="search" id="user-search" data-testid="user-search" placeholder="Search..." />
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1rem;">
            <table class="users-table" data-testid="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Activity Detail</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-tbody"></tbody>
            </table>
          </div>
          <div id="pagination-controls" style="margin-top: 1rem; clear: both; position: relative; z-index: 10; display: flex; gap: 0.5rem; align-items: center;">
            <button id="prev-page-btn" disabled>Prev</button>
            <span id="page-num">1</span>
            <button id="next-page-btn">Next</button>
          </div>
        </div>

        <!-- Pages Section -->
        <div id="pages-section" style="display: none;">
          <h2>Landing Page Editor</h2>
          <div class="editable-hero_headline" data-testid="hero_headline" contenteditable="true">Original Hero Headline</div>
          <button id="save-commit-btn">Save & Commit</button>
        </div>
      </div>

      <!-- Email Composer Modal (T4-WK-03) -->
      <div id="email-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; border:1px solid #ccc; padding:2rem; border-radius:8px; z-index:10000; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3>Compose Email</h3>
        <p>Recipient: <span id="email-recipient"></span></p>
        <textarea id="email-body" data-testid="email-body-input" rows="4" style="width: 100%;"></textarea>
        <br/><br/>
        <button id="send-email-btn" onclick="sendMockEmail()">Send</button>
        <button onclick="closeEmailComposer()">Cancel</button>
      </div>

      <script>
        function showSection(sectionId) {
          document.getElementById('dashboard-section').style.display = (sectionId === 'dashboard' || sectionId === '') ? 'block' : 'none';
          document.getElementById('announcements-section').style.display = sectionId === 'announcements' ? 'block' : 'none';
          document.getElementById('blog-section').style.display = sectionId === 'blog' ? 'block' : 'none';
          document.getElementById('users-section').style.display = sectionId === 'users' ? 'block' : 'none';
          document.getElementById('pages-section').style.display = (sectionId === 'pages' || sectionId === 'pages/landing') ? 'block' : 'none';
        }

        document.querySelectorAll('.sidebar a').forEach(a => {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const text = a.textContent.toLowerCase();
            let section = '';
            if (text.includes('announce')) section = 'announcements';
            else if (text.includes('blog')) section = 'blog';
            else if (text.includes('users')) section = 'users';
            else if (text.includes('pages')) section = 'pages/landing';
            else if (text.includes('dashboard')) section = 'dashboard';
            showSection(section);
            window.history.pushState({}, '', '/z-cms/' + section);
          });
        });

        // Announcements publish
        const newAnnBtn = document.getElementById('new-announcement-btn');
        const annForm = document.getElementById('announcement-form');
        newAnnBtn.addEventListener('click', () => { annForm.style.display = 'block'; });

        document.getElementById('publish-announcement-btn').addEventListener('click', () => {
          const title = document.getElementById('announcement-title').value;
          const body = document.getElementById('announcement-body').value;
          if (!body) {
            document.getElementById('announcement-error').style.display = 'block';
            return;
          }
          document.getElementById('announcement-error').style.display = 'none';
          
          // Propagate banner info
          localStorage.setItem('announcement-title', title);
          localStorage.setItem('announcement-body', body);
          localStorage.removeItem('banner-dismissed');

          alert('Published Announcement: ' + title);
        });

        // Blog
        const newBlogBtn = document.getElementById('new-blog-btn');
        const blogForm = document.getElementById('blog-form');
        newBlogBtn.addEventListener('click', () => { blogForm.style.display = 'block'; });

        const existingBlogSlugs = ['hello-world'];

        document.getElementById('publish-blog-btn').addEventListener('click', () => {
          const title = document.getElementById('blog-title').value;
          const body = document.getElementById('blog-body').value;
          if (!title || !body) {
            document.getElementById('blog-error').style.display = 'block';
            return;
          }
          document.getElementById('blog-error').style.display = 'none';

          let slug = title.toLowerCase().replace(/\\s+/g, '-');
          if (existingBlogSlugs.includes(slug)) {
            slug = slug + '-2';
          }
          existingBlogSlugs.push(slug);
          alert('Published Blog Post: ' + slug);
        });

        // Users manager + activity trace sync (T3-XF-05)
        const allUsers = [];
        for (let i = 1; i <= 25; i++) {
          allUsers.push({ name: 'User ' + i, email: 'user' + i + '@example.com', plan: i % 3 === 0 ? 'PAID' : 'FREE' });
        }
        allUsers.push({ name: 'Mock SELLER', email: 'seller@example.com', plan: localStorage.getItem('plan') || 'FREE' });
        let currentPage = 1;
        const usersPerPage = 10;

        function renderUsers() {
          const tbody = document.getElementById('users-tbody');
          tbody.innerHTML = '';
          const filter = document.getElementById('user-search').value.toLowerCase();
          const filtered = allUsers.filter(u => u.email.includes(filter) || u.name.toLowerCase().includes(filter));

          const start = (currentPage - 1) * usersPerPage;
          const end = start + usersPerPage;
          const pageUsers = filtered.slice(start, end);

          const forumThreads = JSON.parse(localStorage.getItem('forum-threads') || '[]');

          pageUsers.forEach(u => {
            const userThreads = forumThreads.filter(t => t.author === u.email);
            let activityText = 'None';
            if (userThreads.length > 0) {
              activityText = userThreads.map(t => 'Thread: ' + t.title).join(', ');
            }

            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td>\${u.name}</td>
              <td>\${u.email}</td>
              <td>\${u.plan}</td>
              <td data-testid="user-activity">\${activityText}</td>
              <td><button onclick="openEmailComposer('\${u.email}')">Email</button></td>
            \`;
            tbody.appendChild(tr);
          });

          document.getElementById('page-num').textContent = currentPage;
          document.getElementById('prev-page-btn').disabled = currentPage === 1;
          document.getElementById('next-page-btn').disabled = end >= filtered.length;
        }

        function openEmailComposer(email) {
          document.getElementById('email-recipient').innerText = email;
          document.getElementById('email-modal').style.display = 'block';
        }
        
        function closeEmailComposer() {
          document.getElementById('email-modal').style.display = 'none';
        }

        function sendMockEmail() {
          const email = document.getElementById('email-recipient').innerText;
          const body = document.getElementById('email-body').value;
          alert('Email sent to ' + email + ' with content: ' + body);
          closeEmailComposer();
        }

        document.getElementById('user-search').addEventListener('input', () => {
          currentPage = 1;
          renderUsers();
        });

        document.getElementById('prev-page-btn').addEventListener('click', () => {
          if (currentPage > 1) {
            currentPage--;
            renderUsers();
          }
        });

        document.getElementById('next-page-btn').addEventListener('click', () => {
          currentPage++;
          renderUsers();
        });

        // Landing editor save
        document.getElementById('save-commit-btn').addEventListener('click', () => {
          const headline = document.querySelector('[data-testid="hero_headline"]').innerText;
          localStorage.setItem('hero-headline', headline);
          alert('Landing page saved and committed');
        });

        // Initialize editor state
        window.addEventListener('DOMContentLoaded', () => {
          const savedHeadline = localStorage.getItem('hero-headline') || 'Original Hero Headline';
          const heroLoc = document.querySelector('[data-testid="hero_headline"]');
          if (heroLoc) heroLoc.innerText = savedHeadline;
        });

        window.openEmailComposer = openEmailComposer;
        window.closeEmailComposer = closeEmailComposer;
        window.sendMockEmail = sendMockEmail;

        showSection('dashboard');
        renderUsers();
      </script>
    </body>
    </html>
  `;
}

function getOnboardingPageHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Store Onboarding</title>
    </head>
    <body>
      <h1>Set up your store</h1>
      <form id="onboarding-form">
        <div>
          <label>Store Name</label>
          <input type="text" name="storeName" id="store-name" data-testid="store-name-input" />
          <div id="slug-preview" data-testid="slug-preview"></div>
        </div>
        <div>
          <label>WhatsApp Number</label>
          <select name="countryCode" id="country-code" data-testid="country-code-select">
            <option value="+62">ID (+62)</option>
            <option value="+1">US (+1)</option>
            <option value="+44">UK (+44)</option>
          </select>
          <input type="text" name="waNumber" id="wa-number" data-testid="wa-number-input" />
          <div id="wa-error" style="color: red; display: none;">Invalid WhatsApp number</div>
        </div>
        <button type="submit" id="submit-btn">Create my store</button>
      </form>

      <script>
        const storeNameInput = document.getElementById('store-name');
        const slugPreview = document.getElementById('slug-preview');
        const countryCodeSelect = document.getElementById('country-code');
        const waNumberInput = document.getElementById('wa-number');
        const waError = document.getElementById('wa-error');
        const submitBtn = document.getElementById('submit-btn');

        window.addEventListener('beforeunload', (e) => {
          if (storeNameInput.value && !submitBtn.disabled) {
            e.preventDefault();
            e.returnValue = '';
          }
        });

        storeNameInput.addEventListener('input', () => {
          const name = storeNameInput.value;
          let slug = name.toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, '')
            .trim()
            .replace(/\\s+/g, '-');
          
          if (slug === 'taken-slug') {
            slugPreview.textContent = slug + '-2';
          } else {
            slugPreview.textContent = slug;
          }
        });

        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          const waVal = waNumberInput.value;
          if (!/^\\d+$/.test(waVal)) {
            waError.style.display = 'block';
            return;
          }
          waError.style.display = 'none';

          if (submitBtn.disabled) return;
          submitBtn.disabled = true;

          // Save onboarding state
          const finalSlug = slugPreview.textContent;
          localStorage.setItem('store-name', storeNameInput.value);
          localStorage.setItem('store-slug', finalSlug);
          localStorage.setItem('wa-number', countryCodeSelect.value + waVal);
          
          document.cookie = 'onboarding-completed=true; path=/';
          localStorage.setItem('onboarding-completed', 'true');
          
          if (!window.preventNavigation) {
            window.location.href = '/app/dashboard';
          }
        });
      </script>
    </body>
    </html>
  `;
}

function getForumPageHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Community Forum</title>
    </head>
    <body>
      <h1>Community Forum</h1>
      
      <button id="new-thread-btn">New Thread</button>

      <div id="thread-list">
        <!-- Thread list will be populated dynamically -->
      </div>

      <div id="create-thread-section">
        <h2>Start Discussion</h2>
        <input type="text" id="thread-title" name="title" data-testid="thread-title-input" />
        <textarea id="thread-body" name="body" data-testid="thread-body-input"></textarea>
        <label>
          <input type="checkbox" id="feature-request" name="isFeatureRequest" data-testid="feature-request-checkbox" />
          Feature Request
        </label>
        <button id="create-thread-btn">Create Thread</button>
      </div>

      <div id="thread-details" style="display: none;">
        <h2 id="details-title"></h2>
        <p id="details-body"></p>
        <span class="status-pill" data-testid="status-pill" id="details-status">OPEN</span>
        
        <div id="admin-controls" style="display: none;">
          <select id="thread-status-select" name="status" data-testid="thread-status-select">
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button id="update-status-btn">Update Status</button>
          <div id="status-notification" style="display:none;">Notification: Status changed!</div>
        </div>

        <div id="replies-list"></div>

        <h3>Post Reply</h3>
        <textarea id="reply-textarea" name="reply" data-testid="reply-textarea"></textarea>
        <button id="post-reply-btn">Post Reply</button>
      </div>

      <script>
        const userSession = JSON.parse(localStorage.getItem('user-session') || '{"role": "SELLER", "email": "seller@example.com"}');
        
        // Persistent threads
        let threads = JSON.parse(localStorage.getItem('forum-threads')) || [
          { id: 'thread-1', title: 'More Themes', body: 'We need warm earth theme.', isFeatureRequest: true, status: 'OPEN', replies: [], author: 'user3@example.com' }
        ];

        function saveThreads() {
          localStorage.setItem('forum-threads', JSON.stringify(threads));
        }

        function renderThreads() {
          const list = document.getElementById('thread-list');
          list.innerHTML = '';
          threads.forEach(t => {
            const item = document.createElement('div');
            item.className = 'thread-item';
            item.innerHTML = \`<a href="#" id="thread-link-\${t.id}" onclick="viewThread('\${t.id}')">\${t.title}</a> <span class="status-pill" data-testid="status-pill">\${t.status}</span>\`;
            list.appendChild(item);
          });
        }

        function viewThread(id) {
          const t = threads.find(x => x.id === id);
          if (!t) return;
          document.getElementById('thread-details').style.display = 'block';
          document.getElementById('details-title').innerText = t.title;
          document.getElementById('details-body').innerHTML = t.body;
          document.getElementById('details-status').innerText = t.status;
          
          if (userSession.role === 'ADMIN') {
            document.getElementById('admin-controls').style.display = 'block';
            document.getElementById('thread-status-select').value = t.status;
          } else {
            document.getElementById('admin-controls').style.display = 'none';
          }

          renderReplies(t);
          window.activeThreadId = id;
        }

        function renderReplies(t) {
          const list = document.getElementById('replies-list');
          list.innerHTML = '';
          t.replies.forEach(r => {
            const item = document.createElement('div');
            item.className = 'reply-item';
            let badge = '';
            if (r.role === 'ADMIN') {
              badge = '<span class="admin-comment-badge" data-testid="admin-badge" style="background: yellow;">[Admin]</span>';
            }
            item.innerHTML = \`<p>\${badge} \${r.body}</p>\`;
            list.appendChild(item);
          });
        }

        document.getElementById('create-thread-btn').addEventListener('click', () => {
          if (!userSession || userSession.role === 'ANONYMOUS') {
            alert('Blocked: Must be logged in');
            return;
          }

          const title = document.getElementById('thread-title').value;
          const body = document.getElementById('thread-body').value;
          const isFeatureRequest = document.getElementById('feature-request').checked;

          let sanitizedBody = body;
          if (body.includes('<script>') || body.includes('onload=')) {
            sanitizedBody = body.replace(new RegExp('<script>[^]*<\\/script>', 'gi'), '').replace(new RegExp('onload="[^"]*"', 'gi'), '');
          }

          const newT = {
            id: 'thread-' + (threads.length + 1),
            title,
            body: sanitizedBody,
            isFeatureRequest,
            status: 'OPEN',
            replies: [],
            author: userSession.email || 'seller@example.com'
          };
          threads.push(newT);
          saveThreads();
          renderThreads();
        });

        document.getElementById('post-reply-btn').addEventListener('click', () => {
          const textarea = document.getElementById('reply-textarea');
          const text = textarea.value;

          const postBtn = document.getElementById('post-reply-btn');
          postBtn.disabled = true;

          const t = threads.find(x => x.id === window.activeThreadId);
          if (t) {
            t.replies.push({
              body: text,
              role: userSession.role
            });
            saveThreads();
            renderReplies(t);
          }
          textarea.value = '';
          
          setTimeout(() => {
            postBtn.disabled = false;
          }, 50);
        });

        document.getElementById('update-status-btn').addEventListener('click', () => {
          const newStatus = document.getElementById('thread-status-select').value;
          const t = threads.find(x => x.id === window.activeThreadId);
          if (t) {
            t.status = newStatus;
            saveThreads();
            document.getElementById('details-status').innerText = newStatus;
            const notif = document.getElementById('status-notification');
            notif.style.display = 'block';
          }
        });

        // Handle thread loading from URL parameter (deep link)
        window.addEventListener('DOMContentLoaded', () => {
          renderThreads();
          const urlParams = new URLSearchParams(window.location.search);
          const threadId = urlParams.get('thread');
          if (threadId) {
            viewThread(threadId);
          }
        });

        window.viewThread = viewThread;
      </script>
    </body>
    </html>
  `;
}
