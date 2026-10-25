const App = {
  currentPage: 'dashboard',
  filters: { search: '', category: '', field: '', status: '' },
  statsFilter: { deviceId: '', period: 'week' },
  bookingFilters: { period: '', field: '', purpose: '', status: '', customStart: '', customEnd: '' },

  BOOKING_PERIODS: [
    { id: '', label: '全部' },
    { id: 'today', label: '今天' },
    { id: '3days', label: '近三天' },
    { id: 'week', label: '近一周' },
    { id: 'month', label: '近一个月' },
    { id: 'custom', label: '自定义' },
  ],

  BOOKING_PURPOSES: ['课题实验', '样品检测', '数据分析', '课程教学', '毕业论文', '合作项目'],

  TIME_SLOTS: [
    { id: 's1', label: '08:00-10:00' },
    { id: 's2', label: '10:00-12:00' },
    { id: 's3', label: '14:00-16:00' },
    { id: 's4', label: '16:00-18:00' },
  ],

  STATUS_LABELS: {
    available: { text: '可预约', cls: 'status-available' },
    busy: { text: '使用中', cls: 'status-busy' },
    maintenance: { text: '维修中', cls: 'status-maintenance' },
    broken: { text: '已停用', cls: 'status-broken' },
  },

  BOOKING_STATUS: {
    pending: { text: '待确认', cls: 'status-pending' },
    approved: { text: '预约成功', cls: 'status-approved' },
    rejected: { text: '已取消', cls: 'status-rejected' },
    completed: { text: '已完成', cls: 'status-completed' },
    overtime: { text: '已超时', cls: 'status-overtime' },
  },

  // 页面全部采用 innerHTML 模板拼接，所有来自用户输入的字段在插入前必须转义，
  // 否则「用途/报修描述/申诉理由」等字段可注入 <script> 造成 XSS。
  esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ===== 文本校验 =====
  TEXT_LIMITS: { purpose: 50, companions: 50, faultDesc: 200, appeal: 200, rejectReason: 200, note: 100 },

  checkText(value, label, maxLen) {
    if (!value) { this.toast(`请填写${label}`, 'warning'); return false; }
    if (value.length > maxLen) { this.toast(`${label}不能超过 ${maxLen} 字`, 'warning'); return false; }
    return true;
  },

  init() {
    Store.init();
    Store.checkOvertime();
    this._overtimeTimer = setInterval(() => this.checkOvertime(), 60000);
    if (Store.isLoggedIn()) {
      document.getElementById('app').innerHTML = this._appShell();
      this.renderNav();
      this.navigate('dashboard');
    } else {
      this.renderLogin();
    }
  },

  checkOvertime() {
    if (!Store.isLoggedIn()) return;
    const changed = Store.checkOvertime();
    if (changed) {
      this.renderNav();
      this.navigate(this.currentPage);
    }
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-header">
            <div class="login-icon">🔬</div>
            <h1>实验室设备预约系统</h1>
            <p>请登录以继续使用</p>
          </div>
          <div class="login-body">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input type="text" class="form-input" id="loginUsername" placeholder="请输入用户名"
                onkeydown="if(event.key==='Enter')App.doLogin()">
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input type="password" class="form-input" id="loginPassword" placeholder="请输入密码"
                onkeydown="if(event.key==='Enter')App.doLogin()">
            </div>
            <button class="btn btn-primary login-btn" onclick="App.doLogin()">登 录</button>
          </div>
          <div class="login-footer">
            <p class="login-hint">演示账号（用户名 / 密码）</p>
            <div class="demo-accounts">
              <div class="demo-account" onclick="App.fillLogin('admin','admin123')">
                <span class="role-badge role-admin">管理员</span>
                <span>admin / admin123</span>
              </div>
              <div class="demo-account" onclick="App.fillLogin('zhang','zhang123')">
                <span class="role-badge role-researcher">研究员</span>
                <span>zhang / zhang123</span>
              </div>
              <div class="demo-account" onclick="App.fillLogin('li','li123')">
                <span class="role-badge role-researcher">研究员</span>
                <span>li / li123</span>
              </div>
              <div class="demo-account" onclick="App.fillLogin('wang','wang123')">
                <span class="role-badge role-researcher">研究员</span>
                <span>wang / wang123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('loginUsername').focus(), 100);
  },

  fillLogin(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
  },

  doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) { this.toast('请输入用户名和密码', 'warning'); return; }
    const session = Store.login(username, password);
    if (session) {
      this.toast(`欢迎回来，${session.displayName}`, 'success');
      setTimeout(() => {
        document.getElementById('app').innerHTML = this._appShell();
        this.renderNav();
        this.navigate('dashboard');
      }, 500);
    } else {
      this.toast('用户名或密码错误', 'error');
    }
  },

  logout() {
    Store.logout();
    this.toast('已退出登录', 'info');
    setTimeout(() => this.renderLogin(), 300);
  },

  _appShell() {
    return `
      <header class="navbar">
        <div class="nav-container">
          <div class="nav-brand" onclick="App.navigate('dashboard')">
            <span class="brand-icon">🔬</span>
            <span class="brand-text">实验室设备预约</span>
          </div>
          <nav class="nav-menu" id="navMenu"></nav>
          <div class="nav-user" id="navUser"></div>
        </div>
      </header>
      <main class="main-content" id="mainContent"></main>
      <div id="modalContainer"></div>

    `;
  },

  renderNav() {
    const session = Store.getSession();
    const navMenu = document.getElementById('navMenu');
    const navUser = document.getElementById('navUser');
    if (!session || !navMenu) return;

    let menuHtml = `
      <a class="nav-link" data-page="dashboard" onclick="App.navigate('dashboard')">仪表盘</a>
      <a class="nav-link" data-page="devices" onclick="App.navigate('devices')">设备列表</a>
    `;
    if (session.role === 'admin') {
      menuHtml += `<a class="nav-link" data-page="stats" onclick="App.navigate('stats')">设备统计</a>`;
      menuHtml += `<a class="nav-link" data-page="bookings" onclick="App.navigate('bookings')">所有预约</a>`;
      const repairCount = Store.getPendingRepairCount();
      menuHtml += `<a class="nav-link" data-page="messages" onclick="App.navigate('messages')">收信箱${repairCount > 0 ? `<span class="nav-badge">${repairCount}</span>` : ''}</a>`;
      const pendingCount = Store.getPendingMessageCount();
      menuHtml += `<a class="nav-link" data-page="approvals" onclick="App.navigate('approvals')">待审批申请${pendingCount > 0 ? `<span class="nav-badge">${pendingCount}</span>` : ''}</a>`;
    } else {
      menuHtml += `<a class="nav-link" data-page="bookings" onclick="App.navigate('bookings')">我的预约</a>`;
      menuHtml += `<a class="nav-link" data-page="usage" onclick="App.navigate('usage')">使用情况</a>`;
      const unreadCount = Store.getUnreadNoticeCount(session.username);
      menuHtml += `<a class="nav-link" data-page="messages" onclick="App.navigate('messages')">收信箱${unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ''}</a>`;
    }
    navMenu.innerHTML = menuHtml;

    const roleBadge = session.role === 'admin'
      ? '<span class="role-badge role-admin">管理员</span>'
      : '<span class="role-badge role-researcher">研究员</span>';
    navUser.innerHTML = `
      <span class="user-greeting">${session.displayName}</span>
      ${roleBadge}
      <button class="btn-icon" onclick="App.logout()" title="退出登录">🚪</button>
    `;
  },

  navigate(page) {
    this.currentPage = page;
    if (page === 'messages') {
      const session = Store.getSession();
      if (session && session.role === 'researcher') {
        Store.markNoticesRead(session.username);
        this.renderNav();
      }
    }
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
    const container = document.getElementById('mainContent');
    switch (page) {
      case 'dashboard': container.innerHTML = this.renderDashboard(); break;
      case 'devices': container.innerHTML = this.renderDevices(); break;
      case 'bookings': container.innerHTML = this.renderBookings(); break;
      case 'stats': container.innerHTML = this.renderDeviceStats(); break;
      case 'usage': container.innerHTML = this.renderUsage(); break;
      case 'messages': container.innerHTML = this.renderMessages(); break;
      case 'approvals': container.innerHTML = this.renderApprovals(); break;
    }
  },

  goToDevices(status) {
    this.filters = { search: '', category: '', field: '', status: status || '' };
    this.navigate('devices');
  },

  goToBookings(status) {
    this.bookingFilters.period = '';
    this.bookingFilters.field = '';
    this.bookingFilters.purpose = '';
    this.bookingFilters.status = status || '';
    this.bookingFilters.customStart = '';
    this.bookingFilters.customEnd = '';
    this.navigate('bookings');
  },

  renderDashboard() {
    const session = Store.getSession();
    const stats = Store.getStats();
    const isAdmin = session.role === 'admin';

    let html = `
      <h1 class="page-title">仪表盘</h1>
      <p class="page-subtitle">${isAdmin ? '实验室设备预约全局概览' : '您的设备预约概览'}</p>
      <div class="stats-grid">
        <div class="stat-card clickable" onclick="App.goToDevices()">
          <div class="stat-icon blue">📦</div>
          <div class="stat-info"><h3>${stats.totalDevices}</h3><p>设备总数</p></div>
        </div>
        <div class="stat-card clickable" onclick="App.goToDevices('available')">
          <div class="stat-icon green">✅</div>
          <div class="stat-info"><h3>${stats.availableDevices}</h3><p>可预约设备</p></div>
        </div>
    `;
    if (isAdmin) {
      html += `
        <div class="stat-card clickable" onclick="App.goToBookings()">
          <div class="stat-icon orange">📅</div>
          <div class="stat-info"><h3>${stats.totalBookings}</h3><p>预约总数</p></div>
        </div>
        <div class="stat-card clickable" onclick="App.goToBookings('pending')">
          <div class="stat-icon red">📊</div>
          <div class="stat-info"><h3>${Store.getBookings().filter(b=>b.status==='pending').length}</h3><p>待确认预约</p></div>
        </div>
      `;
    } else {
      html += `
        <div class="stat-card clickable" onclick="App.goToBookings()">
          <div class="stat-icon orange">📋</div>
          <div class="stat-info"><h3>${stats.myTotalBookings}</h3><p>我的预约</p></div>
        </div>
        <div class="stat-card clickable" onclick="App.goToBookings('active')">
          <div class="stat-icon red">⏳</div>
          <div class="stat-info"><h3>${stats.activeBookings}</h3><p>进行中预约</p></div>
        </div>
      `;
    }
    html += `</div>`;

    if (!isAdmin) {
      const credit = Store.getCredit(session.username);
      const creditColor = credit.score >= 80 ? 'var(--success)' : credit.score >= 60 ? 'var(--warning)' : 'var(--danger)';
      html += `
        <div class="credit-banner-dashboard" onclick="App.navigate('usage')">
          <div class="credit-banner-left">
            <span class="credit-banner-icon">⭐</span>
            <div>
              <div class="credit-banner-label">信誉评分</div>
              <div class="credit-banner-score" style="color:${creditColor};">${credit.score}<span style="font-size:14px;color:var(--gray-400);"> / 100</span></div>
            </div>
          </div>
          <div class="credit-bar-wrap">
            <div class="credit-bar-fill" style="width:${credit.score}%;background:${creditColor};"></div>
          </div>
          <div class="credit-banner-right">
            ${credit.score >= 60 ? '<span class="credit-status-ok">可预约</span>' : '<span class="credit-status-block">已限制</span>'}
            <span style="font-size:13px;color:var(--gray-400);">查看详情 →</span>
          </div>
        </div>
      `;
    }

    const recentBookings = isAdmin
      ? Store.getBookings().slice(0, 5)
      : Store.getMyBookings().slice(0, 5);

    html += `<h2 class="page-title" style="font-size:18px;">最近预约</h2>`;
    if (recentBookings.length === 0) {
      html += this.renderEmptyState('📋', '暂无预约记录', '去设备列表预约一台设备吧');
    } else {
      html += `<div class="bookings-list">`;
      recentBookings.forEach(b => {
        const device = Store.getDevice(b.deviceId);
        html += this.renderBookingCard(b, device, isAdmin);
      });
      html += `</div>`;
    }

    html += `<h2 class="page-title" style="font-size:18px;margin-top:32px;">热门设备</h2>`;
    const devices = Store.getDevices().filter(d => d.status === 'available').slice(0, 4);
    html += `<div class="devices-grid">`;
    devices.forEach(d => { html += this.renderDeviceCard(d); });
    html += `</div>`;

    return html;
  },

  renderDevices() {
    const categories = Store.getCategories();
    let catOptions = '<option value="">全部分类</option>';
    categories.forEach(c => { catOptions += `<option value="${c}" ${this.filters.category === c ? 'selected' : ''}>${c}</option>`; });

    const fields = Store.getFields();
    let fieldOptions = '<option value="">全部学科</option>';
    fields.forEach(f => { fieldOptions += `<option value="${f}" ${this.filters.field === f ? 'selected' : ''}>${f}</option>`; });

    const statusOpts = [
      { v: '', l: '全部状态' },
      { v: 'available', l: '可预约' },
      { v: 'busy', l: '使用中' },
      { v: 'maintenance', l: '维修中' },
      { v: 'broken', l: '已停用' },
    ];
    let statusOptions = statusOpts.map(s => `<option value="${s.v}" ${this.filters.status === s.v ? 'selected' : ''}>${s.l}</option>`).join('');

    let html = `
      <h1 class="page-title">设备列表</h1>
      <p class="page-subtitle">浏览并预约实验室设备</p>
      <div class="toolbar">
        <div class="search-box">
          <input type="text" placeholder="搜索设备名称、型号..." value="${this.filters.search}"
            oninput="App.onSearch(this.value)">
        </div>
        <select class="filter-select" onchange="App.onFilterField(this.value)">
          ${fieldOptions}
        </select>
        <select class="filter-select" onchange="App.onFilterCategory(this.value)">
          ${catOptions}
        </select>
        <select class="filter-select" onchange="App.onFilterStatus(this.value)">
          ${statusOptions}
        </select>
      </div>
      <div id="devicesGridContainer">${this.renderDevicesGrid()}</div>
    `;

    return html;
  },

  renderDevicesGrid() {
    let devices = Store.getDevices();
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      devices = devices.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }
    if (this.filters.field) {
      devices = devices.filter(d => d.field === this.filters.field);
    }
    if (this.filters.category) {
      devices = devices.filter(d => d.category === this.filters.category);
    }
    if (this.filters.status) {
      devices = devices.filter(d => d.status === this.filters.status);
    }

    if (devices.length === 0) {
      return this.renderEmptyState('🔍', '未找到匹配的设备', '试试调整搜索条件');
    }
    let html = `<div class="devices-grid">`;
    devices.forEach(d => { html += this.renderDeviceCard(d); });
    html += `</div>`;
    return html;
  },

  renderDeviceCard(d) {
    const status = this.STATUS_LABELS[d.status];
    const tagsHtml = d.tags.map(t => `<span class="device-tag">${t}</span>`).join('');
    const canBook = d.status === 'available';
    const session = Store.getSession();
    const canRepair = session && session.role === 'researcher' && (d.status === 'available' || d.status === 'busy');
    const isAdmin = session && session.role === 'admin';
    let adminBtn = '';
    if (isAdmin) {
      if (d.status === 'maintenance') {
        adminBtn = `<button class="btn btn-outline btn-sm btn-repair" onclick="App.confirmDeviceAction('${d.id}','endMaintenance')">结束维修</button>`;
      } else if (d.status === 'broken') {
        adminBtn = `<button class="btn btn-outline btn-sm btn-repair" onclick="App.confirmDeviceAction('${d.id}','enable')">启用</button>`;
      } else {
        adminBtn = `<button class="btn btn-outline btn-sm btn-repair" onclick="App.confirmDeviceAction('${d.id}','disable')">停用</button>`;
      }
    }
    return `
      <div class="device-card">
        <div class="device-card-header">
          <div>
            <div class="device-name">${d.name}</div>
            <div class="device-model">${d.id} · ${d.model}</div>
          </div>
          <span class="device-status ${status.cls}">${status.text}</span>
        </div>
        <div class="device-card-body">
          <div class="device-desc">${d.description}</div>
          <div class="device-tags">
            <span class="device-tag device-tag-field">${d.field || '未分类'}</span>
            <span class="device-tag">${d.category}</span>
            ${tagsHtml}
          </div>
        </div>
        <div class="device-card-footer">
          <span class="device-location">📍 ${d.location}</span>
          <div class="device-card-actions">
            ${adminBtn}
            ${canRepair ? `<button class="btn btn-outline btn-sm btn-repair" onclick="App.openRepairModal('${d.id}')">报修</button>` : ''}
            <button class="btn btn-primary btn-sm" ${canBook ? '' : 'disabled'}
              onclick="App.openBookingModal('${d.id}')">${canBook ? '预约' : '不可预约'}</button>
          </div>
        </div>
      </div>
    `;
  },

  renderBookings() {
    const session = Store.getSession();
    const isAdmin = session.role === 'admin';
    let html = `
      <h1 class="page-title">${isAdmin ? '所有预约' : '我的预约'}</h1>
      <p class="page-subtitle">${isAdmin ? '查看全部设备预约记录' : '查看和管理你的设备预约记录'}</p>
    `;

    if (this.bookingFilters.status) {
      const statusLabel = this.bookingFilters.status === 'pending' ? '待确认' : '进行中';
      html += `
        <div class="filter-banner">
          <span class="filter-banner-text">当前筛选：仅显示「${statusLabel}」预约</span>
          <button class="filter-banner-clear" onclick="App.clearBookingStatusFilter()">✕ 清除筛选</button>
        </div>
      `;
    }

    if (!isAdmin) {
      html += this.renderBookingFilters();
    }

    html += `<div id="bookingsListContainer">${this.renderBookingsList()}</div>`;
    return html;
  },

  clearBookingStatusFilter() {
    this.bookingFilters.status = '';
    this.navigate('bookings');
  },

  renderBookingFilters() {
    const f = this.bookingFilters;

    const periodTabs = this.BOOKING_PERIODS.map(p =>
      `<button class="filter-tab ${f.period === p.id ? 'active' : ''}" onclick="App.onBookingPeriodChange('${p.id}')">${p.label}</button>`
    ).join('');

    const fields = Store.getFields();
    let fieldOptions = '<option value="">全部学科</option>';
    fields.forEach(fld => { fieldOptions += `<option value="${fld}" ${f.field === fld ? 'selected' : ''}>${fld}</option>`; });

    let purposeOptions = '<option value="">全部用途</option>';
    this.BOOKING_PURPOSES.forEach(p => { purposeOptions += `<option value="${p}" ${f.purpose === p ? 'selected' : ''}>${p}</option>`; });

    let customHtml = '';
    if (f.period === 'custom') {
      customHtml = `
        <div class="custom-date-range">
          <input type="date" class="form-input" id="bookingFilterStart" value="${f.customStart}" onchange="App.onBookingCustomDateChange()">
          <span class="date-range-sep">至</span>
          <input type="date" class="form-input" id="bookingFilterEnd" value="${f.customEnd}" onchange="App.onBookingCustomDateChange()">
        </div>
      `;
    }

    return `
      <div class="booking-filters">
        <div class="filter-section">
          <span class="filter-section-label">时间</span>
          <div class="filter-tabs">${periodTabs}</div>
          ${customHtml}
        </div>
        <div class="filter-section">
          <span class="filter-section-label">筛选</span>
          <select class="filter-select" onchange="App.onBookingFieldChange(this.value)">
            ${fieldOptions}
          </select>
          <select class="filter-select" onchange="App.onBookingPurposeChange(this.value)">
            ${purposeOptions}
          </select>
        </div>
      </div>
    `;
  },

  _filterBookingsByDate(bookings) {
    const f = this.bookingFilters;
    if (!f.period) return bookings;

    if (f.period === 'custom') {
      return bookings.filter(b => {
        if (f.customStart && b.date < f.customStart) return false;
        if (f.customEnd && b.date > f.customEnd) return false;
        return true;
      });
    }

    const start = Store._getPeriodStart(f.period);
    const startDate = Store._dateStr(start);
    return bookings.filter(b => b.date >= startDate);
  },

  renderBookingsList() {
    const session = Store.getSession();
    const isAdmin = session.role === 'admin';
    let bookings = isAdmin ? Store.getBookings() : Store.getMyBookings();

    const f = this.bookingFilters;
    if (f.status === 'pending') {
      bookings = bookings.filter(b => b.status === 'pending');
    } else if (f.status === 'active') {
      bookings = bookings.filter(b => b.status === 'pending' || b.status === 'approved');
    }

    if (!isAdmin) {
      bookings = this._filterBookingsByDate(bookings);
      if (f.field) {
        bookings = bookings.filter(b => {
          const device = Store.getDevice(b.deviceId);
          return device && device.field === f.field;
        });
      }
      if (f.purpose) {
        bookings = bookings.filter(b => b.purpose === f.purpose);
      }
    }

    if (bookings.length === 0) {
      return this.renderEmptyState('📋', '暂无预约记录', '前往设备列表开始预约');
    }
    let html = `<div class="bookings-list">`;
    bookings.forEach(b => {
      const device = Store.getDevice(b.deviceId);
      html += this.renderBookingCard(b, device, isAdmin);
    });
    html += `</div>`;
    return html;
  },

  _refreshBookingsList() {
    const container = document.getElementById('bookingsListContainer');
    if (container) container.innerHTML = this.renderBookingsList();
  },

  onBookingPeriodChange(period) {
    this.bookingFilters.period = period;
    if (period === 'custom' && !this.bookingFilters.customStart) {
      const today = Store.todayStr();
      const monthAgo = Store._dateStr(new Date(Date.now() - 29 * 86400000));
      this.bookingFilters.customStart = monthAgo;
      this.bookingFilters.customEnd = today;
    }
    const filtersEl = document.querySelector('.booking-filters');
    if (filtersEl) filtersEl.outerHTML = this.renderBookingFilters();
    this._refreshBookingsList();
  },

  onBookingCustomDateChange() {
    this.bookingFilters.customStart = document.getElementById('bookingFilterStart').value;
    this.bookingFilters.customEnd = document.getElementById('bookingFilterEnd').value;
    this._refreshBookingsList();
  },

  onBookingFieldChange(value) {
    this.bookingFilters.field = value;
    this._refreshBookingsList();
  },

  onBookingPurposeChange(value) {
    this.bookingFilters.purpose = value;
    this._refreshBookingsList();
  },

  renderBookingCard(b, device, showUser) {
    const status = this.BOOKING_STATUS[b.status] || this.BOOKING_STATUS.pending;
    const deviceName = device ? device.name : '未知设备';
    const slotsText = b.timeSlots.map(s => {
      const slot = this.TIME_SLOTS.find(t => t.id === s);
      return slot ? slot.label : s;
    }).join('、');
    const session = Store.getSession();
    const canCancel = (b.status === 'pending' || b.status === 'approved') &&
      session && (Store.isAdmin() || b.userId === session.username);
    const canComplete = b.status === 'approved' &&
      session && !Store.isAdmin() && b.userId === session.username;
    const canRepairBooking = b.status === 'approved' &&
      session && !Store.isAdmin() && b.userId === session.username;
    const usageBadge = b.usageStatus === 'overtime' ? '<span class="usage-badge overtime">超时</span>' :
      b.usageStatus === 'completed' ? '<span class="usage-badge completed">按时</span>' : '';

    return `
      <div class="booking-card">
        <div class="booking-info">
          <div class="booking-device">${deviceName} ${usageBadge}</div>
          <div class="booking-detail">
            <span>📅 ${b.date}</span>
            <span>⏰ ${slotsText}</span>
            ${showUser ? `<span>👤 ${b.userName}</span>` : ''}
          </div>
          ${b.purpose ? `<div class="booking-purpose">用途：${this.esc(b.purpose)}</div>` : ''}
          ${b.companions ? `<div class="booking-companions">👥 同行：${this.esc(b.companions)}</div>` : ''}
        </div>
        <span class="booking-status ${status.cls}">${status.text}</span>
        ${canComplete ? `<button class="btn btn-primary btn-sm" onclick="App.completeUsage('${b.id}')">完成使用</button>` : ''}
        ${canRepairBooking ? `<button class="btn btn-outline btn-sm btn-repair" onclick="App.openRepairModal('${b.deviceId}')">报修</button>` : ''}
        ${canCancel ? `<button class="btn btn-outline btn-sm" onclick="App.cancelBooking('${b.id}')">取消</button>` : ''}
      </div>
    `;
  },

  renderDeviceStats() {
    const devices = Store.getDevices();
    const deviceId = this.statsFilter.deviceId || devices[0].id;
    this.statsFilter.deviceId = deviceId;

    let deviceOptions = devices.map(d =>
      `<option value="${d.id}" ${deviceId === d.id ? 'selected' : ''}>${d.id} · ${d.name}</option>`
    ).join('');

    const periodOptions = Object.entries(Store.PERIOD_LABELS).map(([k, v]) =>
      `<option value="${k}" ${this.statsFilter.period === k ? 'selected' : ''}>${v}</option>`
    ).join('');

    const device = Store.getDevice(deviceId);
    const accessStats = Store.getDeviceAccessStats(deviceId);
    const allStats = Store.getAllDeviceAccessStats(this.statsFilter.period);
    const recentBookings = Store.getDeviceRecentBookings(deviceId, 10);

    const maxCount = Math.max(...allStats.map(s => s.count), 1);

    let html = `
      <h1 class="page-title">设备访问统计</h1>
      <p class="page-subtitle">查看各设备在不同时间段的预约访问次数</p>
      <div class="toolbar">
        <select class="filter-select" onchange="App.onStatsDeviceChange(this.value)" style="min-width:280px;">
          ${deviceOptions}
        </select>
        <select class="filter-select" onchange="App.onStatsPeriodChange(this.value)">
          ${periodOptions}
        </select>
        <div class="toolbar-spacer"></div>
        <button class="btn btn-outline" onclick="App.exportBookingsCSV()">导出预约明细 CSV</button>
        <button class="btn btn-outline" onclick="App.exportBackup()">导出数据备份</button>
        <label class="btn btn-outline import-label" title="导入此前导出的数据备份">
          导入数据备份
          <input type="file" accept="application/json" hidden onchange="App.importBackup(this)">
        </label>
      </div>
    `;

    html += `
      <div class="stats-detail-card">
        <div class="stats-detail-header">
          <div>
            <h2>${device.name}</h2>
            <p>${device.model} · 📍${device.location} · <span class="device-tag device-tag-field">${device.field}</span></p>
          </div>
        </div>
        <div class="access-count-grid">
    `;
    Object.entries(Store.PERIOD_LABELS).forEach(([key, label]) => {
      const count = accessStats[key];
      const isActive = this.statsFilter.period === key;
      html += `
          <div class="access-count-item ${isActive ? 'active' : ''}" onclick="App.onStatsPeriodChange('${key}')">
            <div class="access-count-num">${count}</div>
            <div class="access-count-label">${label}</div>
          </div>
      `;
    });
    html += `
        </div>
      </div>
    `;

    html += `
      <h2 class="page-title" style="font-size:18px;margin-top:28px;">全部设备排行（${Store.PERIOD_LABELS[this.statsFilter.period]}）</h2>
      <div class="ranking-list">
    `;
    allStats.forEach((s, idx) => {
      const pct = (s.count / maxCount * 100).toFixed(0);
      html += `
        <div class="ranking-item" onclick="App.onStatsDeviceChange('${s.device.id}')">
          <span class="ranking-num">${idx + 1}</span>
          <span class="ranking-name">${s.device.name}</span>
          <div class="ranking-bar-wrap">
            <div class="ranking-bar" style="width:${pct}%"></div>
          </div>
          <span class="ranking-count">${s.count} 次</span>
        </div>
      `;
    });
    html += `</div>`;

    html += `<h2 class="page-title" style="font-size:18px;margin-top:28px;">${device.name} · 最近预约记录</h2>`;
    if (recentBookings.length === 0) {
      html += this.renderEmptyState('📋', '暂无预约记录', '');
    } else {
      html += `<div class="bookings-list">`;
      recentBookings.forEach(b => {
        const d = Store.getDevice(b.deviceId);
        html += this.renderBookingCard(b, d, true);
      });
      html += `</div>`;
    }

    return html;
  },

  onStatsDeviceChange(deviceId) {
    this.statsFilter.deviceId = deviceId;
    document.getElementById('mainContent').innerHTML = this.renderDeviceStats();
  },

  onStatsPeriodChange(period) {
    this.statsFilter.period = period;
    document.getElementById('mainContent').innerHTML = this.renderDeviceStats();
  },

  renderUsage() {
    const session = Store.getSession();
    const userId = session.username;
    const myBookings = Store.getMyBookings();
    const validBookings = myBookings.filter(b => b.status !== 'rejected');

    let html = `
      <h1 class="page-title">使用情况</h1>
      <p class="page-subtitle">查看您的设备使用统计</p>
    `;

    const periods = ['today', '3days', 'week', 'month'];
    html += `<div class="stats-grid">`;
    periods.forEach(p => {
      const s = Store.getUserUsageStats(userId, p);
      const topDevice = s.topDeviceId ? Store.getDevice(s.topDeviceId) : null;
      html += `
        <div class="stat-card">
          <div class="stat-icon ${p === 'today' ? 'blue' : p === '3days' ? 'green' : p === 'week' ? 'orange' : 'red'}">📈</div>
          <div class="stat-info">
            <h3>${s.totalBookings}</h3>
            <p>${Store.PERIOD_LABELS[p]} · ${s.deviceCount}台设备</p>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    const credit = Store.getCredit(userId);
    const creditColor = credit.score >= 80 ? 'var(--success)' : credit.score >= 60 ? 'var(--warning)' : 'var(--danger)';
    const creditLevel = credit.score >= 80 ? '优秀' : credit.score >= 60 ? '正常' : '受限';
    html += `
      <div class="credit-detail-card">
        <div class="credit-detail-header">
          <div>
            <h2>⭐ 信誉评分</h2>
            <p>按时完成 +5分 · 超时使用 -10分 · 爽约 -5分 · 低于60分将限制预约</p>
          </div>
          <div class="credit-detail-score" style="color:${creditColor};">${credit.score}<span style="font-size:16px;color:var(--gray-400);"> / 100</span></div>
        </div>
        <div class="credit-detail-bar-wrap">
          <div class="credit-detail-bar-fill" style="width:${credit.score}%;background:${creditColor};"></div>
          <div class="credit-detail-bar-threshold" style="left:60%;"></div>
        </div>
        <div class="credit-detail-meta">
          <span class="credit-level-badge" style="background:${creditColor}1a;color:${creditColor};">${creditLevel}</span>
          ${credit.score >= 60 ? '<span style="color:var(--success);">✅ 允许预约</span>' : '<span style="color:var(--danger);">🚫 已限制预约</span>'}
        </div>
      </div>
    `;

    html += `<h2 class="page-title" style="font-size:18px;">信誉变动记录</h2>`;
    if (credit.history.length === 0) {
      html += this.renderEmptyState('📜', '暂无信誉变动记录', '');
    } else {
      html += `<div class="credit-history-list">`;
      credit.history.forEach(h => {
        const date = new Date(h.time);
        const isPositive = h.change > 0;
        html += `
          <div class="credit-history-item">
            <div class="credit-history-change ${isPositive ? 'positive' : 'negative'}">
              ${isPositive ? '+' : ''}${h.change}
            </div>
            <div class="credit-history-info">
              <div class="credit-history-reason">${this.esc(h.reason)}</div>
              <div class="credit-history-time">${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</div>
            </div>
            <div class="credit-history-score">${h.scoreAfter}分</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    const deviceUsage = {};
    validBookings.forEach(b => {
      if (!deviceUsage[b.deviceId]) deviceUsage[b.deviceId] = { count: 0, name: '', lastDate: '' };
      deviceUsage[b.deviceId].count++;
      const dev = Store.getDevice(b.deviceId);
      if (dev) deviceUsage[b.deviceId].name = dev.name;
      if (b.date > deviceUsage[b.deviceId].lastDate) deviceUsage[b.deviceId].lastDate = b.date;
    });
    const sortedUsage = Object.entries(deviceUsage).sort((a, b) => b[1].count - a[1].count);
    const maxUsage = sortedUsage.length > 0 ? sortedUsage[0][1].count : 1;

    html += `<h2 class="page-title" style="font-size:18px;">设备使用频次</h2>`;
    if (sortedUsage.length === 0) {
      html += this.renderEmptyState('📊', '暂无使用记录', '前往设备列表开始预约');
    } else {
      html += `<div class="ranking-list">`;
      sortedUsage.forEach(([id, info], idx) => {
        const pct = (info.count / maxUsage * 100).toFixed(0);
        html += `
          <div class="ranking-item">
            <span class="ranking-num">${idx + 1}</span>
            <span class="ranking-name">${info.name}</span>
            <div class="ranking-bar-wrap">
              <div class="ranking-bar" style="width:${pct}%"></div>
            </div>
            <span class="ranking-count">${info.count} 次</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `<h2 class="page-title" style="font-size:18px;margin-top:28px;">我的预约记录</h2>`;
    if (myBookings.length === 0) {
      html += this.renderEmptyState('📋', '暂无预约记录', '前往设备列表开始预约');
    } else {
      html += `<div class="bookings-list">`;
      myBookings.forEach(b => {
        const device = Store.getDevice(b.deviceId);
        html += this.renderBookingCard(b, device, false);
      });
      html += `</div>`;
    }

    return html;
  },

  MESSAGE_STATUS: {
    pending: { text: '待审核', cls: 'msg-status-pending' },
    approved: { text: '已通过', cls: 'msg-status-approved' },
    rejected: { text: '已拒绝', cls: 'msg-status-rejected' },
  },

  renderMessages() {
    const session = Store.getSession();
    const isAdmin = session.role === 'admin';

    let html = `
      <h1 class="page-title">收信箱</h1>
      <p class="page-subtitle">${isAdmin ? '查看所有申诉与通知消息' : '查看通知消息与申诉记录'}</p>
    `;

    if (!isAdmin) {
      const credit = Store.getCredit(session.username);
      const check = Store.canSubmitAppeal(session.username);

      if (credit.score < 60) {
        html += `
          <div class="appeal-form-card">
            <div class="appeal-form-header">
              <span class="appeal-form-icon">✉️</span>
              <div>
                <h3>信誉申诉</h3>
                <p>当前信誉分 <strong style="color:var(--danger);">${credit.score}分</strong>，低于60分预约准入线。请发送申诉说明原因，管理员审核通过后将恢复预约权限。</p>
              </div>
            </div>
        `;
        if (check.ok) {
          html += `
            <div class="form-group" style="margin-bottom:16px;">
              <textarea class="form-textarea" id="appealReason" rows="4" maxlength="${this.TEXT_LIMITS.appeal}"
                placeholder="请给出原因说明，以便快速审核通过"></textarea>
            </div>
            <button class="btn btn-primary" onclick="App.sendAppeal()" style="width:100%;justify-content:center;">发送申诉</button>
          `;
        } else {
          html += `<div class="appeal-pending-notice">📌 ${check.reason}</div>`;
        }
        html += `</div>`;
      } else {
        html += `
          <div class="appeal-info-card">
            <span class="appeal-info-icon">✅</span>
            <div>
              <h3>信誉良好</h3>
              <p>您的信誉分为 <strong style="color:var(--success);">${credit.score}分</strong>（≥60分），可正常预约设备。无需发送申诉。</p>
            </div>
          </div>
        `;
      }

      const notices = Store.getMyMessages(session.username).filter(m => m.type === 'notice');
      html += `<h2 class="page-title" style="font-size:18px;margin-top:24px;">通知消息</h2>`;
      if (notices.length === 0) {
        html += this.renderEmptyState('📭', '暂无通知消息', '');
      } else {
        html += `<div class="message-list">`;
        notices.forEach(m => {
          const date = new Date(m.createdAt);
          html += `
            <div class="message-card message-card-notice">
              <div class="message-card-header">
                <div class="message-card-user">
                  <span class="message-avatar" style="background:var(--gray-500);">📢</span>
                  <span class="message-user-name">${this.esc(m.title) || '系统通知'}</span>
                </div>
                <span class="message-time">📅 ${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</span>
              </div>
              <div class="message-card-body">${this.esc(m.content)}</div>
            </div>
          `;
        });
        html += `</div>`;
      }
    }

    if (isAdmin) {
      const repairs = Store.getRepairs();
      const pendingRepairs = repairs.filter(r => r.status === 'pending');
      const processedRepairs = repairs.filter(r => r.status !== 'pending');

      html += `<h2 class="page-title" style="font-size:18px;margin-top:24px;">设备报修</h2>`;
      if (pendingRepairs.length > 0) {
        html += `<div class="message-list">`;
        pendingRepairs.forEach(m => {
          const date = new Date(m.createdAt);
          html += `
            <div class="message-card message-card-repair">
              <div class="message-card-header">
                <div class="message-card-user">
                  <span class="message-avatar" style="background:var(--warning);">🔧</span>
                  <span class="message-user-name">${m.deviceName}</span>
                </div>
                <span class="message-status msg-status-pending">待处理</span>
              </div>
              <div class="message-card-body">${this.esc(m.faultDesc)}</div>
              <div class="message-card-footer">
                <span class="message-time">👤 ${m.userName} · 📅 ${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</span>
                <div class="message-actions">
                  <button class="btn btn-primary btn-sm" onclick="App.processRepairModal('${m.id}')">处理</button>
                </div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      } else {
        html += `<div class="appeal-info-card" style="margin-bottom:16px;"><span class="appeal-info-icon">✅</span><div><h3>暂无待处理报修</h3><p>所有报修已处理完毕</p></div></div>`;
      }

      if (processedRepairs.length > 0) {
        html += `<h2 class="page-title" style="font-size:16px;margin-top:20px;color:var(--gray-500);">已处理报修</h2>`;
        html += `<div class="message-list">`;
        processedRepairs.forEach(m => {
          const date = new Date(m.createdAt);
          const statusText = m.status === 'fixed' ? '已修复' : '无法修复';
          const statusCls = m.status === 'fixed' ? 'msg-status-approved' : 'msg-status-rejected';
          html += `
            <div class="message-card message-card-repair">
              <div class="message-card-header">
                <div class="message-card-user">
                  <span class="message-avatar" style="background:var(--gray-500);">🔧</span>
                  <span class="message-user-name">${m.deviceName}</span>
                </div>
                <span class="message-status ${statusCls}">${statusText}</span>
              </div>
              <div class="message-card-body">${this.esc(m.faultDesc)}</div>
              ${m.processNote ? `<div class="message-reject-reason"><span class="reject-label">处理说明：</span>${this.esc(m.processNote)}</div>` : ''}
              <div class="message-card-footer">
                <span class="message-time">👤 ${m.userName} · 📅 ${date.toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
    } else {
      const myRepairs = Store.getMyMessages(session.username).filter(m => m.type === 'repair');
      if (myRepairs.length > 0) {
        html += `<h2 class="page-title" style="font-size:18px;margin-top:24px;">我的报修记录</h2>`;
        html += `<div class="message-list">`;
        myRepairs.forEach(m => {
          const date = new Date(m.createdAt);
          const statusText = m.status === 'pending' ? '待处理' : m.status === 'fixed' ? '已修复' : '无法修复';
          const statusCls = m.status === 'pending' ? 'msg-status-pending' : m.status === 'fixed' ? 'msg-status-approved' : 'msg-status-rejected';
          html += `
            <div class="message-card message-card-repair">
              <div class="message-card-header">
                <div class="message-card-user">
                  <span class="message-avatar" style="background:var(--warning);">🔧</span>
                  <span class="message-user-name">${m.deviceName}</span>
                </div>
                <span class="message-status ${statusCls}">${statusText}</span>
              </div>
              <div class="message-card-body">${this.esc(m.faultDesc)}</div>
              ${m.processNote ? `<div class="message-reject-reason"><span class="reject-label">处理说明：</span>${this.esc(m.processNote)}</div>` : ''}
              <div class="message-card-footer">
                <span class="message-time">📅 ${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</span>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
    }

    const appeals = isAdmin ? Store.getAppealMessages() : Store.getMyMessages(session.username).filter(m => m.type === 'appeal');
    html += `<h2 class="page-title" style="font-size:18px;margin-top:24px;">${isAdmin ? '申诉列表' : '我的申诉记录'}</h2>`;
    if (appeals.length === 0) {
      html += this.renderEmptyState('�', '暂无申诉记录', '');
    } else {
      html += `<div class="message-list">`;
      appeals.forEach(m => {
        const status = this.MESSAGE_STATUS[m.status] || this.MESSAGE_STATUS.pending;
        const date = new Date(m.createdAt);
        html += `
          <div class="message-card">
            <div class="message-card-header">
              <div class="message-card-user">
                <span class="message-avatar">${m.userName.charAt(0)}</span>
                <span class="message-user-name">${m.userName}</span>
              </div>
              <span class="message-status ${status.cls}">${status.text}</span>
            </div>
            <div class="message-card-body">${this.esc(m.reason)}</div>
            ${m.rejectReason ? `<div class="message-reject-reason"><span class="reject-label">拒绝原因：</span>${this.esc(m.rejectReason)}</div>` : ''}
            <div class="message-card-footer">
              <span class="message-time">📅 ${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</span>
              ${isAdmin && m.status === 'pending' ? `
                <div class="message-actions">
                  <button class="btn btn-primary btn-sm" onclick="App.reviewAppeal('${m.id}', true)">通过</button>
                  <button class="btn btn-outline btn-sm" onclick="App.goToApprovalsAndReject('${m.id}')">拒绝</button>
                </div>
              ` : ''}
              ${m.status !== 'pending' && m.reviewedAt ? `<span class="message-reviewed">审核：${new Date(m.reviewedAt).toLocaleDateString('zh-CN')}</span>` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    return html;
  },

  renderApprovals() {
    const pending = Store.getPendingAppeals();

    let html = `
      <h1 class="page-title">待审批申请</h1>
      <p class="page-subtitle">审核研究员的信誉申诉申请</p>
    `;

    if (pending.length === 0) {
      html += this.renderEmptyState('✅', '暂无待审批申请', '所有申诉已处理完毕');
    } else {
      html += `<div class="approvals-list">`;
      pending.forEach(m => {
        const credit = Store.getCredit(m.userId);
        const date = new Date(m.createdAt);
        html += `
          <div class="approval-card" id="approval-${m.id}">
            <div class="approval-card-top">
              <div class="approval-user-info">
                <span class="message-avatar">${m.userName.charAt(0)}</span>
                <div>
                  <div class="approval-user-name">${m.userName}</div>
                  <div class="approval-user-meta">信誉分：<strong style="color:var(--danger);">${credit.score}分</strong> · 提交于 ${date.toLocaleDateString('zh-CN')} ${date.toTimeString().slice(0,5)}</div>
                </div>
              </div>
              <span class="message-status msg-status-pending">待审核</span>
            </div>
            <div class="approval-reason-section">
              <div class="approval-reason-label">申诉原因</div>
              <div class="approval-reason-text">${this.esc(m.reason)}</div>
            </div>
            <div class="approval-actions">
              <button class="btn btn-outline" onclick="App.reviewAppeal('${m.id}', false)">拒绝（需填写原因）</button>
              <button class="btn btn-primary" onclick="App.reviewAppeal('${m.id}', true)">通过申请</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    return html;
  },

  goToApprovalsAndReject(id) {
    this.navigate('approvals');
    setTimeout(() => {
      const card = document.getElementById(`approval-${id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight');
        setTimeout(() => card.classList.remove('highlight'), 2000);
      }
      this.openRejectModal(id);
    }, 100);
  },

  sendAppeal() {
    const reason = document.getElementById('appealReason').value.trim();
    if (!this.checkText(reason, '申诉原因', this.TEXT_LIMITS.appeal)) return;
    const session = Store.getSession();
    const check = Store.canSubmitAppeal(session.username);
    if (!check.ok) { this.toast(check.reason, 'warning'); return; }
    Store.addMessage(session.username, session.displayName, reason);
    this.toast('申诉已发送，请等待管理员审核', 'success');
    this.navigate('messages');
  },

  reviewAppeal(id, approved) {
    const msg = Store.getMessages().find(m => m.id === id);
    if (!msg) return;
    const credit = Store.getCredit(msg.userId);

    if (approved) {
      this.showModal(`
        <div class="confirm-modal">
          <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--success-bg);">✅</div></div>
          <h2 class="confirm-title">确认通过申请</h2>
          <p class="confirm-desc">通过后该用户信誉分将恢复至60分，可重新预约设备</p>
          <div class="confirm-detail-card">
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">申请人</span>
              <span class="confirm-detail-value">${msg.userName}</span>
            </div>
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">当前</span>
              <span class="confirm-detail-value" style="color:var(--danger);">${credit.score}分 → <strong style="color:var(--success);">60分</strong></span>
            </div>
          </div>
          <div class="confirm-actions">
            <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">再想想</button>
            <button class="btn btn-primary confirm-btn-ok" id="approveAppealBtn">确认通过</button>
          </div>
        </div>
      `);
      document.getElementById('approveAppealBtn').onclick = () => {
        Store.reviewMessage(id, true, Store.getSession().username);
        this.closeModal();
        this.toast('已通过申诉，信誉分已恢复至60', 'success');
        this.renderNav();
        this.navigate(this.currentPage);
      };
    } else {
      this.openRejectModal(id);
    }
  },

  openRejectModal(id) {
    const msg = Store.getMessages().find(m => m.id === id);
    if (!msg) return;
    const credit = Store.getCredit(msg.userId);

    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--danger-bg);">✋</div></div>
        <h2 class="confirm-title">拒绝申诉</h2>
        <p class="confirm-desc">请填写拒绝原因，该原因将以通知形式发送到申请人收信箱</p>
        <div class="confirm-detail-card">
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">申请人</span>
            <span class="confirm-detail-value">${msg.userName}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">信誉分</span>
            <span class="confirm-detail-value" style="color:var(--danger);">${credit.score}分</span>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px;">
          <textarea class="form-textarea" id="rejectReasonInput" rows="3" maxlength="${this.TEXT_LIMITS.rejectReason}"
            placeholder="请说明拒绝原因，该原因将以通知形式发送给申请人"></textarea>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn btn-danger confirm-btn-ok" onclick="App.confirmReject('${id}')">确认拒绝</button>
        </div>
      </div>
    `);
    setTimeout(() => document.getElementById('rejectReasonInput').focus(), 100);
  },

  confirmReject(id) {
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!this.checkText(reason, '拒绝原因', this.TEXT_LIMITS.rejectReason)) return;
    Store.reviewMessage(id, false, Store.getSession().username, reason);
    this.closeModal();
    this.toast('已拒绝申诉，通知已发送', 'info');
    this.renderNav();
    this.navigate(this.currentPage);
  },

  // ===== 数据可迁移性（成果可复用）=====
  _download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportBackup() {
    const data = {};
    Object.values(Store.KEYS).forEach(k => { data[k] = localStorage.getItem(k); });
    data.lab_bookings_version = localStorage.getItem('lab_bookings_version');
    data.exportedAt = new Date().toISOString();
    this._download(`实验室预约备份-${Store.todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json');
    this.toast('数据备份已导出', 'success');
  },

  exportBookingsCSV() {
    const header = ['预约编号', '预约人', '设备编号', '设备名称', '学科', '日期', '时间段', '用途', '同行人员', '状态', '创建时间'];
    const rows = [header];
    Store.getBookings().forEach(b => {
      const device = Store.getDevice(b.deviceId);
      const slotsText = b.timeSlots.map(s => {
        const slot = this.TIME_SLOTS.find(t => t.id === s);
        return slot ? slot.label : s;
      }).join(' / ');
      const status = (this.BOOKING_STATUS[b.status] || {}).text || b.status;
      rows.push([
        b.id, b.userName || '', b.deviceId, device ? device.name : '（已删除）',
        device ? device.field : '', b.date, slotsText,
        b.purpose || '', b.companions || '', status, b.createdAt || '',
      ]);
    });
    // 加 BOM，避免 Excel 打开 CSV 时中文乱码
    const csv = '\uFEFF' + rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    this._download(`预约明细-${Store.todayStr()}.csv`, csv, 'text/csv;charset=utf-8;');
    this.toast(`已导出 ${rows.length - 1} 条预约记录`, 'success');
  },

  importBackup(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { this.toast('文件不是合法的 JSON，导入失败', 'error'); input.value = ''; return; }
      try {
        Object.values(Store.KEYS).forEach(k => {
          if (data[k]) localStorage.setItem(k, data[k]);
        });
        if (data.lab_bookings_version) localStorage.setItem('lab_bookings_version', data.lab_bookings_version);
        this.toast('数据已导入', 'success');
        this.renderNav();
        this.navigate(this.currentPage);
      } catch (e) {
        this.toast('导入失败：' + e.message, 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  },

  renderEmptyState(icon, text, hint) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${text}</div>
        <div class="empty-state-hint">${hint}</div>
      </div>
    `;
  },

  onSearch(value) {
    this.filters.search = value;
    const grid = document.getElementById('devicesGridContainer');
    if (grid) grid.innerHTML = this.renderDevicesGrid();
  },

  onFilterCategory(value) {
    this.filters.category = value;
    const grid = document.getElementById('devicesGridContainer');
    if (grid) grid.innerHTML = this.renderDevicesGrid();
  },

  onFilterField(value) {
    this.filters.field = value;
    const grid = document.getElementById('devicesGridContainer');
    if (grid) grid.innerHTML = this.renderDevicesGrid();
  },

  onFilterStatus(value) {
    this.filters.status = value;
    const grid = document.getElementById('devicesGridContainer');
    if (grid) grid.innerHTML = this.renderDevicesGrid();
  },

  openBookingModal(deviceId) {
    const device = Store.getDevice(deviceId);
    if (!device) return;
    const session = Store.getSession();

    if (session && session.role === 'researcher' && !Store.canBook(session.username)) {
      const credit = Store.getCredit(session.username);
      const hasPending = Store.hasPendingMessage(session.username);
      this.showModal(`
        <div class="confirm-modal">
          <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--danger-bg);">🚫</div></div>
          <h2 class="confirm-title">无法预约</h2>
          <p class="confirm-desc">您的信誉分数为 <strong style="color:var(--danger);">${credit.score}分</strong>，低于60分预约准入线</p>
          <div class="confirm-detail-card">
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">当前</span>
              <span class="confirm-detail-value" style="color:var(--danger);font-weight:700;">${credit.score} / 100</span>
            </div>
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">准入</span>
              <span class="confirm-detail-value">≥ 60 分</span>
            </div>
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">说明</span>
              <span class="confirm-detail-value">信誉分≥60分可正常预约</span>
            </div>
          </div>
          <div class="confirm-actions">
            <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">关闭</button>
            ${hasPending
              ? `<button class="btn btn-primary confirm-btn-ok" style="flex:1;" onclick="App.closeModal();App.navigate('messages')">申诉审核中 →</button>`
              : `<button class="btn btn-primary confirm-btn-ok" style="flex:1;" onclick="App.closeModal();App.navigate('messages')">去申诉 →</button>`
            }
          </div>
        </div>
      `);
      return;
    }

    const today = Store.todayStr();
    const maxDate = Store._dateStr(new Date(Date.now() + 14 * 86400000));

    const slotsHtml = this.TIME_SLOTS.map(s =>
      `<div class="time-slot" data-slot="${s.id}" onclick="App.toggleSlot('${s.id}')">${s.label}</div>`
    ).join('');

    this._currentBookingDeviceId = deviceId;

    this.showModal(`
      <div class="confirm-modal confirm-modal-wide">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--primary-bg);">📅</div></div>
        <h2 class="confirm-title">预约设备</h2>
        <p class="confirm-desc">${device.name} · ${device.model} · 📍${device.location}</p>
        <div class="confirm-form-area">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> 预约日期</label>
            <input type="date" class="form-input" id="bookingDate" min="${today}" max="${maxDate}" value="${today}"
              onchange="App.refreshSlots()">
            <div class="form-hint">最多可预约未来14天</div>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> 时间段（可多选）</label>
            <div class="time-slots" id="timeSlots">${slotsHtml}</div>
          </div>
          <div id="bookingAdvice"></div>
          <div class="form-group">
            <label class="form-label">同行人员</label>
            <input type="text" class="form-input" id="bookingCompanions" maxlength="${this.TEXT_LIMITS.companions}" placeholder="多人用逗号分隔，如：张三、李四">
          </div>
          <div class="form-group">
            <label class="form-label">预约用途</label>
            <textarea class="form-textarea" id="bookingPurpose" maxlength="${this.TEXT_LIMITS.purpose}" placeholder="简要说明使用目的..."></textarea>
          </div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn btn-primary confirm-btn-ok" onclick="App.submitBooking('${deviceId}')">确认预约</button>
        </div>
      </div>
    `);

    this.refreshSlots();
  },

  toggleSlot(slotId) {
    const el = document.querySelector(`.time-slot[data-slot="${slotId}"]`);
    if (!el || el.classList.contains('disabled')) return;
    el.classList.toggle('selected');
    this.refreshAdvice();
  },

  // ===== 智能推荐 =====
  // 依据当前日期与用户关心的时段（优先已选时段，其次已被占用的时段）计算替代方案。
  refreshAdvice() {
    const el = document.getElementById('bookingAdvice');
    if (!el) return;
    const deviceId = this._currentBookingDeviceId;
    const dateEl = document.getElementById('bookingDate');
    if (!deviceId || !dateEl || !dateEl.value) { el.innerHTML = ''; return; }

    const all = [...document.querySelectorAll('.time-slot')];
    const selected = all.filter(e => e.classList.contains('selected')).map(e => e.dataset.slot);
    const blocked = all.filter(e => e.classList.contains('disabled')).map(e => e.dataset.slot);
    const demand = selected.length ? selected : blocked;
    if (!demand.length) { el.innerHTML = ''; return; }

    const s = Store.suggestAlternatives(deviceId, dateEl.value, demand);
    if (!s.devices.length && !s.dates.length) { el.innerHTML = ''; return; }

    let html = `<div class="booking-advice">
      <div class="booking-advice-title">💡 智能推荐</div>
      <div class="booking-advice-hint">所选时段不可用时，可参考以下替代方案</div>`;

    if (s.devices.length) {
      html += `<div class="booking-advice-row">
        <span class="booking-advice-label">同时段可替代设备</span>
        <div class="booking-advice-tags">`;
      s.devices.forEach(d => {
        const title = `${d.field} · ${d.category} · ${d.location}`;
        html += `<button type="button" class="advice-tag" title="${this.esc(title)}"
          onclick="App.switchBookingDevice('${d.id}','${dateEl.value}')">${this.esc(d.name)}</button>`;
      });
      html += `</div></div>`;
    }

    if (s.dates.length) {
      html += `<div class="booking-advice-row">
        <span class="booking-advice-label">本设备最近可约日期</span>
        <div class="booking-advice-tags">`;
      s.dates.forEach(d => {
        html += `<button type="button" class="advice-tag advice-tag-date"
          onclick="App.switchBookingDate('${d}')">${d}</button>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    el.innerHTML = html;
  },

  switchBookingDevice(deviceId, date) {
    this.closeModal();
    this.openBookingModal(deviceId);
    const d = document.getElementById('bookingDate');
    if (d) d.value = date;
    this.refreshSlots();
  },

  switchBookingDate(date) {
    const d = document.getElementById('bookingDate');
    if (d) { d.value = date; }
    this.refreshSlots();
  },

  refreshSlots() {
    const dateEl = document.getElementById('bookingDate');
    if (!dateEl) return;
    const deviceId = this._currentBookingDeviceId;
    const date = dateEl.value;

    document.querySelectorAll('.time-slot').forEach(el => {
      const slotId = el.dataset.slot;
      el.classList.remove('selected', 'disabled');
      if (Store.isSlotBooked(date, deviceId, slotId)) {
        el.classList.add('disabled');
      }
    });

    this.refreshAdvice();
  },

  submitBooking(deviceId) {
    const date = document.getElementById('bookingDate').value;
    const purpose = document.getElementById('bookingPurpose').value.trim();
    const companions = document.getElementById('bookingCompanions').value.trim();
    const selectedSlots = [...document.querySelectorAll('.time-slot.selected')].map(el => el.dataset.slot);

    if (!date) { this.toast('请选择预约日期', 'warning'); return; }
    if (selectedSlots.length === 0) { this.toast('请至少选择一个时间段', 'warning'); return; }
    if (!this.checkText(purpose, '用途', this.TEXT_LIMITS.purpose)) return;
    if (companions && companions.length > this.TEXT_LIMITS.companions) {
      this.toast(`同行人员不能超过 ${this.TEXT_LIMITS.companions} 字`, 'warning');
      return;
    }

    const result = Store.addBooking({
      deviceId,
      date,
      timeSlots: selectedSlots,
      purpose,
      companions,
    });

    if (result.error) {
      this.toast(result.error, 'error');
      this.refreshSlots();
      return;
    }

    this.closeModal();
    this.toast('预约成功！', 'success');
    this.navigate('bookings');
  },

  completeUsage(id) {
    const booking = Store.getBookings().find(b => b.id === id);
    if (!booking) return;
    const device = Store.getDevice(booking.deviceId);
    const deviceName = device ? device.name : '未知设备';
    const slotsText = booking.timeSlots.map(s => {
      const slot = this.TIME_SLOTS.find(t => t.id === s);
      return slot ? slot.label : s;
    }).join('、');

    const slots = booking.timeSlots.map(s => this.TIME_SLOTS.find(t => t.id === s)).filter(Boolean);
    const maxEndHour = Math.max(...slots.map(s => s.end));
    const now = new Date();
    const bookingEnd = new Date(booking.date + 'T' + String(maxEndHour).padStart(2, '0') + ':00:00');
    const isOvertime = now > bookingEnd;
    const credit = Store.getCredit(booking.userId);

    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap"><div class="confirm-icon">${isOvertime ? '⏰' : '✅'}</div></div>
        <h2 class="confirm-title">确认完成使用</h2>
        <p class="confirm-desc">${isOvertime ? '当前已超出预约时段，将记录为超时使用' : '在预约时段内完成，将记录为按时完成'}</p>
        <div class="confirm-detail-card">
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">设备</span>
            <span class="confirm-detail-value">${deviceName}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">时段</span>
            <span class="confirm-detail-value">📅 ${booking.date} ⏰ ${slotsText}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">当前</span>
            <span class="confirm-detail-value">🕐 ${now.toTimeString().slice(0,5)}（时段结束 ${String(maxEndHour).padStart(2,'0')}:00）</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">信誉</span>
            <span class="confirm-detail-value">${credit.score}分 → <strong style="color:${isOvertime ? 'var(--danger)' : 'var(--success)'};">${Math.max(0, Math.min(100, credit.score + (isOvertime ? -10 : +5)))}分</strong>（${isOvertime ? '-10' : '+5'}）</span>
          </div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn ${isOvertime ? 'btn-danger' : 'btn-primary'} confirm-btn-ok" id="completeUsageBtn">确认完成</button>
        </div>
      </div>
    `);
    document.getElementById('completeUsageBtn').onclick = () => {
      const result = Store.completeUsage(id);
      this.closeModal();
      if (result) {
        this.toast(`${result.reason}！信誉${result.change > 0 ? '+' : ''}${result.change}分`, result.change > 0 ? 'success' : 'warning');
        this.navigate('bookings');
      }
    };
  },

  cancelBooking(id) {
    const booking = Store.getBookings().find(b => b.id === id);
    if (!booking) return;
    const device = Store.getDevice(booking.deviceId);
    const deviceName = device ? device.name : '未知设备';
    const slotsText = booking.timeSlots.map(s => {
      const slot = this.TIME_SLOTS.find(t => t.id === s);
      return slot ? slot.label : s;
    }).join('、');

    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap">
          <div class="confirm-icon">⚠️</div>
        </div>
        <h2 class="confirm-title">确认取消预约？</h2>
        <p class="confirm-desc">取消后该时间段将释放，其他用户可重新预约</p>
        <div class="confirm-detail-card">
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">设备</span>
            <span class="confirm-detail-value">${deviceName}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">日期</span>
            <span class="confirm-detail-value">📅 ${booking.date}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">时段</span>
            <span class="confirm-detail-value">⏰ ${slotsText}</span>
          </div>
          ${booking.purpose ? `
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">用途</span>
            <span class="confirm-detail-value">${this.esc(booking.purpose)}</span>
          </div>` : ''}
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">再想想</button>
          <button class="btn btn-danger confirm-btn-ok" id="confirmCancelBtn">确认取消</button>
        </div>
      </div>
    `);
    document.getElementById('confirmCancelBtn').onclick = () => {
      this.closeModal();
      Store.cancelBooking(id);
      this.toast('预约已取消', 'info');
      this.navigate('bookings');
    };
  },

  confirmDeviceAction(deviceId, action) {
    const device = Store.getDevice(deviceId);
    if (!device) return;
    const actions = {
      endMaintenance: { icon: '✅', title: '结束维修', desc: '设备将恢复为可预约状态', btn: '确认恢复', btnCls: 'btn-primary', newStatus: 'available', toast: '设备已恢复可用' },
      disable: { icon: '🚫', title: '停用设备', desc: '停用后设备将无法被预约', btn: '确认停用', btnCls: 'btn-danger', newStatus: 'broken', toast: '设备已停用' },
      enable: { icon: '✅', title: '启用设备', desc: '设备将恢复为可预约状态', btn: '确认启用', btnCls: 'btn-primary', newStatus: 'available', toast: '设备已恢复可用' },
    };
    const a = actions[action];
    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:${a.btnCls === 'btn-danger' ? 'var(--danger-bg)' : 'var(--success-bg)'};">${a.icon}</div></div>
        <h2 class="confirm-title">${a.title}</h2>
        <p class="confirm-desc">${a.desc}</p>
        <div class="confirm-detail-card">
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">设备</span>
            <span class="confirm-detail-value">${device.name}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">型号</span>
            <span class="confirm-detail-value">${device.model}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">位置</span>
            <span class="confirm-detail-value">📍 ${device.location}</span>
          </div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn ${a.btnCls} confirm-btn-ok" onclick="App.doDeviceAction('${deviceId}','${a.newStatus}','${a.toast}')">${a.btn}</button>
        </div>
      </div>
    `);
  },

  doDeviceAction(deviceId, newStatus, toastMsg) {
    Store.updateDeviceStatus(deviceId, newStatus);
    this.closeModal();
    this.toast(toastMsg, newStatus === 'available' ? 'success' : 'info');
    this.navigate(this.currentPage);
  },

  openRepairModal(deviceId) {
    const device = Store.getDevice(deviceId);
    if (!device) return;
    this.showModal(`
      <div class="confirm-modal confirm-modal-wide">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--warning-bg);">🔧</div></div>
        <h2 class="confirm-title">设备报修</h2>
        <p class="confirm-desc">${device.name} · ${device.model} · 📍${device.location}</p>
        <div class="confirm-form-area">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> 故障描述</label>
            <textarea class="form-textarea" id="repairDesc" rows="4" maxlength="${this.TEXT_LIMITS.faultDesc}"
              placeholder="请描述设备故障现象..."></textarea>
          </div>
          <div class="repair-warning">⚠️ 提交报修后，该设备将自动转为维修状态，其他人暂时无法预约。</div>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn btn-danger confirm-btn-ok" onclick="App.submitRepair('${deviceId}')">提交报修</button>
        </div>
      </div>
    `);
    setTimeout(() => document.getElementById('repairDesc').focus(), 100);
  },

  submitRepair(deviceId) {
    const desc = document.getElementById('repairDesc').value.trim();
    if (!this.checkText(desc, '故障描述', this.TEXT_LIMITS.faultDesc)) return;
    const session = Store.getSession();
    const device = Store.getDevice(deviceId);
    Store.addRepairReport(session.username, session.displayName, deviceId, device.name, desc);
    this.closeModal();
    this.toast('报修已提交，设备已转为维修中', 'success');
    this.renderNav();
    this.navigate(this.currentPage);
  },

  processRepairModal(id) {
    const msg = Store.getMessages().find(m => m.id === id);
    if (!msg) return;
    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--warning-bg);">🔧</div></div>
        <h2 class="confirm-title">处理报修</h2>
        <p class="confirm-desc">请选择处理结果</p>
        <div class="confirm-detail-card">
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">设备</span>
            <span class="confirm-detail-value">${msg.deviceName}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">报修人</span>
            <span class="confirm-detail-value">${msg.userName}</span>
          </div>
          <div class="confirm-detail-row">
            <span class="confirm-detail-label">故障</span>
            <span class="confirm-detail-value">${this.esc(msg.faultDesc)}</span>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px;">
          <textarea class="form-textarea" id="processRepairNote" rows="2" maxlength="${this.TEXT_LIMITS.note}"
            placeholder="处理说明（可选）"></textarea>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn btn-danger confirm-btn-ok" style="flex:1;" onclick="App.confirmProcessRepair('${id}', 'unrepairable')">无法修复</button>
          <button class="btn btn-primary confirm-btn-ok" style="flex:1;" onclick="App.confirmProcessRepair('${id}', 'fixed')">已修复</button>
        </div>
      </div>
    `);
  },

  confirmProcessRepair(id, result) {
    const note = document.getElementById('processRepairNote').value.trim();
    if (note && note.length > this.TEXT_LIMITS.note) {
      this.toast(`处理说明不能超过 ${this.TEXT_LIMITS.note} 字`, 'warning');
      return;
    }
    Store.processRepair(id, result, Store.getSession().username, note);
    this.closeModal();
    this.toast(result === 'fixed' ? '已标记为修复，设备恢复可用' : '已标记为无法修复，设备已停用', result === 'fixed' ? 'success' : 'info');
    this.renderNav();
    this.navigate(this.currentPage);
  },

  showModal(html) {
    document.getElementById('modalContainer').innerHTML = `<div class="modal-overlay" onclick="App.onOverlayClick(event)">${html}</div>`;
  },

  onOverlayClick(e) {
    if (e.target.classList.contains('modal-overlay')) this.closeModal();
  },

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  },

  showConfirm(title, message, onConfirm) {
    this.showModal(`
      <div class="confirm-modal">
        <div class="confirm-icon-wrap"><div class="confirm-icon" style="background:var(--danger-bg);">⚠️</div></div>
        <h2 class="confirm-title">${title}</h2>
        <p class="confirm-desc">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-btn-cancel" onclick="App.closeModal()">取消</button>
          <button class="btn btn-danger confirm-btn-ok" id="confirmBtn">确认</button>
        </div>
      </div>
    `);
    document.getElementById('confirmBtn').onclick = () => {
      this.closeModal();
      onConfirm();
    };
  },

  toast(message, type = 'info') {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icons[type] || ''} ${message}`;
    const container = document.getElementById('toastContainer');
    if (!container) { alert(message); return; }
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
      el.style.transition = 'all 0.3s';
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },
};

App.init();
