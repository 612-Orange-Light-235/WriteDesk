const fs = require('fs');
const path = require('path');

// 打包后精简：只保留中文和英文语言包，减小体积
module.exports = async function afterPack(context) {
  const appOut = context.appOutDir;
  const keep = new Set(['zh-CN.pak', 'en-US.pak']);
  const locales = path.join(appOut, 'locales');
  try {
    const files = fs.readdirSync(locales);
    for (const f of files) {
      if (!keep.has(f)) {
        try { fs.rmSync(path.join(locales, f), { force: true }); } catch (e) { }
      }
    }
    console.log('[afterPack] locales kept: ' + fs.readdirSync(locales).join(', '));
  } catch (e) {
    console.log('[afterPack] locales dir error: ' + e.message);
  }
};
