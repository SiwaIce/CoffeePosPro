/* ============================================
   COFFEE POS — AUTO-REFRESH.JS
   Real-time Dashboard Auto Refresh
   Version: 1.0
   ============================================ */

var AutoRefresh = {
  interval: null,
  currentIntervalSeconds: 30,
  isEnabled: false,
  
  /* Initialize */
  init: function() {
    /* Check if Pro feature enabled */
    if (typeof FeatureManager !== 'undefined' && !FeatureManager.isEnabled('pro_realtime')) {
      console.log('[AutoRefresh] Pro feature disabled');
      return;
    }
    
    /* Load saved settings */
    var cfg = ST.getConfig();
    this.isEnabled = cfg.autoRefreshEnabled === true;
    this.currentIntervalSeconds = cfg.autoRefreshInterval || 30;
    
    if (this.isEnabled) {
      this.start();
    }
  },
  
  /* Start auto refresh */
  start: function() {
    if (this.interval) clearInterval(this.interval);
    
    this.interval = setInterval(function() {
      AutoRefresh.refresh();
    }, this.currentIntervalSeconds * 1000);
    
    console.log('[AutoRefresh] Started, interval:', this.currentIntervalSeconds, 'seconds');
  },
  
  /* Stop auto refresh */
  stop: function() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[AutoRefresh] Stopped');
  },
  
  /* Refresh current view */
  refresh: function() {
    /* Only refresh if user is on report page and not in modal */
    if (APP && APP.currentView === 'report' && !_modalOpen) {
      console.log('[AutoRefresh] Refreshing dashboard...');
      renderReportView();
      
      /* Show small indicator */
      var indicator = $('autoRefreshIndicator');
      if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(function() {
          if (indicator) indicator.style.opacity = '0';
        }, 500);
      }
    }
  },
  
  /* Set interval and restart */
  setInterval: function(seconds) {
    this.currentIntervalSeconds = Math.max(10, Math.min(300, seconds));
    var cfg = ST.getConfig();
    cfg.autoRefreshInterval = this.currentIntervalSeconds;
    ST.saveConfig(cfg);
    
    if (this.isEnabled) {
      this.stop();
      this.start();
    }
    
    toast('ตั้งค่า auto-refresh ทุก ' + this.currentIntervalSeconds + ' วินาที', 'success');
  },
  
  /* Enable/disable */
  setEnabled: function(enabled) {
    this.isEnabled = enabled;
    var cfg = ST.getConfig();
    cfg.autoRefreshEnabled = enabled;
    ST.saveConfig(cfg);
    
    if (enabled) {
      this.start();
      toast('✅ เปิด auto-refresh ทุก ' + this.currentIntervalSeconds + ' วินาที', 'success');
    } else {
      this.stop();
      toast('🔴 ปิด auto-refresh แล้ว', 'info');
    }
  },
  
  /* Add indicator to UI */
  addIndicator: function() {
    var existing = $('autoRefreshIndicator');
    if (existing) return;
    
    var indicator = document.createElement('div');
    indicator.id = 'autoRefreshIndicator';
    indicator.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--accent);color:#fff;padding:8px 12px;border-radius:20px;font-size:12px;opacity:0;transition:opacity 0.3s;z-index:1000;pointer-events:none;';
    indicator.textContent = '🔄 อัปเดต';
    document.body.appendChild(indicator);
  }
};

/* Auto init */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    AutoRefresh.init();
    AutoRefresh.addIndicator();
  });
} else {
  AutoRefresh.init();
  AutoRefresh.addIndicator();
}

console.log('[auto-refresh.js] loaded');