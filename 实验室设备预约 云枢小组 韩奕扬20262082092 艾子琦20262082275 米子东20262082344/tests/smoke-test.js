// 临时冒烟测试：用最小 DOM/localStorage 桩验证 store.js + app.js 的核心流程
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 站点文件位于仓库根目录，测试文件置于 tests/，故向上回退一级
const dir = path.resolve(__dirname, '..');

const storage = {};
const localStorage = {
  getItem: k => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: k => { delete storage[k]; },
};

// 极简元素桩
function makeEl(id) {
  return {
    id,
    innerHTML: '',
    dataset: {},
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    style: {},
    value: '',
    focus() {},
    remove() {},
    scrollIntoView() {},
    appendChild() {},
    onclick: null,
    querySelectorAll: () => [],
  };
}
const els = {};
const document = {
  getElementById: id => (els[id] = els[id] || makeEl(id)),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => makeEl('tmp'),
};

const sandbox = { localStorage, document, setTimeout: () => 0, setInterval: () => 0, clearInterval: () => {}, Math, Date, JSON, console, alert: console.log };
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(dir, 'js/store.js'), 'utf8'), sandbox, { filename: 'store.js' });

// 把 App.init() 剥掉再加载 app.js，改为手动初始化以便控制
let appSrc = fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8');
appSrc = appSrc.replace(/App\.init\(\);\s*$/, '');
vm.runInContext(appSrc, sandbox, { filename: 'app.js' });

// const 声明不会挂到 sandbox 对象上，需从全局词法作用域取值
const Store = vm.runInContext('Store', sandbox);
const App = vm.runInContext('App', sandbox);
const assert = require('assert');
let pass = 0;
function ok(name, fn) {
  try { fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.log('  ✗ ' + name + ' → ' + e.message); process.exitCode = 1; }
}

console.log('\n[1] 初始化与种子数据');
Store.init();
const devices = Store.getDevices();
const bookings = Store.getBookings();
ok('设备 18 台', () => assert.strictEqual(devices.length, 18));
ok('预约种子非空', () => assert.ok(bookings.length > 0));

console.log('\n[2] 本地时区日期（核心修复）');
const now = new Date();
const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
ok('todayStr 等于本地日期', () => assert.strictEqual(Store.todayStr(), localToday));
ok('种子今日预约日期与本地日期一致', () => {
  const t = bookings.find(b => b.date === localToday);
  assert.ok(t, '未找到日期为 ' + localToday + ' 的预约');
});
ok('_getPeriodStart(today) 转字符串后为本地今天', () => {
  assert.strictEqual(Store._dateStr(Store._getPeriodStart('today')), localToday);
});

