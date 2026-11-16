'use strict';
// 纯 Node 导出模块：不依赖 electron，便于单独测试
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------------- 通用工具 ---------------- */
const CRC_TABLE = (function () {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8');
    const crc = crc32(data);
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30); cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34); cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + body.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([Buffer.concat(chunks), cenBuf, end]);
}
function xesc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function hesc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escMd(s) {
  return String(s == null ? '' : s).replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}
function nowStr(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
function blockPlain(b) {
  return (b.runs || []).map(function (r) { return r.t || ''; }).join('');
}
function notePlain(note) {
  return (note.blocks || []).map(blockPlain).join('\n');
}
function noteCharCount(note) {
  return notePlain(note).replace(/\s/g, '').length;
}
function normalizeColor(c) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c).toUpperCase() : ''; }
function normalizeHl(c) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c).toUpperCase() : ''; }

/* ---------------- TXT ---------------- */
function buildTxt(payload) {
  const parts = [];
  for (const n of payload.notes) {
    const head = (payload.notes.length > 1 ? '　'.repeat(n.depth || 0) : '');
    parts.push('【' + (n.title || '未命名') + '】');
    if (n.tags && n.tags.length) parts.push('标签：' + n.tags.join(' '));
    parts.push('');
    parts.push(notePlain(n));
    parts.push('');
    parts.push('——');
  }
  parts.push('导出时间：' + nowStr(payload.exportedAt));
  return parts.join('\n');
}

/* ---------------- Markdown ---------------- */
function buildMarkdown(payload) {
  const out = ['# ' + (payload.title || '导出'), ''];
  for (const n of payload.notes) {
    const lvl = Math.min(6, 2 + (n.depth || 0));
    out.push('#'.repeat(lvl) + ' ' + (n.title || '未命名'));
    out.push('');
    if (n.tags && n.tags.length) { out.push('> 标签：' + n.tags.join(' ')); out.push(''); }
    for (const b of (n.blocks || [])) {
      const line = blockPlain(b);
      if (b.desc && line) { out.push('> ' + escMd(line)); out.push(''); continue; }
      out.push(line === '' ? '' : escMd(line));
    }
    out.push('');
  }
  out.push('---');
  out.push('导出时间：' + nowStr(payload.exportedAt));
  return out.join('\n');
}

