(() => {
  'use strict';
  const config = window.MT_CONFIG || {};
  const hasDatabaseConfig = Boolean(config.supabaseUrl && config.supabasePublishableKey && config.supabaseUrl.startsWith('https://'));
  const hasAdminEmail = Boolean(config.adminEmail && config.adminEmail.includes('@'));
  const db = hasDatabaseConfig && window.supabase? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey) : null;
  const ownerEmail = String(config.adminEmail || '').toLowerCase().trim();
  const $ = (id) => document.getElementById(id);
  const statuses = [
    {value:'new',label:'New order'},
    {value:'preparing',label:'Preparing'},
    {value:'ready',label:'Ready for collection'},
    {value:'completed',label:'Completed / paid'},
    {value:'cancelled',label:'Cancelled'}
  ];
  let orders = []; let reviews = [];
  const money = (amount) => new Intl.NumberFormat('en-ZA', {style:'currency',currency:'ZAR',maximumFractionDigits:2}).format(Number(amount || 0));
  const escapeHtml = (value) => String(value?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-ZA', {timeZone:'Africa/Johannesburg',dateStyle:'medium',timeStyle:'short'}).format(d);
  };
  function message(id, text, isError = false) {
    const el = $(id); if (!el) return;
    el.textContent = text; el.classList.toggle('error', Boolean(isError));
  }
  function showPanel(name) {
    $('loginPanel').classList.toggle('hidden', name!== 'login');
    $('dashboardPanel').classList.toggle('hidden', name!== 'dashboard');
    $('logoutBtn').classList.toggle('hidden', name!== 'dashboard');
  }
  async function signIn(event) {
    event.preventDefault();
    if (!db) { message('loginMessage','Database not configured. Check config.js', true); return; }
    const email = $('loginEmail').value.trim().toLowerCase();
    const password = $('loginPassword').value;
    if (email!== ownerEmail) { message('loginMessage','Use the admin email configured for Maggie’s Treat: ' + ownerEmail, true); return; }
    const button = $('loginForm').querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Signing in…';
    message('loginMessage','Checking your login…');
    try {
      const {data, error} = await db.auth.signInWithPassword({email, password});
      if (error) throw error;
      const signedInEmail = String(data.user?.email || '').toLowerCase();
      if (signedInEmail!== ownerEmail) { await db.auth.signOut(); throw new Error('This account is not the configured store admin.'); }
      message('loginMessage','Signed in successfully.');
      await openDashboard();
    } catch (err) {
      message('loginMessage', err.message || 'Could not sign in. Check your email and password.', true);
    } finally { button.disabled = false; button.textContent = 'Sign in to dashboard →'; }
  }
  async function openDashboard() { showPanel('dashboard'); await loadDashboard(); }
  async function signOut() { if (db) await db.auth.signOut(); showPanel('login'); $('loginForm').reset(); $('loginEmail').value = ownerEmail; message('loginMessage','You have been logged out.'); }
  async function loadDashboard() {
    if (!db) return;
    $('ordersList').innerHTML = '<div class="loading-card">Loading orders…</div>';
    $('reviewsList').innerHTML = '<div class="loading-card">Loading reviews…</div>';
    message('dashboardMessage','Updating your figures…');
    try {
      const [statsResult, ordersResult, reviewsResult] = await Promise.all([
        db.rpc('admin_dashboard_stats'),
        db.from('orders').select('id,customer_name,phone,note,item_details,total,status,created_at,completed_at').order('created_at',{ascending:false}).limit(200),
        db.from('reviews').select('id,customer_name,rating,comment,created_at').order('created_at',{ascending:false}).limit(100)
      ]);
      if (statsResult.error) throw statsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      const stats = Array.isArray(statsResult.data)? statsResult.data[0] : statsResult.data;
      if (!stats) throw new Error('No dashboard statistics were returned.');
      orders = ordersResult.data || []; reviews = reviewsResult.data || [];
      renderStats(stats); renderOrders(); renderReviews();
      $('lastUpdated').textContent = `Last updated ${localDateTime(new Date().toISOString())} · South African time`;
      message('dashboardMessage','Dashboard updated.');
    } catch (err) {
      message('dashboardMessage',`Could not load dashboard data. ${err.message || ''}`, true);
      $('ordersList').innerHTML = '<div class="empty-state">Orders are not available. Check the SQL setup and admin access policy.</div>';
      $('reviewsList').innerHTML = '<div class="empty-state">Reviews are not available yet.</div>';
    }
  }
  function renderStats(stats) {
    $('revenueToday').textContent = money(stats.revenue_today);
    $('revenueWeek').textContent = money(stats.revenue_week);
    $('revenueMonth').textContent = money(stats.revenue_month);
    $('ordersToday').textContent = Number(stats.orders_today || 0).toLocaleString('en-ZA');
    const count = Number(stats.review_count || 0);
    const average = stats.average_rating == null? null : Number(stats.average_rating);
    $('averageRating').textContent = average == null ||!count? '—' : `${average.toFixed(2)} ★`;
    $('reviewCount').textContent = `${count} ${count === 1? 'review' : 'reviews'}`;
  }
  function statusClass(s) { return ({preparing:'status-preparing',ready:'status-ready',completed:'status-completed',cancelled:'status-cancelled'})[s] || ''; }
  function renderOrders() {
    const container = $('ordersList'); const filter = $('orderStatusFilter').value;
    const filtered = filter === 'all'? orders : orders.filter(o => o.status === filter);
    if (!filtered.length) { container.innerHTML = `<div class="empty-state">${filter === 'all'? 'No orders have been placed yet.' : `There are no ${escapeHtml(filter)} orders.`}</div>`; return; }
    container.innerHTML = filtered.map(order => {
      const details = Array.isArray(order.item_details)? order.item_details : [];
      const itemLines = details.map(item => `<li><span>${Number(item.quantity||0)} × ${escapeHtml(item.name||'Menu item')}</span><span>${money(item.line_total?? (Number(item.price||0)*Number(item.quantity||0)))}</span></li>`).join('');
      const phoneLink = String(order.phone||'').replace(/[^\d+]/g,'');
      const statusOptions = statuses.map(s => `<option value="${s.value}"${order.status===s.value?' selected':''}>${s.label}</option>`).join('');
      return `<article class="order-card"><div class="order-card-head"><div><h3>${escapeHtml(order.customer_name)}</h3><div class="order-meta">Order received: ${escapeHtml(localDateTime(order.created_at))}<br>Order #${escapeHtml(String(order.id).slice(0,8).toUpperCase())}</div><span class="order-status ${statusClass(order.status)}">${escapeHtml(statuses.find(i=>i.value===order.status)?.label||order.status)}</span></div><strong class="order-total">${money(order.total)}</strong></div><ul class="order-items">${itemLines||'<li><span>Order items unavailable</span></li>'}</ul>${order.note?`<div class="order-note"><strong>Customer note:</strong> ${escapeHtml(order.note)}</div>`:''}<div class="order-card-footer"><a class="order-phone" href="tel:${escapeHtml(phoneLink)}">☎ ${escapeHtml(order.phone)}</a><select data-status-order="${escapeHtml(order.id)}">${statusOptions}</select></div>${order.completed_at?`<div class="completed-date">Completed / paid: ${escapeHtml(localDateTime(order.completed_at))}</div>`:''}</article>`;
    }).join('');
  }
  function renderReviews() {
    const container = $('reviewsList');
    if (!reviews.length) { container.innerHTML = '<div class="empty-state">No reviews yet.</div>'; return; }
    container.innerHTML = reviews.map(review => {
      const rating = Math.max(0, Math.min(5, Number(review.rating||0)));
      return `<article class="admin-review-card"><div class="admin-review-head"><strong>${escapeHtml(review.customer_name)}</strong><span class="admin-review-stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span></div><p>${review.comment?escapeHtml(review.comment):'<em>No written comment.</em>'}</p><time>${escapeHtml(localDateTime(review.created_at))}</time></article>`;
    }).join('');
  }
  async function updateStatus(event) {
    const selector = event.target.closest('[data-status-order]'); if (!selector ||!db) return;
    const id = selector.dataset.statusOrder; const nextStatus = selector.value;
    const previous = orders.find(o=>o.id===id)?.status;
    selector.disabled = true; message('dashboardMessage','Saving order status…');
    try { const {error} = await db.from('orders').update({status:nextStatus}).eq('id',id); if (error) throw error; await loadDashboard(); message('dashboardMessage', nextStatus==='completed'?'Order marked completed / paid.':'Order status updated.'); }
    catch (err) { selector.value = previous||'new'; message('dashboardMessage',`Could not update the order. ${err.message||''}`, true); }
    finally { selector.disabled = false; }
  }
  if (!hasDatabaseConfig ||!hasAdminEmail) {
    $('setupNotice').classList.remove('hidden');
  } else {
    $('loginEmail').value = ownerEmail;
    $('loginForm').addEventListener('submit', signIn);
    $('logoutBtn').addEventListener('click', signOut);
    $('refreshBtn').addEventListener('click', loadDashboard);
    $('orderStatusFilter').addEventListener('change', renderOrders);
    $('ordersList').addEventListener('change', updateStatus);
    db.auth.getSession().then(async ({data, error}) => {
      if (error) return;
      const user = data.session?.user;
      if (user && String(user.email||'').toLowerCase() === ownerEmail) { await openDashboard(); } else { showPanel('login'); }
    });
  }
})();
