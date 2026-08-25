(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var toastEl = $('#toast');
  var toastTimer = null;
  function toast(msg, ok) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('toast-err', !ok);
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3200);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmtDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  var state = { posts: [], photos: [], officers: [], students: [], notes: [] };

  function api(path, options) {
    return fetch(path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Request failed (' + res.status + ')');
        return body;
      });
    });
  }

  function loadAll() {
    ['posts', 'photos', 'officers', 'students', 'notes'].forEach(function (kind) {
      api('/adin/api/' + kind)
        .then(function (body) { state[kind] = body.items || []; renderList(kind); })
        .catch(function (err) { toast(err.message, false); });
    });
    api('/adin/api/settings')
      .then(function (body) { fillSettings(body.site || {}); })
      .catch(function () {});
  }

  /* ---------- tabs ---------- */
  $$('.adm-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.adm-tab').forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      $$('.adm-pane').forEach(function (p) { p.classList.remove('is-active'); });
      $('#pane-' + tab.dataset.tab).classList.add('is-active');
    });
  });

  /* ---------- list rendering ---------- */
  var renderers = {
    posts: function (item, li) {
      li.append(el('img', 'row-thumb'));
      li.querySelector('.row-thumb').src = item.cover_url || '';
      li.querySelector('.row-thumb').hidden = !item.cover_url;
      var box = el('div', 'row-main');
      var meta = el('p', 'row-meta mono');
      meta.append(el('span', 'badge ' + (item.category === 'dumb' ? 'badge-dumb' : 'badge-activity'), item.category === 'dumb' ? 'DUMB MOMENT' : 'ACTIVITY'));
      if (item.event_date) meta.append(document.createTextNode(' · ' + fmtDate(item.event_date)));
      box.append(meta, el('p', 'row-title', item.title));
      if (item.body) box.append(el('p', 'row-sub', item.body.length > 120 ? item.body.slice(0, 120) + '…' : item.body));
      li.append(box);
    },
    photos: function (item, li) {
      var wrap = el('div', 'cell');
      var img = el('img', 'cell-img');
      img.src = item.url;
      img.alt = item.title || 'photo';
      img.loading = 'lazy';
      wrap.append(img);
      if (item.title) wrap.append(el('p', 'cell-title', item.title));
      if (item.album) wrap.append(el('p', 'cell-sub mono', item.album));
      var del = el('button', 'btn btn-danger btn-sm', 'Delete');
      del.type = 'button';
      del.dataset.act = 'del';
      del.dataset.id = item.id;
      del.dataset.kind = 'photos';
      wrap.append(del);
      li.append(wrap);
      li.className = 'cell-item';
      return true;
    },
    officers: function (item, li) {
      li.append(el('img', 'row-thumb row-thumb-round'));
      li.querySelector('.row-thumb').src = item.photo_url || '';
      li.querySelector('.row-thumb').hidden = !item.photo_url;
      var box = el('div', 'row-main');
      box.append(el('p', 'row-title', item.name));
      box.append(el('p', 'row-meta mono', '#' + (item.sort_order || 0) + ' · ' + item.position));
      if (item.quote) box.append(el('p', 'row-sub', item.quote));
      li.append(box);
    },
    students: function (item, li) {
      if (item.photo_url) {
        var img = el('img', 'row-thumb row-thumb-round');
        img.src = item.photo_url;
        img.alt = '';
        li.append(img);
      } else {
        li.append(el('span', 'row-initial', (item.name || '?').charAt(0).toUpperCase()));
      }
      var box = el('div', 'row-main');
      box.append(el('p', 'row-title', item.name));
      if (item.nickname) box.append(el('p', 'row-meta mono', 'aka ' + item.nickname));
      li.append(box);
    },
    notes: function (item, li) {
      li.append(el('div', 'row-pdf mono', 'PDF'));
      var box = el('div', 'row-main');
      box.append(el('p', 'row-title', item.title));
      var bits = [];
      if (item.subject) bits.push(item.subject);
      bits.push(item.size_bytes ? (item.size_bytes / 1048576).toFixed(2) + ' MB' : '? MB');
      box.append(el('p', 'row-meta mono', bits.join(' · ')));
      if (item.description) box.append(el('p', 'row-sub', item.description));
      li.append(box);
      var actions = el('div', 'row-actions');
      var open = el('a', 'btn btn-ghost btn-sm', 'Open');
      open.href = item.url;
      open.target = '_blank';
      open.rel = 'noopener';
      actions.append(open);
      var del = el('button', 'btn btn-danger btn-sm', 'Delete');
      del.type = 'button';
      del.dataset.act = 'del';
      del.dataset.id = item.id;
      del.dataset.kind = 'notes';
      actions.append(del);
      li.append(actions);
      return true;
    }
  };

  function renderList(kind) {
    var list = $('#list-' + kind);
    list.textContent = '';
    var items = state[kind];
    if (!items.length) {
      list.append(el('p', 'adm-empty mono', '// empty — nothing here yet'));
      return;
    }
    items.forEach(function (item) {
      var li = el('div', 'row card');
      var custom = renderers[kind](item, li);
      if (!custom) {
        var actions = el('div', 'row-actions');
        if (kind !== 'photos') {
          var edit = el('button', 'btn btn-ghost btn-sm', 'Edit');
          edit.type = 'button';
          edit.dataset.act = 'edit';
          edit.dataset.id = item.id;
          edit.dataset.kind = kind;
          actions.append(edit);
        }
        var del = el('button', 'btn btn-danger btn-sm', 'Delete');
        del.type = 'button';
        del.dataset.act = 'del';
        del.dataset.id = item.id;
        del.dataset.kind = kind;
        actions.append(del);
        li.append(actions);
      }
      list.append(li);
    });
  }

  /* ---------- form submit (create / update) ---------- */
  $$('.adm-form[data-kind]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.dataset.kind;
      var id = (form.querySelector('[name="id"]') || {}).value || '';
      var fd = new FormData(form);
      var url = id ? '/adin/api/' + kind + '/' + id : '/adin/api/' + kind;
      if (id) fd.delete('id');
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      api(url, { method: id ? 'PUT' : 'POST', body: fd })
        .then(function () {
          toast(id ? 'Updated.' : 'Saved.');
          resetForm(form);
          return api('/adin/api/' + kind);
        })
        .then(function (body) {
          if (body && body.items) { state[kind] = body.items; renderList(kind); }
        })
        .catch(function (err) { toast(err.message, false); })
        .finally(function () { btn.disabled = false; });
    });
    var resetBtn = form.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () { resetForm(form); });
    }
  });

  function resetForm(form) {
    form.reset();
    var idInput = form.querySelector('[name="id"]');
    if (idInput) idInput.value = '';
    var label = form.querySelector('[data-mode-label]');
    if (label) label.textContent = label.textContent.replace('edit_', 'new_');
    var thumb = form.querySelector('[data-thumb]');
    if (thumb) thumb.hidden = true;
    var resetBtn = form.querySelector('[data-reset]');
    if (resetBtn) resetBtn.hidden = true;
    var file = form.querySelector('[type="file"]');
    if (file) file.required = kindOf(form) === 'photos' || kindOf(form) === 'notes';
  }

  function kindOf(form) { return form.dataset.kind; }

  /* ---------- edit / delete (event delegation) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var kind = btn.dataset.kind;
    var id = btn.dataset.id;

    if (btn.dataset.act === 'del') {
      if (!confirm('Delete this ' + kind.slice(0, -1) + '? This cannot be undone.')) return;
      api('/adin/api/' + kind + '/' + id, { method: 'DELETE' })
        .then(function () {
          toast('Deleted.');
          state[kind] = state[kind].filter(function (i) { return i.id !== id; });
          renderList(kind);
        })
        .catch(function (err) { toast(err.message, false); });
    }

    if (btn.dataset.act === 'edit') {
      var item = state[kind].find(function (i) { return i.id === id; });
      if (!item) return;
      var form = $('#form-' + kind);
      form.querySelector('[name="id"]').value = item.id;
      ['title', 'category', 'event_date', 'body', 'name', 'position', 'quote', 'sort_order', 'nickname'].forEach(function (f) {
        var input = form.querySelector('[name="' + f + '"]');
        if (input && item[f] !== undefined && item[f] !== null) input.value = item[f];
      });
      var label = form.querySelector('[data-mode-label]');
      if (label) label.textContent = 'edit_' + kind.slice(0, -1);
      var thumb = form.querySelector('[data-thumb]');
      if (thumb) {
        var src = item.cover_url || item.photo_url || '';
        thumb.hidden = !src;
        if (src) thumb.querySelector('img').src = src;
      }
      var file = form.querySelector('[type="file"]');
      if (file) file.required = false;
      form.querySelector('[data-reset]').hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.querySelector('[name="title"], [name="name"]').focus();
    }
  });

  /* ---------- settings ---------- */
  function fillSettings(site) {
    var form = $('#form-settings');
    ['title', 'tagline', 'heroText', 'about'].forEach(function (k) {
      var input = form.querySelector('[name="' + k + '"]');
      if (input) input.value = site[k] || '';
    });
  }

  $('#form-settings').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var payload = {};
    ['title', 'tagline', 'heroText', 'about'].forEach(function (k) {
      payload[k] = form.querySelector('[name="' + k + '"]').value;
    });
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    api('/adin/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function () { toast('Settings saved.'); })
      .catch(function (err) { toast(err.message, false); })
      .finally(function () { btn.disabled = false; });
  });

  loadAll();
})();
