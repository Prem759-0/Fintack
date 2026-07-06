/* ============================================================
   FinTrack Pro – app.js v2.0
   Advanced Features: Budgets, Goals, Sparklines, Heatmap,
   FAB, Confetti, Notifications, Health Score, CSV Export,
   Animated Counters, Accent Colors, Tags, Recurring, Sort
   ============================================================ */

'use strict';

// ==========================================
//  CONSTANTS
// ==========================================

const CURRENCY_SYMBOLS  = { USD:'$', EUR:'€', GBP:'£', INR:'₹', JPY:'¥' };
const EXCHANGE_RATES    = { USD:1, EUR:0.92, GBP:0.79, INR:83.5, JPY:157.8 };
const CURRENCY_NAMES    = { USD:'US Dollar', EUR:'Euro', GBP:'British Pound', INR:'Indian Rupee', JPY:'Japanese Yen' };
const CURRENCY_FLAGS    = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', INR:'🇮🇳', JPY:'🇯🇵' };

const CATEGORY_ICONS = {
  General:'📦', Food:'🍔', Transport:'🚗', Shopping:'🛍️',
  Entertainment:'🎬', Health:'🏥', Utilities:'💡',
  Salary:'💼', Freelance:'💻', Investment:'📈', Other:'🔖',
};

const INCOME_CATEGORIES  = ['Salary','Freelance','Investment','General','Other'];
const EXPENSE_CATEGORIES = ['Food','Transport','Shopping','Entertainment','Health','Utilities','General','Other'];

const CHART_COLORS = [
  '#6c63ff','#10d9a8','#f0415a','#f59e0b','#3b82f6',
  '#a78bfa','#34d399','#fb7185','#fbbf24','#60a5fa','#c084fc','#f97316'
];

const LS = {
  transactions: 'ft2_transactions',
  profile:      'ft2_profile',
  theme:        'ft2_theme',
  budgets:      'ft2_budgets',
  goals:        'ft2_goals',
  accent:       'ft2_accent',
  notifications:'ft2_notifications',
};

// ==========================================
//  STATE
// ==========================================

let S = {
  transactions:  [],
  budgets:       {},
  goals:         [],
  profile:       { name:'User', currency:'USD', email:'' },
  theme:         'dark',
  accent:        '#6c63ff',
  activeCurrency:'USD',
  activeFilter:  'all',
  txSearch:      '',
  txSort:        'date-desc',
  chartPeriod:   30,
  selectedEmoji: '🎯',
  selectedType:  'income',
  charts:        { cashFlow:null, category:null, trend:null },
  pendingDeleteId: null,
  pendingDeleteType: null,
  pendingReset:    false,
  pendingGoalId:   null,
  notifPanelOpen:  false,
  fabOpen:         false,
  notifications:   [],
};

// ==========================================
//  LOCAL STORAGE
// ==========================================

function loadState() {
  try {
    const tx   = localStorage.getItem(LS.transactions);
    S.transactions = tx ? JSON.parse(tx) : getSampleData();
    const prof = localStorage.getItem(LS.profile);
    if (prof) S.profile = { ...S.profile, ...JSON.parse(prof) };
    S.theme  = localStorage.getItem(LS.theme) || 'dark';
    S.accent = localStorage.getItem(LS.accent) || '#6c63ff';
    const bud = localStorage.getItem(LS.budgets);
    if (bud) S.budgets = JSON.parse(bud);
    const gls = localStorage.getItem(LS.goals);
    if (gls) S.goals = JSON.parse(gls);
    const nts = localStorage.getItem(LS.notifications);
    if (nts) S.notifications = JSON.parse(nts);
    S.activeCurrency = S.profile.currency || 'USD';
  } catch(e) { console.error('Load error:', e); }
  // Sync name/email from auth session
  try {
    const authUser = JSON.parse(localStorage.getItem('ft2_auth_user'));
    if (authUser && authUser.name) {
      S.profile.name  = authUser.name.split(' ')[0] || authUser.name;
      S.profile.email = authUser.email || S.profile.email;
    }
  } catch(e) {}
}

// ==========================================
//  LOGOUT
// ==========================================

function handleLogout() {
  if (!confirm('Are you sure you want to sign out?')) return;
  localStorage.removeItem('ft2_auth_user');
  window.location.replace('login.html');
}

const save = {
  tx:    () => localStorage.setItem(LS.transactions, JSON.stringify(S.transactions)),
  prof:  () => localStorage.setItem(LS.profile, JSON.stringify(S.profile)),
  theme: () => localStorage.setItem(LS.theme, S.theme),
  accent:() => localStorage.setItem(LS.accent, S.accent),
  bud:   () => localStorage.setItem(LS.budgets, JSON.stringify(S.budgets)),
  goals: () => localStorage.setItem(LS.goals, JSON.stringify(S.goals)),
  notif: () => localStorage.setItem(LS.notifications, JSON.stringify(S.notifications)),
};

function getSampleData() {
  const fmt = d => { const dt=new Date(); dt.setDate(dt.getDate()-d); return dt.toISOString().split('T')[0]; };
  return [
    { id:uid(), type:'income',  desc:'Monthly Salary',       amount:3500,  category:'Salary',        date:fmt(0),  notes:'July salary',    currency:'USD', tags:['#work','#monthly'], recurring:true,  recurFreq:'monthly' },
    { id:uid(), type:'expense', desc:'Grocery Shopping',     amount:125,   category:'Food',           date:fmt(1),  notes:'',               currency:'USD', tags:['#essential'], recurring:false },
    { id:uid(), type:'expense', desc:'Netflix Subscription', amount:15.99, category:'Entertainment',  date:fmt(2),  notes:'',               currency:'USD', tags:['#subscription'], recurring:true, recurFreq:'monthly' },
    { id:uid(), type:'income',  desc:'Freelance Project',    amount:850,   category:'Freelance',      date:fmt(3),  notes:'Web design',     currency:'USD', tags:['#freelance'], recurring:false },
    { id:uid(), type:'expense', desc:'Electricity Bill',     amount:78,    category:'Utilities',      date:fmt(5),  notes:'',               currency:'USD', tags:['#bills'], recurring:true, recurFreq:'monthly' },
    { id:uid(), type:'expense', desc:'Uber Rides',           amount:48,    category:'Transport',      date:fmt(7),  notes:'',               currency:'USD', tags:['#commute'], recurring:false },
    { id:uid(), type:'income',  desc:'Stock Dividend',       amount:230,   category:'Investment',     date:fmt(10), notes:'Q2 dividend',    currency:'USD', tags:['#passive'], recurring:false },
    { id:uid(), type:'expense', desc:'Restaurant Dinner',    amount:92,    category:'Food',           date:fmt(12), notes:'Anniversary',    currency:'USD', tags:['#dining'], recurring:false },
    { id:uid(), type:'expense', desc:'Online Shopping',      amount:210,   category:'Shopping',       date:fmt(14), notes:'Clothes',        currency:'USD', tags:['#shopping'], recurring:false },
    { id:uid(), type:'expense', desc:'Gym Membership',       amount:45,    category:'Health',         date:fmt(18), notes:'',               currency:'USD', tags:['#health','#monthly'], recurring:true, recurFreq:'monthly' },
    { id:uid(), type:'income',  desc:'Side Hustle Income',   amount:320,   category:'Freelance',      date:fmt(20), notes:'Content writing', currency:'USD', tags:['#freelance'], recurring:false },
    { id:uid(), type:'expense', desc:'Internet Bill',        amount:55,    category:'Utilities',      date:fmt(22), notes:'',               currency:'USD', tags:['#bills'], recurring:true, recurFreq:'monthly' },
  ];
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

// ==========================================
//  CURRENCY
// ==========================================

function cvt(amountUSD, toCur) { return amountUSD * (EXCHANGE_RATES[toCur] || 1); }
function toUSD(amount, fromCur) { return amount / (EXCHANGE_RATES[fromCur] || 1); }

function fmt(amountUSD, cur) {
  cur = cur || S.activeCurrency;
  const sym = CURRENCY_SYMBOLS[cur] || '$';
  const val = cvt(amountUSD, cur);
  if (cur === 'JPY') return sym + Math.round(val).toLocaleString();
  if (cur === 'INR') return sym + Math.round(val).toLocaleString('en-IN');
  return sym + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}

// ==========================================
//  ANIMATED COUNTER
// ==========================================

function animateCounter(el, targetText) {
  // Extract numeric value
  const prev = parseFloat(el.dataset.rawVal || 0);
  const match = targetText.match(/([\d,.]+)/);
  if (!match) { el.textContent = targetText; return; }
  const targetNum = parseFloat(match[0].replace(/,/g,''));
  if (isNaN(targetNum) || prev === targetNum) { el.textContent = targetText; el.dataset.rawVal = targetNum; return; }

  const dur = 900;
  const start = performance.now();
  const sym = targetText.replace(/([\d,. ]+).*/,'').trim() || '';
  const suffix = targetText.slice(targetText.search(/[\d]/)).replace(/[\d,.]+/,'').trim();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / dur, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const cur = prev + (targetNum - prev) * ease;
    const sym2 = CURRENCY_SYMBOLS[S.activeCurrency] || '$';
    if (targetText.includes('%')) {
      el.textContent = Math.round(cur) + '%';
    } else {
      el.textContent = fmt(toUSD(cur, S.activeCurrency));
    }
    if (progress < 1) requestAnimationFrame(step);
    else { el.textContent = targetText; el.dataset.rawVal = targetNum; }
  }
  requestAnimationFrame(step);
}

