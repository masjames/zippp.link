/* Zippp proof-profile prototype: mock service layer (api.js)
 * ------------------------------------------------------------------
 * All pages talk to the data through ZipppApi, never directly to
 * localStorage. Every method returns a Promise with simulated
 * latency, so swapping in a real backend later is a drop-in change.
 *
 * Honesty rules enforced here:
 *  - No email is ever sent (request links are shown to the user).
 *  - Payment state is a status badge only (self-reported / verified /
 *    not disclosed). No banking, transaction or payer data is stored
 *    or rendered.
 *  - Mock/demo data is tagged isDemo/demo and surfaced as such.
 */
(function () {
  'use strict';

  var LATENCY = 120 + Math.round(Math.random() * 120);

  function delay(value) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, LATENCY); });
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Apply fn to a fresh clone of the db, persist, return the clone. */
  function mutate(fn) {
    var db = ZipppStore.clone(ZipppStore.load());
    var result = fn(db);
    ZipppStore.save(db);
    return delay(result === undefined ? db : result);
  }

  function findProject(db, projectId) {
    var p = db.projects.filter(function (x) { return x.id === projectId; })[0];
    if (!p) throw new Error('Project not found: ' + projectId);
    return p;
  }

  function nowIso() { return new Date().toISOString(); }

  /* ------------------------------------------------------------------ */
  var api = {
    init: function () { return delay(ZipppStore.load()); },
    getDb: function () { return ZipppStore.clone(ZipppStore.load()); },

    /* ---- profile, positioning, availability, contact CTA labels ---- */
    saveProfile: function (patch) {
      return mutate(function (db) {
        db.profile = Object.assign({}, db.profile, patch);
        db.profile.availability = Object.assign({}, db.profile.availability, patch.availability || {});
        db.profile.positioning = Object.assign({}, db.profile.positioning, patch.positioning || {});
        db.profile.contact = Object.assign({}, db.profile.contact, patch.contact || {});
        if (patch.positioning && patch.positioning.focus && typeof patch.positioning.focus === 'string') {
          db.profile.positioning.focus = patch.positioning.focus.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }
        return db.profile;
      });
    },

    /* ---- projects ---- */
    listProjects: function () {
      return delay(ZipppStore.clone(ZipppStore.load()).projects);
    },
    createProject: function (data) {
      return mutate(function (db) {
        var project = {
          id: uid('p-'),
          title: (data.title || 'Untitled').trim(),
          role: (data.role || '').trim(),
          status: data.status || 'In progress',
          summary: (data.summary || '').trim(),
          description: (data.description || '').trim(),
          focus: String(data.focus || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          payment: { status: 'not-disclosed', note: '' },
          evidence: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        db.projects.unshift(project);
        return project;
      });
    },
    updateProject: function (id, patch) {
      return mutate(function (db) {
        var p = findProject(db, id);
        Object.assign(p, patch);
        if (patch.focus && typeof patch.focus === 'string') {
          p.focus = patch.focus.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }
        p.updatedAt = Date.now();
        return p;
      });
    },
    deleteProject: function (id) {
      return mutate(function (db) {
        db.projects = db.projects.filter(function (x) { return x.id !== id; });
        db.verifications = db.verifications.filter(function (v) { return v.projectId !== id; });
      });
    },

    /* ---- proof links (evidence) per project ---- */
    addEvidence: function (projectId, data) {
      return mutate(function (db) {
        var p = findProject(db, projectId);
        var ev = {
          id: uid('ev-'),
          type: data.type || 'live',          // live | demo | private | code
          label: (data.label || '').trim(),
          url: (data.url || '').trim(),
          verified: data.type === 'live' ? !!data.verified : false,
          note: (data.note || '').trim()
        };
        p.evidence.push(ev);
        p.updatedAt = Date.now();
        return ev;
      });
    },
    removeEvidence: function (projectId, evidenceId) {
      return mutate(function (db) {
        var p = findProject(db, projectId);
        p.evidence = p.evidence.filter(function (e) { return e.id !== evidenceId; });
        p.updatedAt = Date.now();
      });
    },
    updateEvidence: function (projectId, evidenceId, patch) {
      return mutate(function (db) {
        var p = findProject(db, projectId);
        var ev = p.evidence.filter(function (e) { return e.id === evidenceId; })[0];
        if (!ev) throw new Error('Evidence link not found.');
        ev.type = patch.type || ev.type;
        ev.label = patch.label !== undefined ? patch.label.trim() : ev.label;
        ev.url = patch.url !== undefined ? patch.url.trim() : ev.url;
        ev.note = patch.note !== undefined ? patch.note.trim() : ev.note;
        ev.verified = patch.type === 'live' ? !!patch.verified : false;
        p.updatedAt = Date.now();
        return ev;
      });
    },
    setPayment: function (projectId, status, note) {
      return mutate(function (db) {
        var p = findProject(db, projectId);
        p.payment = { status: status, note: (note || '').trim() };
        p.updatedAt = Date.now();
        return p.payment;
      });
    },

    /* ---- client verification workflow ---- */
    listVerifications: function () {
      return delay(ZipppStore.clone(ZipppStore.load()).verifications);
    },
    requestVerification: function (data) {
      return mutate(function (db) {
        var request = {
          id: uid('vq-'),
          token: uid('t').slice(0, 10),
          client: (data.client || '').trim(),
          company: (data.company || '').trim(),
          email: (data.email || '').trim(),
          projectId: data.projectId || '',
          notes: (data.notes || '').trim(),
          status: 'pending',                // pending | confirmed | declined
          answers: null,
          projectValue: null,
          confirmedAt: null,
          isDemo: false,
          createdAt: nowIso()
        };
        db.verifications.unshift(request);
        request.url = 'verify.html?token=' + request.token;
        return request;
      });
    },
    getVerificationByToken: function (token) {
      var db = ZipppStore.load();
      var v = db.verifications.filter(function (x) { return x.token === token; })[0] || null;
      return delay(v ? ZipppStore.clone(v) : null);
    },
    submitVerification: function (token, answers) {
      return mutate(function (db) {
        var v = db.verifications.filter(function (x) { return x.token === token; })[0];
        if (!v) throw new Error('Verification link not found. It may have been deleted.');
        if (v.status === 'confirmed') throw new Error('This verification link was already answered.');
        var workedTogether = answers.workedTogether === 'yes';
        v.answers = {
          workedTogether: workedTogether,
          projectExisted: answers.projectExisted === 'yes',
          delivered: answers.delivered === 'yes',
          wouldHireAgain: answers.wouldHireAgain === 'yes'
        };
        if (answers.projectValue && Number(answers.projectValue.amount) > 0) {
          v.projectValue = { amount: Number(answers.projectValue.amount), currency: answers.projectValue.currency || 'USD' };
        } else {
          v.projectValue = null;
        }
        v.notes = (answers.notes || '').trim();
        v.confirmedAt = nowIso();
        v.status = workedTogether ? 'confirmed' : 'declined';
        // A confirmed client value is self-reported evidence only. The
        // owner can upgrade the project badge to "verified" separately.
        if (v.status === 'confirmed' && v.projectValue) {
          var p = db.projects.filter(function (x) { return x.id === v.projectId; })[0];
          if (p && p.payment.status !== 'verified') {
            p.payment.status = 'self-reported';
            p.payment.note = 'Client-reported value; owner has not independently verified it.';
            p.updatedAt = Date.now();
          }
        }
        return ZipppStore.clone(v);
      });
    },
    setVerificationDemo: function (id, isDemo) {
      return mutate(function (db) {
        var v = db.verifications.filter(function (x) { return x.id === id; })[0];
        if (v) v.isDemo = !!isDemo;
      });
    },
    addDemoVerification: function () {
      return mutate(function (db) {
        var project = db.projects[0] || null;
        var demo = {
          id: uid('vq-'),
          token: uid('t').slice(0, 10),
          client: 'Sample client (demo)',
          company: 'Sample company (demo)',
          email: 'demo@example.invalid',
          projectId: project ? project.id : '',
          notes: 'Added from the owner console to show how a confirmation renders. Clearly tagged as demo, excluded from real counts.',
          status: 'confirmed',
          answers: { workedTogether: true, projectExisted: true, delivered: true, wouldHireAgain: true },
          projectValue: null,
          confirmedAt: nowIso(),
          isDemo: true,
          createdAt: nowIso()
        };
        db.verifications.unshift(demo);
        return demo;
      });
    },
    deleteVerification: function (id) {
      return mutate(function (db) {
        db.verifications = db.verifications.filter(function (v) { return v.id !== id; });
      });
    },

    /* ---- contact drafts (the safe communication mechanism) ---- */
    listDrafts: function () {
      return delay(ZipppStore.clone(ZipppStore.load()).drafts);
    },
    submitDraft: function (data) {
      return mutate(function (db) {
        var draft = {
          id: uid('d-'),
          name: (data.name || '').trim(),
          email: (data.email || '').trim(),
          type: data.type || 'Question',
          projectId: data.projectId || '',
          message: (data.message || '').trim(),
          createdAt: nowIso()
        };
        db.drafts.unshift(draft);
        return draft;
      });
    },
    deleteDraft: function (id) {
      return mutate(function (db) {
        db.drafts = db.drafts.filter(function (d) { return d.id !== id; });
      });
    },

    /* ---- GitHub connection (mock OAuth) ---- */
    connectGithub: function (handle) {
      return mutate(function (db) {
        db.github = { connected: true, handle: String(handle || '').trim().replace(/^@/, '') };
        return db.github;
      });
    },
    disconnectGithub: function () {
      return mutate(function (db) { db.github = { connected: false, handle: '' }; });
    },

    /* ---- settings ---- */
    updateSettings: function (patch) {
      return mutate(function (db) {
        db.settings = Object.assign({}, db.settings, patch);
        return db.settings;
      });
    },

    /* ---- data tools ---- */
    resetData: function () {
      var fresh = ZipppStore.reset();
      return delay(fresh);
    },
    exportJson: function () {
      return delay(JSON.stringify(ZipppStore.load(), null, 2));
    },
    importJson: function (text) {
      return mutate(function (db) {
        var parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.projects)) throw new Error('Not a Zippp profile export.');
        Object.assign(db, parsed, { version: 1 });
      });
    },
    exportMarkdown: function () {
      return delay(ZipppStore.load()).then(function (db) { return toMarkdown(db); });
    }
  };

  function statusLabel(project) {
    return project.status || 'In progress';
  }

  function money(value) {
    if (!value || !value.amount) return '';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currency || 'USD', maximumFractionDigits: 0 }).format(value.amount); }
    catch (e) { return value.amount + ' ' + (value.currency || 'USD'); }
  }

  function toMarkdown(db) {
    var lines = [];
    var p = db.profile;
    lines.push('# ' + p.name + ' \u00b7 ' + p.handle);
    lines.push('');
    lines.push('> ' + p.tagline);
    lines.push('');
    lines.push('- Location: ' + p.location);
    lines.push('- Availability: ' + p.availability.label + (p.availability.note ? ' (' + p.availability.note + ')' : ''));
    lines.push('');
    lines.push('## Positioning');
    lines.push('');
    lines.push(p.positioning.intro);
    if (p.positioning.focus.length) lines.push('', 'Focus: ' + p.positioning.focus.join(', '));
    lines.push('');
    lines.push('## Projects');
    lines.push('');
    db.projects.forEach(function (pr) {
      lines.push('### ' + pr.title + ' (' + pr.role + ') - ' + statusLabel(pr));
      lines.push('');
      lines.push(pr.summary);
      if (pr.description) lines.push('', pr.description);
      if (pr.evidence.length) {
        lines.push('');
        pr.evidence.forEach(function (ev) {
          var tag = ev.type === 'live' ? 'live, verified' : ev.type === 'demo' ? 'demo data' : ev.type === 'code' ? 'code' : 'private';
          lines.push('- Evidence [' + tag + ']: ' + (ev.url ? ev.label + ' <' + ev.url + '>' : ev.label));
        });
      }
      lines.push('- Payment: ' + pr.payment.status.replace(/-/g, ' '));
      lines.push('');
    });
    var conf = db.verifications.filter(function (v) { return v.status === 'confirmed'; });
    lines.push('## Client verifications');
    lines.push('');
    if (!conf.length) {
      lines.push('None yet.');
    } else {
      conf.forEach(function (v) {
        var pr = db.projects.filter(function (x) { return x.id === v.projectId; })[0];
        var tag = v.isDemo ? ' (demo)' : '';
        lines.push('- ' + v.client + ', ' + v.company + ' \u00b7 ' + (pr ? pr.title : 'project') + tag + ' \u00b7 confirmed ' + (v.confirmedAt || '').slice(0, 10) + (v.projectValue ? ' \u00b7 reported value ' + money(v.projectValue) + ' (self-reported)' : ''));
      });
    }
    lines.push('');
    lines.push('_Exported from the Zippp proof-profile prototype. Data is a mock stored in the browser._');
    return lines.join('\n');
  }

  window.ZipppApi = api;
  window.ZipppFormat = { money: money, statusLabel: statusLabel };
})();
