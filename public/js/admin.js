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

  var state = { posts: [], photos: [], officers: [], students: [], notes: [], albums: [], spotlight: [] };

  function api(path, options) {
    return fetch(path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Request failed (' + res.status + ')');
        return body;
      });
    });
  }

  function loadAll() {
    ['posts', 'photos', 'officers', 'students', 'notes', 'albums', 'spotlight'].forEach(function (kind) {
      api('/adin/api/' + kind)
        .then(function (body) {
          state[kind] = body.items || [];
          renderList(kind);
          if (kind === 'albums' || kind === 'photos') fillAlbumSelect();
          if (kind === 'officers' || kind === 'students') populateSpotlightPeople();
        })
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
      var bits = ['#' + (item.sort_order || 0) + ' · ' + item.position];
      if (item.birthdate) bits.push('b. ' + item.birthdate);
      box.append(el('p', 'row-meta mono', bits.join(' · ')));
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
      var bits = [];
      if (item.nickname) bits.push('aka ' + item.nickname);
      if (item.birthdate) bits.push('b. ' + item.birthdate);
      if (bits.length) box.append(el('p', 'row-meta mono', bits.join(' · ')));
      if (item.motto) box.append(el('p', 'row-sub', item.motto));
      li.append(box);
    },
    albums: function (item, li) {
      var box = el('div', 'row-main');
      box.append(el('p', 'row-title', item.name));
      var count = state.photos.filter(function (p) { return p.album === item.name; }).length;
      var bits = ['#' + (item.sort_order || 0) + ' · ' + count + (count === 1 ? ' photo' : ' photos')];
      if (item.description) bits.unshift(item.description);
      box.append(el('p', 'row-meta mono', bits.join(' · ')));
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
    },
    spotlight: function (item, li) {
      var isCurrent = state.spotlight[0] && state.spotlight[0].id === item.id;
      if (item.person_photo) {
        li.append(el('img', 'row-thumb row-thumb-round'));
        li.querySelector('.row-thumb').src = item.person_photo;
      } else {
        li.append(el('span', 'row-initial', (item.person_name || '?').charAt(0).toUpperCase()));
      }
      var box = el('div', 'row-main');
      if (isCurrent) box.append(el('span', 'badge badge-activity', 'CURRENT'));
      box.append(el('p', 'row-title', item.title || 'Student 1A of the Week'));
      var metaBits = [item.person_name];
      if (item.person_role) metaBits.push(item.person_role);
      box.append(el('p', 'row-meta mono', metaBits.join(' · ')));
      if (item.caption) box.append(el('p', 'row-sub', item.caption));
      box.append(el('p', 'row-meta mono', 'posted ' + fmtDate(item.created_at)));
      li.append(box);
      var actions = el('div', 'row-actions');
      var del = el('button', 'btn btn-danger btn-sm', 'Delete');
      del.type = 'button';
      del.dataset.act = 'del';
      del.dataset.id = item.id;
      del.dataset.kind = 'spotlight';
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
  var FILE_REQUIRED_MSG = {
    photos: 'Picture required.',
    notes: 'PDF required.',
    officers: 'Picture required.',
    students: 'Picture required.'
  };

  $$('.adm-form [type="file"]').forEach(function (f) {
    f.addEventListener('change', function () { f.classList.remove('input-error'); });
  });

  $$('.adm-form[data-kind]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.dataset.kind;
      var idInput = form.querySelector('[name="id"]');
      var id = (idInput || {}).value || '';
      var fileInput = form.querySelector('[type="file"]');
      if (!id && FILE_REQUIRED_MSG[kind] && fileInput && !fileInput.files.length) {
        toast(FILE_REQUIRED_MSG[kind], false);
        fileInput.classList.add('input-error');
        fileInput.focus();
        return;
      }
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
    if (file) {
      file.required = false;
      file.classList.remove('input-error');
    }
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
          if (kind === 'albums') {
            return api('/adin/api/photos').then(function (body) {
              state.photos = body.items || [];
              renderList('photos');
              fillAlbumSelect();
            });
          }
        })
        .catch(function (err) { toast(err.message, false); });
    }

    if (btn.dataset.act === 'edit') {
      var item = state[kind].find(function (i) { return i.id === id; });
      if (!item) return;
      var form = $('#form-' + kind);
      form.querySelector('[name="id"]').value = item.id;
      ['title', 'category', 'event_date', 'body', 'name', 'position', 'quote', 'sort_order', 'nickname', 'birthdate', 'motto'].forEach(function (f) {
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
      if (file) {
        file.required = false;
        file.classList.remove('input-error');
      }
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

  /* ---------- album dropdown ---------- */
  function fillAlbumSelect() {
    var sel = $('#photo-album');
    if (!sel) return;
    var current = sel.value;
    sel.textContent = '';
    var names = ['General'].concat(state.albums.map(function (a) { return a.name; }));
    names.forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sel.append(o);
    });
    if (names.indexOf(current) !== -1) sel.value = current;
  }

  /* ---------- spotlight person dropdown ---------- */
  function populateSpotlightPeople() {
    var sel = $('#spotlight-person');
    if (!sel) return;
    var prev = sel.value;
    sel.textContent = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— choose officer or student —';
    sel.append(placeholder);
    function addGroup(label, list, type) {
      if (!list || !list.length) return;
      var og = document.createElement('optgroup');
      og.label = label;
      list.forEach(function (p) {
        var o = document.createElement('option');
        o.value = type + ':' + p.id;
        var sub = type === 'officer' ? p.position : (p.nickname || 'Student');
        o.textContent = p.name + (sub ? ' — ' + sub : '');
        og.append(o);
      });
      sel.append(og);
    }
    addGroup('Officers', state.officers, 'officer');
    addGroup('Students', state.students, 'student');
    var stillThere = Array.prototype.some.call(sel.options, function (o) { return o.value === prev; });
    if (stillThere) sel.value = prev;
  }

  var spotlightForm = $('#form-spotlight');
  if (spotlightForm) {
    spotlightForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var personVal = spotlightForm.querySelector('[name="person_id"]').value;
      if (!personVal || personVal.indexOf(':') === -1) {
        toast('Pick a person first.', false);
        return;
      }
      var parts = personVal.split(':');
      var payload = {
        person_type: parts[0],
        person_id: parts[1],
        title: spotlightForm.querySelector('[name="title"]').value.trim(),
        caption: spotlightForm.querySelector('[name="caption"]').value.trim()
      };
      var btn = spotlightForm.querySelector('[type="submit"]');
      btn.disabled = true;
      api('/adin/api/spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function () {
          toast('Posted to home page.');
          spotlightForm.reset();
          return api('/adin/api/spotlight');
        })
        .then(function (body) {
          state.spotlight = body.items || [];
          renderList('spotlight');
          populateSpotlightPeople();
        })
        .catch(function (err) { toast(err.message, false); })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------- group photo (special page) ---------- */
  function loadGroupPhoto() {
    api('/adin/api/group-photo')
      .then(function (body) {
        var photo = body.photo;
        var thumb = $('[data-gp-thumb]');
        var removeBtn = $('[data-gp-remove]');
        if (photo && photo.url) {
          thumb.hidden = false;
          thumb.querySelector('img').src = photo.url;
          removeBtn.hidden = false;
        } else {
          thumb.hidden = true;
          removeBtn.hidden = true;
        }
      })
      .catch(function () {});
  }

  $('#form-group').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = e.target.querySelector('[type="file"]');
    if (!input.files.length) {
      toast('Pick an image first.', false);
      return;
    }
    var fd = new FormData();
    fd.append('file', input.files[0]);
    var btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true;
    api('/adin/api/group-photo', { method: 'POST', body: fd })
      .then(function () {
        toast('Group pic updated.');
        e.target.reset();
        loadGroupPhoto();
      })
      .catch(function (err) { toast(err.message, false); })
      .finally(function () { btn.disabled = false; });
  });

  $('[data-gp-remove]').addEventListener('click', function () {
    if (!confirm('Remove the group pic from /special?')) return;
    api('/adin/api/group-photo', { method: 'DELETE' })
      .then(function () { toast('Group pic removed.'); loadGroupPhoto(); })
      .catch(function (err) { toast(err.message, false); });
  });

  loadGroupPhoto();
  loadAll();
})();