// ==========================================
//  SUMMARY CARDS
// ==========================================

function calcSummary() {
  let incUSD = 0, expUSD = 0;
  S.transactions.forEach(t => { if(t.type==='income') incUSD+=t.amount; else expUSD+=t.amount; });
  const balUSD  = incUSD - expUSD;
  const savings = incUSD > 0 ? Math.max(0, Math.round((balUSD/incUSD)*100)) : 0;
  return { incUSD, expUSD, balUSD, savings };
}

function renderSummaryCards() {
  const { incUSD, expUSD, balUSD, savings } = calcSummary();
  const cur = S.activeCurrency;

  const balEl  = document.getElementById('totalBalance');
  const incEl  = document.getElementById('totalIncome');
  const expEl  = document.getElementById('totalExpense');
  const savEl  = document.getElementById('savingsRate');

  if (balEl)  animateCounter(balEl, fmt(balUSD, cur));
  if (incEl)  animateCounter(incEl, fmt(incUSD, cur));
  if (expEl)  animateCounter(expEl, fmt(expUSD, cur));
  if (savEl)  { savEl.textContent = savings + '%'; }

  // Savings bar
  const fill = document.getElementById('savingsBarFill');
  if (fill) setTimeout(() => fill.style.width = Math.min(savings,100)+'%', 100);

  // Card sub text
  const txCount = S.transactions.length;
  const setEl = (id, txt) => { const el=document.getElementById(id); if(el) el.textContent=txt; };
  setEl('balanceSub', txCount>0 ? `${txCount} transaction${txCount!==1?'s':''}` : 'Start adding transactions');
  const incCt = S.transactions.filter(t=>t.type==='income').length;
  const expCt = S.transactions.filter(t=>t.type==='expense').length;
  setEl('incomeSub', incCt>0 ? `${incCt} income entr${incCt!==1?'ies':'y'}` : 'No income yet');
  setEl('expenseSub', expCt>0 ? `${expCt} expense entr${expCt!==1?'ies':'y'}` : 'No expenses yet');

  renderSparklines();
  renderHealthScore();
  updateSidebarStats();
  updateFilterCounts();
}

// ==========================================
//  SPARKLINES
// ==========================================

function renderSparklines() {
  const last7 = getDatesRange(7);

  function drawSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 220;
    const H = 40;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0,0,W,H);
    const max = Math.max(...data, 1);
    const pts = data.map((v,i) => ({ x: (i/(data.length-1))*W, y: H - (v/max)*(H-6) }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p,i) => { if(i>0) { const cp=(pts[i-1].x+p.x)/2; ctx.bezierCurveTo(cp,pts[i-1].y,cp,p.y,p.x,p.y); } });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, color+'55');
    grad.addColorStop(1, color+'00');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  const incByDay  = last7.map(d => S.transactions.filter(t=>t.date===d&&t.type==='income').reduce((a,t)=>a+t.amount,0));
  const expByDay  = last7.map(d => S.transactions.filter(t=>t.date===d&&t.type==='expense').reduce((a,t)=>a+t.amount,0));
  const balByDay  = incByDay.map((v,i) => Math.max(v-expByDay[i],0));

  drawSparkline('sparkBalance', balByDay, '#6c63ff');
  drawSparkline('sparkIncome',  incByDay, '#10d9a8');
  drawSparkline('sparkExpense', expByDay, '#f0415a');
}

// ==========================================
//  HEALTH SCORE
// ==========================================

function renderHealthScore() {
  const { incUSD, expUSD, balUSD, savings } = calcSummary();
  let score = 0;

  if (incUSD > 0) {
    score += Math.min(savings, 30);                                     // savings rate
    score += expUSD/incUSD < 0.7 ? 25 : expUSD/incUSD < 0.9 ? 12 : 0; // expense ratio
    score += S.transactions.length > 5 ? 20 : S.transactions.length * 4; // activity
    score += Object.keys(S.budgets).length > 0 ? 15 : 0;               // has budgets
    score += S.goals.length > 0 ? 10 : 0;                               // has goals
    score = Math.min(Math.round(score), 100);
  }

  const circle = document.getElementById('healthRingCircle');
  if (circle) {
    const offset = 157 - (score/100)*157;
    setTimeout(() => circle.style.strokeDashoffset = offset, 200);
  }

  const numEl = document.getElementById('healthScoreNum');
  if (numEl) numEl.textContent = score || '--';

  const titleEl = document.getElementById('healthTitle');
  const descEl  = document.getElementById('healthDesc');
  const lvl = score >= 80 ? ['Excellent 🌟','Your finances are in great shape!','#10d9a8'] :
              score >= 60 ? ['Good 👍','You\'re on the right track.','#6c63ff'] :
              score >= 40 ? ['Fair ⚡','Some areas need attention.','#f59e0b'] :
              score > 0   ? ['Needs Work 📈','Start with tracking & budgeting.','#f0415a'] :
                            ['Getting Started 🚀','Add transactions to see your score.',null];

  if (titleEl) titleEl.textContent = 'Financial Health · ' + lvl[0];
  if (descEl)  descEl.textContent  = lvl[1];

  const banner = document.getElementById('healthBanner');
  if (banner && lvl[2]) banner.style.background = `linear-gradient(135deg, ${lvl[2]}18 0%, rgba(108,99,255,0.06) 100%)`;

  // Update health metrics
  const setHM = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setHM('hm-total', S.transactions.length);
  const avgDaily = S.transactions.length > 0 ? expUSD / Math.max(1, getDaysSinceFirst()) : 0;
  setHM('hm-avg', fmt(avgDaily));
  setHM('hm-net', fmt(balUSD));
}

