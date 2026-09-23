/* ============================================================
   Yojana Setu – app.js
   Powers the search / filter / sort / save / compare UI on
   index.html. Scheme data is loaded from assets/data/schemes.json,
   so serve the folder over HTTP (fetch does not work on file://).
   ============================================================ */
(function(){
  'use strict';

  var AUD = [
    ['', 'Show everything'],
    ['family', 'Low-income family'],
    ['mother', 'Mother-to-be or new mother'],
    ['child', 'Child or teenager'],
    ['worker', 'Employee or pensioner'],
    ['senior', 'Senior citizen'],
    ['patient', 'Patient with a long-term illness']
  ];
  var PAGE_SIZE = 6;

  var DATA = [];   // loaded from schemes.json
  var cats = [];   // derived categories for the dropdown
  var st = {aud:'', q:'', cat:'', stat:'', sort:'cat', saved:[], cmp:[], onlySaved:false, page:1};

  var $ = function(i){ return document.getElementById(i); };

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function store(k, v){
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k));
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  /* ---------- preferences (saved, applied immediately) ---------- */
  st.saved = store('ys_saved') || [];
  var size = store('ys_size') || 1;
  var theme = store('ys_theme') || 'light';

  function applyPrefs(){
    document.documentElement.style.setProperty('--fs', size);
    document.documentElement.setAttribute('data-theme', theme);
  }
  applyPrefs();

  /* ---------- helpers ---------- */
  function isLegacy(s){ return s.status !== 'active'; }
  function byId(id){ return DATA.filter(function(s){ return s.id === id; })[0]; }

  function populateCategories(){
    cats = [];
    DATA.forEach(function(s){ if (cats.indexOf(s.category) < 0) cats.push(s.category); });
    $('cat').innerHTML = '<option value="">All types</option>' +
      cats.map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('');
  }

  function chips(){
    $('audChips').innerHTML = AUD.map(function(a){
      return '<button type="button" class="chip" data-a="' + a[0] + '" aria-pressed="' + (st.aud === a[0]) + '">' + esc(a[1]) + '</button>';
    }).join('');
  }

  function filtered(){
    var q = st.q.trim().toLowerCase();
    var r = DATA.filter(function(s){
      if (st.onlySaved && st.saved.indexOf(s.id) < 0) return false;
      if (st.aud && s.audience.indexOf(st.aud) < 0) return false;
      if (st.cat && s.category !== st.cat) return false;
      if (st.stat === 'active' && isLegacy(s)) return false;
      if (st.stat === 'legacy' && !isLegacy(s)) return false;
      if (q){
        var hay = (s.name + ' ' + s.short_name + ' ' + s.description + ' ' + s.category +
                   ' ' + s.key_features.join(' ') + ' ' + s.target_beneficiaries).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var cmp = {
      az:  function(a, b){ return a.name.localeCompare(b.name); },
      new: function(a, b){ return b.launch_year - a.launch_year; },
      old: function(a, b){ return a.launch_year - b.launch_year; },
      cat: function(a, b){ return cats.indexOf(a.category) - cats.indexOf(b.category); }
    }[st.sort];
    return r.sort(cmp);
  }

  function card(s){
    var saved = st.saved.indexOf(s.id) >= 0;
    var inC = st.cmp.indexOf(s.id) >= 0;
    var leg = isLegacy(s);
    return '<article class="card' + (leg ? ' legacy' : '') + '">' +
      '<span class="cat">' + esc(s.category) + '</span>' +
      '<h3><span class="short">' + esc(s.short_name) + '</span>' + esc(s.name) + '</h3>' +
      '<span class="badge' + (leg ? ' legacy' : '') + '">' + (leg ? 'Legacy · no longer enrolling' : 'Active') + '</span>' +
      '<p class="cover">' + esc(s.coverage_amount) + '</p>' +
      '<p class="min">' + esc(s.ministry) + ' · since ' + s.launch_year + '</p>' +
      '<div class="acts">' +
        '<button class="btn" type="button" data-open="' + s.id + '">View details</button>' +
        '<button class="btn ghost' + (saved ? ' on' : '') + '" type="button" data-save="' + s.id + '" aria-pressed="' + saved + '">' + (saved ? 'Saved' : 'Save') + '</button>' +
        '<label class="cmp"><input type="checkbox" data-cmp="' + s.id + '"' + (inC ? ' checked' : '') + '> Compare</label>' +
      '</div></article>';
  }

  function render(){
    var r = filtered();
    var visible = r.slice(0, st.page * PAGE_SIZE);
    $('grid').innerHTML = visible.length ? visible.map(card).join('') :
      '<div class="empty"><p><strong>No schemes match these filters.</strong></p><p>Clear a filter or try a shorter search word.</p></div>';
    $('resH').textContent = (st.onlySaved ? 'Your saved schemes: ' : '') + r.length +
      (r.length === 1 ? ' scheme' : ' schemes') + (st.aud ? ' for this need' : '');
    var hasMore = visible.length < r.length;
    $('moreWrap').style.display = hasMore ? 'flex' : 'none';
    $('moreBtn').textContent = 'See more schemes';
    $('savedCount').textContent = st.saved.length;
    $('btnSaved').setAttribute('aria-pressed', st.onlySaved);
    chips();
    var n = st.cmp.length;
    $('tray').classList.toggle('show', n > 0);
    $('trayTxt').textContent = n + ' selected' + (n < 2 ? ' – pick at least 2 to compare' : '');
    $('goCmp').disabled = n < 2;
    $('goCmp').style.opacity = n < 2 ? .5 : 1;
  }

  function toast(m){
    var t = $('toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(toast.h);
    toast.h = setTimeout(function(){ t.classList.remove('show'); }, 2200);
  }

  function openDetail(id){
    var s = byId(id);
    $('dTitle').textContent = s.name;
    $('dBody').innerHTML =
      '<p>' + esc(s.description) + '</p>' +
      '<dl>' +
        '<dt>What it gives</dt><dd>' + esc(s.coverage_amount) + '</dd>' +
        '<dt>Who can use it</dt><dd>' + esc(s.eligibility) + '</dd>' +
        '<dt>Meant for</dt><dd>' + esc(s.target_beneficiaries) + '</dd>' +
        '<dt>Key features</dt><dd><ul>' +
          s.key_features.map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('') +
        '</ul></dd>' +
        '<dt>Run by</dt><dd>' + esc(s.ministry) +
          (s.implementing_body && s.implementing_body !== s.ministry ? ' through ' + esc(s.implementing_body) : '') + '</dd>' +
        '<dt>Type</dt><dd>' + esc(s.scheme_type) + ', started ' + s.launch_year + '</dd>' +
        '<dt>Status</dt><dd>' + (isLegacy(s) ? 'Legacy. No longer enrolling; see PM-JAY.' : 'Active') + '</dd>' +
        '<dt>Official site</dt><dd><a href="' + esc(s.official_website) + '" target="_blank" rel="noopener noreferrer">' +
          esc(s.official_website.replace('https://', '')) + '</a></dd>' +
      '</dl>' +
      '<div class="note">Details last compiled 10 September 2026. Confirm amounts and eligibility on the official site before you apply.</div>';
    $('dlg').showModal();
  }

  function openCompare(){
    var a = st.cmp.map(byId);
    var rows = [
      ['Type of help', 'category'],
      ['What it gives', 'coverage_amount'],
      ['Who can use it', 'eligibility'],
      ['Meant for', 'target_beneficiaries'],
      ['Run by', 'ministry'],
      ['Started', 'launch_year'],
      ['Status', 'status']
    ];
    var h = '<table><thead><tr><th scope="col"></th>' +
      a.map(function(s){ return '<th scope="col">' + esc(s.short_name) + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function(r){
      h += '<tr><th scope="row">' + r[0] + '</th>' +
        a.map(function(s){
          var v = s[r[1]];
          if (r[1] === 'status') v = isLegacy(s) ? 'Legacy' : 'Active';
          return '<td>' + esc(v) + '</td>';
        }).join('') + '</tr>';
    });
    $('cBody').innerHTML = h + '</tbody></table>';
    $('cdlg').showModal();
  }

  function bindEvents(){
    document.addEventListener('click', function(e){
      var t = e.target.closest('[data-a],[data-open],[data-save]');
      if (!t) return;
      if (t.hasAttribute('data-a')){
        st.aud = t.getAttribute('data-a');
        st.onlySaved = false;
        st.page = 1;
        render();
        if (st.aud) $('finder').scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      } else if (t.hasAttribute('data-open')){
        openDetail(t.getAttribute('data-open'));
      } else if (t.hasAttribute('data-save')){
        var id = t.getAttribute('data-save');
        var i = st.saved.indexOf(id);
        if (i < 0){ st.saved.push(id); toast('Saved'); }
        else { st.saved.splice(i, 1); toast('Removed from saved'); }
        store('ys_saved', st.saved);
        st.page = 1;
        render();
      }
    });

    $('grid').addEventListener('change', function(e){
      var id = e.target.getAttribute('data-cmp');
      if (!id) return;
      var i = st.cmp.indexOf(id);
      if (e.target.checked){
        if (st.cmp.length >= 3){ e.target.checked = false; toast('You can compare up to 3 schemes'); return; }
        st.cmp.push(id);
      } else if (i >= 0){
        st.cmp.splice(i, 1);
      }
      render();
    });

    $('q').addEventListener('input', function(e){ st.q = e.target.value; st.page = 1; render(); });
    $('cat').addEventListener('change', function(e){ st.cat = e.target.value; st.page = 1; render(); });
    $('stat').addEventListener('change', function(e){ st.stat = e.target.value; st.page = 1; render(); });
    $('sort').addEventListener('change', function(e){ st.sort = e.target.value; st.page = 1; render(); });

    $('clear').addEventListener('click', function(){
      st.aud = ''; st.q = ''; st.cat = ''; st.stat = ''; st.onlySaved = false; st.page = 1;
      $('q').value = ''; $('cat').value = ''; $('stat').value = '';
      render();
    });
    $('btnSaved').addEventListener('click', function(){
      st.onlySaved = !st.onlySaved; st.page = 1; render();
      $('finder').scrollIntoView();
    });
    $('btnText').addEventListener('click', function(){
      size = size >= 1.3 ? 1 : +(size + .15).toFixed(2);
      store('ys_size', size);
      applyPrefs();
    });
    $('btnTheme').addEventListener('click', function(){
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      theme = dark ? 'light' : 'dark';
      store('ys_theme', theme);
      applyPrefs();
    });
    $('moreBtn').addEventListener('click', function(){ st.page++; render(); });
    $('goCmp').addEventListener('click', openCompare);
    $('clrCmp').addEventListener('click', function(){ st.cmp = []; render(); });
    $('dClose').addEventListener('click', function(){ $('dlg').close(); });
    $('cClose').addEventListener('click', function(){ $('cdlg').close(); });
    ['dlg', 'cdlg'].forEach(function(id){
      $(id).addEventListener('click', function(e){ if (e.target === e.currentTarget) e.currentTarget.close(); });
    });
  }

  /* ---------- boot: load data, then start the UI ---------- */
  function showLoadError(){
    $('grid').innerHTML = '<div class="empty"><p><strong>Could not load the schemes data.</strong></p>' +
      '<p>Serve this folder over HTTP — for example <code>python -m http.server</code> or <code>npx serve</code> — ' +
      'so <code>assets/data/schemes.json</code> can be fetched.</p></div>';
    $('resH').textContent = 'Unable to load schemes';
  }

  fetch('assets/data/schemes.json')
    .then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data){
      DATA = data;
      populateCategories();
      chips();
      bindEvents();
      render();
    })
    .catch(showLoadError);
})();