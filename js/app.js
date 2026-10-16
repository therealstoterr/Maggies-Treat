(() => {
  'use strict';
  const businessPhone = '27818962131'; // No + for wa.me
  const STORAGE_KEY = 'maggie_orders_v2';

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
  const escapeHtml = (value) => String(value?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const menuById = () => new Map(menu.map((item) => [item.id, item]));
  const cartQuantity = () => Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartTotal = () => Object.entries(cart).reduce((sum, [id, q]) => sum + (Number(menuById().get(id)?.price) || 0) * q, 0);

  function displayPrice(item) { return item.price_label? item.price_label : money(item.price); }
  function setMessage(element, message, isError = false) { if (!element) return; element.textContent = message; element.classList.toggle('error', Boolean(isError)); }
  function renderFilters() { const c=$('menuFilters'); if(!c) return; const cats=['All',...new Set(menu.map(i=>i.category))]; c.innerHTML=cats.map(cat=>`<button type="button" class="filter-pill${cat===activeCategory?' active':''}" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join(''); }
  function renderMenu() { const c=$('menuGrid'); if(!c) return; const vis=activeCategory==='All'?menu:menu.filter(i=>i.category===activeCategory); c.innerHTML=vis.map(item=>`<article class="menu-card"><div class="menu-card-top"><div class="food-icon">${escapeHtml(item.emoji||'🍴')}</div><span class="menu-price">${escapeHtml(displayPrice(item))}<small>per item</small></span></div><span class="food-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="menu-card-bottom"><span style="font-size:12px;color:#8a7f72">${cart[item.id]?cart[item.id]+' in basket':'Made for cravings'}</span><button type="button" class="add-button" data-add="${escapeHtml(item.id)}">${cart[item.id]?'＋ Add another':'＋ Add'}</button></div></article>`).join(''); }
  function renderCart() { const c=$('cartItems'); if(!c) return; const items=Object.entries(cart).filter(([id,qty])=>qty>0&&menuById().has(id)); if(!items.length) c.innerHTML='<div class="empty-cart">Your basket is empty. Add a favourite first.</div>'; else c.innerHTML=items.map(([id,qty])=>{const item=menuById().get(id); return `<div class="cart-row"><div><div style="font-weight:700">${escapeHtml(item.name)}</div><div style="font-size:12px;color:#8a7f72">${money(item.price)} × ${qty} = ${money(item.price*qty)}</div></div><div class="cart-controls"><button type="button" data-cart-change="-1" data-id="${escapeHtml(id)}">−</button><span>${qty}</span><button type="button" data-cart-change="1" data-id="${escapeHtml(id)}">+</button></div></div>`}).join(''); $('basketCount').textContent=`${cartQuantity()} ${cartQuantity()===1?'item':'items'}`; $('cartTotal').textContent=money(cartTotal()); renderMenu(); }
  function addItem(id, change=1) { if(!menuById().has(id)) return; const next=(cart[id]||0)+change; if(next<=0) delete cart[id]; else if(next>20){ setMessage($('orderMessage'),'Max 20 per item',true); return; } else cart[id]=next; setMessage($('orderMessage'),''); renderCart(); }
  function orderMessage(name, phone, note) { const lines=Object.entries(cart).map(([id,qty])=>`${qty} x ${menuById().get(id).name} — ${money(menuById().get(id).price*qty)}`); return `Hi Maggie's Treat! I'd like to order.\n\nName: ${name}\nPhone: ${phone}\n\nOrder:\n${lines.join('\n')}\n\nTotal: ${money(cartTotal())}${note?`\nNote: ${note}`:''}\n\nPickup: 9440 Ext 2, Adonis Street, Soshanguve.`; }

  // SHARED SAVE FUNCTION
  function saveOrderLocally(name, phone, note){
    let orders=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    const orderId=Date.now().toString();
    orders.push({id:orderId,created_at:new Date().toISOString(),customer_name:name,phone:phone,total:cartTotal(),items:Object.entries(cart).map(([id,qty])=>`${qty}x ${menuById().get(id).name}`).join(', '),item_details:Object.entries(cart).map(([id,qty])=>({name:menuById().get(id).name,quantity:qty,price:menuById().get(id).price})),status:'new',order_note:note});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return orderId;
  }
  function getCustomerDetails(){
    const name=$('customerName').value.trim(); const phone=$('customerPhone').value.trim(); const note=$('orderNote').value.trim();
    if(!cartQuantity()){ setMessage($('orderMessage'),'Add at least one item',true); return null; }
    if(name.length<2){ setMessage($('orderMessage'),'Enter your name',true); return null; }
    if(!/^[0-9+()\s-]{7,25}$/.test(phone)||phone.replace(/\D/g,'').length<7){ setMessage($('orderMessage'),'Enter valid phone',true); return null; }
    return {name,phone,note};
  }
  // BUTTON 1: WHATSAPP
  function orderWhatsApp(){
    const d=getCustomerDetails(); if(!d) return;
    saveOrderLocally(d.name,d.phone,d.note);
    const waText=orderMessage(d.name,d.phone,d.note);
    const whatsappUrl=`https://wa.me/${businessPhone}?text=${encodeURIComponent(waText)}`;
    setMessage($('orderMessage'),'✅ Saved! Opening WhatsApp...');
    window.open(whatsappUrl,'_blank','noopener,noreferrer');
    setTimeout(()=>{ cart={}; $('orderForm').reset(); renderCart(); setMessage($('orderMessage'),'Thank you! Sent to WhatsApp 🧁'); },1000);
  }
  // BUTTON 2: ONLINE ONLY
  function orderOnline(){
    const d=getCustomerDetails(); if(!d) return;
    const id=saveOrderLocally(d.name,d.phone,d.note);
    setMessage($('orderMessage'),`✅ Online order #${id.slice(-5)} saved! Total ${money(cartTotal())}. We will call ${d.phone} for collection.`);
    cart={}; $('orderForm').reset(); renderCart();
  }

  document.addEventListener('click',(e)=>{
    const a=e.target.closest('[data-add]'); if(a){ addItem(a.dataset.add,1); return; }
    const c=e.target.closest('[data-cart-change]'); if(c){ addItem(c.dataset.id,Number(c.dataset.cartChange)); return; }
    const f=e.target.closest('[data-filter]'); if(f){ activeCategory=f.dataset.filter; renderFilters(); renderMenu(); }
  });

  // CONNECT BOTH BUTTONS
  $('whatsappOrderBtn')?.addEventListener('click', orderWhatsApp);
  $('onlineOrderBtn')?.addEventListener('click', orderOnline);
  $('submitOrderBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); orderWhatsApp(); }); // fallback old button
  $('orderForm')?.addEventListener('submit',(e)=>e.preventDefault());

  $('reviewForm')?.addEventListener('submit',(e)=>{
    e.preventDefault(); const name=$('reviewName').value.trim(); const r=document.querySelector('input[name="rating"]:checked');
    if(!r){ setMessage($('reviewMessage'),'Select rating',true); return; }
    if(name.length<2){ setMessage($('reviewMessage'),'Enter name',true); return; }
    let rev=JSON.parse(localStorage.getItem('maggie_reviews')||'[]'); rev.push({name,rating:r.value,comment:$('reviewComment').value,date:new Date().toISOString()}); localStorage.setItem('maggie_reviews',JSON.stringify(rev));
    $('reviewForm').reset(); setMessage($('reviewMessage'),`Thank you ${name}! ⭐${r.value} review saved`);
  });

  if($('currentYear')) $('currentYear').textContent=new Date().getFullYear();
  if($('menuConnection')) $('menuConnection').textContent='Pickup • WhatsApp + Online Orders • Collection';
  renderFilters(); renderMenu(); renderCart();
})();