function getDaysSinceFirst() {
  if (!S.transactions.length) return 1;
  const sorted = [...S.transactions].sort((a,b)=>a.date.localeCompare(b.date));
  const first  = new Date(sorted[0].date);
  const today  = new Date();
  return Math.max(1, Math.ceil((today - first) / 86400000));
}

// ==========================================
//  SIDEBAR STATS
// ==========================================

function updateSidebarStats() {
  const now  = new Date();
  const mon  = now.getMonth();
  const yr   = now.getFullYear();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date); return d.getMonth()===mon && d.getFullYear()===yr;
  });
  const mInc = monthTx.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const mExp = monthTx.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  const setEl = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setEl('sidebarMonthIncome',  '+'+fmt(mInc));
  setEl('sidebarMonthExpense', '-'+fmt(mExp));
}

// ==========================================
//  TODAY'S SNAPSHOT
// ==========================================

function renderTodaySnapshot() {
  const today = todayStr();
  const todayTx = S.transactions.filter(t=>t.date===today);
  const todayInc = todayTx.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const todayExp = todayTx.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);

  const setEl = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setEl('todayIncome',  fmt(todayInc));
  setEl('todayExpense', fmt(todayExp));

  const badge = document.getElementById('todayBadge');
  if (badge) badge.textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});

  // Week bars (last 7 days)
  const last7 = getDatesRange(7);
  const bars  = document.getElementById('weekBars');
  if (!bars) return;
  bars.innerHTML = '';
  const maxExp = Math.max(...last7.map(d=>S.transactions.filter(t=>t.date===d&&t.type==='expense').reduce((a,t)=>a+t.amount,0)), 1);
  last7.forEach(d => {
    const exp = S.transactions.filter(t=>t.date===d&&t.type==='expense').reduce((a,t)=>a+t.amount,0);
    const inc = S.transactions.filter(t=>t.date===d&&t.type==='income').reduce((a,t)=>a+t.amount,0);
    const pct = Math.max((exp/maxExp)*100, 4);
    const dt  = new Date(d+'T00:00:00');
    const lbl = dt.toLocaleDateString('en-US',{weekday:'short'}).slice(0,1);
    const wrap = document.createElement('div');
    wrap.className = 'week-bar-wrap';
    const cls = inc > 0 && exp === 0 ? 'income' : exp > 0 ? 'expense' : '';
    wrap.innerHTML = `
      <div class="week-bar ${cls}" style="height:${pct}%;max-height:40px" title="${fmt(exp)} spent"></div>
      <div class="week-bar-label">${lbl}</div>
    `;
    bars.appendChild(wrap);
  });
}

// ==========================================
//  TRANSACTION LIST
// ==========================================

function buildTxItem(tx, delay=0) {
  const icon   = CATEGORY_ICONS[tx.category] || '📦';
  const sign   = tx.type==='income' ? '+' : '-';
  const dateStr = new Date(tx.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  const div = document.createElement('div');
  div.className = 'tx-item';
  div.dataset.id = tx.id;
  div.style.animationDelay = delay + 'ms';

  const tagsHTML = (tx.tags||[]).filter(Boolean).map(t=>`<span class="tx-tag">${escHtml(t)}</span>`).join('');
  const recurBadge = tx.recurring ? `<span class="tx-recurring-badge">🔄 ${tx.recurFreq||'recurring'}</span>` : '';

  div.innerHTML = `
    <div class="tx-icon ${tx.type}" aria-hidden="true">${icon}</div>
    <div class="tx-info">
      <div class="tx-desc" title="${escHtml(tx.desc)}">${escHtml(tx.desc)}</div>
      <div class="tx-meta">${escHtml(tx.category)} · ${dateStr}${tx.notes?' · '+escHtml(tx.notes):''}</div>
      ${tagsHTML||recurBadge ? `<div class="tx-tags">${tagsHTML}${recurBadge}</div>` : ''}
    </div>
    <div class="tx-right">
      <span class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</span>
      <button class="tx-delete" title="Delete" aria-label="Delete ${escHtml(tx.desc)}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;

  div.querySelector('.tx-delete').addEventListener('click', e => {
    e.stopPropagation();
    confirmDelete(tx.id, 'tx', tx.desc);
  });
  return div;
}

function renderRecentList() {
  const container = document.getElementById('recentList');
  if (!container) return;
  container.innerHTML = '';

  const sorted = [...S.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 6);

  if (!recent.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>No transactions yet. Add one to get started!</p></div>`;
    return;
  }
  recent.forEach((tx,i) => container.appendChild(buildTxItem(tx, i*50)));
}

