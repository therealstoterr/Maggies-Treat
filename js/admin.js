(() => {
  'use strict';
  const config = window.MT_CONFIG || {};
  const hasDatabaseConfig = Boolean(
    config.supabaseUrl && config.supabasePublishableKey &&
    config.supabaseUrl.startsWith('https://') &&
    !config.supabaseUrl.includes('PASTE_') &&
    !config.supabasePublishableKey.includes('PASTE_') &&
    window.supabase && typeof window.supabase.createClient === 'function'
  );
  const hasAdminEmail = Boolean(config.adminEmail && !config.adminEmail.includes('your-admin-email'));
  const db = hasDatabaseConfig ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey) : null;
  const ownerEmail = String(config.adminEmail || '').toLowerCase().trim();
  const $ = (id) => document.getElementById(id);
  const statuses = [
    {value:'new',label:'New order'},
    {value:'preparing',label:'Preparing'},
    {value:'ready',label:'Ready for collection'},
    {value:'completed',label:'Completed / paid'},
    {value:'cancelled',label:'Cancelled'}
  ];
  let orders = [];
  let reviews = [];

  const money = (amount) => new Intl.NumberFormat('en-ZA', {style:'currency',currency:'ZAR',maximumFractionDigits:2}).format(Number(amount || 0));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const localDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-ZA', {timeZone:'Africa/Johannesburg',dateStyle:'medium',timeStyle:'short'}).format(date);
  };
  function message(id, text, isError = false) {
    const element = $(id);
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('error', Boolean(isError));
  }
  function showPanel(name) {
    $('loginPanel').classList.toggle('hidden', name !== 'login');
    $('dashboardPanel').classList.toggle('hidden', name !== 'dashboard');
    $('logoutBtn').classList.toggle('hidden', name !== 'dashboard');
  }
  function setSetupNotice() {
    if (!hasDatabaseConfig || !hasAdminEmail) {
      $('setupNotice').classList.remove('hidden');
      showPanel('login');
      $('loginPanel').classList.add('hidden');
      $('logoutBtn').classList.add('hidden');
      return true;
    }
    $('setupNotice').classList.add('hidden');
    return false;
  }

  async function signIn(event) {
    event.preventDefault();
    if (!db) return;
    const email = $('loginEmail').value.trim().toLowerCase();
    const password = $('loginPassword').value;
    if (email !== ownerEmail) {
      message('loginMessage', 'Use the admin email configured for Maggie’s Treat.', true);
      return;
    }
    const button = $('loginForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Signing in…';
    message('loginMessage', 'Checking your login…');
    try {
      const {data, error} = await db.auth.signInWithPassword({email, password});
      if (error) throw error;
      const signedInEmail = String(data.user?.email || '').toLowerCase();
      if (signedInEmail !== ownerEmail) {
        await db.auth.signOut();
        throw new Error('This account is not the configured store admin.');
      }
      message('loginMessage', 'Signed in successfully.');
      await openDashboard();
    } catch (error) {
      console.error('Admin login failed:', error);
      message('loginMessage', error.message || 'Could not sign in. Check your email and password.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in to dashboard →';
    }
  }

  async function openDashboard() {
    showPanel('dashboard');
    await loadDashboard();
  }

  async function signOut() {
    if (db) await db.auth.signOut();
    showPanel('login');
    $('loginForm').reset();
    message('loginMessage', 'You have been logged out.');
  }

  async function loadDashboard() {
    if (!db) return;
    $('ordersList').innerHTML = '<div class="loading-card">Loading orders…</div>';
    $('reviewsList').innerHTML = '<div class="loading-card">Loading reviews…</div>';
    message('dashboardMessage', 'Updating your figures…');
    try {
      const [statsResult, ordersResult, reviewsResult] = await Promise.all([
        db.rpc('admin_dashboard_stats'),
        db.from('orders').select('id,customer_name,phone,note,item_details,total,status,created_at,completed_at').order('created_at', {ascending:false}).limit(200),
        db.from('reviews').select('id,customer_name,rating,comment,created_at').order('created_at', {ascending:false}).limit(100)
      ]);
      if (statsResult.error) throw statsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      const stats = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
      if (!stats) throw new Error('No dashboard statistics were returned. Check the admin database setup.');
      orders = ordersResult.data || [];
      reviews = reviewsResult.data || [];
      renderStats(stats);
      renderOrders();
      renderReviews();
      $('lastUpdated').textContent = `Last updated ${localDateTime(new Date().toISOString())} · South African time`;
      message('dashboardMessage', 'Dashboard updated.');
    } catch (error) {
      console.error('Dashboard load failed:', error);
      message('dashboardMessage', `Could not load dashboard data. ${error.message || 'Please check your Supabase setup and admin email.'}`, true);
      $('ordersList').innerHTML = '<div class="empty-state">Orders are not available. Check the SQL setup and admin access policy.</div>';
      $('reviewsList').innerHTML = '<div class="empty-state">Reviews are not available yet, or the database setup needs attention.</div>';
    }
  }

  function renderStats(stats) {
    $('revenueToday').textContent = money(stats.revenue_today);
    $('revenueWeek').textContent = money(stats.revenue_week);
    $('revenueMonth').textContent = money(stats.revenue_month);
    $('ordersToday').textContent = Number(stats.orders_today || 0).toLocaleString('en-ZA');
    const count = Number(stats.review_count || 0);
    const average = stats.average_rating === null || stats.average_rating === undefined ? null : Number(stats.average_rating);
    $('averageRating').textContent = average === null || !count ? '—' : `${average.toFixed(2)} ★`;
    $('reviewCount').textContent = `${count} ${count === 1 ? 'review' : 'reviews'}`;
  }

  function statusClass(status) {
    return ({preparing:'status-preparing',ready:'status-ready',completed:'status-completed',cancelled:'status-cancelled'})[status] || '';
  }

  function renderOrders() {
    const container = $('ordersList');
    const filter = $('orderStatusFilter').value;
    const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">${filter === 'all' ? 'No orders have been placed yet. New customer orders will appear here.' : `There are no ${escapeHtml(filter)} orders in the latest order list.`}</div>`;
      return;
    }
    container.innerHTML = filtered.map((order) => {
      const details = Array.isArray(order.item_details) ? order.item_details : [];
      const itemLines = details.map((item) => `<li><span>${Number(item.quantity || 0)} × ${escapeHtml(item.name || 'Menu item')}</span><span>${money(item.line_total ?? (Number(item.price || 0) * Number(item.quantity || 0)))}</span></li>`).join('');
      const phoneLink = String(order.phone || '').replace(/[^\d+]/g, '');
      const statusOptions = statuses.map((status) => `<option value="${status.value}"${order.status === status.value ? ' selected' : ''}>${status.label}</option>`).join('');
      return `<article class="order-card" data-order-card="${escapeHtml(order.id)}">
        <div class="order-card-head"><div><h3>${escapeHtml(order.customer_name)}</h3><div class="order-meta">Order received: ${escapeHtml(localDateTime(order.created_at))}<br>Order #${escapeHtml(String(order.id).slice(0,8).toUpperCase())}</div><span class="order-status ${statusClass(order.status)}">${escapeHtml(statuses.find((item) => item.value === order.status)?.label || order.status)}</span></div><strong class="order-total">${money(order.total)}</strong></div>
        <ul class="order-items">${itemLines || '<li><span>Order items unavailable</span></li>'}</ul>
        ${order.note ? `<div class="order-note"><strong>Customer note:</strong> ${escapeHtml(order.note)}</div>` : ''}
        <div class="order-card-footer"><a class="order-phone" href="tel:${escapeHtml(phoneLink)}">☎ ${escapeHtml(order.phone)}</a><select data-status-order="${escapeHtml(order.id)}" aria-label="Update order status for ${escapeHtml(order.customer_name)}">${statusOptions}</select></div>
        ${order.completed_at ? `<div class="completed-date">Completed / paid: ${escapeHtml(localDateTime(order.completed_at))}</div>` : ''}
      </article>`;
    }).join('');
  }

  function renderReviews() {
    const container = $('reviewsList');
    if (!reviews.length) {
      container.innerHTML = '<div class="empty-state">No reviews yet. Customer ratings will appear here when they submit feedback.</div>';
      return;
    }
    container.innerHTML = reviews.map((review) => {
      const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));
      return `<article class="admin-review-card"><div class="admin-review-head"><strong>${escapeHtml(review.customer_name)}</strong><span class="admin-review-stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span></div><p>${review.comment ? escapeHtml(review.comment) : '<em>No written comment provided.</em>'}</p><time>${escapeHtml(localDateTime(review.created_at))}</time></article>`;
    }).join('');
  }

  async function updateStatus(event) {
    const selector = event.target.closest('[data-status-order]');
    if (!selector || !db) return;
    const id = selector.dataset.statusOrder;
    const nextStatus = selector.value;
    const previous = orders.find((order) => order.id === id)?.status;
    selector.disabled = true;
    message('dashboardMessage', 'Saving order status…');
    try {
      const {error} = await db.from('orders').update({status:nextStatus}).eq('id', id);
      if (error) throw error;
      await loadDashboard();
      message('dashboardMessage', nextStatus === 'completed' ? 'Order marked completed / paid. Revenue has been updated.' : 'Order status updated.');
    } catch (error) {
      console.error('Order status update failed:', error);
      selector.value = previous || 'new';
      message('dashboardMessage', `Could not update the order. ${error.message || ''}`, true);
    } finally {
      selector.disabled = false;
    }
  }

  if (!setSetupNotice()) {
    $('loginEmail').value = config.adminEmail || '';
    $('loginForm').addEventListener('submit', signIn);
    $('logoutBtn').addEventListener('click', signOut);
    $('refreshBtn').addEventListener('click', loadDashboard);
    $('orderStatusFilter').addEventListener('change', renderOrders);
    $('ordersList').addEventListener('change', updateStatus);
    db.auth.getSession().then(async ({data, error}) => {
      if (error) return;
      const user = data.session?.user;
      if (user && String(user.email || '').toLowerCase() === ownerEmail) {
        await openDashboard();
      } else {
        showPanel('login');
      }
    });
  }
})();
