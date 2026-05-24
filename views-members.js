/* ============================================
   COFFEE POS — VIEWS-MEMBERS.JS
   จัดการสมาชิก + ระบบแต้มสะสม
   Version: 2.0 (Fixed: Permission + Quick Points)
   ============================================ */

var MEMBER_VIEW = {
  tab: 'members',
  searchQuery: '',
  sortBy: 'points',
  sortDesc: true,
  page: 1,
  perPage: 20
};

/* ============================================
   RENDER MEMBERS PAGE
   ============================================ */
function renderMembersView() {
  var main = $('mainContent');
  if (!main) return;
  
  /* ตรวจสอบว่ามาจากหน้า Admin หรือไม่ (ดูจาก container) */
  var isFromAdmin = !!document.getElementById('membersViewContainer');
  
  var html = '<div class="page-pad anim-fadeUp">';
  
  /* เพิ่มปุ่มกลับถ้ามาจาก Admin */
  if (isFromAdmin) {
    html += '<div class="admin-back-btn mb-16">' +
      '<button class="btn btn-secondary btn-sm" onclick="switchAdmTab(\'shop\')">← กลับไปหน้า Admin</button>' +
      '</div>';
  }
  
  html += '<div class="section-header">';
  html += '<div class="section-title">👤 จัดการสมาชิก</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="modalEditMember(null)">➕ เพิ่มสมาชิก</button>';
  html += '</div>';
  html += renderMemberContent();
  html += '</div>';
  
  main.innerHTML = html;
}

function memberSubTab(key, label) {
  var active = MEMBER_VIEW.tab === key ? ' active' : '';
  return '<button class="cat-tab' + active + '" onclick="switchMemberTab(\'' + key + '\')">' + label + '</button>';
}

function switchMemberTab(tab) {
  MEMBER_VIEW.tab = tab;
  vibrate(20);
  renderMembersView();
}

function renderMemberContent() {
  switch (MEMBER_VIEW.tab) {
    case 'members': return renderMemberList();
    case 'transactions': return renderMemberTransactions();
    case 'settings': return renderMemberSettings();
    default: return '';
  }
}

/* ============================================
   MEMBER STATS
   ============================================ */
function renderMemberStats() {
  var members = ST.getMembers();
  var totalPoints = 0;
  var totalSpent = 0;
  
  for (var i = 0; i < members.length; i++) {
    totalPoints += members[i].points || 0;
    totalSpent += members[i].totalSpent || 0;
  }
  
  var html = '<div class="kpi-grid mb-16">';
  html += kpiCard('👥', members.length, 'สมาชิกทั้งหมด', 'info');
  html += kpiCard('⭐', totalPoints, 'แต้มสะสมรวม', 'accent');
  html += kpiCard('💰', formatMoneySign(totalSpent), 'ยอดซื้อรวม', 'success');
  html += kpiCard('📊', members.length > 0 ? formatMoneySign(totalSpent / members.length) : '0', 'เฉลี่ย/สมาชิก', 'accent2');
  html += '</div>';
  
  return html;
}

/* ============================================
   MEMBER LIST
   ============================================ */
