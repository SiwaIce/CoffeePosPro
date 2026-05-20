/* ============================================
   STAFF WORK HISTORY MODAL
   ============================================ */

function showStaffWorkHistory(staffId) {
  var staff = findById(ST.getStaff(), staffId);
  if (!staff) return;
  
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var selectedMonth = currentMonth;
  var selectedYear = currentYear;
  
  renderWorkHistoryModal(staff, selectedMonth, selectedYear);
}

function renderWorkHistoryModal(staff, month, year) {
  var shifts = ST.getShiftsByStaffAndMonth(staff.id, month, year);
  var totalHours = ST.getStaffWorkHours(staff.id, month, year);
  var summary = ST.getStaffWorkSummary(staff.id);
  
  var monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  
  var html = '';
  
  /* Staff Info */
  html += '<div class="text-center mb-16">';
  html += '<div class="fw-800 fs-lg">' + sanitize(staff.name) + '</div>';
  html += '<div class="text-muted">' + getRoleName(staff.role) + '</div>';
  html += '</div>';
  
  /* Summary Cards */
  html += '<div class="kpi-grid mb-16" style="grid-template-columns:repeat(3,1fr);">';
  html += '<div class="kpi-card"><div class="kpi-value">' + summary.totalDays + '</div><div class="kpi-label">วันทำงานทั้งหมด</div></div>';
  html += '<div class="kpi-card"><div class="kpi-value">' + summary.totalHours + '</div><div class="kpi-label">ชั่วโมงทั้งหมด</div></div>';
  html += '<div class="kpi-card"><div class="kpi-value">' + summary.avgHoursPerDay + '</div><div class="kpi-label">เฉลี่ย/วัน</div></div>';
  html += '</div>';
  
  /* Month Selector */
  html += '<div class="flex-between mb-16">';
  html += '<div class="flex gap-8">';
  html += '<button class="btn btn-secondary btn-sm" onclick="changeWorkHistoryMonth(\'' + staff.id + '\', ' + (month - 1) + ', ' + year + ')">◀ เดือนก่อน</button>';
  html += '<span class="fw-600" style="padding:6px 12px;">' + monthNames[month] + ' ' + (year + 543) + '</span>';
  html += '<button class="btn btn-secondary btn-sm" onclick="changeWorkHistoryMonth(\'' + staff.id + '\', ' + (month + 1) + ', ' + year + ')">เดือนถัดไป ▶</button>';
  html += '</div>';
  html += '<button class="btn btn-sm btn-outline" onclick="exportStaffWorkHistory(\'' + staff.id + '\', ' + month + ', ' + year + ')">📥 Export CSV</button>';
  html += '</div>';
  
  /* Work Hours Summary for this month */
  html += '<div class="card-glass p-12 mb-16">';
  html += '<div class="flex-between">';
  html += '<span class="fw-600">ชั่วโมงทำงาน ' + monthNames[month] + '</span>';
  html += '<span class="fw-800 text-accent fs-lg">' + totalHours + ' ชั่วโมง</span>';
  html += '</div>';
  html += '</div>';
  
  /* Shifts Table */
  if (shifts.length === 0) {
    html += '<div class="empty-state">';
    html += '<div class="empty-icon">📋</div>';
    html += '<div class="empty-text">ไม่มีประวัติการทำงานในเดือนนี้</div>';
    html += '</div>';
  } else {
    html += '<div class="table-wrap">';
    html += '<table>';
    html += '<thead>';
    html += '<th>วันที่</th>';
    html += '<th>เวลาเข้า</th>';
    html += '<th>เวลาออก</th>';
    html += '<th class="text-right">ชั่วโมง</th>';
    html += '</thead>';
    html += '<tbody>';
    
    for (var i = 0; i < shifts.length; i++) {
      var shift = shifts[i];
      var hours = shift.clockOut ? calcShiftHours(shift) : '-';
      var statusBadge = shift.clockOut ? '' : '<span class="badge badge-warning">กำลังทำงาน</span>';
      
      html += '<tr>';
      html += '<td>' + relativeDay(shift.date) + '<br><span class="text-muted fs-sm">' + shift.date + '</span></td>';
      html += '<td>' + shift.clockIn + '</td>';
      html += '<td>' + (shift.clockOut || statusBadge) . '</td>';
      html += '<td class="text-right fw-600">' + (hours !== '-' ? hours + ' ชม.' : '-') . '</td>';
      html += '</tr>';
    }
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
  }
  
  var footer = '<button class="btn btn-secondary" onclick="closeMForce()">ปิด</button>';
  
  openModal('📋 ประวัติการทำงาน: ' + staff.name, html, footer, { wide: true });
}

function changeWorkHistoryMonth(staffId, month, year) {
  var now = new Date();
  if (month < 0) {
    month = 11;
    year--;
  }
  if (month > 11) {
    month = 0;
    year++;
  }
  
  var staff = findById(ST.getStaff(), staffId);
  if (staff) {
    renderWorkHistoryModal(staff, month, year);
  }
}

function exportStaffWorkHistory(staffId, month, year) {
  var staff = findById(ST.getStaff(), staffId);
  if (!staff) return;
  
  var shifts = ST.getShiftsByStaffAndMonth(staffId, month, year);
  
  var rows = [];
  rows.push(['วันที่', 'เวลาเข้า', 'เวลาออก', 'ชั่วโมงทำงาน']);
  
  for (var i = 0; i < shifts.length; i++) {
    var s = shifts[i];
    var hours = s.clockOut ? calcShiftHours(s) : '';
    rows.push([s.date, s.clockIn, s.clockOut || 'ยังไม่ออก', hours]);
  }
  
  var csv = rowsToCSV(rows);
  var fileName = staff.name + '_worklog_' + (year + 543) + '_' + (month + 1) + '.csv';
  downloadFile(fileName, csv, 'text/csv');
}