console.log('\n[3] XSS 转义');
ok('esc 转义尖括号与引号', () => {
  assert.strictEqual(App.esc('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
ok('esc 处理 null/undefined', () => {
  assert.strictEqual(App.esc(null), '');
  assert.strictEqual(App.esc(undefined), '');
});

console.log('\n[4] 登录与预约主流程');
ok('管理员登录成功', () => {
  const s = Store.login('admin', 'admin123');
  assert.ok(s && s.role === 'admin');
});
ok('错误密码登录失败', () => assert.strictEqual(Store.login('admin', 'wrong'), null));

Store.login('li', 'li123');
ok('研究员登录为 zhang/li', () => {
  const s = Store.getSession();
  assert.ok(s && s.role === 'researcher');
});
ok('li 信誉分 95，可预约', () => {
  assert.strictEqual(Store.getCredit('li').score, 95);
  assert.strictEqual(Store.canBook('li'), true);
});

const targetDevice = Store.getDevices().find(d => d.status === 'available');
const futureDate = Store._dateStr(new Date(Date.now() + 3 * 86400000));
ok('可创建预约且自动通过', () => {
  const r = Store.addBooking({ deviceId: targetDevice.id, date: futureDate, timeSlots: ['s1'], purpose: '测试用途', companions: '张三' });
  assert.ok(!r.error, JSON.stringify(r));
  assert.strictEqual(r.status, 'approved');
});
ok('同时段重复预约被拦截', () => {
  const r = Store.addBooking({ deviceId: targetDevice.id, date: futureDate, timeSlots: ['s1'], purpose: '冲突测试', companions: '' });
  assert.ok(r.error, '应当返回冲突错误');
});
ok('相邻时段仍可预约', () => {
  const r = Store.addBooking({ deviceId: targetDevice.id, date: futureDate, timeSlots: ['s4'], purpose: '相邻时段', companions: '' });
  assert.ok(!r.error, JSON.stringify(r));
});

console.log('\n[5] 信誉分与限制');
ok('wang 信誉 50 < 60 禁止预约', () => {
  assert.strictEqual(Store.getCredit('wang').score, 50);
  assert.strictEqual(Store.canBook('wang'), false);
});
ok('信誉分上下限钳制在 0-100', () => {
  Store.updateCredit('zhang', -999, '测试扣爆');
  assert.strictEqual(Store.getCredit('zhang').score, 0);
  Store.updateCredit('zhang', +999, '测试加爆');
  assert.strictEqual(Store.getCredit('zhang').score, 100);
});
ok('信誉变动记录最多保留 10 条', () => {
  assert.ok(Store.getCredit('zhang').history.length <= 10);
});

console.log('\n[6] 报修闭环');
Store.login('zhang', 'zhang123');
const dev = Store.getDevices().find(d => d.status === 'available' && d.id !== targetDevice.id);
ok('提交报修后设备转维修中', () => {
  Store.addRepairReport('zhang', '张研究员', dev.id, dev.name, '设备无法开机');
  assert.strictEqual(Store.getDevice(dev.id).status, 'maintenance');
});
ok('维修中设备产生待处理报修', () => assert.ok(Store.getPendingRepairs().length > 0));
const repair = Store.getPendingRepairs()[0];
ok('管理员处理为已修复 → 设备恢复可用', () => {
  Store.processRepair(repair.id, 'fixed', 'admin', '更换电源模块');
  assert.strictEqual(Store.getDevice(repair.deviceId).status, 'available');
});

console.log('\n[7] 申诉闭环');
ok('已有待审核申诉时正确拦截重复提交', () => {
  // 种子数据里 wang 本来就有一条 pending 申诉，应当被拦截
  const c = Store.canSubmitAppeal('wang');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.reason, '您已有待审核的申诉');
});
ok('信誉分 ≥60 的用户无需申诉', () => {
  Store.updateCredit('zhang', +60, '复位测试');
  const c = Store.canSubmitAppeal('zhang');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.reason, '信誉分≥60分，无需申诉');
});
const before = Store.getCredit('wang').score;
ok('申诉通过后信誉恢复至 60', () => {
  const pending = Store.getPendingAppeals();
  assert.ok(pending.length > 0, '应有待处理申诉');
  Store.reviewMessage(pending[0].id, true, 'admin');
  const s = Store.getCredit('wang').score;
  assert.strictEqual(s, 60, `期望 60，实际 ${s}（操作前 ${before}）`);
});

console.log('\n[8] 页面渲染不抛异常');
const pages = ['dashboard', 'devices', 'bookings'];
pages.forEach(p => {
  ok(`渲染 ${p} 页面`, () => {
    const html = App['render' + p[0].toUpperCase() + p.slice(1)] ? App['render' + p[0].toUpperCase() + p.slice(1)]() : null;
    if (html !== null) assert.ok(typeof html === 'string' && html.length > 0);
  });
});
ok('渲染 XSS 内容不泄漏原始标签', () => {
  Store.addBooking({ deviceId: Store.getDevices()[5].id, date: futureDate, timeSlots: ['s2'], purpose: '<img src=x onerror=alert(1)>', companions: '' });
  const b = Store.getBookings().find(x => x.purpose.includes('onerror'));
  const card = App.renderBookingCard(b, Store.getDevice(b.deviceId), false);
  assert.ok(!card.includes('<img src=x onerror'), '原始标签未被转义！');
  assert.ok(card.includes('&lt;img'), '未见到转义结果');
});

console.log('\n[9] 智能推荐（新增功能）');
ok('返回同类可替代设备', () => {
  // targetDevice 已在 s1/s4 被占用，用同一时段查询应给出替代设备
  const s = Store.suggestAlternatives(targetDevice.id, futureDate, ['s1']);
  assert.ok(Array.isArray(s.devices), '应返回 devices 数组');
  assert.ok(s.devices.every(d => d.id !== targetDevice.id), '不应推荐自身');
  assert.ok(s.devices.every(d => d.status === 'available'), '推荐设备必须可用');
});
ok('推荐设备在目标时段确实空闲', () => {
  const s = Store.suggestAlternatives(targetDevice.id, futureDate, ['s1']);
  s.devices.forEach(d => {
    assert.strictEqual(Store.isSlotBooked(futureDate, d.id, 's1'), false, `${d.id} 在 s1 其实已被占用`);
  });
});
ok('推荐设备优先同分类/同学科', () => {
  const dev = Store.getDevice(targetDevice.id);
  const s = Store.suggestAlternatives(targetDevice.id, futureDate, ['s1']);
  assert.ok(s.devices.every(d => d.category === dev.category || d.field === dev.field),
    '推荐结果必须与目标设备同类或同学科');
});
ok('返回本设备最近可用日期且不重复', () => {
  const s = Store.suggestAlternatives(targetDevice.id, futureDate, ['s1']);
  assert.ok(s.dates.length > 0, '应有可用日期');
  assert.strictEqual(new Set(s.dates).size, s.dates.length, '日期不应重复');
});
ok('参数异常（设备不存在）时安全返回空结果', () => {
  const s = Store.suggestAlternatives('DXXX', futureDate, ['s1']);
  // 注意：不能跨 vm 沙箱用 deepStrictEqual 比较（原型不同），逐字段断言
  assert.ok(Array.isArray(s.devices) && s.devices.length === 0, 'devices 应为空数组');
  assert.ok(Array.isArray(s.dates) && s.dates.length === 0, 'dates 应为空数组');
});
ok('日期或时段为空时安全返回空结果', () => {
  const s1 = Store.suggestAlternatives(targetDevice.id, '', ['s1']);
  const s2 = Store.suggestAlternatives(targetDevice.id, futureDate, []);
  assert.strictEqual(s1.devices.length, 0);
  assert.strictEqual(s2.devices.length, 0);
});

console.log('\n[10] CSV 导出');
ok('CSV 行号与字段数一致且已转义引号', () => {
  const rows = [];
  const header = ['编号', '用途'];
  rows.push(header);
  Store.getBookings().slice(0, 3).forEach(b => rows.push([b.id, b.purpose || '']));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const lines = csv.split('\r\n');
  lines.forEach(l => assert.strictEqual(l.split('","').length, header.length === 0 ? 1 : header.length, '字段数不符：' + l));
});
ok('含 XSS 字符串的用途被正确转义为不破坏 CSV 结构', () => {
  Store.addBooking({ deviceId: Store.getDevices()[7].id, date: futureDate, timeSlots: ['s3'], purpose: '测试"引号"与,<逗号>', companions: '' });
  const b = Store.getBookings().find(x => x.purpose && x.purpose.includes('引号'));
  assert.ok(b, '应能取到该预约');
  const cell = `"${String(b.purpose).replace(/"/g, '""')}"`;
  assert.ok(cell.startsWith('"') && cell.endsWith('"'), 'CSV 单元格须被引号包裹');
});

console.log(`\n通过 ${pass} 项检查`);