function renderMemberList() {
  var members = ST.getMembers();
  
  /* Search filter */
  var filtered = members;
  if (MEMBER_VIEW.searchQuery) {
    filtered = [];
    var q = MEMBER_VIEW.searchQuery.toLowerCase();
    for (var i = 0; i < members.length; i++) {
      if (members[i].name.toLowerCase().indexOf(q) !== -1 ||
          (members[i].phone && members[i].phone.indexOf(q) !== -1)) {
        filtered.push(members[i]);
      }
    }
  }
  
  /* Sort */
  filtered = sortBy(filtered, MEMBER_VIEW.sortBy, MEMBER_VIEW.sortDesc);
  
  /* Pagination */
  var totalPages = Math.ceil(filtered.length / MEMBER_VIEW.perPage);
  var startIdx = (MEMBER_VIEW.page - 1) * MEMBER_VIEW.perPage;
  var pageMembers = filtered.slice(startIdx, startIdx + MEMBER_VIEW.perPage);
  
  var html = '';
  
  /* Toolbar */
  html += '<div class="flex-between mb-16" style="flex-wrap:wrap;gap:12px;">';
  html += '<div class="pos-search" style="flex:1;min-width:200px;">';
  html += '<span class="pos-search-icon">🔍</span>';
  html += '<input type="text" id="memberSearch" placeholder="ค้นหาชื่อหรือเบอร์โทร..." value="' + sanitize(MEMBER_VIEW.searchQuery) + '" oninput="onMemberSearch(this.value)">';
  html += '</div>';
  html += '<div class="flex gap-8">';
  html += '<select id="memberSort" onchange="onMemberSortChange()" style="width:auto;">';
  html += '<option value="points"' + (MEMBER_VIEW.sortBy === 'points' ? ' selected' : '') + '>เรียงตามแต้ม</option>';
  html += '<option value="totalSpent"' + (MEMBER_VIEW.sortBy === 'totalSpent' ? ' selected' : '') + '>เรียงตามยอดซื้อ</option>';
  html += '<option value="name"' + (MEMBER_VIEW.sortBy === 'name' ? ' selected' : '') + '>เรียงตามชื่อ</option>';
  html += '<option value="lastVisit"' + (MEMBER_VIEW.sortBy === 'lastVisit' ? ' selected' : '') + '>เรียงตามวันที่ล่าสุด</option>';
  html += '</select>';
  html += '</div>';
  html += '</div>';
  
  if (filtered.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">👤</div>';
    html += '<div class="empty-text">' + (MEMBER_VIEW.searchQuery ? 'ไม่พบสมาชิก' : 'ยังไม่มีสมาชิก') + '</div>';
    html += '</div>';
    return html;
  }
  
  html += '<div class="member-grid">';
  for (var m = 0; m < pageMembers.length; m++) {
    html += renderMemberCard(pageMembers[m]);
  }
  html += '</div>';
  
  /* Pagination */
  if (totalPages > 1) {
    html += renderMemberPagination(totalPages);
  }
  
  return html;
}

function renderMemberCard(member) {
  var tierBadge = '';
  var tierClass = '';
  
  if (member.totalSpent >= 50000) {
    tierBadge = '<span class="badge badge-accent">👑 Platinum</span>';
    tierClass = 'platinum';
  } else if (member.totalSpent >= 20000) {
    tierBadge = '<span class="badge badge-info">🥈 Gold</span>';
    tierClass = 'gold';
  } else if (member.totalSpent >= 5000) {
    tierBadge = '<span class="badge badge-success">🥉 Silver</span>';
    tierClass = 'silver';
  } else {
    tierBadge = '<span class="badge badge-secondary">🟤 Bronze</span>';
    tierClass = 'bronze';
  }
  
  var html = '<div class="member-card ' + tierClass + '" onclick="modalMemberDetail(\'' + member.id + '\')">';
  html += '<div class="member-avatar">' + (member.name ? member.name.charAt(0).toUpperCase() : '?') + '</div>';
  html += '<div class="member-info">';
  html += '<div class="member-name">' + sanitize(member.name) + '</div>';
  html += '<div class="member-contact">';
  if (member.phone) html += '📱 ' + formatPhoneNumber(member.phone) + ' ';
  if (member.email) html += '✉️ ' + sanitize(member.email);
  html += '</div>';
  html += '<div class="member-stats">';
  html += '<span>⭐ ' + formatNumber(member.points || 0) + ' แต้ม</span>';
  html += '<span>💰 ' + formatMoneySign(member.totalSpent || 0) + '</span>';
  html += '<span>📅 ' + (member.lastVisit ? relativeDay(member.lastVisit) : 'ไม่เคย') + '</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="member-tier">' + tierBadge + '</div>';
  html += '</div>';
  
  return html;
}

/* ============================================
   MEMBER TRANSACTIONS
   ============================================ */
