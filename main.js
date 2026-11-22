const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { pathToFileURL, fileURLToPath } = require('url');
const exporters = require('./exporters');

// ---------- 应用身份 ----------
app.setName('写作台');
try {
  app.setPath('userData', path.join(app.getPath('appData'), '写作台'));
} catch (e) { /* ignore */ }

const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');

let forcedDataDir = null;
let SELFTEST = null;
let SELFTEST_PDF = null;
let SELFTEST_EXPORT = null;
let SELFTEST_LOG = null;
let SELFTEST_LANG = null;
let SELFTEST_SHOT2 = null;
let SELFTEST_MODE = null;
let SELFTEST_CLEAR = false;
let SELFTEST_ONBOARD = null;
for (const a of process.argv) {
  if (a.indexOf('--data-dir=') === 0) forcedDataDir = a.slice('--data-dir='.length);
  if (a.indexOf('--selftest=') === 0) SELFTEST = a.slice('--selftest='.length);
  if (a.indexOf('--selftest-pdf=') === 0) SELFTEST_PDF = a.slice('--selftest-pdf='.length);
  if (a.indexOf('--selftest-export=') === 0) SELFTEST_EXPORT = a.slice('--selftest-export='.length);
  if (a.indexOf('--selftest-log=') === 0) SELFTEST_LOG = a.slice('--selftest-log='.length);
  if (a.indexOf('--selftest-lang=') === 0) SELFTEST_LANG = a.slice('--selftest-lang='.length);
  if (a.indexOf('--selftest-shot2=') === 0) SELFTEST_SHOT2 = a.slice('--selftest-shot2='.length);
  if (a.indexOf('--selftest-mode=') === 0) SELFTEST_MODE = a.slice('--selftest-mode='.length);
  if (a === '--selftest-clear') SELFTEST_CLEAR = true;
  if (a.indexOf('--selftest-onboard=') === 0) SELFTEST_ONBOARD = a.slice('--selftest-onboard='.length);
}
if (SELFTEST) {
  try { app.setPath('userData', path.join(path.dirname(SELFTEST), '_selftest-userdata')); } catch (e) { }
}

// ---------- 数据目录 ----------
let dataDir = null;
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf8')); } catch (e) { return {}; }
}
function saveConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
    fs.writeFileSync(CONFIG_FILE(), JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) { /* ignore */ }
}
function isWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const t = path.join(dir, '.write-test-' + Date.now());
    fs.writeFileSync(t, '1'); fs.unlinkSync(t); return true;
  } catch (e) { return false; }
}
function pickDefaultDataDir() {
  const adopted = ['P:\\写作台笔记', 'D:\\写作台笔记'];
  for (const c of adopted) if (fs.existsSync(path.join(c, '笔记数据.json'))) return c;
  for (const d of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
    const root = d + ':\\';
    if (!fs.existsSync(root)) continue;
    const p = path.join(root, '写作台笔记');
    if (isWritable(p)) return p;
  }
  const docs = path.join(app.getPath('documents'), '写作台笔记');
  if (isWritable(docs)) return docs;
  return path.join(os.homedir(), '写作台笔记');
}
function dataPaths() {
  return {
    dir: dataDir, txt: path.join(dataDir, '正文'), bak: path.join(dataDir, '备份'),
    img: path.join(dataDir, '图片'),
    file: path.join(dataDir, '笔记数据.json'),
    index: path.join(dataDir, '正文', '_索引.json'),
    outline: path.join(dataDir, '正文', '_目录.md')
  };
}
function ensureDataDir() {
  const p = dataPaths();
  [p.dir, p.txt, p.bak, p.img].forEach(function (d) { try { fs.mkdirSync(d, { recursive: true }); } catch (e) { } });
  return p;
}
function resolveDataDir() {
  if (forcedDataDir) return forcedDataDir;
  const cfg = loadConfig();
  if (cfg && cfg.dataDir) return cfg.dataDir;
  return pickDefaultDataDir();
}

