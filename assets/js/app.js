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
  var AGE_GROUPS = [
    ['', 'All ages'],
    ['child', 'Children (0–17)'],
    ['adult', 'Adults (18–59)'],
    ['senior', 'Seniors (60+)'],
    ['senior70', 'Seniors 70+']
  ];
  var PAGE_SIZE = 6;

  /* Accent colour per scheme category (cards get a colored top bar) */
  var CAT_COLORS = {
    "Health Insurance / Financial Protection": "#2e7d63",
    "Health Infrastructure": "#1a5fd0",
    "Employee / Pensioner Schemes": "#7a4fc0",
    "Maternal & Child Health": "#c25a7c",
    "Immunization": "#1f9d8f",
    "Disease Control": "#b45309",
    "Medicine Access": "#0e7490",
    "Digital Health": "#5b6f96",
    "Mental Health": "#8a63b8",
    "Nutrition": "#4d7c0f",
    "AYUSH": "#a16207"
  };

  var DATA = [];   // loaded from schemes.json
  var cats = [];   // derived categories for the dropdown
  var st = {aud:'', q:'', cat:'', age:'', gender:'', income:'', min:'', type:'', stat:'', sort:'cat', saved:[], cmp:[], onlySaved:false, page:1};

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
  var filtersOpen = store('ys_filters') === true;   // filter panel starts collapsed

  function applyPrefs(){
    document.documentElement.style.setProperty('--fs', size);
    document.documentElement.setAttribute('data-theme', theme);
  }
  applyPrefs();
  setFiltersOpen(filtersOpen);

  /* ---------- delegates ---------- */
  function forEach(els, fn){ Array.prototype.forEach.call(els, fn); }

  /* ---------- helpers ---------- */
  function isLegacy(s){ return s.status !== 'active'; }
  function byId(id){ return DATA.filter(function(s){ return s.id === id; })[0]; }
  function accentOf(cat){ return CAT_COLORS[cat] || '#0e2a55'; }
  function ageLabel(k){ return {all:'All ages', child:'Children (0–17)', adult:'Adults (18–59)', senior:'Seniors (60+)', senior70:'Seniors 70+'}[k] || k; }
  function genderLabel(k){ return {all:'All genders', female:'Women', male:'Men'}[k] || k; }
  function rs(n){ return n.toLocaleString('en-IN'); }
  function incomeLimitText(s){
    if (s.income_max_annual == null) return 'No income limit.';
    return 'Up to ₹' + rs(s.income_max_annual) + ' per year.';
  }
  function activeFilters(){
    var n = 0;
    if (st.q.trim()) n++;
    if (st.aud) n++;
    if (st.cat) n++;
    if (st.age) n++;
    if (st.gender) n++;
    if (st.income.trim()) n++;
    if (st.stat) n++;
    if (st.min) n++;
    if (st.type) n++;
    return n;
  }

  /* ---------- icons (Feather-style inline SVG, stroke = currentColor) ---------- */
  function ico(shape){
    var p = {
      rupee:    '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
      user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      list:     '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
      flag:     '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      check:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      x:        '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      ext:      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
    }[shape] || '';
    return '<svg class="di" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function dt(label, content){
    return '<dt>' + label + '</dt><dd>' + content + '</dd>';
  }

  /* ---------- data plumbing ---------- */
  function populateCategories(){
    cats = [];
    DATA.forEach(function(s){ if (cats.indexOf(s.category) < 0) cats.push(s.category); });
    $('cat').innerHTML = '<option value="">All types</option>' +
      cats.map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('');
    $('age').innerHTML = AGE_GROUPS.map(function(a){
      return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>';
    }).join('');
    var mins = [], types = [];
    DATA.forEach(function(s){
      if (s.ministry && mins.indexOf(s.ministry) < 0) mins.push(s.ministry);
      if (s.scheme_type && types.indexOf(s.scheme_type) < 0) types.push(s.scheme_type);
    });
    mins.sort(function(a, b){ return a.localeCompare(b); });
    types.sort(function(a, b){ return a.localeCompare(b); });
    $('min').innerHTML = '<option value="">All ministries</option>' +
      mins.map(function(m){ return '<option>' + esc(m) + '</option>'; }).join('');
    $('type').innerHTML = '<option value="">All scheme types</option>' +
      types.map(function(t){ return '<option>' + esc(t) + '</option>'; }).join('');
  }

  function chips(){
    $('audChips').innerHTML = AUD.map(function(a){
      return '<button type="button" class="chip" data-a="' + a[0] + '" aria-pressed="' + (st.aud === a[0]) + '">' + esc(a[1]) + '</button>';
    }).join('');
  }

  /* Any .seg[data-seg-key] group reads/writes its own st[key] value. */
  function segSync(){
    forEach(document.querySelectorAll('.seg[data-seg-key]'), function(seg){
      var val = st[seg.getAttribute('data-seg-key')];
      forEach(seg.querySelectorAll('.seg-btn'), function(b){
        b.setAttribute('aria-pressed', String(b.getAttribute('data-val') === val));
      });
    });
  }

  function filtered(){
    var q = st.q.trim().toLowerCase();
    var r = DATA.filter(function(s){
      if (st.onlySaved && st.saved.indexOf(s.id) < 0) return false;
      if (st.aud && s.audience.indexOf(st.aud) < 0) return false;
      if (st.cat && s.category !== st.cat) return false;
      if (st.age && (s.age_group || []).indexOf('all') < 0 && (s.age_group || []).indexOf(st.age) < 0) return false;
      if (st.gender && (s.gender || ['all']).indexOf('all') < 0 && (s.gender || ['all']).indexOf(st.gender) < 0) return false;
      if (st.min && s.ministry !== st.min) return false;
      if (st.type && s.scheme_type !== st.type) return false;
      if (st.income && s.income_max_annual != null){
        var annual = parseFloat(st.income) * 12;
        if (isFinite(annual) && annual > s.income_max_annual) return false;
      }
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

  /* ---------- rendering ---------- */
  function card(s, i){
    var saved = st.saved.indexOf(s.id) >= 0;
    var inC = st.cmp.indexOf(s.id) >= 0;
    var leg = isLegacy(s);
    return '<article class="card' + (leg ? ' legacy' : '') + '" style="--accent:' + accentOf(s.category) + ';--d:' + (i * 26) + 'ms">' +
      '<span class="cat">' + esc(s.category) + '</span>' +
      '<h3><span class="short">' + esc(s.short_name) + '</span>' + esc(s.name) + '</h3>' +
      '<span class="badge' + (leg ? ' legacy' : '') + '"><span class="dot"></span>' + (leg ? 'Legacy · no longer enrolling' : 'Active') + '</span>' +
      '<p class="cover">' + esc(s.coverage_amount) + '</p>' +
      '<p class="min">' + esc(s.ministry) + ' · since ' + s.launch_year + '</p>' +
      '<div class="acts">' +
        '<button class="btn" type="button" data-open="' + s.id + '">View details</button>' +
        '<button class="btn ghost' + (saved ? ' on' : '') + '" type="button" data-save="' + s.id + '" aria-pressed="' + saved + '">' + (saved ? 'Saved' : 'Save') + '</button>' +
        '<label class="cmp"><input type="checkbox" data-cmp="' + s.id + '"' + (inC ? ' checked' : '') + '> Compare</label>' +
      '</div></article>';
  }

  function skeletonCard(){
    return '<article class="card skel">' +
      '<span class="sk sk-badge"></span>' +
      '<span class="sk sk-title"></span>' +
      '<span class="sk sk-line"></span>' +
      '<span class="sk sk-line w60"></span>' +
      '<span class="sk sk-cover"></span>' +
      '<span class="sk sk-actions"></span>' +
      '</article>';
  }

  function renderSkeletons(n){
    var out = '';
    for (var i = 0; i < n; i++) out += skeletonCard();
    $('grid').innerHTML = out;
    $('pages').style.display = 'none';
  }

  function render(){
    var r = filtered();
    var totalPages = Math.max(1, Math.ceil(r.length / PAGE_SIZE));
    if (st.page > totalPages) st.page = totalPages;
    var visible = r.slice((st.page - 1) * PAGE_SIZE, st.page * PAGE_SIZE);
    $('grid').innerHTML = visible.length ? visible.map(card).join('') :
      '<div class="empty"><p><strong>No schemes match these filters.</strong></p><p>Clear a filter or try a shorter search word.</p></div>';
    var heading = st.onlySaved ? 'Saved schemes' : (st.aud ? 'Schemes for this need' : 'Schemes');
    $('resH').innerHTML = heading + ' <span class="pill">' + r.length + '</span>';
    $('cat').value = st.cat;
    $('age').value = st.age;
    $('income').value = st.income;
    $('min').value = st.min;
    $('type').value = st.type;
    var hasPages = r.length > PAGE_SIZE;
    $('pages').style.display = hasPages ? 'flex' : 'none';
    $('pageInfo').textContent = 'Page ' + st.page + ' of ' + totalPages;
    $('prevBtn').disabled = st.page <= 1;
    $('nextBtn').disabled = st.page >= totalPages;
    $('btnSaved').setAttribute('aria-pressed', st.onlySaved);
    chips();
    segSync();
    var n = st.cmp.length;
    $('tray').classList.toggle('show', n > 0);
    $('trayTxt').textContent = n + ' selected' + (n < 2 ? ' – pick at least 2 to compare' : '');
    $('goCmp').disabled = n < 2;
    syncIncomeClear();
    var nF = activeFilters();
    $('filtersCount').textContent = nF;
    $('filtersCount').hidden = nF === 0;
  }

  function toast(m){
    var t = $('toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(toast.h);
    toast.h = setTimeout(function(){ t.classList.remove('show'); }, 2200);
  }

  /* ---------- detail + compare dialogs ---------- */
  function openDetail(id){
    var s = byId(id);
    $('dTitle').textContent = s.name;
    $('dBody').innerHTML =
      '<p class="d-lead">' + esc(s.description) + '</p>' +
      '<dl>' +
        dt(ico('rupee') + '<span>What it gives</span>', esc(s.coverage_amount)) +
        dt(ico('user') + '<span>Who can use it</span>', esc(s.eligibility)) +
        dt(ico('users') + '<span>Meant for</span>', esc(s.target_beneficiaries)) +
        dt(ico('activity') + '<span>Age group</span>', (s.age_group || ['all']).map(ageLabel).join(', ')) +
        dt(ico('users') + '<span>Gender</span>', (s.gender || ['all']).map(genderLabel).join(', ')) +
        dt(ico('rupee') + '<span>Income limit</span>', incomeLimitText(s)) +
        dt(ico('list') + '<span>Key features</span>',
          '<ul>' + s.key_features.map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>') +
        dt(ico('flag') + '<span>Run by</span>',
          esc(s.ministry) + (s.implementing_body && s.implementing_body !== s.ministry ? ' through ' + esc(s.implementing_body) : '')) +
        dt(ico('calendar') + '<span>Type</span>', esc(s.scheme_type) + ', started ' + s.launch_year) +
        dt(ico(isLegacy(s) ? 'x' : 'check') + '<span>Status</span>',
          isLegacy(s) ? 'Legacy. No longer enrolling; see PM-JAY.' : 'Active') +
        dt(ico('ext') + '<span>Official site</span>',
          '<a class="btn btn-gold" href="' + esc(s.official_website) + '" target="_blank" rel="noopener noreferrer">Visit official site ' + ico('ext') + '</a>') +
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

  /* ---------- events ---------- */
  function scrollToFinder(){
    $('finder').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  function syncClearBtn(){
    $('qClear').classList.toggle('show', st.q.length > 0);
  }

  function syncIncomeClear(){
    $('incClear').classList.toggle('show', st.income.trim().length > 0);
  }

  /* Collapsible filter panel. A collapsed panel is made inert so its controls
     leave the tab order instead of trapping focus in a zero-height box. */
  function setFiltersOpen(open){
    filtersOpen = !!open;
    $('filtersBtn').setAttribute('aria-expanded', String(filtersOpen));
    $('filtersPanel').classList.toggle('collapsed', !filtersOpen);
    if ('inert' in HTMLElement.prototype) $('filtersPanel').inert = !filtersOpen;
    store('ys_filters', filtersOpen);
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
        if (st.aud) scrollToFinder();
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

    $('q').addEventListener('input', function(e){
      st.q = e.target.value;
      st.page = 1;
      render();
      syncClearBtn();
    });
    $('qClear').addEventListener('click', function(){
      st.q = '';
      $('q').value = '';
      st.page = 1;
      render();
      syncClearBtn();
      $('q').focus();
    });
    $('cat').addEventListener('change', function(e){ st.cat = e.target.value; st.page = 1; render(); });
    $('age').addEventListener('change', function(e){ st.age = e.target.value; st.page = 1; render(); });
    $('income').addEventListener('input', function(e){
      st.income = e.target.value;
      st.page = 1;
      render();
    });
    $('incClear').addEventListener('click', function(){
      st.income = '';
      $('income').value = '';
      st.page = 1;
      render();
      $('income').focus();
    });
    forEach(document.querySelectorAll('.seg[data-seg-key]'), function(seg){
      seg.addEventListener('click', function(e){
        var b = e.target.closest('.seg-btn');
        if (!b) return;
        st[seg.getAttribute('data-seg-key')] = b.getAttribute('data-val');
        st.page = 1;
        render();
      });
    });
    $('sort').addEventListener('change', function(e){ st.sort = e.target.value; st.page = 1; render(); });
    $('min').addEventListener('change', function(e){ st.min = e.target.value; st.page = 1; render(); });
    $('type').addEventListener('change', function(e){ st.type = e.target.value; st.page = 1; render(); });
    $('filtersBtn').addEventListener('click', function(){ setFiltersOpen(!filtersOpen); });

    $('clear').addEventListener('click', function(){
      st.aud = ''; st.q = ''; st.cat = ''; st.age = ''; st.gender = ''; st.income = ''; st.min = ''; st.type = ''; st.stat = ''; st.onlySaved = false; st.page = 1;
      $('q').value = ''; $('cat').value = ''; $('age').value = ''; $('income').value = ''; $('min').value = ''; $('type').value = '';
      render();
      syncClearBtn();
    });
    $('btnSaved').addEventListener('click', function(){
      st.onlySaved = !st.onlySaved; st.page = 1; render();
      scrollToFinder();
    });
    $('btnText').addEventListener('click', function(){
      size = size >= 1.3 ? 1 : +(size + .15).toFixed(2);
      store('ys_size', size);
      applyPrefs();
      toast('Text size ' + Math.round(size * 100) + '%');
    });
    $('btnTheme').addEventListener('click', function(){
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      theme = dark ? 'light' : 'dark';
      store('ys_theme', theme);
      applyPrefs();
      toast(theme === 'dark' ? 'Dark theme on' : 'Light theme on');
    });
    $('prevBtn').addEventListener('click', function(){
      if (st.page <= 1) return;
      st.page--;
      render();
      scrollToFinder();
    });
    $('nextBtn').addEventListener('click', function(){
      st.page++;
      render();
      scrollToFinder();
    });
    $('goCmp').addEventListener('click', openCompare);
    $('clrCmp').addEventListener('click', function(){ st.cmp = []; render(); });
    $('dClose').addEventListener('click', function(){ $('dlg').close(); });
    $('cClose').addEventListener('click', function(){ $('cdlg').close(); });
    ['dlg', 'cdlg'].forEach(function(id){
      $(id).addEventListener('click', function(e){ if (e.target === e.currentTarget) e.currentTarget.close(); });
    });

    /* footer quick links by category */
    forEach(document.querySelectorAll('.fq'), function(b){
      b.addEventListener('click', function(){
        st.cat = b.getAttribute('data-cat');
        st.page = 1;
        render();
        scrollToFinder();
      });
    });

    /* header blur once scrolled */
    var top = document.querySelector('.top');
    var onScroll = function(){ top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- boot: slim skeletons, then load data ---------- */
  function showLoadError(){
    $('grid').innerHTML = '<div class="empty"><p><strong>Could not load the schemes data.</strong></p>' +
      '<p>Serve this folder over HTTP — for example <code>python -m http.server</code> or <code>npx serve</code> — ' +
      'so <code>assets/data/schemes.json</code> can be fetched.</p></div>';
    $('resH').textContent = 'Unable to load schemes';
    $('pages').style.display = 'none';
  }

  renderSkeletons(PAGE_SIZE);

  fetch('assets/data/schemes.json')
    .then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data){
      DATA = data;
      var count = $('schemeCount');
      if (count) count.textContent = DATA.length;
      populateCategories();
      chips();
      bindEvents();
      render();
    })
    .catch(showLoadError);
})();