function renderMemberTransactions() {
  var transactions = ST.getMemberTransactions();
  
  if (transactions.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">ยังไม่มีประวัติการใช้แต้ม</div></div>';
  }
  
  transactions = sortBy(transactions, 'timestamp', true);
  var members = ST.getMembers();
  
  var html = '<div class="card">';
  html += '<div class="card-header"><div class="card-title">📋 ประวัติการใช้แต้ม</div></div>';
  html += '<div class="table-wrap">';
  html += '<table>';
  html += '<thead><table>';
  html += '<th>วันที่</th>';
  html += '<th>สมาชิก</th>';
  html += '<th>รายการ</th>';
  html += '<th class="text-right">แต้ม</th>';
  html += '<th class="text-right">ประเภท</th>';
  html += '</thead>';
  html += '<tbody>';
  
  for (var i = 0; i < transactions.length && i < 100; i++) {
    var t = transactions[i];
    var member = findById(members, t.memberId);
    var pointClass = t.type === 'earn' ? 'text-success' : 'text-danger';
    var pointSign = t.type === 'earn' ? '+' : '-';
    
    html += '<tr>';
    html += '<td class="fs-sm">' + sanitize(t.date) + ' ' + sanitize(t.time) + '</td>';
    html += '<td class="fw-600">' + sanitize(member ? member.name : 'Unknown') + '</td>';
    html += '<td class="fs-sm">' + sanitize(t.reason || '') + '</td>';
    html += '<td class="text-right ' + pointClass + ' fw-700">' + pointSign + formatNumber(t.points) + '</td>';
    html += '<td class="text-right">' + (t.type === 'earn' ? '📥 รับแต้ม' : '💸 ใช้แต้ม') + '</td>';
    html += '</tr>';
  }
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  
  return html;
}

/* ============================================
   MEMBER SETTINGS
   ============================================ */
function renderMemberSettings() {
  var cfg = ST.getConfig();
  var pointRate = cfg.pointRate || 100;
  var pointValue = cfg.pointValue || 1;
  
  var html = '<div class="card">';
  html += '<div class="card-header"><div class="card-title">⚙️ ตั้งค่าระบบแต้ม</div></div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">💰 รับ 1 แต้มต่อการซื้อ (บาท)</label>';
  html += '<input type="number" id="pointRate" value="' + pointRate + '" placeholder="100">';
  html += '<div class="form-hint">ลูกค้าจะได้รับ 1 แต้ม ทุก ' + pointRate + ' บาท</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">💎 1 แต้ม มีค่า (บาท)</label>';
  html += '<input type="number" id="pointValue" value="' + pointValue + '" placeholder="1" step="0.5">';
  html += '<div class="form-hint">1 แต้ม = ' + formatMoneySign(pointValue) + ' ส่วนลด</div>';
  html += '</div>';
  
  html += '<button class="btn btn-primary" onclick="saveMemberSettings()">💾 บันทึกการตั้งค่า</button>';
  html += '</div>';
  
  return html;
}

function saveMemberSettings() {
  var cfg = ST.getConfig();
  cfg.pointRate = parseFloat(($('pointRate') || {}).value) || 100;
  cfg.pointValue = parseFloat(($('pointValue') || {}).value) || 1;
  ST.saveConfig(cfg);
  toast('บันทึกการตั้งค่าแล้ว', 'success');
}

/* ============================================
   MODAL: EDIT MEMBER (พร้อมตรวจสอบสิทธิ์)
   ============================================ */