/* ---------------- HTML（带颜色/荧光） ---------------- */
function buildHtml(payload, opts) {
  opts = opts || {};
  const font = String(payload.fontFamily || (opts.fontMap && opts.fontMap[payload.font]) || 'Microsoft YaHei');
  const style = [
    'body{margin:0;padding:40px 48px;background:#fffdfa;color:#2a2622;',
    'font-family:"' + escCss(font) + '","Microsoft YaHei","PingFang SC",sans-serif;',
    'font-size:17px;line-height:2.05;max-width:900px;margin:0 auto}',
    'h1{font-size:26px;color:#a83232;border-bottom:2px solid #e2d9cd;padding-bottom:10px}',
    'h2{font-size:21px;color:#a83232;margin-top:32px}',
    'h3{font-size:18px;color:#8b5a2b}',
    'p{margin:0 0 2px}',
    '.meta{color:#8b827a;font-size:13px;margin:6px 0 24px}',
    '.tag{display:inline-block;border:1px solid #e2d9cd;border-radius:99px;padding:1px 9px;margin-right:6px;font-size:12px;color:#8b827a}',
    '.hl{padding:0 1px}',
    '.desc{color:#6f6563;font-style:italic}',
    'hr{border:none;border-top:1px dashed #e2d9cd;margin:46px 0 16px}',
    '.footer{color:#8b827a;font-size:12px}',
    opts.pdf ? '@page{margin:14mm} body{padding:0;max-width:none}' : ''
  ].join('');
  const h = ['<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + hesc(payload.title || '导出') + '</title><style>' + style + '</style></head><body>'];
  h.push('<h1>' + hesc(payload.title || '导出') + '</h1>');
  const metaBits = [];
  if (payload.exportedAt) metaBits.push('导出时间：' + hesc(nowStr(payload.exportedAt)));
  if (payload.notes.length > 1) metaBits.push('共 ' + payload.notes.length + ' 篇');
  if (metaBits.length) h.push('<div class="meta">' + metaBits.join('　·　') + '</div>');
  for (const n of payload.notes) {
    const lvl = Math.min(4, 2 + (n.depth || 0));
    h.push('<h' + lvl + '>' + hesc(n.title || '未命名') + '</h' + lvl + '>');
    if (n.tags && n.tags.length) {
      h.push('<div class="meta">' + n.tags.map(function (t) { return '<span class="tag">' + hesc(t) + '</span>'; }).join('') + '</div>');
    }
    for (const b of (n.blocks || [])) {
      if (!b.runs || !b.runs.length) { h.push('<p><br></p>'); continue; }
      const pCls = b.desc ? ' class="desc"' : '';
      h.push('<p' + pCls + '>' + b.runs.map(function (r) {
        let s = hesc(r.t || '');
        const styles = [];
        const color = normalizeColor(r.color);
        const hl = normalizeHl(r.hl);
        if (r.b) styles.push('font-weight:700');
        if (r.i) styles.push('font-style:italic');
        if (r.u) styles.push('text-decoration:underline');
        if (color) styles.push('color:' + color);
        if (hl) { styles.push('background-color:' + hl); s = '<span class="hl">' + s + '</span>'; }
        return styles.length ? '<span style="' + styles.join(';') + '">' + s + '</span>' : s;
      }).join('') + '</p>');
    }
    h.push('<hr>');
  }
  h.push('<div class="footer">由「写作台」导出 · ' + hesc(nowStr(payload.exportedAt)) + '</div>');
  h.push('</body></html>');
  return h.join('\n');
}
function escCss(s) { return String(s || '').replace(/["\\]/g, ''); }

/* ---------------- DOCX ---------------- */
function runXml(r, baseSize) {
  const color = normalizeColor(r.color);
  const hl = normalizeHl(r.hl);
  let rPr = '<w:rPr>';
  if (r.b) rPr += '<w:b/><w:bCs/>';
  if (r.i) rPr += '<w:i/><w:iCs/>';
  if (r.u) rPr += '<w:u w:val="single"/>';
  if (color) rPr += '<w:color w:val="' + color.slice(1) + '"/>';
  if (hl) rPr += '<w:shd w:val="clear" w:color="auto" w:fill="' + hl.slice(1) + '"/>';
  rPr += '<w:sz w:val="' + baseSize + '"/><w:szCs w:val="' + baseSize + '"/>';
  rPr += '</w:rPr>';
  return '<w:r>' + rPr + '<w:t xml:space="preserve">' + xesc(r.t || '') + '</w:t></w:r>';
}
function paraXml(runs, opts) {
  opts = opts || {};
  const size = opts.size || 22;
  let pPr = '<w:pPr><w:spacing w:line="380" w:lineRule="auto"';
  if (opts.before || opts.after) pPr += ' w:before="' + (opts.before || 0) + '" w:after="' + (opts.after || 0) + '"';
  pPr += '/>';
  if (opts.indent) pPr += '<w:ind w:left="' + opts.indent + '"/>';
  pPr += '<w:jc w:val="both"/></w:pPr>';
  return '<w:p>' + pPr + (runs && runs.length ? runs.map(function (r) { return runXml(r, size); }).join('') : '') + '</w:p>';
}
function buildDocx(payload) {
  const body = [];
  const fontName = payload.fontFamily || 'Microsoft YaHei';
  body.push('<w:p><w:pPr><w:spacing w:after="120"/><w:jc w:val="left"/></w:pPr>' +
    '<w:r><w:rPr><w:rFonts w:ascii="' + xesc(fontName) + '" w:eastAsia="' + xesc(fontName) + '" w:hAnsi="' + xesc(fontName) + '"/>' +
    '<w:b/><w:color w:val="A83232"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr>' +
    '<w:t xml:space="preserve">' + xesc(payload.title || '导出') + '</w:t></w:r></w:p>');
  body.push(paraXml([{ t: '导出时间：' + nowStr(payload.exportedAt) + (payload.notes.length > 1 ? '　共 ' + payload.notes.length + ' 篇' : '') }], { size: 18 }));
  for (const n of payload.notes) {
    const depth = Math.min(3, n.depth || 0);
    body.push('<w:p><w:pPr><w:spacing w:before="260" w:after="100"/></w:pPr>' +
      '<w:r><w:rPr><w:b/><w:color w:val="' + (depth ? '8B5A2B' : 'A83232') + '"/>' +
      '<w:sz w:val="' + (36 - depth * 4) + '"/><w:szCs w:val="' + (36 - depth * 4) + '"/></w:rPr>' +
      '<w:t xml:space="preserve">' + xesc(n.title || '未命名') + '</w:t></w:r></w:p>');
    if (n.tags && n.tags.length) body.push(paraXml([{ t: '标签：' + n.tags.join(' ') }], { size: 18 }));
    for (const b of (n.blocks || [])) {
      const runs = b.desc
        ? (b.runs || []).map(function (r) { return { t: r.t, i: 1, color: '#6F6563' }; })
        : (b.runs || []);
      body.push(paraXml(runs, { size: 22, indent: depth ? depth * 240 : 0 }));
    }
  }
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<w:body>' + body.join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1300" w:bottom="1440" w:left="1300" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + xesc(fontName) + '" w:eastAsia="' + xesc(fontName) + '" w:hAnsi="' + xesc(fontName) + '"/>' +
    '<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:line="380" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    '</w:styles>';
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';
  const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';
  const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + xesc(payload.title || '导出') + '</dc:title><dc:creator>写作台</dc:creator>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:created>' +
    '</cp:coreProperties>';
  const app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    '<Application>写作台</Application></Properties>';
  return zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: doc },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: styles },
    { name: 'docProps/core.xml', data: core },
    { name: 'docProps/app.xml', data: app }
  ]);
}