function renderFullList() {
  const container = document.getElementById('fullTxList');
  if (!container) return;
  container.innerHTML = '';

  let filtered = [...S.transactions];
  if (S.activeFilter !== 'all') filtered = filtered.filter(t => t.type === S.activeFilter);
  if (S.txSearch) {
    const q = S.txSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.desc.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.notes||'').toLowerCase().includes(q) ||
      (t.tags||[]).some(tag => tag.toLowerCase().includes(q))
    );
  }

  // Sort
  filtered.sort((a,b) => {
    switch(S.txSort) {
      case 'date-asc':    return a.date.localeCompare(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc':  return a.amount - b.amount;
      default:            return b.date.localeCompare(a.date);
    }
  });

  const total = filtered.reduce((a,t) => t.type==='income' ? a+t.amount : a-t.amount, 0);
  const showEl = document.getElementById('tsbShowing');
  const totEl  = document.getElementById('tsbTotal');
  if (showEl) showEl.textContent = `${filtered.length} transaction${filtered.length!==1?'s':''}`;
  if (totEl)  { totEl.textContent = (total>=0?'+':'')+fmt(Math.abs(total)); totEl.style.color = total>=0?'var(--income)':'var(--expense)'; }

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No transactions found.</p></div>`;
    return;
  }
  filtered.forEach((tx,i) => container.appendChild(buildTxItem(tx, i*30)));
}

function updateFilterCounts() {
  const all  = S.transactions.length;
  const inc  = S.transactions.filter(t=>t.type==='income').length;
  const exp  = S.transactions.filter(t=>t.type==='expense').length;
  setElText('count-all', all);
  setElText('count-income', inc);
  setElText('count-expense', exp);
}

// ==========================================
//  ADD TRANSACTION
// ==========================================

function setType(type) {
  S.selectedType = type;
  document.getElementById('typeIncome')?.classList.toggle('active', type==='income');
  document.getElementById('typeExpense')?.classList.toggle('active', type==='expense');
  updateCatOptions(type);
}

function updateCatOptions(type) {
  const sel = document.getElementById('txCategory');
  if (!sel) return;
  const cats = type==='income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  sel.innerHTML = cats.map(c=>`<option value="${c}">${CATEGORY_ICONS[c]} ${c}</option>`).join('');
}

function handleAddTx(e) {
  e.preventDefault();
  const desc     = document.getElementById('txDescription').value.trim();
  const amtRaw   = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const date     = document.getElementById('txDate').value;
  const notes    = document.getElementById('txNotes').value.trim();
  const tagsRaw  = document.getElementById('txTags').value;
  const recurring = document.getElementById('txRecurring').checked;
  const recurFreq = document.getElementById('txRecurFreq').value;

  if (!desc || isNaN(amtRaw) || amtRaw <= 0 || !date) {
    showToast('Fill in all required fields.', 'error'); return;
  }

  const tags = tagsRaw.split(',').map(t=>t.trim()).filter(t=>t);
  const amountUSD = toUSD(amtRaw, S.activeCurrency);

  const tx = { id:uid(), type:S.selectedType, desc, amount:amountUSD, category, date, notes, currency:S.activeCurrency, tags, recurring, recurFreq };
  S.transactions.unshift(tx);
  save.tx();

  checkBudgetAlerts(tx);
  addNotification(S.selectedType==='income' ? `💰 Income: +${fmt(amountUSD)} – ${desc}` : `💸 Expense: -${fmt(amountUSD)} – ${desc}`, S.selectedType==='income'?'income':'expense');

  renderAll();

  e.target.reset();
  document.getElementById('txDate').value = todayStr();
  setType('income');
  document.getElementById('txRecurring').checked = false;
  document.getElementById('txRecurFreq').style.display = 'none';

  showToast(S.selectedType==='income'?'💰 Income added successfully!':'💸 Expense recorded!', 'success');

  if (S.selectedType==='income') launchConfetti();
}

// ==========================================
//  BUDGETS
// ==========================================

function renderBudgetList() {
  const container = document.getElementById('budgetList');
  if (!container) return;
  const entries = Object.entries(S.budgets);

  // Month label
  const mth = document.getElementById('budgetMonth');
  if (mth) mth.textContent = new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});

  if (!entries.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>No budgets set. Add your first budget!</p></div>`;
    return;
  }
  container.innerHTML = '';

  // Current month expenses by category
  const now = new Date();
  const monthExp = {};
  S.transactions.filter(t=>{
    const d=new Date(t.date); return t.type==='expense' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).forEach(t => monthExp[t.category] = (monthExp[t.category]||0)+t.amount);

  entries.forEach(([cat, limitUSD]) => {
    const spentUSD = monthExp[cat] || 0;
    const pct      = Math.min((spentUSD/limitUSD)*100, 100);
    const pctRound = Math.round(pct);
    const cls      = pct>=100 ? 'danger' : pct>=80 ? 'warn' : 'ok';
    const barCls   = `budget-bar-${cls}`;
    const pctCls   = `budget-${cls}`;

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-header">
        <div>
          <div class="budget-name">${CATEGORY_ICONS[cat]||'📦'} ${cat}</div>
          <div class="budget-amounts">${fmt(spentUSD)} of ${fmt(limitUSD)} spent</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="budget-pct ${pctCls}">${pctRound}%</span>
          <button class="budget-delete" data-cat="${cat}" title="Delete budget">✕</button>
        </div>
      </div>
      <div class="budget-bar-track">
        <div class="budget-bar-fill ${barCls}" style="width:0%"></div>
      </div>
      <div class="budget-meta">
        <span>${fmt(Math.max(limitUSD-spentUSD,0))} remaining</span>
        <span>${pct>=100?'⚠️ Over budget!':pct>=80?'⚡ Almost full':''}</span>
      </div>
    `;
    item.querySelector('.budget-delete').addEventListener('click', () => {
      delete S.budgets[cat]; save.bud(); renderBudgetList();
      showToast(`Budget for ${cat} removed.`, 'info');
    });
    container.appendChild(item);
    setTimeout(() => { const f=item.querySelector('.budget-bar-fill'); if(f) f.style.width=pct+'%'; }, 100);
  });
}

function handleBudgetForm(e) {
  e.preventDefault();
  const cat = document.getElementById('budgetCategory').value;
  const amt = parseFloat(document.getElementById('budgetAmount').value);
  if (!amt || amt<=0) { showToast('Enter a valid amount.','error'); return; }
  S.budgets[cat] = toUSD(amt, S.activeCurrency);
  save.bud(); renderBudgetList();
  e.target.reset();
  showToast(`🎯 Budget set for ${cat}!`, 'success');
}

function checkBudgetAlerts(tx) {
  if (tx.type !== 'expense') return;
  const limit = S.budgets[tx.category];
  if (!limit) return;
  const now = new Date();
  const spent = S.transactions.filter(t=>{
    const d=new Date(t.date);
    return t.type==='expense' && t.category===tx.category && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).reduce((a,t)=>a+t.amount, 0);
  const pct = (spent/limit)*100;
  if (pct >= 100) {
    showToast(`⚠️ Over budget on ${tx.category}!`, 'warning');
    addNotification(`🚨 Budget exceeded: ${tx.category} (${fmt(spent)} / ${fmt(limit)})`, 'danger');
  } else if (pct >= 80) {
    showToast(`⚡ 80%+ budget used for ${tx.category}`, 'warning');
  }
}

// ==========================================
//  GOALS
// ==========================================

function renderGoalsList() {
  const container = document.getElementById('goalsList');
  if (!container) return;
  if (!S.goals.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚀</div><p>No goals yet. Set your first savings goal!</p></div>`;
    return;
  }
  container.innerHTML = '';
  S.goals.forEach((g,i) => {
    const pct     = Math.min((g.current/g.target)*100,100);
    const daysLeft = Math.ceil((new Date(g.deadline)-new Date()) / 86400000);
    const isUrgent = daysLeft <= 14 && daysLeft > 0;
    const isDone   = g.current >= g.target;

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.style.animationDelay = i*80+'ms';
    card.innerHTML = `
      <span class="goal-emoji">${g.emoji||'🎯'}</span>
      <div class="goal-name">${escHtml(g.name)}</div>
      <div class="goal-deadline">📅 Target: ${new Date(g.deadline+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
      <div class="goal-amounts">
        <span class="goal-current">${fmt(g.current||0)}</span>
        <div class="goal-target"><div class="goal-target-val">${fmt(g.target)}</div><div>target</div></div>
      </div>
      <div class="goal-progress-track"><div class="goal-progress-fill" style="width:0%"></div></div>
      <div class="goal-pct">${isDone?'🎉 Goal Reached! ':Math.round(pct)+'% complete'}</div>
      <div class="goal-days-left ${isUrgent&&!isDone?'urgent':''}">${isDone?'✅ Completed!': daysLeft>0?`${daysLeft} day${daysLeft!==1?'s':''} remaining`:'⏰ Deadline passed'}</div>
      <div class="goal-actions">
        ${!isDone?`<button class="goal-fund-btn" data-id="${g.id}">+ Add Funds</button>`:''}
        <button class="goal-del-btn" data-id="${g.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    card.querySelector('.goal-fund-btn')?.addEventListener('click', () => openFundModal(g.id));
    card.querySelector('.goal-del-btn').addEventListener('click', () => confirmDelete(g.id,'goal',g.name));
    container.appendChild(card);
    setTimeout(()=>{ const f=card.querySelector('.goal-progress-fill'); if(f) f.style.width=pct+'%'; }, 150+i*80);
  });
}

function handleGoalForm(e) {
  e.preventDefault();
  const name     = document.getElementById('goalName').value.trim();
  const target   = parseFloat(document.getElementById('goalTarget').value);
  const deadline = document.getElementById('goalDeadline').value;
  if (!name || !target || !deadline) { showToast('Fill all goal fields.','error'); return; }
  S.goals.push({ id:uid(), name, target:toUSD(target,S.activeCurrency), current:0, deadline, emoji:S.selectedEmoji });
  save.goals(); renderGoalsList(); renderNavBadges();
  e.target.reset(); document.querySelector('.emoji-opt.selected')?.click();
  showToast('🚀 Goal created!', 'success');
}

function openFundModal(goalId) {
  const goal = S.goals.find(g=>g.id===goalId);
  if (!goal) return;
  S.pendingGoalId = goalId;
  const nameEl   = document.getElementById('fundGoalName');
  const prefixEl = document.getElementById('fundPrefix');
  if (nameEl)   nameEl.textContent = goal.name;
  if (prefixEl) prefixEl.textContent = CURRENCY_SYMBOLS[S.activeCurrency]||'$';
  document.getElementById('fundAmount').value = '';
  document.getElementById('fundModal').classList.add('open');
}

function handleFundGoal() {
  const goal = S.goals.find(g=>g.id===S.pendingGoalId);
  if (!goal) return;
  const amt = parseFloat(document.getElementById('fundAmount').value);
  if (!amt || amt<=0) { showToast('Enter a valid amount.','error'); return; }
  goal.current = (goal.current||0) + toUSD(amt,S.activeCurrency);
  save.goals(); renderGoalsList();
  closeFundModal();
  if (goal.current >= goal.target) {
    showToast('🎉 Goal reached! Congratulations!', 'success');
    launchConfetti();
  } else {
    showToast(`💰 ${fmt(toUSD(amt,S.activeCurrency))} added to "${goal.name}"`, 'success');
  }
}

function closeFundModal() {
  document.getElementById('fundModal').classList.remove('open');
  S.pendingGoalId = null;
}

// ==========================================
//  DELETE
// ==========================================

function confirmDelete(id, type, name) {
  S.pendingDeleteId   = id;
  S.pendingDeleteType = type;
  S.pendingReset      = false;
  openModal('🗑️','Delete '+( type==='tx'?'Transaction':'Goal'),`Delete "<strong>${escHtml(name)}</strong>"? This cannot be undone.`);
}

function executeDelete() {
  if (S.pendingDeleteType === 'tx') {
    S.transactions = S.transactions.filter(t=>t.id!==S.pendingDeleteId);
    save.tx(); renderAll(); showToast('Transaction deleted.','info');
  } else if (S.pendingDeleteType === 'goal') {
    S.goals = S.goals.filter(g=>g.id!==S.pendingDeleteId);
    save.goals(); renderGoalsList(); renderNavBadges(); showToast('Goal removed.','info');
  }
}

function executeReset() {
  S.transactions=[]; S.budgets={}; S.goals=[]; S.notifications=[];
  save.tx(); save.bud(); save.goals(); save.notif();
  renderAll(); showToast('All data reset.','info');
}

// ==========================================
//  CHARTS
// ==========================================

function chartDefaults() {
  const dark = S.theme==='dark';
  return {
    grid: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)',
    tick: dark?'#7c87a6':'#4a5568',
    tooltipBg: dark?'#0c1020':'#fff',
    tooltipBorder: dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)',
  };
}

function getDatesRange(days) {
  return Array.from({length:days}, (_,i) => {
    const d=new Date(); d.setDate(d.getDate()-(days-1-i)); return d.toISOString().split('T')[0];
  });
}

function renderCashFlowChart() {
  const canvas = document.getElementById('cashFlowChart');
  if (!canvas) return;
  const days  = S.chartPeriod;
  const dates = getDatesRange(days);
  const D     = chartDefaults();
  const sym   = CURRENCY_SYMBOLS[S.activeCurrency]||'$';

  const incByDate = {}, expByDate = {};
  dates.forEach(d => { incByDate[d]=0; expByDate[d]=0; });
  S.transactions.forEach(tx => {
    if (dates.includes(tx.date)) {
      const v = cvt(tx.amount, S.activeCurrency);
      if (tx.type==='income')  incByDate[tx.date]  += v;
      else                     expByDate[tx.date] += v;
    }
  });

  const labels = dates.map(d => {
    const dt=new Date(d+'T00:00:00');
    return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  });

  if (S.charts.cashFlow) S.charts.cashFlow.destroy();
  S.charts.cashFlow = new Chart(canvas, {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Income', data:dates.map(d=>incByDate[d]), backgroundColor:'rgba(16,217,168,0.75)', borderColor:'#10d9a8', borderWidth:1.5, borderRadius:5, borderSkipped:false },
      { label:'Expense',data:dates.map(d=>expByDate[d]), backgroundColor:'rgba(240,65,90,0.75)',  borderColor:'#f0415a', borderWidth:1.5, borderRadius:5, borderSkipped:false },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:D.tick, font:{family:'Inter',size:12}, boxWidth:10, borderRadius:5 }},
        tooltip:{ backgroundColor:D.tooltipBg, borderColor:D.tooltipBorder, borderWidth:1, titleColor:D.tick, bodyColor:D.tick, cornerRadius:8, callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${sym}${ctx.parsed.y.toFixed(2)}` }},
      },
      scales:{
        x:{ grid:{color:D.grid}, ticks:{color:D.tick, font:{family:'Inter',size:10}, maxRotation:45, maxTicksLimit:days<=7?7:12 }},
        y:{ grid:{color:D.grid}, ticks:{color:D.tick, font:{family:'Inter',size:10}, callback:v=>sym+v }},
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const D = chartDefaults();
  const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';

  const catTotals = {};
  S.transactions.filter(t=>t.type==='expense').forEach(t => {
    catTotals[t.category] = (catTotals[t.category]||0) + cvt(t.amount, S.activeCurrency);
  });
  const entries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const labels  = entries.map(e=>`${CATEGORY_ICONS[e[0]]||'📦'} ${e[0]}`);
  const data    = entries.map(e=>parseFloat(e[1].toFixed(2)));
  const colors  = entries.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]);
  const total   = data.reduce((a,b)=>a+b,0);

  if (S.charts.category) S.charts.category.destroy();

  if (!data.length) {
    const leg = document.getElementById('categoryLegend');
    if (leg) leg.innerHTML='<p style="color:var(--text-muted);font-size:13px">No expenses to show.</p>';
    return;
  }

  S.charts.category = new Chart(canvas, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:2, borderColor:'transparent', hoverOffset:10 }]},
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{
        legend:{display:false},
        tooltip:{ backgroundColor:D.tooltipBg, borderColor:D.tooltipBorder, borderWidth:1, titleColor:D.tick, bodyColor:D.tick, cornerRadius:8,
          callbacks:{ label:ctx=>` ${sym}${ctx.parsed.toFixed(2)} (${((ctx.parsed/total)*100).toFixed(1)}%)` }},
      }
    }
  });

  const leg = document.getElementById('categoryLegend');
  if (leg) leg.innerHTML = entries.map((e,i)=>`
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${CATEGORY_ICONS[e[0]]||''} ${e[0]}: <strong>${sym}${e[1].toFixed(2)}</strong></span>
    </div>`).join('');
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const D = chartDefaults();
  const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';

  const monthMap = {};
  S.transactions.forEach(tx => {
    const d = new Date(tx.date+'T00:00:00');
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!monthMap[k]) monthMap[k] = { income:0, expense:0 };
    const v = cvt(tx.amount, S.activeCurrency);
    if (tx.type==='income') monthMap[k].income  += v;
    else                    monthMap[k].expense += v;
  });
  const keys   = Object.keys(monthMap).sort();
  const labels = keys.map(k=>{ const [y,m]=k.split('-'); return new Date(+y,+m-1,1).toLocaleDateString('en-US',{month:'short',year:'2-digit'}); });

  // Update trend badges
  const badges = document.getElementById('trendBadges');
  if (badges && keys.length) {
    const lastKey = keys[keys.length-1];
    badges.innerHTML = `
      <div class="chart-badge badge-income">+${sym}${monthMap[lastKey].income.toFixed(0)}</div>
      <div class="chart-badge badge-expense">-${sym}${monthMap[lastKey].expense.toFixed(0)}</div>
    `;
  }

  if (S.charts.trend) S.charts.trend.destroy();
  S.charts.trend = new Chart(canvas, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Income', data:keys.map(k=>monthMap[k].income), borderColor:'#10d9a8', backgroundColor:'rgba(16,217,168,0.1)', fill:true, tension:0.45, pointBackgroundColor:'#10d9a8', pointRadius:5, pointHoverRadius:8, borderWidth:2.5 },
      { label:'Expense',data:keys.map(k=>monthMap[k].expense),borderColor:'#f0415a', backgroundColor:'rgba(240,65,90,0.1)',  fill:true, tension:0.45, pointBackgroundColor:'#f0415a', pointRadius:5, pointHoverRadius:8, borderWidth:2.5 },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{ labels:{ color:D.tick, font:{family:'Inter',size:12}, boxWidth:10 }},
        tooltip:{ backgroundColor:D.tooltipBg, borderColor:D.tooltipBorder, borderWidth:1, titleColor:D.tick, bodyColor:D.tick, cornerRadius:8, callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${sym}${ctx.parsed.y.toFixed(2)}` }},
      },
      scales:{
        x:{ grid:{color:D.grid}, ticks:{color:D.tick,font:{family:'Inter',size:10}} },
        y:{ grid:{color:D.grid}, ticks:{color:D.tick,font:{family:'Inter',size:10},callback:v=>sym+v} },
      }
    }
  });
}

function renderHeatmap() {
  const wrap = document.getElementById('spendingHeatmap');
  if (!wrap) return;
  wrap.innerHTML = '';

  // Build 12 weeks of data
  const weeks = 12;
  const today = new Date();
  const totalDays = weeks * 7;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  // Build spending map
  const spendMap = {};
  S.transactions.filter(t=>t.type==='expense').forEach(t => {
    spendMap[t.date] = (spendMap[t.date]||0) + cvt(t.amount, S.activeCurrency);
  });

  // Find max
  const vals = Object.values(spendMap);
  const maxSpend = Math.max(...vals, 1);

  // Build week columns
  for (let w=0; w<weeks; w++) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'hm-week';
    for (let d=0; d<7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w*7 + d);
      const dateStr = cellDate.toISOString().split('T')[0];
      if (cellDate > today) {
        const empty = document.createElement('div');
        empty.className = 'hm-cell'; empty.style.opacity='0';
        weekDiv.appendChild(empty); continue;
      }
      const spend = spendMap[dateStr] || 0;
      const level = spend===0 ? 0 : spend<maxSpend*0.25 ? 1 : spend<maxSpend*0.5 ? 2 : spend<maxSpend*0.75 ? 3 : 4;
      const cell  = document.createElement('div');
      cell.className = `hm-cell hm-${level}`;
      const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';
      cell.title = `${dateStr}: ${sym}${spend.toFixed(2)}`;
      weekDiv.appendChild(cell);
    }
    wrap.appendChild(weekDiv);
  }
}

function renderAnalyticsStats() {
  const container = document.getElementById('analyticsStatsRow');
  if (!container) return;
  const { incUSD, expUSD, balUSD, savings } = calcSummary();
  const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';
  const avgTx = S.transactions.length ? cvt(expUSD/S.transactions.filter(t=>t.type==='expense').length||1, S.activeCurrency) : 0;
  const topCat = (() => {
    const m={}; S.transactions.filter(t=>t.type==='expense').forEach(t=>m[t.category]=(m[t.category]||0)+t.amount);
    const k=Object.keys(m).sort((a,b)=>m[b]-m[a]);
    return k.length ? k[0] : '--';
  })();

  container.innerHTML = `
    <div class="analytic-stat">
      <div class="as-label">Total Transactions</div>
      <div class="as-val">${S.transactions.length}</div>
      <div class="as-sub">${S.transactions.filter(t=>t.type==='income').length} income, ${S.transactions.filter(t=>t.type==='expense').length} expense</div>
    </div>
    <div class="analytic-stat">
      <div class="as-label">Avg Expense</div>
      <div class="as-val">${avgTx ? fmt(toUSD(avgTx,S.activeCurrency)) : '--'}</div>
      <div class="as-sub">per transaction</div>
    </div>
    <div class="analytic-stat">
      <div class="as-label">Top Category</div>
      <div class="as-val">${CATEGORY_ICONS[topCat]||''} ${topCat}</div>
      <div class="as-sub">highest spend</div>
    </div>
    <div class="analytic-stat">
      <div class="as-label">Savings Rate</div>
      <div class="as-val" style="color:var(--income)">${savings}%</div>
      <div class="as-sub">of income saved</div>
    </div>
  `;
}

function renderAllCharts() {
  renderCashFlowChart();
  renderCategoryChart();
  renderTrendChart();
  renderHeatmap();
  renderAnalyticsStats();
}

// ==========================================
//  EXPORT CSV
// ==========================================

function exportCSV() {
  if (!S.transactions.length) { showToast('No transactions to export.','info'); return; }
  const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';
  const rows = [['Date','Type','Description','Amount ('+S.activeCurrency+')','Category','Tags','Notes','Recurring']];
  S.transactions.sort((a,b)=>b.date.localeCompare(a.date)).forEach(tx => {
    rows.push([
      tx.date,
      tx.type,
      `"${tx.desc.replace(/"/g,'""')}"`,
      cvt(tx.amount, S.activeCurrency).toFixed(2),
      tx.category,
      `"${(tx.tags||[]).join(', ')}"`,
      `"${(tx.notes||'').replace(/"/g,'""')}"`,
      tx.recurring ? tx.recurFreq||'yes' : 'no',
    ]);
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `fintrack-export-${todayStr()}.csv`;
  a.click();
  showToast('📊 CSV exported successfully!','success');
}