function modalEditMember(member) {
  var isNew = !member;
  var isManager = (APP.currentStaff && APP.currentStaff.role === 'manager');
  var isCashier = (APP.currentStaff && (APP.currentStaff.role === 'cashier' || APP.currentStaff.role === 'barista'));
  
  // แคชเชียร์เพิ่มสมาชิกใหม่ได้ แต่แก้ไขสมาชิกเดิมไม่ได้
  if (!isManager && !isNew && !isCashier) {
    toast('ไม่มีสิทธิ์แก้ไขสมาชิก', 'error');
    return;
  }
  
  var m = member || {};
  
  var html = '';
  html += '<div class="form-group">';
  html += '<label class="form-label">ชื่อ *</label>';
  html += '<input type="text" id="fMemberName" value="' + sanitize(m.name || '') + '" placeholder="เช่น สมชาย ใจดี">';
  html += '</div>';
  
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">เบอร์โทร</label>';
  html += '<input type="tel" id="fMemberPhone" value="' + sanitize(m.phone || '') + '" placeholder="0812345678">';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">อีเมล</label>';
  html += '<input type="email" id="fMemberEmail" value="' + sanitize(m.email || '') + '" placeholder="customer@email.com">';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="form-row">';
  html += '<div class="form-group">';
  html += '<label class="form-label">แต้มเริ่มต้น</label>';
  html += '<input type="number" id="fMemberPoints" value="' + (m.points || 0) + '" placeholder="0" ' + (!isManager ? 'disabled' : '') + '>';
  html += '</div>';
  html += '<div class="form-group">';
  html += '<label class="form-label">ยอดซื้อรวม</label>';
  html += '<input type="number" id="fMemberSpent" value="' + (m.totalSpent || 0) + '" placeholder="0" ' + (!isManager ? 'disabled' : '') + '>';
  html += '</div>';
  html += '</div>';
  
  if (!isManager && !isNew) {
    html += '<div class="text-muted fs-sm mt-4 mb-4">⚠️ เฉพาะผู้จัดการเท่านั้นที่แก้ไขแต้มและยอดซื้อได้</div>';
  }
  
  html += '<input type="hidden" id="fMemberId" value="' + sanitize(m.id || '') + '">';
  
  var footer = '';
  if (!isNew && isManager) footer += '<button class="btn btn-danger btn-sm" onclick="deleteMemberFromModal()">🗑 ลบ</button>';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ยกเลิก</button>';
  footer += '<button class="btn btn-primary" onclick="saveMemberFromModal()">' + (isNew ? '➕ เพิ่ม' : '💾 บันทึก') + '</button>';
  
  openModal(isNew ? '➕ เพิ่มสมาชิก' : '✏️ แก้ไขสมาชิก', html, footer);
}

function saveMemberFromModal() {
  var id = ($('fMemberId') || {}).value;
  var name = ($('fMemberName') || {}).value.trim();
  if (!name) { toast('กรุณาใส่ชื่อสมาชิก', 'error'); return; }
  
  var isManager = (APP.currentStaff && APP.currentStaff.role === 'manager');
  
  // ถ้าแก้ไขสมาชิกที่มีอยู่แล้ว และไม่ใช่ manager → ไม่อนุญาต
  if (id && !isManager) {
    toast('เฉพาะผู้จัดการเท่านั้นที่แก้ไขสมาชิกได้', 'error');
    return;
  }
  
  var member = {
    name: name,
    phone: ($('fMemberPhone') || {}).value.trim(),
    email: ($('fMemberEmail') || {}).value.trim(),
    points: parseInt(($('fMemberPoints') || {}).value) || 0,
    totalSpent: parseFloat(($('fMemberSpent') || {}).value) || 0
  };
  
  if (id) {
    ST.updateMember(id, member);
    toast('อัพเดตสมาชิกแล้ว', 'success');
  } else {
    ST.addMember(member);
    toast('เพิ่มสมาชิกแล้ว', 'success');
  }
  
  closeMForce();
  renderMembersView();
}

function deleteMemberFromModal() {
  var id = ($('fMemberId') || {}).value;
  if (!id) return;
  confirmDialog('ลบสมาชิกนี้?', function() {
    ST.deleteMember(id);
    closeMForce();
    toast('ลบสมาชิกแล้ว', 'warning');
    renderMembersView();
  });
}

/* ============================================
   MODAL: MEMBER DETAIL + USE POINTS (พร้อมเลือกแต้มเอง)
   ============================================ */
