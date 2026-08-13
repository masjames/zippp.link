/* Zippp proof-profile prototype: mock database (store.js)
 * ------------------------------------------------------------------
 * This file is the single source of truth for the prototype's data.
 * It is a mock: everything persists in the browser's localStorage,
 * nothing touches a server, no email or payment is ever really sent.
 *
 * The store exposes load/save/reset. All business logic lives in
 * api.js on top of this store, so swapping this for a real backend
 * later only means reimplementing the api.js interface.
 */
(function () {
  'use strict';

  var STORE_KEY = 'zippp.profile.db.v1';

  /* Seed data. Every claim here is either verified from a public
   * deployment or explicitly labeled as demo/private. Nothing is
   * invented: no fake clients, no fake revenue, no fake outcomes. */
  function seed() {
    var now = Date.now();
    return {
      version: 1,
      meta: {
        seededAt: now,
        updatedAt: now,
        note: 'Prototype store. All data lives in this browser (localStorage). Reset anytime from the owner console.'
      },
      profile: {
        name: 'Adit Dewantara',
        handle: 'Adit @ AppWorkZ',
        tagline: 'I turn messy business workflows into working software and AI systems.',
        location: 'Malang, Indonesia',
        availability: {
          status: 'available',          // available | limited | unavailable
          label: 'Available for selected contract/consulting work',
          note: 'A few focused projects at a time. Remote-first, happy to overlap with your timezone when it matters.'
        },
        positioning: {
          headline: 'I turn messy business workflows into working software and AI systems.',
          intro: 'Product thinking and engineering in one person. You have a workflow that runs on spreadsheets, chat threads and paper checklists. I build the working tool that replaces it, and I ship it live.',
          focus: ['Product thinking', 'Full-stack web apps', 'AI systems', 'Chat-first operations', 'Workflow automation']
        },
        contact: {
          hireLabel: 'Hire Adit',
          problemLabel: 'Talk about a problem',
          note: 'One message is enough to start. Tell me what is breaking and how it works today.'
        }
      },
      projects: [
        {
          id: 'p-rileks',
          title: 'Rileks',
          role: 'Product + Engineering',
          status: 'Live product',       // Live product | Early access | Shipped | In progress | Idea
          summary: 'Restaurant operations over Telegram: staff check-in, daily task checklists, live dashboard. No app for staff to install.',
          description: 'Attendance and daily operations for small restaurant outlets, designed to run entirely through Telegram. Staff tap Masuk to clock in, work a daily task checklist, and owners watch a live dashboard instead of trusting a crowded group chat. Built for Indonesian outlets whose staff will never install another app. The product page is live with an early-access list; rollout is in progress. No usage or revenue claims here: it is early stage.',
          focus: ['Telegram', 'Restaurant ops', 'Real-time dashboard'],
          payment: { status: 'not-disclosed', note: '' },
          evidence: [
            { id: 'ev-rileks-live', type: 'live', label: 'Live deployment', url: 'https://rileks.vercel.app', verified: true, note: 'Public site checked and reachable.' }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'p-zippp',
          title: 'Zippp',
          role: 'Product thinking + Engineering',
          status: 'Live product',
          summary: 'The platform this profile runs on: a link-in-bio WhatsApp shop with fair order routing across a seller\'s numbers.',
          description: 'Turn a Google Sheet into a WhatsApp shop buyers can order from, with orders spread fairly across the seller\'s numbers so none gets buried. Includes the landing page, the themed storefront demo, the design system, and the product strategy documented in this repo. The storefront catalogs you can open are demo data: mock products and prices, clearly labeled. The landing and storefront themselves are live.',
          focus: ['WhatsApp commerce', 'Design system', 'Static architecture'],
          payment: { status: 'not-disclosed', note: '' },
          evidence: [
            { id: 'ev-zippp-live', type: 'live', label: 'Live deployment', url: 'https://zippp-link.vercel.app', verified: true, note: 'Public site checked and reachable.' },
            { id: 'ev-zippp-demo', type: 'demo', label: 'Storefront demo (mock catalog)', url: 'storefront.html?theme=boutique', verified: false, note: 'Demo products and prices, not real sales.' }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'p-impels',
          title: 'Impels',
          role: 'Product + Engineering',
          status: 'Shipped',
          summary: 'Real client product, shipped as contract work. Deployment and client are private; evidence on request.',
          description: 'Contract product work shipped for a client. Client identity, deployment and revenue are not public, and this profile does not invent them. Ask Adit directly for a private walkthrough and references.',
          focus: ['Client work', 'Product delivery'],
          payment: { status: 'not-disclosed', note: '' },
          evidence: [
            { id: 'ev-impels-private', type: 'private', label: 'Private deployment, not public', url: '', verified: false, note: 'No public link exists for this project.' }
          ],
          createdAt: now,
          updatedAt: now
        }
      ],
      verifications: [],                // seeded empty: counts only grow from the real mock journey
      drafts: [],                       // contact drafts submitted from the public profile
      github: { connected: false, handle: '' },
      settings: {
        showAvailability: true,
        showStats: true,
        showVerifications: true,
        showPaymentBadges: true,
        showPrototypeNote: true
      }
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { raw = null; }
    if (!raw) {
      var fresh = seed();
      save(fresh);
      return fresh;
    }
    try {
      var db = JSON.parse(raw);
      if (!db || db.version !== seed().version) throw new Error('stale version');
      return db;
    } catch (e) {
      // Corrupt or stale: reseed rather than crash. Keep a backup for review.
      try { localStorage.setItem(STORE_KEY + '.backup', raw); } catch (e2) { /* noop */ }
      var reseeded = seed();
      save(reseeded);
      return reseeded;
    }
  }

  function save(db) {
    db.meta.updatedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage full or blocked */ }
  }

  function reset() {
    var fresh = seed();
    save(fresh);
    return fresh;
  }

  window.ZipppStore = { STORE_KEY: STORE_KEY, seed: seed, load: load, save: save, reset: reset, clone: clone };
})();