// ==========================================
//  NOTIFICATIONS
// ==========================================

function addNotification(msg, type='info') {
  S.notifications.unshift({ id:uid(), msg, type, time:new Date().toISOString() });
  if (S.notifications.length > 20) S.notifications.pop();
  save.notif();
  renderNotifPanel();
  const dot = document.getElementById('notifDot');
  if (dot) dot.classList.add('show');
}

function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!S.notifications.length) {
    list.innerHTML = '<div class="notif-empty">No notifications</div>'; return;
  }
  list.innerHTML = S.notifications.slice(0,10).map(n => {
    const icon = n.type==='income'?'💰':n.type==='expense'?'💸':n.type==='danger'?'🚨':'ℹ️';
    const timeStr = new Date(n.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    return `<div class="notif-item"><span class="notif-icon">${icon}</span><div class="notif-content"><div class="notif-msg">${escHtml(n.msg)}</div><div class="notif-time">${timeStr}</div></div></div>`;
  }).join('');
}

// ==========================================
//  CONFETTI
// ==========================================

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({length:120}, () => ({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height - canvas.height,
    r: Math.random()*8+4,
    d: Math.random()*10+5,
    color: ['#6c63ff','#10d9a8','#f0415a','#f59e0b','#a78bfa','#3b82f6'][Math.floor(Math.random()*6)],
    tilt: Math.random()*10-10,
    speed: Math.random()*3+1,
  }));

  let alpha = 1;
  let frame = 0;

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = alpha;
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.y += p.speed;
      p.x += Math.sin(frame/20)*1.5;
      p.tilt += 0.1;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random()*canvas.width; }
    });
    frame++;
    if (frame < 200) {
      requestAnimationFrame(draw);
    } else {
      alpha -= 0.05;
      if (alpha > 0) { requestAnimationFrame(draw); }
      else { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.globalAlpha=1; }
    }
  }
  draw();
}