function modalMemberDetail(memberId) {
  var member = ST.getMemberById(memberId);
  if (!member) return;
  
  var cfg = ST.getConfig();
  var pointValue = cfg.pointValue || 1;
  var pointWorth = (member.points || 0) * pointValue;
  var maxPoints = member.points || 0;
  
  var html = '';
  html += '<div class="text-center mb-16">';
  html += '<div class="member-detail-avatar" style="font-size:48px;">' + (member.name ? member.name.charAt(0).toUpperCase() : '?') + '</div>';
  html += '<div class="fw-800 fs-lg mt-4">' + sanitize(member.name) + '</div>';
  if (member.phone) html += '<div class="text-muted fs-sm">📱 ' + formatPhoneNumber(member.phone) + '</div>';
  if (member.email) html += '<div class="text-muted fs-sm">✉️ ' + sanitize(member.email) + '</div>';
  html += '</div>';
  
  html += '<div class="card-glass p-16 mb-16">';
  html += '<div class="flex-between mb-8">';
  html += '<span class="text-muted">⭐ แต้มสะสม</span>';
  html += '<span class="fw-800 fs-lg text-accent">' + formatNumber(member.points || 0) + ' แต้ม</span>';
  html += '</div>';
  html += '<div class="flex-between mb-8">';
  html += '<span class="text-muted">💰 มูลค่าแต้ม</span>';
  html += '<span class="fw-700">' + formatMoneySign(pointWorth) + '</span>';
  html += '</div>';
  html += '<div class="flex-between mb-8">';
  html += '<span class="text-muted">💵 ยอดซื้อรวม</span>';
  html += '<span class="fw-700">' + formatMoneySign(member.totalSpent || 0) + '</span>';
  html += '</div>';
  html += '<div class="flex-between">';
  html += '<span class="text-muted">📅 เข้าร่วม</span>';
  html += '<span>' + (member.createdAt || '') + '</span>';
  html += '</div>';
  html += '</div>';
  
  html += '<div class="form-group">';
  html += '<label class="form-label">ใช้แต้มลด (1 แต้ม = ' + formatMoneySign(pointValue) + ')</label>';
  html += '<input type="number" id="usePoints" placeholder="0" max="' + maxPoints + '" value="0" oninput="updateMemberPointDiscount()" style="font-size:20px;text-align:center;">';
  html += '<div class="form-hint">สูงสุด ' + formatNumber(maxPoints) + ' แต้ม (มูลค่า ' + formatMoneySign(pointWorth) + ')</div>';
  html += '</div>';
  
  // ปุ่มเลือกแต้มแบบเร็ว
  html += '<div class="flex gap-4 mt-4 mb-12 flex-wrap" style="justify-content:center;">';
  var quickPoints = [10, 20, 50, 100, 200];
  for (var qp = 0; qp < quickPoints.length; qp++) {
    if (quickPoints[qp] <= maxPoints) {
      html += '<button class="btn btn-sm btn-outline" onclick="setQuickPoints(' + quickPoints[qp] + ')">' + quickPoints[qp] + ' แต้ม</button>';
    }
  }
  if (maxPoints > 0) {
    html += '<button class="btn btn-sm btn-primary" onclick="setQuickPoints(' + maxPoints + ')">ใช้ทั้งหมด (' + maxPoints + ')</button>';
  }
  html += '</div>';
  
  html += '<div class="card-glass p-16">';
  html += '<div class="flex-between">';
  html += '<span class="fw-700">ส่วนลดจากแต้ม</span>';
  html += '<span id="pointDiscountDisplay" class="fw-800 text-success" style="font-size:20px;">' + formatMoneySign(0) + '</span>';
  html += '</div>';
  html += '</div>';
  
  var footer = '';
  footer += '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  footer += '<button class="btn btn-primary" onclick="useMemberPointsFromDetail(\'' + memberId + '\')">✅ ใช้แต้ม</button>';
  
  openModal('👤 รายละเอียดสมาชิก', html, footer);
  
  window._currentMemberPoints = member.points;
  window._currentMemberPointValue = pointValue;
  window._currentMemberId = memberId;
}

function setQuickPoints(points) {
  var input = $('usePoints');
  if (input) {
    input.value = points;
    updateMemberPointDiscount();
  }
  vibrate(20);
}

function updateMemberPointDiscount() {
  var points = parseInt(($('usePoints') || {}).value) || 0;
  var maxPoints = window._currentMemberPoints || 0;
  if (points > maxPoints) {
    points = maxPoints;
    var input = $('usePoints');
    if (input) input.value = points;
  }
  var discount = points * window._currentMemberPointValue;
  setText('pointDiscountDisplay', formatMoneySign(discount));
}

