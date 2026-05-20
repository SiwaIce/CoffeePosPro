/* ============================================
   COFFEE POS — KITCHEN DISPLAY (KDS)
   แสดงออเดอร์สำหรับครัว แยกจอ
   Version: 3.0 (Fixed + Mobile Support)
   ============================================ */

var KitchenDisplay = {
  channel: null,
  orders: [],
  completedOrders: [],
  isOpen: false,
  
  /* Initialize BroadcastChannel */
  init: function() {
    /* Check if Pro feature enabled */
    if (typeof FeatureManager !== 'undefined' && !FeatureManager.isEnabled('pro_kds')) {
      console.log('[KDS] Pro feature disabled');
      return;
    }
    
    /* Create broadcast channel for cross-tab communication */
    this.channel = new BroadcastChannel('kitchen_display');
    
    /* Listen for messages */
    var self = this;
    this.channel.onmessage = function(event) {
      self.handleMessage(event.data);
    };
    
    /* Load existing orders */
    this.loadOrders();
    
    /* Start checking for new orders from storage */
    this.startWatcher();
    
    console.log('[KDS] Initialized');
  },
  
  /* Handle incoming messages */
  handleMessage: function(data) {
    switch (data.type) {
      case 'new_order':
        this.addOrder(data.order);
        break;
      case 'new_hold_order':
        this.addHoldOrder(data.order);
        break;
      case 'order_completed':
        this.completeOrder(data.orderId);
        break;
      case 'order_cancelled':
        this.cancelOrder(data.orderId);
        break;
      case 'hold_order_completed':
        this.completeHoldOrderInKitchen(data.holdId);
        break;
      case 'ping':
        if (this.channel) this.channel.postMessage({ type: 'pong' });
        break;
    }
  },
  
  /* Load orders from storage */
  loadOrders: function() {
    var saved = ST.getObj('kitchen_orders', []);
    this.orders = saved.filter(function(o) { return o.status !== 'completed'; });
    this.completedOrders = saved.filter(function(o) { return o.status === 'completed'; });
  },
  
  /* Save orders to storage */
  saveOrders: function() {
    var all = this.orders.concat(this.completedOrders);
    ST.setObj('kitchen_orders', all.slice(-200));
  },
  
  /* Add new order */
  addOrder: function(order) {
    var exists = false;
    for (var i = 0; i < this.orders.length; i++) {
      if (this.orders[i].id === order.id) {
        exists = true;
        break;
      }
    }
    
    if (!exists) {
      this.orders.unshift({
        id: order.id,
        number: order.number,
        items: order.items,
        note: order.note,
        timestamp: Date.now(),
        status: 'pending',
        orderTime: order.time,
        channelName: order.channelName,
        isHold: false
      });
      this.saveOrders();
      
      if (this.isOpen && typeof playSound === 'function') {
        playSound('add');
      }
      
      if (this.isOpen && typeof renderKitchenView === 'function') {
        renderKitchenView();
      }
    }
  },
  
  /* Add Hold Order */
  addHoldOrder: function(order) {
    var exists = false;
    for (var i = 0; i < this.orders.length; i++) {
      if (this.orders[i].id === order.id || this.orders[i].holdId === order.holdId) {
        exists = true;
        break;
      }
    }
    
    if (!exists) {
      this.orders.unshift({
        id: order.id || order.holdId,
        holdId: order.holdId,
        number: order.number,
        items: order.items,
        note: order.note,
        timestamp: Date.now(),
        status: 'pending',
        orderTime: order.time,
        channelName: order.channelName,
        isHold: true
      });
      this.saveOrders();
      
      if (this.isOpen && typeof playSound === 'function') {
        playSound('add');
      }
      
      if (this.isOpen && typeof renderKitchenView === 'function') {
        renderKitchenView();
      }
    }
  },
  
  /* Mark order as completed */
  completeOrder: function(orderId) {
    for (var i = 0; i < this.orders.length; i++) {
      if (this.orders[i].id === orderId) {
        var completed = this.orders.splice(i, 1)[0];
        completed.status = 'completed';
        completed.completedAt = Date.now();
        this.completedOrders.unshift(completed);
        this.saveOrders();
        
        if (completed.isHold && completed.holdId) {
          this.updateHoldOrderStatus(completed.holdId, 'completed');
        }
        
        if (this.isOpen && typeof renderKitchenView === 'function') {
          renderKitchenView();
        }
        break;
      }
    }
  },
  
  /* Complete hold order in kitchen */
  completeHoldOrderInKitchen: function(holdId) {
    for (var i = 0; i < this.orders.length; i++) {
      if (this.orders[i].holdId === holdId || this.orders[i].id === holdId) {
        var completed = this.orders.splice(i, 1)[0];
        completed.status = 'completed';
        completed.completedAt = Date.now();
        this.completedOrders.unshift(completed);
        this.saveOrders();
        
        this.updateHoldOrderStatus(holdId, 'completed');
        
        if (this.isOpen && typeof renderKitchenView === 'function') {
          renderKitchenView();
        }
        break;
      }
    }
  },
  
  /* Update hold order status */
  updateHoldOrderStatus: function(holdId, status) {
    var holdOrders = ST.getHoldOrders();
    for (var i = 0; i < holdOrders.length; i++) {
      if (holdOrders[i].id === holdId) {
        holdOrders[i].kitchenStatus = status;
        break;
      }
    }
    ST.saveHoldOrders(holdOrders);
  },
  
  /* Cancel order */
  cancelOrder: function(orderId) {
    for (var i = 0; i < this.orders.length; i++) {
      if (this.orders[i].id === orderId) {
        this.orders.splice(i, 1);
        this.saveOrders();
        
        if (this.isOpen && typeof renderKitchenView === 'function') {
          renderKitchenView();
        }
        break;
      }
    }
  },
  
  /* Send order from POS to kitchen */
  sendOrderToKitchen: function(order) {
    if (!this.channel) return;
    
    this.channel.postMessage({
      type: 'new_order',
      order: {
        id: order.id,
        number: order.number,
        items: order.items,
        note: order.note,
        time: order.time,
        channelName: order.channelName,
        isHold: false
      }
    });
    
    this.addOrder(order);
  },
  
  /* Send hold order to kitchen */
  sendHoldOrderToKitchen: function(holdOrder) {
    if (!this.channel) return;
    
    this.channel.postMessage({
      type: 'new_hold_order',
      order: {
        id: holdOrder.id,
        holdId: holdOrder.id,
        number: holdOrder.number || this.formatOrderNumber(holdOrder),
        items: holdOrder.items,
        note: holdOrder.note,
        time: holdOrder.time,
        channelName: holdOrder.channelName,
        isHold: true
      }
    });
    
    this.addHoldOrder({
      id: holdOrder.id,
      holdId: holdOrder.id,
      number: holdOrder.number || this.formatOrderNumber(holdOrder),
      items: holdOrder.items,
      note: holdOrder.note,
      time: holdOrder.time,
      channelName: holdOrder.channelName,
      isHold: true
    });
  },
  
  /* Start storage watcher */
  startWatcher: function() {
    var lastCheck = 0;
    var self = this;
    
    setInterval(function() {
      var saved = ST.getObj('kitchen_orders', []);
      var newOrders = saved.filter(function(o) { 
        return o.timestamp > lastCheck && o.status !== 'completed';
      });
      
      for (var i = 0; i < newOrders.length; i++) {
        if (!self.orders.find(function(o) { return o.id === newOrders[i].id; })) {
          self.orders.unshift(newOrders[i]);
        }
      }
      
      if (newOrders.length > 0 && self.isOpen && typeof renderKitchenView === 'function') {
        renderKitchenView();
      }
      
      lastCheck = Date.now();
    }, 3000);
  },
  
  /* Open kitchen display in new tab */
  openKitchenDisplay: function() {
    var kitchenUrl = window.location.href.split('#')[0] + '?mode=kitchen';
    window.open(kitchenUrl, '_blank', 'width=1024,height=768');
  },
  
  /* Check if current page is kitchen mode */
  isKitchenMode: function() {
    return window.location.search.indexOf('mode=kitchen') !== -1;
  },
  
  /* Format order number from timestamp */
  formatOrderNumber: function(order) {
    if (order.number) return order.number;
    var d = new Date(order.createdAt || Date.now());
    return this.padZero(d.getHours()) + this.padZero(d.getMinutes()) + this.padZero(d.getSeconds());
  },
  
  /* Pad zero helper */
  padZero: function(n) {
    return n < 10 ? '0' + n : '' + n;
  }
};