// ==========================================
//  NAVIGATION
// ==========================================

const SECTIONS = ['dashboard','transactions','budget','goals','analytics','settings'];

function navigateTo(section) {
  if (!SECTIONS.includes(section)) return;

  SECTIONS.forEach(id => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.classList.toggle('active', id===section);
    const nav = document.getElementById(`nav-${id}`);
    if (nav) nav.classList.toggle('active', id===section);
  });

  const titles = { dashboard:'Dashboard', transactions:'Transactions', budget:'Budgets', goals:'Goals', analytics:'Analytics', settings:'Settings' };
  setElText('pageTitle', titles[section]||section);

  if (section==='analytics') setTimeout(renderAllCharts, 60);
  if (section==='budget')    renderBudgetList();
  if (section==='goals')     renderGoalsList();

  animateNavPill(section);
  closeMobileSidebar();
}

function animateNavPill(section) {
  const nav = document.getElementById(`nav-${section}`);
  const pill = document.getElementById('navPill');
  if (!nav||!pill) return;
  const navContainer = document.getElementById('sidebarNav');
  const navRect = nav.getBoundingClientRect();
  const conRect = navContainer.getBoundingClientRect();
  pill.style.top = (nav.offsetTop) + 'px';
  navContainer.classList.add('ready');
}