/* ---------------- XLSX ---------------- */
function colName(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function cellXml(row, col, text, style) {
  const ref = colName(col) + (row + 1);
  const s = style ? ' s="' + style + '"' : '';
  return '<c r="' + ref + '" t="inlineStr"' + s + '><is><t xml:space="preserve">' + xesc(text) + '</t></is></c>';
}
function sheetXml(rows, widths) {
  let cols = '';
  if (widths && widths.length) {
    cols = '<cols>' + widths.map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join('') + '</cols>';
  }
  const data = rows.map(function (r, ri) {
    return '<row r="' + (ri + 1) + '">' + r.map(function (cell) {
      if (cell && typeof cell === 'object') return cellXml(ri, cell.c, cell.v, cell.s);
      return cellXml(ri, r.indexOf(cell), cell, 0);
    }).join('') + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    cols + '<sheetData>' + data + '</sheetData></worksheet>';
}
function dialogueRows(payload) {
  const rows = [];
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  for (const n of payload.notes) {
    let lineNo = 0;
    (n.blocks || []).forEach(function (b) {
      lineNo++;
      const text = (b.runs || []).map(function (r) { return r.t || ''; }).join('').trim();
      if (!text) return;
      const m = text.match(/^【?([^：:【】]{1,20})】?\s*[：:]\s*(.+)$/);
      let who = '旁白', kind = '旁白', body = text;
      if (b.desc) { who = '描写'; kind = '描写'; }
      else if (m) {
        const role = m[1].trim();
        const looksDialogue = /^【/.test(text) || roles.indexOf(role) >= 0;
        if (looksDialogue) { who = role; kind = '台词'; body = m[2].trim(); }
      }
      rows.push([n.title || '未命名', lineNo, kind, who, body, text.replace(/\s/g, '').length]);
    });
  }
  return rows;
}
function buildXlsx(payload) {
  const sheet1 = [];
  sheet1.push([{ c: 0, v: '层级', s: 1 }, { c: 1, v: '标题', s: 1 }, { c: 2, v: '字数', s: 1 }, { c: 3, v: '标签', s: 1 }, { c: 4, v: '最后修改', s: 1 }]);
  for (const n of payload.notes) {
    sheet1.push([{ c: 0, v: String((n.depth || 0) + 1) }, { c: 1, v: n.title || '未命名' },
      { c: 2, v: String(noteCharCount(n)) }, { c: 3, v: (n.tags || []).join(' ') },
      { c: 4, v: n.updatedAt ? nowStr(n.updatedAt) : '' }]);
  }
  const s1 = sheetXml(sheet1, [8, 40, 10, 24, 20]);
  const sheet2 = [];
  sheet2.push([{ c: 0, v: '场景（文件）', s: 1 }, { c: 1, v: '行号', s: 1 }, { c: 2, v: '类型', s: 1 }, { c: 3, v: '角色', s: 1 }, { c: 4, v: '台词/描写', s: 1 }, { c: 5, v: '字数', s: 1 }]);
  dialogueRows(payload).forEach(function (r) {
    sheet2.push([{ c: 0, v: r[0] }, { c: 1, v: String(r[1]) }, { c: 2, v: r[2] }, { c: 3, v: r[3] },
      { c: 4, v: r[4] }, { c: 5, v: String(r[5]) }]);
  });
  const s2 = sheetXml(sheet2, [28, 8, 8, 14, 60, 8]);
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="目录清单" sheetId="1" r:id="rId1"/><sheet name="台词表" sheetId="2" r:id="rId2"/></sheets></workbook>';
  const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFA83232"/><name val="Microsoft YaHei"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
  return zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/worksheets/sheet1.xml', data: s1 },
    { name: 'xl/worksheets/sheet2.xml', data: s2 },
    { name: 'xl/styles.xml', data: styles }
  ]);
}

/* ---------------- PPTX ---------------- */
function loadTemplate(dir) {
  const read = function (n) { return fs.readFileSync(path.join(dir, n), 'utf8'); };
  return {
    rootRels: read('root.rels'),
    core: read('core.xml'),
    app: read('app.xml'),
    master: read('slideMaster1.xml'),
    masterRels: read('slideMaster1.xml.rels'),
    theme: read('theme1.xml'),
    layouts: fs.readdirSync(dir).filter(function (f) { return /^slideLayout\d+\.xml$/.test(f); }).map(function (f) {
      return { name: f, xml: read(f), rels: read('_rels__' + f + '.rels') };
    })
  };
}
function aPar(text, size, bold, color) {
  const clr = color ? '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>' : '';
  const b = bold ? ' b="1"' : '';
  return '<a:p><a:pPr algn="l"/>' +
    '<a:r><a:rPr lang="zh-CN" altLang="en-US" sz="' + size + '"' + b + ' dirty="0">' + clr +
    '<a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr>' +
    '<a:t>' + xesc(text) + '</a:t></a:r></a:p>';
}
function slideXml(title, lines) {
  const body = lines.map(function (l) { return aPar(l, 1600, false, ''); }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="标题"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="457200" y="320040"/><a:ext cx="8229600" cy="730000"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square"><a:spAutoFit/></a:bodyPr><a:lstStyle/>' +
    aPar(title, 3000, true, 'A83232') + '</p:txBody></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="正文"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="457200" y="1234440"/><a:ext cx="8229600" cy="4800600"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>' + body + '</p:txBody></p:sp>' +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function buildPptx(payload, templateDir) {
  const t = loadTemplate(templateDir);
  const notes = payload.notes.slice(0, 60);
  const slides = notes.map(function (n) {
    const lines = notePlain(n).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    const body = lines.slice(0, 14).map(function (s) { return s.length > 58 ? s.slice(0, 58) + '…' : s; });
    return slideXml(n.title || '未命名', body.length ? body : ['（空）']);
  });
  const n = slides.length || 1;
  const slideOverrides = [];
  for (let i = 1; i <= n; i++) {
    slideOverrides.push('<Override PartName="/ppt/slides/slide' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>');
  }
  const layoutOverrides = t.layouts.map(function (l, i) {
    return '<Override PartName="/ppt/slideLayouts/' + l.name + '" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>';
  });
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    layoutOverrides.join('') +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    slideOverrides.join('') +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '</Types>';
  const sldIds = [];
  const presRels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'];
  for (let i = 1; i <= n; i++) {
    const rid = 'rId' + (i + 1);
    sldIds.push('<p:sldId id="' + (255 + i) + '" r:id="' + rid + '"/>');
    presRels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + i + '.xml"/>');
  }
  const presentation = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + sldIds.join('') + '</p:sldIdLst>' +
    '<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>';
  const presentationRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    presRels.join('') + '</Relationships>';
  const files = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: t.rootRels },
    { name: 'ppt/presentation.xml', data: presentation },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRels },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: t.master },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: t.masterRels },
    { name: 'ppt/theme/theme1.xml', data: t.theme },
    { name: 'docProps/core.xml', data: t.core },
    { name: 'docProps/app.xml', data: t.app }
  ];
  t.layouts.forEach(function (l) {
    files.push({ name: 'ppt/slideLayouts/' + l.name, data: l.xml });
    files.push({ name: 'ppt/slideLayouts/_rels/' + l.name + '.rels', data: l.rels });
  });
  slides.forEach(function (xml, i) {
    files.push({ name: 'ppt/slides/slide' + (i + 1) + '.xml', data: xml });
  });
  return zip(files);
}

module.exports = {
  buildTxt: buildTxt,
  buildMarkdown: buildMarkdown,
  buildHtml: buildHtml,
  buildDocx: buildDocx,
  buildXlsx: buildXlsx,
  buildPptx: buildPptx,
  dialogueRows: dialogueRows,
  noteCharCount: noteCharCount,
  notePlain: notePlain,
  nowStr: nowStr,
  zip: zip
};