/* ============================================
   GO BACK TO POS
   ============================================ */
function goToPOS() {
  if (typeof nav === 'function') {
    nav('pos');
  } else {
    window.location.href = 'index.html';
  }
}

/* ============================================
   RENDER KITCHEN VIEW
   ============================================ */
function renderKitchenView() {
  if (!KitchenDisplay.isOpen) {
    KitchenDisplay.isOpen = true;
  }
  
  var main = $('mainContent');
  if (!main) return;
  
  var html = '';
  html += '<div class="kitchen-page">';
  
  /* Header */
  html += '<div class="kitchen-header">';
  html += '<div class="kitchen-title">🍳 Kitchen Display</div>';
  html += '<div class="kitchen-stats">';
  html += '<span class="badge badge-warning">📋 รอทำ: ' + KitchenDisplay.orders.length + '</span>';
  html += '<span class="badge badge-success">✅ เสร็จแล้ว: ' + KitchenDisplay.completedOrders.length + '</span>';
  html += '<button class="btn btn-sm btn-secondary" onclick="KitchenDisplay.openKitchenDisplay()" title="เปิดจอใหม่">🖥️ จอใหม่</button>';
  html += '<button class="btn btn-sm btn-primary" onclick="goToPOS()" title="กลับไปหน้าร้าน" style="background:linear-gradient(135deg,var(--accent),var(--accent2));">🛒 กลับไป POS</button>';
  html += '</div>';
  html += '</div>';
  
  /* Pending Orders */
  html += '<div class="kitchen-section">';
  html += '<div class="kitchen-section-title">📋 ออเดอร์รอทำ</div>';
  html += '<div class="kitchen-grid">';
  
  if (KitchenDisplay.orders.length === 0) {
    html += '<div class="kitchen-empty">🎉 ไม่มีออเดอร์รอทำ</div>';
  } else {
    for (var i = 0; i < KitchenDisplay.orders.length; i++) {
      html += renderKitchenOrderCard(KitchenDisplay.orders[i]);
    }
  }
  
  html += '</div>';
  html += '</div>';
  
  /* Completed Orders */
  if (KitchenDisplay.completedOrders.length > 0) {
    html += '<div class="kitchen-section">';
    html += '<div class="kitchen-section-title">✅ เสร็จแล้ว (ล่าสุด 10 รายการ)</div>';
    html += '<div class="kitchen-completed-list">';
    
    var recent = KitchenDisplay.completedOrders.slice(0, 10);
    for (var c = 0; c < recent.length; c++) {
      html += renderKitchenCompletedItem(recent[c]);
    }
    
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  main.innerHTML = html;
  
  setTimeout(function() {
    var container = $('mainContent');
    if (container) container.scrollTop = 0;
  }, 100);
}

function renderKitchenOrderCard(order) {
  var cfg = ST.getConfig();
  var items = order.items || [];
  var orderNumber = (cfg.orderPrefix || '#') + (order.number || '');
  var timeAgo = getTimeAgo(order.timestamp);
  
  var holdBadge = order.isHold ? '<span class="badge badge-warning" style="margin-left:8px;">💸 รอชำระ</span>' : '';
  
  var html = '<div class="kitchen-card pending" data-order-id="' + order.id + '">';
  html += '<div class="kitchen-card-header">';
  html += '<div class="kitchen-order-num">' + orderNumber + holdBadge + '</div>';
  html += '<div class="kitchen-order-time">' + timeAgo + '</div>';
  html += '</div>';
  
  if (order.channelName && order.channelName !== 'Walk-in') {
    html += '<div class="kitchen-channel"><span class="badge badge-info">' + sanitize(order.channelName) + '</span></div>';
  }
  
  html += '<div class="kitchen-items">';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    html += '<div class="kitchen-item">';
    html += '<span class="kitchen-item-qty">x' + it.qty + '</span>';
    html += '<span class="kitchen-item-name">' + sanitize(it.name);
    if (it.size) html += ' (' + it.size + ')';
    html += '</span>';
    html += '</div>';
    
    if (it.drinkTypeName) {
      html += '<div class="kitchen-modifier">🔥 ' + sanitize(it.drinkTypeName) + '</div>';
    }
    if (it.sweetName) {
      html += '<div class="kitchen-modifier">🍯 ' + sanitize(it.sweetName) + '</div>';
    }
    if (it.toppingNames && it.toppingNames.length > 0) {
      html += '<div class="kitchen-modifier">🧁 +' + it.toppingNames.join(', ') + '</div>';
    }
    if (it.note) {
      html += '<div class="kitchen-modifier note">📝 ' + sanitize(it.note) + '</div>';
    }
  }
  html += '</div>';
  
  if (order.note) {
    html += '<div class="kitchen-order-note">📌 ' + sanitize(order.note) + '</div>';
  }
  
  html += '<div class="kitchen-actions">';
  html += '<button class="btn btn-success btn-sm" onclick="KitchenDisplay.completeOrder(\'' + order.id + '\')">✅ ทำเสร็จ</button>';
  html += '</div>';
  
  html += '</div>';
  return html;
}

