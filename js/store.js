const Store = {
  KEYS: {
    DEVICES: 'lab_devices',
    BOOKINGS: 'lab_bookings',
    ACCOUNTS: 'lab_accounts',
    SESSION: 'lab_session',
    CREDIT: 'lab_credit',
    MESSAGES: 'lab_messages',
  },

  TIME_SLOTS: [
    { id: 's1', label: '08:00-10:00', start: 8, end: 10 },
    { id: 's2', label: '10:00-12:00', start: 10, end: 12 },
    { id: 's3', label: '14:00-16:00', start: 14, end: 16 },
    { id: 's4', label: '16:00-18:00', start: 16, end: 18 },
  ],

  // ===== 日期工具（一律按浏览器本地时区，避免 toISOString 的 UTC 偏移）=====
  // toISOString() 返回的是 UTC 日期，在 UTC+8 的 00:00–08:00 之间会算成前一天，
  // 导致"今天/近三天/近一周"统计口径整体错位一天，这里统一用本地时区格式化。
  _dateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  todayStr() {
    return this._dateStr(new Date());
  },

  init() {
    const existing = localStorage.getItem(this.KEYS.DEVICES);
    if (!existing) {
      localStorage.setItem(this.KEYS.DEVICES, JSON.stringify(this._seedDevices()));
    } else {
      const devices = JSON.parse(existing);
      if (!devices[0] || !devices[0].field) {
        localStorage.setItem(this.KEYS.DEVICES, JSON.stringify(this._seedDevices()));
      }
    }
    if (!localStorage.getItem(this.KEYS.ACCOUNTS)) {
      localStorage.setItem(this.KEYS.ACCOUNTS, JSON.stringify(this._seedAccounts()));
    }
    // v3：修复种子数据的时区口径（原先按 UTC 生成日期），旧数据需重新播种
    const bookingData = localStorage.getItem(this.KEYS.BOOKINGS);
    const bookingVersion = localStorage.getItem('lab_bookings_version');
    if (!bookingData || bookingVersion !== 'v3') {
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(this._seedBookings()));
      localStorage.setItem('lab_bookings_version', 'v3');
    }
    const creditData = localStorage.getItem(this.KEYS.CREDIT);
    if (!creditData || (JSON.parse(creditData)._version || '') !== 'v2') {
      localStorage.setItem(this.KEYS.CREDIT, JSON.stringify(this._seedCredit()));
    }
    if (!localStorage.getItem(this.KEYS.MESSAGES)) {
      localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(this._seedMessages()));
    }
  },

  _seedDevices() {
    return [
      { id: 'D001', name: '紫外可见分光光度计', model: 'UV-2600', field: '化学', category: '光谱分析', description: '用于物质定性定量分析，波长范围190-1100nm', location: '化学楼A301', status: 'available', tags: ['光谱', '定量分析'] },
      { id: 'D002', name: '扫描电子显微镜', model: 'SEM-5000', field: '材料科学', category: '显微成像', description: '高分辨率表面形貌观察，放大倍数10-500000x', location: '材料楼B205', status: 'available', tags: ['电镜', '表面分析'] },
      { id: 'D003', name: '高速冷冻离心机', model: 'CF-21R', field: '生物学', category: '分离提取', description: '最大转速21000rpm，温控范围-20~40℃', location: '生物楼C102', status: 'available', tags: ['离心', '冷冻'] },
      { id: 'D004', name: '实时荧光定量PCR仪', model: 'qPCR-96', field: '生物学', category: '分子生物', description: '96孔板，支持TaqMan探针和SYBR Green', location: '生物楼C205', status: 'busy', tags: ['PCR', '核酸'] },
      { id: 'D005', name: '高效液相色谱仪', model: 'HPLC-1200', field: '化学', category: '色谱分析', description: '二元梯度泵，DAD检测器，自动进样', location: '化学楼A205', status: 'available', tags: ['色谱', '分离'] },
      { id: 'D006', name: '分析天平', model: 'AB-0.1mg', field: '化学', category: '常规仪器', description: '量程220g，精度0.1mg，自动校准', location: '化学楼A101', status: 'available', tags: ['称量', '精密'] },
      { id: 'D007', name: '二氧化碳培养箱', model: 'CI-160', field: '生物学', category: '细胞培养', description: '温度37℃，CO2浓度5%，湿度95%', location: '生物楼C301', status: 'available', tags: ['培养', '细胞'] },
      { id: 'D008', name: '超声波清洗机', model: 'UC-40K', field: '物理学', category: '常规仪器', description: '频率40kHz，容积10L，加热功能', location: '物理楼D101', status: 'maintenance', tags: ['清洗', '超声'] },
      { id: 'D009', name: '傅里叶红外光谱仪', model: 'FTIR-8400', field: '化学', category: '光谱分析', description: '波数范围400-4000cm⁻¹，ATR附件', location: '化学楼A302', status: 'available', tags: ['红外', '光谱'] },
      { id: 'D010', name: '原子吸收光谱仪', model: 'AA-7000', field: '化学', category: '光谱分析', description: '火焰法+石墨炉法，检测限ppb级', location: '化学楼A303', status: 'available', tags: ['原子吸收', '金属'] },
      { id: 'D011', name: '多功能振荡器', model: 'OS-300', field: '生物学', category: '常规仪器', description: '回旋+往复模式，转速50-300rpm', location: '生物楼C103', status: 'available', tags: ['振荡', '混匀'] },
      { id: 'D012', name: '凝胶成像系统', model: 'GI-3000', field: '生物学', category: '分子生物', description: '紫外/白光透射，CCD高灵敏度成像', location: '生物楼C206', status: 'available', tags: ['成像', '电泳'] },
      { id: 'D013', name: '脉冲激光器', model: 'PL-1064', field: '物理学', category: '光学仪器', description: 'Nd:YAG激光器，波长1064nm，脉冲能量500mJ', location: '物理楼D201', status: 'available', tags: ['激光', '光学'] },
      { id: 'D014', name: '数字示波器', model: 'DSO-200M', field: '物理学', category: '电子测量', description: '带宽200MHz，采样率1GSa/s，4通道', location: '物理楼D202', status: 'available', tags: ['示波器', '电子'] },
      { id: 'D015', name: '高斯计/特斯拉计', model: 'GM-2000', field: '物理学', category: '电磁测量', description: '量程0-2000mT，分辨率0.01mT，交直流测量', location: '物理楼D203', status: 'available', tags: ['磁场', '电磁'] },
      { id: 'D016', name: 'X射线衍射仪', model: 'XRD-6000', field: '材料科学', category: '结构分析', description: 'θ/θ测角仪，Cu靶，扫描范围5-90°', location: '材料楼B201', status: 'available', tags: ['XRD', '晶体'] },
      { id: 'D017', name: '万能材料试验机', model: 'UT-100kN', field: '材料科学', category: '力学测试', description: '最大载荷100kN，拉伸/压缩/弯曲测试', location: '材料楼B301', status: 'available', tags: ['力学', '拉伸'] },
      { id: 'D018', name: '光学平台', model: 'OT-1200', field: '物理学', category: '光学仪器', description: '1200×900mm不锈钢蜂窝隔振台面', location: '物理楼D204', status: 'available', tags: ['光学', '隔振'] },
    ];
  },

  _seedAccounts() {
    return [
      { username: 'admin', password: 'admin123', role: 'admin', displayName: '系统管理员' },
      { username: 'zhang', password: 'zhang123', role: 'researcher', displayName: '张研究员' },
      { username: 'li', password: 'li123', role: 'researcher', displayName: '李研究员' },
      { username: 'wang', password: 'wang123', role: 'researcher', displayName: '王研究员' },
    ];
  },

  _seedBookings() {
    const bookings = [];
    const users = [
      { userId: 'zhang', userName: '张研究员' },
      { userId: 'li', userName: '李研究员' },
      { userId: 'wang', userName: '王研究员' },
    ];
    const deviceIds = ['D001','D002','D003','D004','D005','D006','D007','D009','D010','D012','D013','D016','D017'];
    const purposes = ['课题实验', '样品检测', '数据分析', '课程教学', '毕业论文', '合作项目'];
    const slotSets = [['s1'],['s2'],['s3'],['s4'],['s1','s2'],['s3','s4']];

    const todayStr = this.todayStr();
    const pcrUser = users[Math.floor(Math.random() * users.length)];
    bookings.push({
      id: 'B' + (Date.now() + 100000).toString(36).toUpperCase(),
      userId: pcrUser.userId,
      userName: pcrUser.userName,
      deviceId: 'D004',
      date: todayStr,
      timeSlots: ['s3', 's4'],
      purpose: '课题实验',
      status: 'approved',
      createdAt: new Date().toISOString(),
    });

    let counter = 0;
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(Date.now() - dayOffset * 86400000);
      const dateStr = this._dateStr(date);
      const count = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < count; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
        const slots = slotSets[Math.floor(Math.random() * slotSets.length)];
        const isCancelled = Math.random() < 0.1;
        let status = 'completed';
        if (dayOffset === 0) status = 'approved';
        if (isCancelled) status = 'rejected';
        bookings.push({
          id: 'B' + (Date.now() - counter * 1000).toString(36).toUpperCase(),
          userId: user.userId,
          userName: user.userName,
          deviceId,
          date: dateStr,
          timeSlots: slots,
          purpose: purposes[Math.floor(Math.random() * purposes.length)],
          status,
          createdAt: new Date(date.getTime() - Math.random() * 86400000).toISOString(),
        });
        counter++;
      }
    }
    return bookings;
  },

  _seedCredit() {
    const now = Date.now();
    const mkHistory = (items) => items.map((it, i) => ({
      time: new Date(now - (items.length - i) * 2 * 86400000).toISOString(),
      change: it.change,
      reason: it.reason,
      scoreAfter: it.scoreAfter,
    }));

    return {
      _version: 'v2',
      zhang: {
        score: 85,
        history: mkHistory([
          { change: -10, reason: '超时使用', scoreAfter: 90 },
          { change: +5, reason: '按时完成', scoreAfter: 95 },
          { change: -5, reason: '爽约（取消已确认预约）', scoreAfter: 90 },
          { change: -10, reason: '超时使用', scoreAfter: 80 },
          { change: +5, reason: '按时完成', scoreAfter: 85 },
        ]),
      },
      li: {
        score: 95,
        history: mkHistory([
          { change: -10, reason: '超时使用', scoreAfter: 90 },
          { change: +5, reason: '按时完成', scoreAfter: 95 },
        ]),
      },
      wang: {
        score: 50,
        history: mkHistory([
          { change: -10, reason: '超时使用', scoreAfter: 90 },
          { change: +5, reason: '按时完成', scoreAfter: 95 },
          { change: -10, reason: '超时使用', scoreAfter: 85 },
          { change: -5, reason: '爽约（取消已确认预约）', scoreAfter: 80 },
          { change: -10, reason: '超时使用', scoreAfter: 70 },
          { change: -10, reason: '超时使用', scoreAfter: 60 },
          { change: -10, reason: '超时使用', scoreAfter: 50 },
        ]),
      },
    };
  },

  _seedMessages() {
    const now = Date.now();
    return [
      {
        id: 'M001',
        type: 'appeal',
        userId: 'wang',
        userName: '王研究员',
        reason: '上周因实验反应时间超出预期导致超时，非主观故意。后续已调整实验方案，保证在预约时段内完成，请求恢复预约权限。',
        status: 'pending',
        createdAt: new Date(now - 2 * 86400000).toISOString(),
      },
      {
        id: 'M002',
        type: 'appeal',
        userId: 'zhang',
        userName: '张研究员',
        reason: '因设备故障导致样品处理延误超时，已附上设备报修记录，恳请管理员核实并恢复信誉分。',
        status: 'approved',
        createdAt: new Date(now - 10 * 86400000).toISOString(),
        reviewedAt: new Date(now - 9 * 86400000).toISOString(),
        reviewer: 'admin',
      },
    ];
  },

  getDevices() {
    return JSON.parse(localStorage.getItem(this.KEYS.DEVICES) || '[]');
  },

  getDevice(id) {
    return this.getDevices().find(d => d.id === id);
  },

  getCategories() {
    const devices = this.getDevices();
    return [...new Set(devices.map(d => d.category))];
  },

  getFields() {
    const devices = this.getDevices();
    return [...new Set(devices.map(d => d.field))].sort();
  },

  getAccounts() {
    return JSON.parse(localStorage.getItem(this.KEYS.ACCOUNTS) || '[]');
  },

  login(username, password) {
    const account = this.getAccounts().find(a => a.username === username && a.password === password);
    if (account) {
      const session = { username: account.username, role: account.role, displayName: account.displayName };
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));
      return session;
    }
    return null;
  },

  logout() {
    localStorage.removeItem(this.KEYS.SESSION);
  },

  getSession() {
    const s = localStorage.getItem(this.KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  isAdmin() {
    const s = this.getSession();
    return s && s.role === 'admin';
  },

  getBookings() {
    return JSON.parse(localStorage.getItem(this.KEYS.BOOKINGS) || '[]');
  },

  getMyBookings() {
    const session = this.getSession();
    if (!session) return [];
    return this.getBookings().filter(b => b.userId === session.username);
  },

  addBooking(booking) {
    const bookings = this.getBookings();
    const session = this.getSession();

    for (const slot of booking.timeSlots) {
      if (this.isSlotBooked(booking.date, booking.deviceId, slot)) {
        return { error: '所选时间段已被他人预约，请重新选择' };
      }
    }

    booking.id = 'B' + Date.now().toString(36).toUpperCase();
    booking.createdAt = new Date().toISOString();
    booking.userId = session ? session.username : '';
    booking.userName = session ? session.displayName : booking.userName;
    if (session && session.role === 'researcher' && this.canBook(session.username)) {
      booking.status = 'approved';
    } else {
      booking.status = 'pending';
    }
    bookings.unshift(booking);
    localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(bookings));
    return booking;
  },

  cancelBooking(id) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      const wasApproved = bookings[idx].status === 'approved';
      bookings[idx].status = 'rejected';
      bookings[idx].cancelledAt = new Date().toISOString();
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(bookings));
      if (wasApproved) {
        this.updateCredit(bookings[idx].userId, -5, '爽约（取消已确认预约）', id);
      }
      return true;
    }
    return false;
  },

  completeUsage(id) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return null;

    const booking = bookings[idx];
    const now = new Date();

    const slots = booking.timeSlots
      .map(s => this.TIME_SLOTS.find(t => t.id === s))
      .filter(Boolean);
    const maxEndHour = Math.max(...slots.map(s => s.end));
    const bookingEnd = new Date(booking.date + 'T' + String(maxEndHour).padStart(2, '0') + ':00:00');

    let change, reason, usageStatus;
    if (now > bookingEnd) {
      change = -10;
      reason = '超时使用';
      usageStatus = 'overtime';
    } else {
      change = +5;
      reason = '按时完成';
      usageStatus = 'completed';
    }

    bookings[idx].actualEndTime = now.toISOString();
    bookings[idx].usageStatus = usageStatus;
    bookings[idx].status = 'completed';
    localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(bookings));

    this.updateCredit(booking.userId, change, reason, id);
    return { change, reason, usageStatus };
  },

  checkOvertime() {
    const bookings = this.getBookings();
    const now = new Date();
    let changed = false;

    bookings.forEach(b => {
      if (b.status !== 'approved') return;
      const slots = b.timeSlots
        .map(s => this.TIME_SLOTS.find(t => t.id === s))
        .filter(Boolean);
      if (slots.length === 0) return;
      const maxEndHour = Math.max(...slots.map(s => s.end));
      const bookingEnd = new Date(b.date + 'T' + String(maxEndHour).padStart(2, '0') + ':00:00');
      if (now > bookingEnd) {
        b.status = 'overtime';
        b.usageStatus = 'overtime';
        b.actualEndTime = now.toISOString();
        b.autoOvertime = true;
        changed = true;
        this.updateCredit(b.userId, -10, '超时使用（系统自动检测）', b.id);
      }
    });

    if (changed) {
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(bookings));
    }
    return changed;
  },

  getCredit(username) {
    const all = JSON.parse(localStorage.getItem(this.KEYS.CREDIT) || '{}');
    if (!all[username]) return { score: 100, history: [] };
    return all[username];
  },

  updateCredit(username, change, reason, bookingId) {
    const all = JSON.parse(localStorage.getItem(this.KEYS.CREDIT) || '{}');
    if (!all[username]) all[username] = { score: 100, history: [] };
    all[username].score = Math.max(0, Math.min(100, all[username].score + change));
    all[username].history.unshift({
      time: new Date().toISOString(),
      change,
      reason,
      bookingId,
      scoreAfter: all[username].score,
    });
    all[username].history = all[username].history.slice(0, 10);
    localStorage.setItem(this.KEYS.CREDIT, JSON.stringify(all));
  },

  canBook(username) {
    return this.getCredit(username).score >= 60;
  },

  getMessages() {
    return JSON.parse(localStorage.getItem(this.KEYS.MESSAGES) || '[]');
  },

  getMyMessages(userId) {
    return this.getMessages().filter(m => m.userId === userId);
  },

  getAppealMessages() {
    return this.getMessages().filter(m => m.type === 'appeal');
  },

  getPendingAppeals() {
    return this.getAppealMessages().filter(m => m.status === 'pending');
  },

  getPendingMessageCount() {
    return this.getPendingAppeals().length;
  },

  canSubmitAppeal(userId) {
    if (this.getCredit(userId).score >= 60) return { ok: false, reason: '信誉分≥60分，无需申诉' };
    if (this.hasPendingMessage(userId)) return { ok: false, reason: '您已有待审核的申诉' };
    const today = this.todayStr();
    const submittedToday = this.getMyMessages(userId).some(m =>
      m.type === 'appeal' && m.createdAt.startsWith(today)
    );
    if (submittedToday) return { ok: false, reason: '今天已提交过申诉，请明天再试' };
    return { ok: true };
  },

  addMessage(userId, userName, reason) {
    const messages = this.getMessages();
    const msg = {
      id: 'M' + Date.now().toString(36).toUpperCase(),
      type: 'appeal',
      userId,
      userName,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    messages.unshift(msg);
    localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));
    return msg;
  },

  addNotice(userId, userName, title, content) {
    const messages = this.getMessages();
    const msg = {
      id: 'N' + Date.now().toString(36).toUpperCase(),
      type: 'notice',
      userId,
      userName,
      title,
      content,
      createdAt: new Date().toISOString(),
      from: 'admin',
      read: false,
    };
    messages.unshift(msg);
    localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));
    return msg;
  },

  addRepairReport(userId, userName, deviceId, deviceName, faultDesc) {
    const messages = this.getMessages();
    const msg = {
      id: 'R' + Date.now().toString(36).toUpperCase(),
      type: 'repair',
      userId,
      userName,
      deviceId,
      deviceName,
      faultDesc,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    messages.unshift(msg);
    localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));
    this.updateDeviceStatus(deviceId, 'maintenance');
    return msg;
  },

  getRepairs() {
    return this.getMessages().filter(m => m.type === 'repair');
  },

  getPendingRepairs() {
    return this.getRepairs().filter(m => m.status === 'pending');
  },

  getPendingRepairCount() {
    return this.getPendingRepairs().length;
  },

  updateDeviceStatus(deviceId, status) {
    const devices = this.getDevices();
    const idx = devices.findIndex(d => d.id === deviceId);
    if (idx !== -1) {
      devices[idx].status = status;
      localStorage.setItem(this.KEYS.DEVICES, JSON.stringify(devices));
    }
  },

  processRepair(id, result, processor, note) {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1) return false;

    const msg = messages[idx];
    msg.status = result;
    msg.processedAt = new Date().toISOString();
    msg.processor = processor;
    if (note) msg.processNote = note;
    localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));

    if (result === 'fixed') {
      this.updateDeviceStatus(msg.deviceId, 'available');
    } else {
      this.updateDeviceStatus(msg.deviceId, 'broken');
    }

    const title = result === 'fixed' ? '设备已修复' : '设备无法修复';
    const content = result === 'fixed'
      ? `您报修的设备「${msg.deviceName}」已修复，现已恢复可用。${note ? '说明：' + note : ''}`
      : `您报修的设备「${msg.deviceName}」无法修复，现已停用。${note ? '说明：' + note : ''}`;
    this.addNotice(msg.userId, msg.userName, title, content);

    return true;
  },

  getUnreadNoticeCount(userId) {
    return this.getMyMessages(userId).filter(m => m.type === 'notice' && !m.read).length;
  },

  markNoticesRead(userId) {
    const messages = this.getMessages();
    let changed = false;
    messages.forEach(m => {
      if (m.userId === userId && m.type === 'notice' && !m.read) {
        m.read = true;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));
    }
  },

  reviewMessage(id, approved, reviewer, rejectReason) {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1) return false;

    const msg = messages[idx];
    msg.status = approved ? 'approved' : 'rejected';
    msg.reviewedAt = new Date().toISOString();
    msg.reviewer = reviewer;
    if (!approved && rejectReason) {
      msg.rejectReason = rejectReason;
    }
    localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(messages));

    if (approved) {
      const all = JSON.parse(localStorage.getItem(this.KEYS.CREDIT) || '{}');
      const userId = msg.userId;
      if (!all[userId]) all[userId] = { score: 100, history: [] };
      const oldScore = all[userId].score;
      all[userId].score = 60;
      all[userId].history.unshift({
        time: new Date().toISOString(),
        change: 60 - oldScore,
        reason: '管理员审核通过，信誉分恢复至60',
        messageId: id,
        scoreAfter: 60,
      });
      localStorage.setItem(this.KEYS.CREDIT, JSON.stringify(all));
    } else {
      this.addNotice(msg.userId, msg.userName, '申诉被拒绝', rejectReason || '管理员未提供拒绝原因');
    }
    return true;
  },

  hasPendingMessage(userId) {
    return this.getMyMessages(userId).some(m => m.type === 'appeal' && m.status === 'pending');
  },

  getBookingsByDateAndDevice(date, deviceId) {
    return this.getBookings().filter(b =>
      b.deviceId === deviceId &&
      b.date === date &&
      b.status !== 'rejected'
    );
  },

  isSlotBooked(date, deviceId, slot) {
    const bookings = this.getBookingsByDateAndDevice(date, deviceId);
    return bookings.some(b => b.timeSlots.includes(slot));
  },

  // ===== 智能推荐 =====
  // 目标时段不可用时给出替代方案，包含两条策略：
  //  ① 同时段空闲的可替代设备（优先同 category，其次同 field）
  //  ② 本设备未来 14 天内最近的可用日期
  // 纯规则实现，不依赖任何外部服务，离线可用。
  suggestAlternatives(deviceId, date, timeSlots, limit = 3) {
    const device = this.getDevice(deviceId);
    if (!device || !date || !timeSlots.length) return { devices: [], dates: [] };

    const isFree = (dId, day, slots) => slots.every(s => !this.isSlotBooked(day, dId, s));

    const candidates = this.getDevices().filter(d =>
      d.id !== deviceId &&
      d.status === 'available' &&
      isFree(d.id, date, timeSlots) &&
      (d.category === device.category || d.field === device.field)
    );
    const relevance = d => (d.category === device.category ? 2 : 0) + (d.field === device.field ? 1 : 0);
    candidates.sort((a, b) => relevance(b) - relevance(a) || a.id.localeCompare(b.id));

    const dates = [];
    for (let i = 1; i <= 14 && dates.length < 3; i++) {
      const day = this._dateStr(new Date(Date.now() + i * 86400000));
      if (isFree(deviceId, day, timeSlots)) dates.push(day);
    }

    return { devices: candidates.slice(0, limit), dates };
  },

  getStats() {
    const devices = this.getDevices();
    const allBookings = this.getBookings().filter(b => b.status !== 'rejected');
    const myBookings = this.getMyBookings().filter(b => b.status !== 'rejected');
    const myActive = myBookings.filter(b => b.status === 'pending' || b.status === 'approved');
    return {
      totalDevices: devices.length,
      availableDevices: devices.filter(d => d.status === 'available').length,
      totalBookings: allBookings.length,
      activeBookings: myActive.length,
      myTotalBookings: myBookings.length,
    };
  },

  _getPeriodStart(period) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (period) {
      case 'today': return now;
      case '3days': return new Date(now.getTime() - 2 * 86400000);
      case 'week': return new Date(now.getTime() - 6 * 86400000);
      case 'month': return new Date(now.getTime() - 29 * 86400000);
      default: return new Date(0);
    }
  },

  PERIOD_LABELS: {
    today: '当天',
    '3days': '近三天',
    week: '近一周',
    month: '近一个月',
  },

  getDeviceAccessCount(deviceId, period) {
    const start = this._getPeriodStart(period);
    const startDate = this._dateStr(start);
    return this.getBookings().filter(b =>
      b.deviceId === deviceId &&
      b.date >= startDate &&
      b.status !== 'rejected'
    ).length;
  },

  getDeviceAccessStats(deviceId) {
    const periods = ['today', '3days', 'week', 'month'];
    const stats = {};
    periods.forEach(p => { stats[p] = this.getDeviceAccessCount(deviceId, p); });
    return stats;
  },

  getAllDeviceAccessStats(period) {
    const devices = this.getDevices();
    return devices.map(d => ({
      device: d,
      count: this.getDeviceAccessCount(d.id, period),
    })).sort((a, b) => b.count - a.count);
  },

  getDeviceRecentBookings(deviceId, limit = 10) {
    return this.getBookings()
      .filter(b => b.deviceId === deviceId && b.status !== 'rejected')
      .slice(0, limit);
  },

  getUserUsageStats(userId, period) {
    const start = this._getPeriodStart(period);
    const startDate = this._dateStr(start);
    const bookings = this.getBookings().filter(b =>
      b.userId === userId &&
      b.date >= startDate &&
      b.status !== 'rejected'
    );
    const deviceCount = new Set(bookings.map(b => b.deviceId)).size;
    const deviceUsage = {};
    bookings.forEach(b => {
      deviceUsage[b.deviceId] = (deviceUsage[b.deviceId] || 0) + 1;
    });
    const topDevice = Object.entries(deviceUsage).sort((a, b) => b[1] - a[1])[0];
    return {
      totalBookings: bookings.length,
      deviceCount,
      topDeviceId: topDevice ? topDevice[0] : null,
      topDeviceCount: topDevice ? topDevice[1] : 0,
    };
  },
};