function renderNavBadges() {
  const goalDot = document.getElementById('badge-goals');
  if (goalDot) { const has=S.goals.length>0; goalDot.textContent=S.goals.length||''; goalDot.classList.toggle('show',has); }
  const budDot = document.getElementById('badge-budget');
  if (budDot) { const hasAlert = checkAnyBudgetOver(); budDot.classList.toggle('alert', hasAlert); budDot.textContent = hasAlert?'!':Object.keys(S.budgets).length||''; }
}

function checkAnyBudgetOver() {
  const now = new Date();
  for (const [cat, limit] of Object.entries(S.budgets)) {
    const spent = S.transactions.filter(t=>{
      const d=new Date(t.date); return t.type==='expense'&&t.category===cat&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }).reduce((a,t)=>a+t.amount,0);
    if (spent >= limit) return true;
  }
  return false;
}

// ==========================================
//  THEME & ACCENT
// ==========================================

function applyTheme(theme) {
  S.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  save.theme();
  setElText('themeIcon', theme==='dark'?'🌙':'☀️');
  setElText('themeLabel', theme==='dark'?'Dark Mode':'Light Mode');
  document.getElementById('themeDark')?.classList.toggle('selected', theme==='dark');
  document.getElementById('themeLight')?.classList.toggle('selected', theme==='light');
  setElText('checkDark', theme==='dark'?'✓':'');
  setElText('checkLight', theme==='light'?'✓':'');
}

function applyAccent(color) {
  S.accent = color;
  document.documentElement.style.setProperty('--accent', color);
  // Update RGB
  const r=parseInt(color.slice(1,3),16), g=parseInt(color.slice(3,5),16), b=parseInt(color.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  document.documentElement.style.setProperty('--accent-2', color+'cc');
  save.accent();
  document.querySelectorAll('.accent-dot').forEach(d=>d.classList.toggle('selected', d.dataset.color===color));
}

// ==========================================
//  PROFILE
// ==========================================

function applyProfile() {
  const { name, currency } = S.profile;
  const init = (name||'U').charAt(0).toUpperCase();
  setElText('avatarInitials', init);
  setElText('profileAvatarLarge', init);
  setElText('profileNameDisplay', name||'User');
  setElText('profileCurrencyDisplay', `${currency} – ${CURRENCY_NAMES[currency]||''}`);
  const pn = document.getElementById('profileName');
  const pc = document.getElementById('profileCurrency');
  const pe = document.getElementById('profileEmail');
  if (pn) pn.value = name||'';
  if (pc) pc.value = currency||'USD';
  if (pe) pe.value = S.profile.email||'';
}

// ==========================================
//  CURRENCY TABLE
// ==========================================

function renderCurrencyTable() {
  const container = document.getElementById('currencyTable');
  if (!container) return;
  container.innerHTML = Object.entries(EXCHANGE_RATES).map(([c,r]) => `
    <div class="currency-row">
      <span class="currency-name">${CURRENCY_FLAGS[c]} ${c} – ${CURRENCY_NAMES[c]}</span>
      <span class="currency-rate">1 USD = ${CURRENCY_SYMBOLS[c]}${r.toFixed(4)}</span>
    </div>
  `).join('');
}

// ==========================================
//  STORAGE INFO
// ==========================================

function renderStorageInfo() {
  const el = document.getElementById('storageInfo');
  if (!el) return;
  const bytes = new Blob([JSON.stringify(S.transactions)]).size;
  const kb    = (bytes/1024).toFixed(1);
  el.textContent = `💾 ${S.transactions.length} transactions · ~${kb} KB stored in localStorage`;
}

// ==========================================
//  MODAL
// ==========================================

function openModal(icon, title, msg) {
  setElText('modalIcon', icon);
  setElText('modalTitle', title);
  const el = document.getElementById('modalMsg');
  if (el) el.innerHTML = msg;
  document.getElementById('confirmModal').classList.add('open');
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('open');
  S.pendingDeleteId=null; S.pendingDeleteType=null; S.pendingReset=false;
}

// ==========================================
//  TOAST
// ==========================================

function showToast(msg, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚡' };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('exit'); setTimeout(()=>toast.remove(), 350); }, 3500);
}

// ==========================================
//  MOBILE SIDEBAR
// ==========================================

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebarOverlay')?.classList.add('open');
  document.getElementById('hamburger')?.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');
  document.body.style.overflow='';
}

// ==========================================
//  UTILITY
// ==========================================

function todayStr() { return new Date().toISOString().split('T')[0]; }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function setElText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }

function updateCurrencyPrefixes() {
  const sym = CURRENCY_SYMBOLS[S.activeCurrency]||'$';
  ['currencyPrefix','budgetCurrencyPrefix','goalCurrencyPrefix','fundPrefix'].forEach(id => setElText(id, sym));
}

// ==========================================
//  RENDER ALL
// ==========================================

function renderAll() {
  renderSummaryCards();
  renderRecentList();
  renderFullList();
  renderBudgetList();
  renderGoalsList();
  renderTodaySnapshot();
  renderCurrencyTable();
  renderStorageInfo();
  renderNavBadges();
  const analyticsSection = document.getElementById('section-analytics');
  if (analyticsSection?.classList.contains('active')) renderAllCharts();
}

// ==========================================
//  INIT
// ==========================================