function renderKitchenCompletedItem(order) {
  var cfg = ST.getConfig();
  var orderNumber = (cfg.orderPrefix || '#') + (order.number || '');
  var itemsCount = order.items ? order.items.length : 0;
  var timeAgo = order.completedAt ? getTimeAgo(order.completedAt) : '';
  
  return '<div class="kitchen-completed-item">' +
    '<span class="kitchen-completed-num">' + orderNumber + '</span>' +
    '<span class="kitchen-completed-items">' + itemsCount + ' รายการ</span>' +
    '<span class="kitchen-completed-time">' + timeAgo + '</span>' +
    '</div>';
}

/* ============================================
   CSS
   ============================================ */
(function() {
  var styleId = 'kitchenViewStyle';
  if (document.getElementById(styleId)) return;
  
  var css = '';
  css += '.kitchen-page{padding:20px;background:var(--bg-primary);min-height:100vh;}';
  css += '.kitchen-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}';
  css += '.kitchen-title{font-size:28px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}';
  css += '.kitchen-stats{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}';
  css += '.kitchen-stats .btn{white-space:nowrap;}';
  css += '.kitchen-section{margin-bottom:32px;}';
  css += '.kitchen-section-title{font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--accent);display:inline-block;}';
  css += '.kitchen-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;}';
  css += '.kitchen-card{background:var(--bg-card);border:2px solid var(--border);border-radius:var(--radius);padding:16px;transition:all var(--transition);}';
  css += '.kitchen-card.pending{border-left:5px solid var(--warning);}';
  css += '.kitchen-card:hover{box-shadow:var(--shadow);transform:translateY(-2px);}';
  css += '.kitchen-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}';
  css += '.kitchen-order-num{font-size:20px;font-weight:800;color:var(--accent);}';
  css += '.kitchen-order-time{font-size:12px;color:var(--text-muted);}';
  css += '.kitchen-channel{margin-bottom:8px;}';
  css += '.kitchen-items{margin:12px 0;border-top:1px solid var(--border);padding-top:12px;}';
  css += '.kitchen-item{display:flex;gap:8px;padding:4px 0;font-size:14px;}';
  css += '.kitchen-item-qty{font-weight:800;color:var(--accent);min-width:40px;}';
  css += '.kitchen-item-name{flex:1;}';
  css += '.kitchen-modifier{font-size:12px;color:var(--text-muted);padding-left:48px;margin:2px 0;}';
  css += '.kitchen-modifier.note{color:var(--warning);}';
  css += '.kitchen-order-note{margin:12px 0;padding:8px;background:rgba(234,179,8,0.1);border-radius:var(--radius-sm);font-size:13px;}';
  css += '.kitchen-actions{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}';
  css += '.kitchen-empty{text-align:center;padding:48px;color:var(--text-muted);font-size:18px;}';
  css += '.kitchen-completed-list{display:flex;flex-direction:column;gap:8px;}';
  css += '.kitchen-completed-item{display:flex;gap:16px;padding:10px 16px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border);}';
  css += '.kitchen-completed-num{font-weight:700;color:var(--success);min-width:80px;}';
  css += '.kitchen-completed-items{flex:1;color:var(--text-muted);}';
  css += '.kitchen-completed-time{font-size:12px;color:var(--text-muted);}';
  
  /* Mobile responsive */
  css += '@media(max-width:768px){';
  css += '.kitchen-header{flex-direction:column;align-items:stretch;}';
  css += '.kitchen-stats{flex-wrap:wrap;justify-content:center;}';
  css += '.kitchen-stats .btn{flex:1;text-align:center;}';
  css += '.kitchen-title{text-align:center;margin-bottom:10px;font-size:22px;}';
  css += '.kitchen-grid{grid-template-columns:1fr;}';
  css += '}';
  
  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* Check if kitchen mode */
if (KitchenDisplay.isKitchenMode()) {
  document.addEventListener('DOMContentLoaded', function() {
    KitchenDisplay.init();
    renderKitchenView();
    document.title = '🍳 Kitchen Display - Coffee POS';
  });
}

console.log('[views-kitchen.js] loaded');