function useMemberPointsFromDetail(memberId) {
  var points = parseInt(($('usePoints') || {}).value) || 0;
  if (points <= 0) {
    toast('กรุณาระบุจำนวนแต้ม', 'error');
    return;
  }
  
  var maxPoints = window._currentMemberPoints || 0;
  if (points > maxPoints) {
    toast('แต้มไม่เพียงพอ', 'error');
    return;
  }
  
  var discount = points * window._currentMemberPointValue;
  
  confirmDialog('ใช้ ' + points + ' แต้ม (มูลค่า ' + formatMoneySign(discount) + ') ใช่หรือไม่?', function() {
    ST.useMemberPoints(memberId, points, 'ใช้แต้มจากหน้ารายละเอียด', discount);
    closeMForce();
    toast('✅ ใช้แต้มสำเร็จ ' + formatMoneySign(discount), 'success');
    renderMembersView();
  });
}

/* ============================================
   HELPER FUNCTIONS
   ============================================ */
function onMemberSearch(val) {
  MEMBER_VIEW.searchQuery = val;
  MEMBER_VIEW.page = 1;
  var content = renderMemberList();
  var container = $('memberContent');
  if (container) container.innerHTML = content;
  else setHTML('memberContent', content);
}

function onMemberSortChange() {
  var select = $('memberSort');
  if (select) {
    MEMBER_VIEW.sortBy = select.value;
    MEMBER_VIEW.page = 1;
    var content = renderMemberList();
    var container = $('memberContent');
    if (container) container.innerHTML = content;
    else setHTML('memberContent', content);
  }
}

function renderMemberPagination(totalPages) {
  var html = '<div class="pagination mt-16">';
  html += '<button class="btn btn-secondary btn-sm" onclick="memberGoPage(' + (MEMBER_VIEW.page - 1) + ')" ' + (MEMBER_VIEW.page <= 1 ? 'disabled' : '') + '>← ก่อนหน้า</button>';
  html += '<span class="text-muted fs-sm">หน้า ' + MEMBER_VIEW.page + ' / ' + totalPages + '</span>';
  html += '<button class="btn btn-secondary btn-sm" onclick="memberGoPage(' + (MEMBER_VIEW.page + 1) + ')" ' + (MEMBER_VIEW.page >= totalPages ? 'disabled' : '') + '>ถัดไป →</button>';
  html += '</div>';
  return html;
}

function memberGoPage(page) {
  MEMBER_VIEW.page = page;
  var content = renderMemberList();
  var container = $('memberContent');
  if (container) container.innerHTML = content;
  else setHTML('memberContent', content);
  
  var main = $('mainContent');
  if (main) main.scrollTop = 0;
}

function renderFeatureLockedMembers() {
  return '<div class="page-pad text-center">' +
    '<div class="empty-state">' +
    '<div class="empty-icon">🔒</div>' +
    '<div class="empty-text fw-700 mb-4">👤 ระบบสมาชิก + แต้มสะสม</div>' +
    '<div class="empty-text text-muted">ฟีเจอร์นี้ต้องมี Pro License</div>' +
    '<button class="btn btn-primary mt-16" onclick="LicenseManager.showLicenseModal()">🔑 อัปเกรดเป็น Pro</button>' +
    '</div></div>';
}

/* ============================================
   CSS
   ============================================ */
(function() {
  var styleId = 'membersViewStyle';
  if (document.getElementById(styleId)) return;
  
  var css = '';
  css += '.member-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}';
  css += '.member-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all var(--transition);}';
  css += '.member-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow);}';
  css += '.member-card.platinum{border-left:4px solid #eab308;}';
  css += '.member-card.gold{border-left:4px solid #f97316;}';
  css += '.member-card.silver{border-left:4px solid #94a3b8;}';
  css += '.member-avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:800;flex-shrink:0;}';
  css += '.member-info{flex:1;min-width:0;}';
  css += '.member-name{font-size:16px;font-weight:700;margin-bottom:4px;}';
  css += '.member-contact{font-size:12px;color:var(--text-muted);margin-bottom:6px;}';
  css += '.member-stats{display:flex;gap:12px;font-size:12px;}';
  css += '.member-stats span{color:var(--text-secondary);}';
  css += '.member-tier{flex-shrink:0;}';
  css += '.member-detail-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:800;margin:0 auto;}';
  
  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
})();

console.log('[views-members.js] loaded');