function init() {
  loadState();
  applyTheme(S.theme);
  applyAccent(S.accent);
  applyProfile();

  // Set today's date in forms
  ['txDate','goalDeadline'].forEach(id => {
    const el=document.getElementById(id); if(el) el.value=todayStr();
  });

  // Page date
  const pd = document.getElementById('pageDate');
  if (pd) pd.textContent = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Currency selectors
  const gcur = document.getElementById('globalCurrency');
  if (gcur) gcur.value = S.activeCurrency;
  updateCurrencyPrefixes();

  setType('income');
  renderAll();
  renderNotifPanel();

  // Initial nav pill
  setTimeout(() => animateNavPill('dashboard'), 100);

  // -------- EVENTS --------

  // Nav links
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.section); });
  });

  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

  // Profile btn → settings
  document.getElementById('profileBtn')?.addEventListener('click', () => navigateTo('settings'));

  // View all link
  document.getElementById('viewAllLink')?.addEventListener('click', e => { e.preventDefault(); navigateTo('transactions'); });

  // Theme toggle (sidebar)
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(S.theme==='dark'?'light':'dark');
    setTimeout(renderAllCharts, 50);
  });

  // Theme options (settings)
  document.getElementById('themeDark')?.addEventListener('click',  () => { applyTheme('dark');  setTimeout(renderAllCharts,50); });
  document.getElementById('themeLight')?.addEventListener('click', () => { applyTheme('light'); setTimeout(renderAllCharts,50); });

  // Accent colors
  document.getElementById('accentColors')?.addEventListener('click', e => {
    const btn = e.target.closest('.accent-dot');
    if (btn) applyAccent(btn.dataset.color);
  });

  // Global currency
  document.getElementById('globalCurrency')?.addEventListener('change', e => {
    S.activeCurrency = e.target.value;
    S.profile.currency = e.target.value;
    save.prof(); applyProfile();
    updateCurrencyPrefixes();
    renderAll();
    setTimeout(renderAllCharts, 50);
  });

  // Transaction type buttons
  document.getElementById('typeIncome')?.addEventListener('click', () => setType('income'));
  document.getElementById('typeExpense')?.addEventListener('click', () => setType('expense'));

  // Transaction form
  document.getElementById('transactionForm')?.addEventListener('submit', handleAddTx);

  // Recurring checkbox
  document.getElementById('txRecurring')?.addEventListener('change', e => {
    const sel = document.getElementById('txRecurFreq');
    if (sel) sel.style.display = e.target.checked ? 'block' : 'none';
  });

  // Filter tabs
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      S.activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b===btn));
      renderFullList();
    });
  });

  // Search
  document.getElementById('txSearch')?.addEventListener('input', e => { S.txSearch=e.target.value; renderFullList(); });

  // Topbar search
  document.getElementById('topbarSearch')?.addEventListener('input', e => {
    const q = e.target.value;
    if (q.trim()) { S.txSearch=q; navigateTo('transactions'); renderFullList(); }
  });

  // Sort
  document.getElementById('txSort')?.addEventListener('change', e => { S.txSort=e.target.value; renderFullList(); });

  // Chart period
  document.getElementById('chartPeriod')?.addEventListener('change', e => { S.chartPeriod=parseInt(e.target.value,10); renderCashFlowChart(); });

  // Profile form
  document.getElementById('profileForm')?.addEventListener('submit', e => {
    e.preventDefault();
    S.profile.name     = document.getElementById('profileName').value.trim()||'User';
    S.profile.currency = document.getElementById('profileCurrency').value;
    S.profile.email    = document.getElementById('profileEmail').value.trim();
    S.activeCurrency   = S.profile.currency;
    const gcur = document.getElementById('globalCurrency');
    if (gcur) gcur.value = S.activeCurrency;
    save.prof(); applyProfile(); updateCurrencyPrefixes(); renderAll();
    showToast('✨ Profile updated!','success');
  });

  // Budget form
  document.getElementById('budgetForm')?.addEventListener('submit', handleBudgetForm);

  // Goal form
  document.getElementById('goalForm')?.addEventListener('submit', handleGoalForm);

  // Emoji picker
  document.getElementById('emojiPicker')?.addEventListener('click', e => {
    const btn = e.target.closest('.emoji-opt');
    if (!btn) return;
    document.querySelectorAll('.emoji-opt').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    S.selectedEmoji = btn.dataset.emoji;
  });

  // Export
  document.getElementById('exportBtn')?.addEventListener('click', exportCSV);
  document.getElementById('exportMiniBtn')?.addEventListener('click', exportCSV);
  document.getElementById('exportFullBtn')?.addEventListener('click', exportCSV);

  // Import sample data
  document.getElementById('importBtn')?.addEventListener('click', () => {
    S.transactions = getSampleData(); save.tx(); renderAll();
    showToast('📥 Sample data loaded!','success');
  });

  // Reset
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    S.pendingReset=true; S.pendingDeleteId=null; S.pendingDeleteType=null;
    openModal('⚠️','Reset All Data','This will permanently delete <strong>all data</strong>. This cannot be undone.');
  });

  // Modal buttons
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalConfirm')?.addEventListener('click', () => {
    if (S.pendingReset) executeReset();
    else if (S.pendingDeleteId) executeDelete();
    closeModal();
  });
  document.getElementById('confirmModal')?.addEventListener('click', e => { if(e.target===document.getElementById('confirmModal')) closeModal(); });

  // Fund modal
  document.getElementById('fundCancel')?.addEventListener('click', closeFundModal);
  document.getElementById('fundConfirm')?.addEventListener('click', handleFundGoal);
  document.getElementById('fundModal')?.addEventListener('click', e => { if(e.target===document.getElementById('fundModal')) closeFundModal(); });

  // Notifications
  const notifBtn = document.getElementById('notifBtn');
  notifBtn?.addEventListener('click', e => {
    e.stopPropagation();
    S.notifPanelOpen = !S.notifPanelOpen;
    document.getElementById('notifPanel')?.classList.toggle('open', S.notifPanelOpen);
    if (S.notifPanelOpen) {
      const dot = document.getElementById('notifDot'); if(dot) dot.classList.remove('show');
    }
  });
  document.getElementById('notifClear')?.addEventListener('click', () => {
    S.notifications=[]; save.notif(); renderNotifPanel();
    document.getElementById('notifDot')?.classList.remove('show');
    showToast('Notifications cleared.','info');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) {
      S.notifPanelOpen=false;
      document.getElementById('notifPanel')?.classList.remove('open');
    }
  });

  // FAB
  document.getElementById('fabMain')?.addEventListener('click', e => {
    e.stopPropagation();
    S.fabOpen = !S.fabOpen;
    document.getElementById('fabWrap')?.classList.toggle('open', S.fabOpen);
    document.getElementById('fabMain')?.classList.toggle('open', S.fabOpen);
  });
  document.getElementById('fabIncome')?.addEventListener('click', () => {
    setType('income'); navigateTo('dashboard');
    document.getElementById('txDescription')?.focus();
    closeFab();
  });
  document.getElementById('fabExpense')?.addEventListener('click', () => {
    setType('expense'); navigateTo('dashboard');
    document.getElementById('txDescription')?.focus();
    closeFab();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#fabWrap')) closeFab();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { closeModal(); closeFundModal(); closeFab(); }
    if ((e.metaKey||e.ctrlKey) && e.key==='k') {
      e.preventDefault();
      document.getElementById('topbarSearch')?.focus();
    }
  });
}

function closeFab() {
  S.fabOpen=false;
  document.getElementById('fabWrap')?.classList.remove('open');
  document.getElementById('fabMain')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', init);