// ---------- 存储工具 ----------
function writeAtomic(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
}
function safeName(s) {
  let t = String(s || '未命名笔记').replace(/[\\/:*?"<>|\r\n\t]/g, '_').trim();
  if (!t) t = '未命名笔记';
  return t.slice(0, 60);
}
function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
function stamp() {
  const d = new Date(); const p = function (n) { return String(n).padStart(2, '0'); };
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function mirrorTxt(notes) {
  const p = ensureDataDir();
  let oldIndex = {};
  try { oldIndex = JSON.parse(fs.readFileSync(p.index, 'utf8')) || {}; } catch (e) { oldIndex = {}; }
  const list = Array.isArray(notes) ? notes : [];
  const byId = {};
  list.forEach(function (n) { byId[n.id] = n; });
  const used = {};
  const newIndex = {};
  const pathOf = function (n) {
    const names = []; let cur = n, guard = 0;
    while (cur && guard < 50) { names.unshift(cur.title || '未命名笔记'); cur = cur.parentId ? byId[cur.parentId] : null; guard++; }
    return names;
  };
  const ordered = [];
  (function walk(parentId, depth) {
    list.forEach(function (n) {
      if ((n.parentId || null) === parentId) { ordered.push({ n: n, depth: depth }); walk(n.id, depth + 1); }
    });
  })(null, 0);
  list.forEach(function (n) { if (ordered.every(function (o) { return o.n.id !== n.id; })) ordered.push({ n: n, depth: 0 }); });
  ordered.forEach(function (o) {
    const n = o.n;
    let base = safeName(n.title), name = base + '.txt', i = 2;
    while (used[name]) { name = base + '_' + i + '.txt'; i++; }
    used[name] = true; newIndex[n.id] = name;
    const body = '【' + (n.title || '未命名笔记') + '】\n路径：' + pathOf(n).join(' / ') +
      '\n\n' + htmlToText(n.contentHtml || '') +
      '\n\n——\n标签：' + ((n.tags || []).join(' ') || '无') +
      '\n格线：' + (n.grid || '默认') +
      '\n最后修改：' + new Date(n.updatedAt || Date.now()).toLocaleString('zh-CN') + '\n';
    try { writeAtomic(path.join(p.txt, name), body); } catch (e) { }
  });
  const keep = {};
  Object.keys(newIndex).forEach(function (id) { keep[newIndex[id]] = true; });
  try {
    fs.readdirSync(p.txt).forEach(function (f) {
      if (f === '_索引.json' || f === '_目录.md' || !/\.txt$/i.test(f)) return;
      if (!keep[f]) { try { fs.unlinkSync(path.join(p.txt, f)); } catch (e) { } }
    });
  } catch (e) { }
  try { writeAtomic(p.index, JSON.stringify(newIndex, null, 2)); } catch (e) { }
  try {
    const lines = ['# 笔记目录（自动生成）', ''];
    ordered.forEach(function (o) {
      lines.push('　'.repeat(o.depth) + '- ' + (o.n.title || '未命名笔记') + '  （' +
        htmlToText(o.n.contentHtml || '').replace(/\s/g, '').length + ' 字）');
    });
    writeAtomic(p.outline, lines.join('\n') + '\n');
  } catch (e) { }
}
let lastBackupAt = 0;

/* ---------------- 正文图片：独立文件存储 ---------------- */
function imageExtFromMime(mime) {
  var m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/bmp') return 'bmp';
  return 'png';
}
function parseImageDataUrl(dataUrl) {
  var m = String(dataUrl || '').match(/^data:image\/([a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!m) return null;
  return { buf: Buffer.from(m[2], 'base64'), ext: imageExtFromMime('image/' + m[1]) };
}
function saveImageBuffer(buf, ext) {
  ensureDataDir();
  var dir = dataPaths().img;
  var name = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  var file = path.join(dir, name);
  fs.writeFileSync(file, buf);
  return { ok: true, url: pathToFileURL(file).href, rel: '图片/' + name };
}
function saveImageDataUrl(dataUrl) {
  var p = parseImageDataUrl(dataUrl);
  if (!p) return { ok: false, error: '不是有效的图片数据' };
  return saveImageBuffer(p.buf, p.ext);
}
function imageSrcToBuffer(src) {
  try {
    var s = String(src || '');
    if (/^data:image\//i.test(s)) return parseImageDataUrl(s);
    if (/^file:\/\//i.test(s)) {
      var f = fileURLToPath(s);
      if (!fs.existsSync(f)) return null;
      return { buf: fs.readFileSync(f), ext: (path.extname(f).slice(1) || 'png').toLowerCase().replace('jpeg', 'jpg') };
    }
    if (/^图片[\\/]/.test(s)) {
      var f2 = path.join(dataDir, s);
      if (!fs.existsSync(f2)) return null;
      return { buf: fs.readFileSync(f2), ext: (path.extname(f2).slice(1) || 'png').toLowerCase().replace('jpeg', 'jpg') };
    }
  } catch (e) { }
  return null;
}
function migrateHtmlImages(html, state) {
  if (!html || String(html).indexOf('data:image/') < 0) return html;
  return String(html).replace(/(<img\b[^>]*?\bsrc\s*=\s*["'])(data:image\/[^"']+)(["'])/gi, function (m, pre, data, post) {
    var saved = saveImageDataUrl(data);
    if (!saved || !saved.ok) return m;
    state.changed = true;
    return pre + saved.url + post + ' data-img="' + saved.rel + '"';
  });
}
function migrateImagesInData(data) {
  var state = { changed: false };
  if (!data || typeof data !== 'object') return { data: data, changed: false };
  (Array.isArray(data.notes) ? data.notes : []).forEach(function (n) {
    if (typeof n.contentHtml === 'string') n.contentHtml = migrateHtmlImages(n.contentHtml, state);
    if (Array.isArray(n.hist)) n.hist.forEach(function (h) { if (h && typeof h.c === 'string') h.c = migrateHtmlImages(h.c, state); });
  });
  if (data.cards && data.cards.characters) {
    Object.keys(data.cards.characters).forEach(function (k) {
      var c = data.cards.characters[k]; if (!c) return;
      ['designImage', 'threeViewImage'].forEach(function (f) {
        if (typeof c[f] === 'string' && c[f].indexOf('data:image/') === 0) {
          var saved = saveImageDataUrl(c[f]); if (saved && saved.ok) { c[f] = saved.url; state.changed = true; }
        }
      });
    });
  }
  if (data.cards && Array.isArray(data.cards.worlds)) {
    data.cards.worlds.forEach(function (w) {
      if (w && typeof w.image === 'string' && w.image.indexOf('data:image/') === 0) {
        var saved = saveImageDataUrl(w.image); if (saved && saved.ok) { w.image = saved.url; state.changed = true; }
      }
    });
  }
  return { data: data, changed: state.changed };
}
function fileUrlToDataUrl(src) {
  var p = imageSrcToBuffer(src);
  if (!p) return '';
  var mime = p.ext === 'jpg' ? 'image/jpeg' : ('image/' + p.ext);
  return 'data:' + mime + ';base64,' + p.buf.toString('base64');
}
function inlineHtmlImages(html) {
  if (!html || String(html).indexOf('file://') < 0) return html;
  return String(html).replace(/(<img\b[^>]*?\bsrc\s*=\s*["'])(file:\/\/[^"']+)(["'])/gi, function (m, pre, src, post) {
    var d = fileUrlToDataUrl(src);
    return d ? pre + d + post : m;
  });
}
// 备份 JSON 保持自包含：写入前把独立图片文件临时转回 data URL
function inlineImagesInData(data) {
  var copy;
  try { copy = JSON.parse(JSON.stringify(data)); } catch (e) { return data; }
  (Array.isArray(copy.notes) ? copy.notes : []).forEach(function (n) {
    if (typeof n.contentHtml === 'string') n.contentHtml = inlineHtmlImages(n.contentHtml);
    if (Array.isArray(n.hist)) n.hist.forEach(function (h) { if (h && typeof h.c === 'string') h.c = inlineHtmlImages(h.c); });
  });
  if (copy.cards && copy.cards.characters) {
    Object.keys(copy.cards.characters).forEach(function (k) {
      var c = copy.cards.characters[k]; if (!c) return;
      ['designImage', 'threeViewImage'].forEach(function (f) {
        if (typeof c[f] === 'string' && /^file:\/\//i.test(c[f])) { var d = fileUrlToDataUrl(c[f]); if (d) c[f] = d; }
      });
    });
  }
  if (copy.cards && Array.isArray(copy.cards.worlds)) copy.cards.worlds.forEach(function (w) {
    if (w && typeof w.image === 'string' && /^file:\/\//i.test(w.image)) { var d = fileUrlToDataUrl(w.image); if (d) w.image = d; }
  });
  return copy;
}
// 导出时把图片文件读成 Buffer/data URL，交给导出器
function hydrateExportImages(payload) {
  (payload.notes || []).forEach(function (n) {
    (n.blocks || []).forEach(function (b) {
      if (!b || !b.img || !b.img.src) return;
      var p = imageSrcToBuffer(b.img.src);
      if (!p) return;
      b.img.data = p.buf;
      b.img.ext = p.ext;
      b.img.dataUrl = 'data:' + (p.ext === 'jpg' ? 'image/jpeg' : 'image/' + p.ext) + ';base64,' + p.buf.toString('base64');
      if (!b.img.w || !b.img.h) {
        var dim = exporters.imageSize(p.buf);
        if (dim) { b.img.w = dim.w; b.img.h = dim.h; }
      }
    });
  });
  return payload;
}
  /* ---------------- 未使用图片扫描 / 回收 ---------------- */
  const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
  function imageRefBasename(ref) {
    var s = String(ref || '');
    try {
      if (/^file:\/\//i.test(s)) s = fileURLToPath(s);
    } catch (e) { }
    s = decodeURIComponent(s);
    var i = s.lastIndexOf('图片/');
    if (i >= 0) s = s.slice(i + 3);
    else s = path.basename(s);
    return path.basename(s);
  }
  function scanOrphanImages(refs) {
    const p = ensureDataDir();
    const referenced = new Set((Array.isArray(refs) ? refs : []).map(imageRefBasename));
    const now = Date.now();
    const files = [];
    let total = 0;
    let entries = [];
    try { entries = fs.readdirSync(p.img, { withFileTypes: true }); } catch (e) { entries = []; }
    entries.forEach(function (ent) {
      if (!ent.isFile()) return;
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) return;
      if (referenced.has(ent.name)) return;
      const full = path.join(p.img, ent.name);
      let stat;
      try { stat = fs.statSync(full); } catch (e) { return; }
      // 刚插入、还没保存进笔记的图片留 10 分钟宽限期
      if (now - stat.mtimeMs < 10 * 60 * 1000) return;
      files.push({ name: ent.name, size: stat.size, mtime: stat.mtimeMs });
      total += stat.size;
    });
    files.sort(function (a, b) { return a.mtime - b.mtime; });
    return { ok: true, files: files, count: files.length, bytes: total, dir: p.img };
  }
  function cleanOrphanImages(names, refs) {
    const p = ensureDataDir();
    const current = scanOrphanImages(refs);
    const allowed = new Set(current.files.map(function (f) { return f.name; }));
    const wanted = (Array.isArray(names) ? names : []).filter(function (n) {
      return allowed.has(path.basename(String(n)));
    });
    if (!wanted.length) return { ok: true, moved: 0, bytes: 0, dir: p.img };
    const recycle = path.join(p.dir, '图片-回收', stamp());
    fs.mkdirSync(recycle, { recursive: true });
    let moved = 0, bytes = 0;
    wanted.forEach(function (name) {
      const base = path.basename(String(name));
      const src = path.join(p.img, base);
      const dst = path.join(recycle, base);
      try {
        const st = fs.statSync(src);
        fs.renameSync(src, dst);
        moved++; bytes += st.size;
      } catch (e) {
        try {
          fs.copyFileSync(src, dst);
          fs.unlinkSync(src);
          moved++;
        } catch (e2) { }
      }
    });
    return { ok: true, moved: moved, bytes: bytes, dir: recycle, root: p.img };
  }
  function maybeBackup(data, force) {  const now = Date.now();
  if (!force && now - lastBackupAt < 10 * 60 * 1000) return null;
  lastBackupAt = now;
  const p = ensureDataDir();
  const file = path.join(p.bak, '笔记数据-' + stamp() + '.json');
  try {
    fs.writeFileSync(file, JSON.stringify(inlineImagesInData(data), null, 2), 'utf8');
    const files = fs.readdirSync(p.bak).filter(function (f) { return f.endsWith('.json'); }).sort();
    while (files.length > 50) { try { fs.unlinkSync(path.join(p.bak, files.shift())); } catch (e) { } }
    return file;
  } catch (e) { return null; }
}
function readData() {
  const p = ensureDataDir();
  try {
    const raw = JSON.parse(fs.readFileSync(p.file, 'utf8'));
    const r = migrateImagesInData(raw);
    if (r.changed) { try { writeAtomic(p.file, JSON.stringify(r.data, null, 2)); } catch (e) { } }
    return r.data;
  } catch (e) { return null; }
}
function saveData(data) {
  const p = ensureDataDir();
  writeAtomic(p.file, JSON.stringify(data, null, 2));
  mirrorTxt(data && data.notes);
  maybeBackup(data, false);
  return true;
}

// ---------- 壁纸 ----------
function wallpaperDir() { const d = path.join(app.getPath('userData'), 'wallpapers'); try { fs.mkdirSync(d, { recursive: true }); } catch (e) { } return d; }
function mimeOf(file) {
  const e = path.extname(file).toLowerCase();
  return ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp' })[e] || 'image/png';
}
function fileToDataUrl(file) {
  try { return 'data:' + mimeOf(file) + ';base64,' + fs.readFileSync(file).toString('base64'); } catch (e) { return ''; }
}
function saveWallpaperBuffer(buf, ext) {
  const dir = wallpaperDir();
  const file = path.join(dir, 'wall-' + stamp() + '.' + (ext || 'png'));
  fs.writeFileSync(file, buf);
  const cfg = loadConfig();
  cfg.wallpaper = { file: path.basename(file), opacity: (cfg.wallpaper && cfg.wallpaper.opacity) || 0.35 };
  saveConfig(cfg);
  return { ok: true, dataUrl: fileToDataUrl(file), opacity: cfg.wallpaper.opacity };
}
function currentWallpaper() {
  const cfg = loadConfig();
  if (!cfg.wallpaper || !cfg.wallpaper.file) return { ok: false };
  const file = path.join(wallpaperDir(), cfg.wallpaper.file);
  if (!fs.existsSync(file)) return { ok: false };
  return { ok: true, dataUrl: fileToDataUrl(file), opacity: cfg.wallpaper.opacity || 0.35 };
}

// ---------- 导出 ----------
function exportFilters() {
  return {
    txt: [{ name: '纯文本', extensions: ['txt'] }],
    md: [{ name: 'Markdown', extensions: ['md'] }],
    html: [{ name: '网页', extensions: ['html'] }],
    docx: [{ name: 'Word 文档', extensions: ['docx'] }],
    xlsx: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }],
    pptx: [{ name: 'PowerPoint 演示文稿', extensions: ['pptx'] }],
    pdf: [{ name: 'PDF', extensions: ['pdf'] }]
  };
}
async function makePdf(payload) {
  hydrateExportImages(payload);
  const html = exporters.buildHtml(payload, { pdf: true });
  const tmp = path.join(app.getPath('temp'), 'xzt-export-' + Date.now() + '.html');
  fs.writeFileSync(tmp, html, 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, javascript: false } });
  try {
    await win.loadFile(tmp);
    await new Promise(function (r) { setTimeout(r, 350); });
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    return data;
  } finally {
    try { win.destroy(); } catch (e) { }
    try { fs.unlinkSync(tmp); } catch (e) { }
  }
}
function buildExportBuffer(kind, payload) {
  hydrateExportImages(payload);
  switch (kind) {
    case 'txt': return Buffer.from(exporters.buildTxt(payload), 'utf8');
    case 'md': return Buffer.from(exporters.buildMarkdown(payload), 'utf8');
    case 'html': return Buffer.from(exporters.buildHtml(payload, {}), 'utf8');
    case 'docx': return exporters.buildDocx(payload);
    case 'xlsx': return exporters.buildXlsx(payload);
    case 'pptx': return exporters.buildPptx(payload, path.join(__dirname, 'assets', 'pptx-template'));
    default: throw new Error('不支持的格式：' + kind);
  }
}

// ---------- 窗口 ----------
let mainWindow = null;
let quitting = false;
function createWindow() {
  const opts = {
    width: 1320, height: 880, minWidth: 940, minHeight: 620,
    backgroundColor: '#f6f2ec', title: '写作台',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, spellcheck: false
    }
  };
  if (SELFTEST) {
    opts.show = false;
    opts.webPreferences = Object.assign({}, opts.webPreferences, { offscreen: true });
  }
  const win = new BrowserWindow(opts);
  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

// ---------- IPC ----------
function registerIpc() {
  ipcMain.handle('config:get', function () {
    return { dataDir: dataDir, version: app.getVersion(), userData: app.getPath('userData') };
  });
  ipcMain.handle('data:load', function () { return { data: readData(), dir: dataDir, version: app.getVersion() }; });
  ipcMain.handle('data:save', function (ev, data) {
    try { saveData(data); return { ok: true, at: Date.now(), dir: dataDir }; }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('data:backup', function (ev, data) {
    try { saveData(data); const file = maybeBackup(data, true); return { ok: true, dir: dataPaths().bak, file: file }; }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('image:save', function (ev, dataUrl) {
    try { return saveImageDataUrl(dataUrl); }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('images:scan', function (ev, refs) { return scanOrphanImages(refs); });
  ipcMain.handle('images:clean', function (ev, names, refs) {
    try { return cleanOrphanImages(names, refs); }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('images:open', function () { ensureDataDir(); return shell.openPath(dataPaths().img); });
  ipcMain.handle('data:openFolder', function () { shell.openPath(dataDir); return dataDir; });
  ipcMain.handle('config:chooseDir', async function () {
    const r = await dialog.showOpenDialog({
      title: '选择笔记保存位置（可换盘符）',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: dataDir
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false, canceled: true };
    const target = r.filePaths[0];
    if (!isWritable(target)) return { ok: false, error: '这个文件夹不能写入，请换一个。' };
    const oldDir = dataDir;
    const targetHasData = fs.existsSync(path.join(target, '笔记数据.json'));
    const currentHasData = fs.existsSync(path.join(oldDir, '笔记数据.json'));
    let migrate = false;
    if (targetHasData) {
      const c = await dialog.showMessageBox({
        type: 'question', buttons: ['使用该文件夹的笔记', '取消'], defaultId: 0, cancelId: 1,
        title: '目标文件夹已有笔记', message: '这个文件夹里已经有笔记数据了。',
        detail: '切换后会显示那里的笔记；旧位置的笔记不会被删除。'
      });
      if (c.response !== 0) return { ok: false, canceled: true };
    } else if (currentHasData) {
      const c = await dialog.showMessageBox({
        type: 'question', buttons: ['迁移过去（推荐）', '只换位置，不迁移', '取消'], defaultId: 0, cancelId: 2,
        title: '迁移笔记', message: '要把现在的笔记复制到新位置吗？',
        detail: '迁移会复制「笔记数据.json / 正文 / 备份」到新文件夹，旧文件夹保留不动。'
      });
      if (c.response === 2) return { ok: false, canceled: true };
      migrate = c.response === 0;
    }
    try {
      if (migrate) {
        fs.mkdirSync(target, { recursive: true });
        fs.cpSync(oldDir, target, { recursive: true, force: true });
        // 图片已经复制过去，把 JSON 里的旧绝对路径改成新路径
        try {
          const oldPrefix = pathToFileURL(path.join(oldDir, '图片')).href;
          const newPrefix = pathToFileURL(path.join(target, '图片')).href;
          const f = path.join(target, '笔记数据.json');
          if (fs.existsSync(f)) {
            const s = fs.readFileSync(f, 'utf8');
            if (s.indexOf(oldPrefix) >= 0) fs.writeFileSync(f, s.split(oldPrefix).join(newPrefix), 'utf8');
          }
        } catch (e) { }
      }
      dataDir = target;
      saveConfig(Object.assign(loadConfig(), { dataDir: dataDir }));
      ensureDataDir();
      return { ok: true, dataDir: dataDir, migrated: migrate, oldDir: oldDir };
    } catch (e) { return { ok: false, error: '切换失败：' + (e && e.message || e) }; }
  });
  ipcMain.handle('export:document', async function (ev, kind, payload, defaultName) {
    const filters = exportFilters();
    const r = await dialog.showSaveDialog({
      title: '导出',
      defaultPath: defaultName || ('导出.' + kind),
      filters: filters[kind] || [{ name: '所有文件', extensions: ['*'] }]
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      const buf = kind === 'pdf' ? await makePdf(payload) : buildExportBuffer(kind, payload);
      fs.writeFileSync(r.filePath, buf);
      return { ok: true, file: r.filePath, bytes: buf.length };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('file:saveAs', async function (ev, content, defaultName) {
    const r = await dialog.showSaveDialog({
      title: '导出', defaultPath: defaultName || '导出.txt',
      filters: [{ name: '文本', extensions: ['txt'] }, { name: '所有文件', extensions: ['*'] }]
    });
    if (r.canceled || !r.filePath) return { ok: false };
    try { fs.writeFileSync(r.filePath, content, 'utf8'); return { ok: true, file: r.filePath }; }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('file:openBackup', async function () {
    const r = await dialog.showOpenDialog({
      title: '选择备份文件',
      filters: [{ name: '备份文件', extensions: ['json'] }, { name: '所有文件', extensions: ['*'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false };
    try { return { ok: true, data: migrateImagesInData(JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'))).data, file: r.filePaths[0] }; }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('app:info', function () { return { version: app.getVersion(), dataDir: dataDir }; });

  // 壁纸
  ipcMain.handle('wallpaper:get', function () { return currentWallpaper(); });
  ipcMain.handle('wallpaper:choose', async function () {
    const r = await dialog.showOpenDialog({
      title: '选择壁纸图片',
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false, canceled: true };
    try {
      const buf = fs.readFileSync(r.filePaths[0]);
      return saveWallpaperBuffer(buf, (path.extname(r.filePaths[0]) || '.png').slice(1).toLowerCase());
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('wallpaper:setData', function (ev, dataUrl) {
    try {
      const m = String(dataUrl || '').match(/^data:image\/([a-z0-9+]+);base64,(.+)$/i);
      if (!m) return { ok: false, error: '不是有效的图片数据' };
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      return saveWallpaperBuffer(Buffer.from(m[2], 'base64'), ext);
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle('wallpaper:setUrl', function (ev, url) {
    return new Promise(function (resolve) {
      try {
        const lib = String(url).indexOf('https:') === 0 ? https : http;
        const req = lib.get(url, { timeout: 15000 }, function (res) {
          if (res.statusCode !== 200) { resolve({ ok: false, error: '下载失败：HTTP ' + res.statusCode }); res.resume(); return; }
          const ct = String(res.headers['content-type'] || '');
          if (ct.indexOf('image/') !== 0) { resolve({ ok: false, error: '这个链接不是图片' }); res.resume(); return; }
          const chunks = []; let total = 0;
          res.on('data', function (c) { total += c.length; if (total > 20 * 1024 * 1024) { req.destroy(); } chunks.push(c); });
          res.on('end', function () {
            if (total > 20 * 1024 * 1024) { resolve({ ok: false, error: '图片太大（>20MB）' }); return; }
            const ext = ct.split('/')[1].split(';')[0].replace('jpeg', 'jpg');
            resolve(saveWallpaperBuffer(Buffer.concat(chunks), ext));
          });
        });
        req.on('error', function (e) { resolve({ ok: false, error: String(e.message || e) }); });
        req.on('timeout', function () { req.destroy(); resolve({ ok: false, error: '下载超时' }); });
      } catch (e) { resolve({ ok: false, error: String(e.message || e) }); }
    });
  });
  ipcMain.handle('wallpaper:clear', function () {
    const cfg = loadConfig();
    if (cfg.wallpaper && cfg.wallpaper.file) {
      try { fs.unlinkSync(path.join(wallpaperDir(), cfg.wallpaper.file)); } catch (e) { }
    }
    cfg.wallpaper = null; saveConfig(cfg);
    return { ok: true };
  });
  ipcMain.handle('wallpaper:setOpacity', function (ev, opacity) {
    const cfg = loadConfig();
    if (!cfg.wallpaper) return { ok: false };
    cfg.wallpaper.opacity = Math.max(0, Math.min(0.9, Number(opacity) || 0));
    saveConfig(cfg);
    return { ok: true, opacity: cfg.wallpaper.opacity };
  });
}

// ---------- 启动 ----------
app.setAppUserModelId('com.xiezuotai.app');
const gotLock = SELFTEST ? true : app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(function () {
    Menu.setApplicationMenu(null);
    dataDir = resolveDataDir();
    if (!forcedDataDir) saveConfig(Object.assign(loadConfig(), { dataDir: dataDir }));
    ensureDataDir();
    mainWindow = createWindow();
    registerIpc();
    if (SELFTEST) {
      mainWindow.webContents.once('did-finish-load', function () {
        setTimeout(async function () {
          try {
            const initial = await mainWindow.webContents.executeJavaScript('JSON.stringify((window.__xzt.state()||{}).settings||{})', true);
            await mainWindow.webContents.executeJavaScript('window.__xzt && window.__xzt.demo ? window.__xzt.demo() : null', true);
            await new Promise(function (r) { setTimeout(r, 700); });
            if (SELFTEST_LOG) {
              try {
                const dialogue = await mainWindow.webContents.executeJavaScript('window.__xzt.testScriptEnter("dialogue")', true);
                const desc = await mainWindow.webContents.executeJavaScript('window.__xzt.testScriptEnter("desc")', true);
                const v22 = await mainWindow.webContents.executeJavaScript('window.__xzt.testV22()', true);
                const v22b = await mainWindow.webContents.executeJavaScript('window.__xzt.testV22b()', true);
                const v22c = await mainWindow.webContents.executeJavaScript('window.__xzt.testV22c()', true);
                const probe = await mainWindow.webContents.executeJavaScript('window.__xzt.probeClear()', true);
                const v228 = await mainWindow.webContents.executeJavaScript('window.__xzt.testV228()', true);
                const v2211 = await mainWindow.webContents.executeJavaScript('window.__xzt.testV2211()', true);
                const v2212 = await mainWindow.webContents.executeJavaScript('window.__xzt.testV2212()', true);
                const onboard = await mainWindow.webContents.executeJavaScript('window.__xzt.testOnboard()', true);
                fs.writeFileSync(SELFTEST_LOG, JSON.stringify({ initial: JSON.parse(initial), dialogue: dialogue, desc: desc, v22: v22, v22b: v22b, v22c: v22c, probe: probe, v228: v228, v2211: v2211, v2212: v2212, onboard: onboard }, null, 2));
                await mainWindow.webContents.executeJavaScript('window.__xzt.demo()', true);
                await new Promise(function (r) { setTimeout(r, 400); });
              } catch (e) {
                try { fs.writeFileSync(SELFTEST_LOG + '.err.txt', String(e && e.stack || e)); } catch (e2) { }
              }
            }
            if (SELFTEST_LANG) {
              try { await mainWindow.webContents.executeJavaScript('window.__xzt.setLang(' + JSON.stringify(SELFTEST_LANG) + ')', true); } catch (e) { }
            }
            await new Promise(function (r) { setTimeout(r, 600); });
            if (SELFTEST_MODE === 'desc') {
              try {
                await mainWindow.webContents.executeJavaScript('(function(){var s=document.getElementById("enterModeSel");s.value="desc";s.dispatchEvent(new Event("change"));return true})()', true);
                await new Promise(function (r) { setTimeout(r, 250); });
              } catch (e3) { }
            }
            if (SELFTEST_CLEAR) {
              try {
                const cleared = await mainWindow.webContents.executeJavaScript('window.__xzt.demoClearFormat()', true);
                if (SELFTEST_LOG) fs.writeFileSync(SELFTEST_LOG + '.cleared.txt', cleared || '');
                await new Promise(function (r) { setTimeout(r, 300); });
              } catch (e4) { }
            }
            if (SELFTEST_ONBOARD !== null) {
              try {
                await mainWindow.webContents.executeJavaScript('window.__xzt.openOnboard(' + Number(SELFTEST_ONBOARD || 0) + ')', true);
                await new Promise(function (r) { setTimeout(r, 350); });
              } catch (e5) { }
            }
            const img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(SELFTEST, img.toPNG());
            if (SELFTEST_SHOT2) {
              try {
                const shot2Hook = String(SELFTEST_SHOT2).indexOf('roles') >= 0 ? 'window.__xzt.testV22c()' : 'window.__xzt.testV22()';
                await mainWindow.webContents.executeJavaScript(shot2Hook, true);
                await mainWindow.webContents.executeJavaScript('window.__xzt.openSettingsForShot()', true);
                await new Promise(function (r) { setTimeout(r, 500); });
                const img2 = await mainWindow.webContents.capturePage();
                fs.writeFileSync(SELFTEST_SHOT2, img2.toPNG());
                await mainWindow.webContents.executeJavaScript('document.getElementById("settingsModal").hidden = true', true);
              } catch (e2) { }
            }
            fs.writeFileSync(SELFTEST + '.ok.txt', 'ok ' + new Date().toISOString() + '\nversion=' + app.getVersion());
            if (SELFTEST_PDF || SELFTEST_EXPORT) {
              const payload = await mainWindow.webContents.executeJavaScript('window.__xzt && window.__xzt.demoPayload ? window.__xzt.demoPayload() : null', true);
              if (payload) {
                if (SELFTEST_PDF) {
                  const pdf = await makePdf(payload);
                  fs.writeFileSync(SELFTEST_PDF, pdf);
                }
                if (SELFTEST_EXPORT) {
                  fs.writeFileSync(SELFTEST_EXPORT + '.payload.json', JSON.stringify(payload, null, 2));
                  ['txt', 'md', 'html', 'docx', 'xlsx', 'pptx'].forEach(function (k) {
                    try { fs.writeFileSync(SELFTEST_EXPORT + '.' + k, buildExportBuffer(k, payload)); } catch (e) { }
                  });
                }
              }
            }
          } catch (e) {
            try { fs.writeFileSync(SELFTEST + '.err.txt', String(e && e.stack || e)); } catch (e2) { }
          }
          app.exit(0);
        }, 2000);
      });
    } else {
      mainWindow.on('closed', function () { mainWindow = null; });
    }
  });
  app.on('window-all-closed', function () { app.quit(); });
  app.on('before-quit', function (e) {
    if (quitting) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      e.preventDefault();
      quitting = true;
      try { mainWindow.webContents.send('app:flush'); } catch (err) { }
      setTimeout(function () { app.exit(0); }, 500);
    }
  });
}
