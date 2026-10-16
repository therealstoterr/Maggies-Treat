(() => {
  'use strict';

  const config = window.MT_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl && config.supabasePublishableKey &&
    config.supabaseUrl.startsWith('https://') &&
   !config.supabaseUrl.includes('PASTE_') &&
   !config.supabasePublishableKey.includes('PASTE_') &&
    window.supabase && typeof window.supabase.createClient === 'function'
  );
  const db = configured? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey) : null;
  const businessPhone = '27818962131';

  const fallbackMenu = [
    {id:'wrap-classic-chicken',name:'Classic Chicken Wrap',category:'Chicken Wraps',price:30,description:'A classic, satisfying chicken wrap.',emoji:'🌯',display_order:1},
    {id:'wrap-spicy-chicken',name:'Spicy Chicken Wrap',category:'Chicken Wraps',price:35,description:'Chicken with a spicy kick.',emoji:'🌶️',display_order:2},
    {id:'wrap-bbq',name:'BBQ Wrap',category:'Chicken Wraps',price:50,description:'A smoky BBQ-flavoured wrap.',emoji:'🔥',display_order:3},
    {id:'chips-wrap-classic',name:'Classic Chips Wrap',category:'Chips Wraps',price:25,description:'A simple local favourite with chips.',emoji:'🍟',display_order:4},
    {id:'chips-wrap-cheese',name:'Cheese & Chips Wrap',category:'Chips Wraps',price:30,description:'Chips with a cheesy twist.',emoji:'🧀',display_order:5},
    {id:'chips-wrap-spicy',name:'Spicy Chips Wrap',category:'Chips Wraps',price:30,description:'A little heat in every bite.',emoji:'🌶️',display_order:6},
    {id:'shawarma-beef',name:'Beef Shawarma',category:'Shawarma',price:50,description:'A tasty beef shawarma.',emoji:'🥙',display_order:7},
    {id:'shawarma-chicken',name:'Chicken Shawarma',category:'Shawarma',price:48,description:'A flavour-packed chicken shawarma.',emoji:'🥙',display_order:8},
    {id:'shawarma-veg',name:'Veg Shawarma',category:'Shawarma',price:40,description:'A delicious vegetarian option.',emoji:'🥬',display_order:9},
    {id:'ice-cream-vanilla',name:'Vanilla Cone',category:'Ice Cream',price:15,description:'A cool, creamy vanilla cone.',emoji:'🍦',display_order:10},
    {id:'ice-cream-strawberry',name:'Strawberry Cup',category:'Ice Cream',price:20,description:'Sweet strawberry ice cream in a cup.',emoji:'🍨',display_order:11},
    {id:'ice-cream-chocolate',name:'Chocolate Swirl',category:'Ice Cream',price:20,description:'A chocolatey frozen treat.',emoji:'🍫',display_order:12},
    {id:'ice-cream-oreo',name:'Ice Cream Oreo',category:'Ice Cream',price:12,description:'A sweet Oreo-inspired treat.',emoji:'🍪',display_order:13},
    {id:'ice-cream-toppings',name:'Ice Cream Toppings',category:'Ice Cream',price:15,description:'Extra toppings for your ice cream.',emoji:'🍬',display_order:14},
    {id:'ice-pop',name:'Ice Pop',category:'Frozen Treats',price:2,price_label:'From R2',description:'Assorted colourful, refreshing flavours.',emoji:'🍡',display_order:15},
    {id:'ice-cream-pop',name:'Ice Cream Pops',category:'Frozen Treats',price:5,description:'A little frozen sweetness on a stick.',emoji:'🍦',display_order:16},
    {id:'combo-chicken-ice-pop',name:'Combo 1: Chicken Wrap + Ice Pop',category:'Combos',price:35,description:'A chicken wrap and an ice pop together.',emoji:'🎁',display_order:17},
    {id:'combo-chips-ice-pops',name:'Combo 2: Chips Wrap + Ice Cream Pops',category:'Combos',price:30,description:'A chips wrap paired with ice cream pops.',emoji:'🎁',display_order:18},
    {id:'combo-shawarma-ice-cream',name:'Combo 3: Shawarma + Ice Cream',category:'Combos',price:65,description:'A shawarma and an ice cream treat.',emoji:'🎁',display_order:19}
  ];

  let menu = [...fallbackMenu];
  let cart = {};
  let activeCategory = 'All';

  const $ = (id) => document.getElementById(id);
  const money = (amount) => new Intl.NumberFormat('en-ZA', {style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(amount || 0));
  const escapeHtml = (value) => String(value?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const menuById = () => new Map(menu.map((item) => [item.id, item]));
  const cartQuantity = () => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = () => Object.entries(cart).reduce((sum, [id, quantity]) => sum + (Number(menuById().get(id)?.price) || 0) * quantity, 0);

  function displayPrice(item) {
    if (item.price_label) return item.price_label;
    return money(item.price);
  }

  function setMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('error', Boolean(isError));
  }

  function renderFilters() {
    const container = $('menuFilters');
    if (!container) return;
    const categories = ['All',...new Set(menu.map((item) => item.category))];
    container.innerHTML = categories.map((category) => `<button type="button" class="filter-pill${category === activeCategory? ' active' : ''}" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  }

  function renderMenu() {
    const container = $('menuGrid');
    if (!container) return;
    const visibleItems = activeCategory === 'All'? menu : menu.filter((item) => item.category === activeCategory);
    if (!visibleItems.length) {
      container.innerHTML = '<div class="empty-state">No items in this category just yet.</div>';
      return;
    }
    container.innerHTML = visibleItems.map((item) => `
      <article class="menu-card">
        <div class="menu-card-top"><div class="food-icon" aria-hidden="true">${escapeHtml(item.emoji || '🍴')}</div><span class="menu-price">${escapeHtml(displayPrice(item))}<small>per item</small></span></div>
        <span class="food-category">${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || 'A tasty Maggie’s Treat favourite.')}</p>
        <div class="menu-card-bottom"><span class="cart-row-price">${cart[item.id]? `${cart[item.id]} in your basket` : 'Made for your cravings'}</span><button type="button" class="add-button" data-add="${escapeHtml(item.id)}">${cart[item.id]? '＋ Add another' : '＋ Add to order'}</button></div>
      </article>`).join('');
  }

  function renderCart() {
    const container = $('cartItems');
    if (!container) return;
    const items = Object.entries(cart).filter(([id, qty]) => qty > 0 && menuById().has(id));
    if (!items.length) {
      container.innerHTML = '<div class="empty-cart">Your basket is empty. Add a favourite from the menu first.</div>';
    } else {
      container.innerHTML = items.map(([id, quantity]) => {
        const item = menuById().get(id);
        return `<div class="cart-row"><div><div class="cart-row-name">${escapeHtml(item.name)}</div><div class="cart-row-price">${money(item.price)} × ${quantity} = ${money(Number(item.price) * quantity)}</div></div><div class="cart-controls"><button type="button" data-cart-change="-1" data-id="${escapeHtml(id)}" aria-label="Remove one ${escapeHtml(item.name)}">−</button><span class="cart-qty">${quantity}</span><button type="button" data-cart-change="1" data-id="${escapeHtml(id)}" aria-label="Add one ${escapeHtml(item.name)}">+</button></div></div>`;
      }).join('');
    }
    const basketCountEl = $('basketCount');
    const cartTotalEl = $('cartTotal');
    if(basketCountEl) basketCountEl.textContent = `${cartQuantity()} ${cartQuantity() === 1? 'item' : 'items'}`;
    if(cartTotalEl) cartTotalEl.textContent = money(cartTotal());
    renderMenu();
  }

  function addItem(id, change = 1) {
    if (!menuById().has(id)) return;
    const next = (cart[id] || 0) + change;
    if (next <= 0) delete cart[id];
    else if (next > 20) {
      setMessage($('orderMessage'), 'You can add up to 20 of each menu item per order.', true);
      return;
    } else cart[id] = next;
    setMessage($('orderMessage'), '');
    renderCart();
  }

  async function loadMenu() {
    const note = $('menuConnection');
    if (!db) {
      if (note) note.textContent = 'Online order storage not connected yet';
      return;
    }
    try {
      const {data, error} = await db.from('menu_items').select('id,name,category,price,price_label,description,emoji,display_order,active').eq('active', true).order('display_order', {ascending:true});
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        menu = data.map((item) => ({...item, price:Number(item.price)}));
        cart = Object.fromEntries(Object.entries(cart).filter(([id]) => menuById().has(id)));
        renderFilters();
        renderMenu();
        renderCart();
        if (note) note.textContent = 'Live menu connected';
      }
    } catch (error) {
      console.error('Menu could not be loaded from Supabase:', error);
      if (note) note.textContent = 'Showing menu prices saved in the website';
    }
  }

  function orderMessage(name, phone, note) {
    const lines = Object.entries(cart).map(([id, qty]) => {
      const item = menuById().get(id);
      return `${qty} x ${item.name} — ${money(item.price * qty)}`;
    });
    return `Hi Maggie's Treat! I'd like to place a pickup order.\n\nName: ${name}\nPhone: ${phone}\n\nOrder:\n${lines.join('\n')}\n\nEstimated total: ${money(cartTotal())}${note? `\nNote: ${note}` : ''}\n\nPickup: 9440 Ext 2, Adonis Street, Soshanguve.`;
  }

  async function submitOrder(event) {
    event.preventDefault();
    const message = $('orderMessage');
    const button = $('submitOrderBtn');
    if (!cartQuantity()) {
      setMessage(message, 'Please add at least one food item to your basket.', true);
      return;
    }
    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim();
    const note = $('orderNote').value.trim();
    if (name.length < 2) {
      setMessage(message, 'Please enter your name.', true);
      $('customerName').focus();
      return;
    }
    if (!/^[0-9+()\s-]{7,25}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
      setMessage(message, 'Please enter a valid phone number so we can contact you.', true);
      $('customerPhone').focus();
      return;
    }

    const waText = orderMessage(name, phone, note);
    const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(waText)}`;

    if (!db) {
      setMessage(message, 'Opening WhatsApp so you can send the order directly.', false);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending your order…';
    setMessage(message, 'Sending your order securely…');

    try {
      const payload = {
        customer_name: name,
        customer_phone: phone,
        items: Object.entries(cart).map(([id, quantity]) => {
          const it = menuById().get(id);
          return { id, name: it.name, quantity, price: it.price, line_total: it.price * quantity };
        }),
        total: cartTotal(),
        order_note: note || null,
        status: 'new'
      };
      const {error} = await db.from('orders').insert(payload);
      if (error) throw error;
      setMessage(message, 'Order received! Thank you. Opening WhatsApp to confirm pickup.');
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      cart = {};
      $('orderForm').reset();
      renderCart();
    } catch (error) {
      console.error('Order submission failed, still opening WhatsApp:', error);
      setMessage(message, 'We could not save online but your WhatsApp order is ready. Please send it.', false);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } finally {
      button.disabled = false;
      button.innerHTML = 'Place my order <span aria-hidden="true">→</span>';
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    const message = $('reviewMessage');
    const button = $('submitReviewBtn');
    const name = $('reviewName').value.trim();
    const ratingElement = document.querySelector('input[name="rating"]:checked');
    const comment = $('reviewComment').value.trim();
    if (!ratingElement) {
      setMessage(message, 'Please select a star rating.', true);
      return;
    }
    if (name.length < 2) {
      setMessage(message, 'Please enter your name.', true);
      return;
    }
    if (!db) {
      setMessage(message, 'The review form will work after the website database is connected. Thank you for your patience.', true);
      return;
    }
    button.disabled = true;
    button.textContent = 'Sending review…';
    try {
      const {error} = await db.from('reviews').insert({customer_name:name, rating:Number(ratingElement.value), comment:comment || null});
      if (error) throw error;
      $('reviewForm').reset();
      setMessage(message, 'Thank you for your review! We appreciate your support.');
    } catch (error) {
      console.error('Review submission failed:', error);
      setMessage(message, 'Your review could not be saved just now. Please try again later.', true);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Send review <span aria-hidden="true">→</span>';
    }
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      addItem(addButton.dataset.add, 1);
      return;
    }
    const cartButton = event.target.closest('[data-cart-change]');
    if (cartButton) {
      addItem(cartButton.dataset.id, Number(cartButton.dataset.cartChange));
      return;
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      activeCategory = filterButton.dataset.filter;
      renderFilters();
      renderMenu();
    }
  });

  $('orderForm')?.addEventListener('submit', submitOrder);
  $('reviewForm')?.addEventListener('submit', submitReview);
  const yearEl = $('currentYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  renderFilters();
  renderMenu();
  renderCart();
  loadMenu();
})();
