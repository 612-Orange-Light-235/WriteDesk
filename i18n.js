/* 写作台 · 界面语言（中文 / 日本語 / English） */
(function () {
  'use strict';

  var STATIC_JA = {
    '＋ 新建文件': '＋ 新規ファイル',
    '＋ 子文件': '＋ 子ファイル',
    '立即备份': '今すぐバックアップ',
    '恢复备份': 'バックアップを復元',
    '打开文件夹': 'フォルダを開く',
    '导出…': '書き出し…',
    '设置': '設定',
    '深色': 'ダーク',
    '字体': 'フォント',
    '文字颜色': '文字色',
    '荧光笔': 'マーカー',
    '清除格式': '書式クリア',
    '斜体': '斜体',
    '下划线': '下線',
    '格线': '罫線',
    '无': 'なし',
    '横线（稿纸）': '横罫線（原稿用紙）',
    '方格': '方眼',
    '点阵': 'ドット',
    '剧本格线': '台本罫線',
    '剧本模式': '台本モード',
    '插入台词行': 'セリフ行を挿入',
    '回车生成': 'Enter で生成',
    '台词行': 'セリフ行',
    '描写行': '描写行',
    '搜索文件…': 'ファイルを検索…',
    '全部展开': 'すべて展開',
    '全部折叠': 'すべて折りたたむ',
    '点左上角「＋ 新建文件」开始写': '左上の「＋ 新規ファイル」から始めましょう',
    '文件名…（比如：第一章 · 初见）': 'ファイル名…（例：第一章・初対面）',
    '从这里开始写… 先选中文字再点上面的颜色/荧光笔': 'ここから書き始め… 色やマーカーは文字を選択してから',
    '标签': 'タグ',
    '空格分隔，例如：剧情 第一章': 'スペース区切り（例：プロット 第一章）',
    '父文件': '親ファイル',
    '（顶层）': '（トップ階層）',
    '历史版本': '履歴',
    '删除': '削除',
    '就绪': '準備完了',
    '没有打开的文件': '開いているファイルがありません',
    '导出': '書き出し',
    '范围': '範囲',
    '当前文件': '現在のファイル',
    '整棵树（当前文件 + 所有子文件）': 'ツリー全体（現在のファイル＋すべての子ファイル）',
    '格式': '形式',
    'TXT 纯文本': 'TXT プレーンテキスト',
    'Markdown（.md）': 'Markdown（.md）',
    '网页（.html，保留颜色）': 'HTML（色を保持）',
    'Word（.docx，保留颜色）': 'Word（.docx、色を保持）',
    'PDF（可打印）': 'PDF（印刷可）',
    'Excel（.xlsx：目录 + 台词表）': 'Excel（.xlsx：目次＋セリフ表）',
    'PowerPoint（.pptx：每篇一页）': 'PowerPoint（.pptx：1ファイル1ページ）',
    '开始导出': '書き出し開始',
    '取消': 'キャンセル',
    '版本': 'バージョン',
    '笔记保存位置': 'ノートの保存先',
    '更改保存位置…': '保存先を変更…',
    '壁纸': '壁紙',
    '可以选本地图片，也可以直接把截图按 Ctrl+V 粘贴，或把图片文件拖进窗口。只改背景，不影响文字。': 'ローカル画像を選ぶ、Ctrl+V でスクショを貼り付け、画像ファイルをウィンドウにドロップできます。背景だけが変わり、文字には影響しません。',
    '选择图片…': '画像を選択…',
    '粘贴剪贴板图片': 'クリップボードの画像を貼り付け',
    '清除壁纸': '壁紙を削除',
    '底纹浓度': '背景の濃さ',
    '角色表（剧本模式用，每行一个，可留空）': 'キャラ表（台本モード用、1行1名・空欄可）',
    '每行一个角色名，可留空（例：鲸鱼娘）': '1行に1名。空欄でもOK（例：鲸鱼娘）',
    '保存角色表': 'キャラ表を保存',
    '关闭': '閉じる',
    '语言': '言語',
    '新建子文件': '子ファイルを作成',
    '重命名': '名前を変更',
    '复制标题': 'タイトルをコピー',
    '展开子级': '子を展開',
    '折叠子级': '子を折りたたむ',
    '移到顶层': 'トップ階層へ移動',
    '剧本模式：每行【角色/旁白】：“文本”，回车自动换到下一行': '台本モード：各行【キャラ/ナレーション】：「テキスト」、Enterで次の行へ自動移動',
    'TXT 只有纯文字；Word / HTML / PDF 保留颜色和荧光笔；Excel 会生成「目录清单」和「台词表」两个工作表；PPT 每篇文件一页大纲。': 'TXT はテキストのみ。Word / HTML / PDF は色とマーカーを保持。Excel は「目次」と「セリフ表」の2シート。PPT は1ファイル1ページのアウトライン。',
    '还没有文件，点「＋ 新建文件」': 'ファイルがまだありません。「＋ 新規ファイル」へ',
    '没有匹配的文件': '一致するファイルがありません',
    '在这篇下面新建子文件': 'この下に子ファイルを作成',
    '字号变小': '文字を小さく',
    '字号变大': '文字を大きく',
    '切换深色模式': 'ダークモード切替',
    '开启后，回车自动生成下一行台词模板': 'オンにすると、Enterで次のセリフ行テンプレートを自動生成',
    '关闭（不删除内容）': '閉じる（内容は削除しません）',
    '新建文件': '新規ファイル',
    '中文': '中国語',
    '日本語': '日本語',
    'English': 'English'
  };

  var STATIC_EN = {
    '＋ 新建文件': '＋ New File',
    '＋ 子文件': '＋ Subfile',
    '立即备份': 'Back Up Now',
    '恢复备份': 'Restore Backup',
    '打开文件夹': 'Open Folder',
    '导出…': 'Export…',
    '设置': 'Settings',
    '深色': 'Dark',
    '字体': 'Font',
    '文字颜色': 'Text Color',
    '荧光笔': 'Highlighter',
    '清除格式': 'Clear Formatting',
    '斜体': 'Italic',
    '下划线': 'Underline',
    '格线': 'Guidelines',
    '无': 'None',
    '横线（稿纸）': 'Ruled',
    '方格': 'Grid',
    '点阵': 'Dots',
    '剧本格线': 'Script Grid',
    '剧本模式': 'Script Mode',
    '插入台词行': 'Insert Line',
    '回车生成': 'Enter inserts',
    '台词行': 'Dialogue line',
    '描写行': 'Description line',
    '搜索文件…': 'Search files…',
    '全部展开': 'Expand All',
    '全部折叠': 'Collapse All',
    '点左上角「＋ 新建文件」开始写': 'Click "＋ New File" at the top left to start',
    '文件名…（比如：第一章 · 初见）': 'File name… (e.g. Chapter 1 · First Meeting)',
    '从这里开始写… 先选中文字再点上面的颜色/荧光笔': 'Start writing here… select text first, then pick a color or highlighter above',
    '标签': 'Tags',
    '空格分隔，例如：剧情 第一章': 'Space-separated, e.g. plot chapter1',
    '父文件': 'Parent',
    '（顶层）': '(Top level)',
    '历史版本': 'History',
    '删除': 'Delete',
    '就绪': 'Ready',
    '没有打开的文件': 'No file open',
    '导出': 'Export',
    '范围': 'Range',
    '当前文件': 'Current file',
    '整棵树（当前文件 + 所有子文件）': 'Whole tree (current file + all subfiles)',
    '格式': 'Format',
    'TXT 纯文本': 'TXT plain text',
    'Markdown（.md）': 'Markdown (.md)',
    '网页（.html，保留颜色）': 'HTML (.html, keeps colors)',
    'Word（.docx，保留颜色）': 'Word (.docx, keeps colors)',
    'PDF（可打印）': 'PDF (printable)',
    'Excel（.xlsx：目录 + 台词表）': 'Excel (.xlsx: index + dialogue sheet)',
    'PowerPoint（.pptx：每篇一页）': 'PowerPoint (.pptx: one page per file)',
    '开始导出': 'Start Export',
    '取消': 'Cancel',
    '版本': 'Version',
    '笔记保存位置': 'Notes location',
    '更改保存位置…': 'Change location…',
    '壁纸': 'Wallpaper',
    '可以选本地图片，也可以直接把截图按 Ctrl+V 粘贴，或把图片文件拖进窗口。只改背景，不影响文字。': 'Pick a local image, paste a screenshot with Ctrl+V, or drop an image file into the window. Background only — text stays unaffected.',
    '选择图片…': 'Choose image…',
    '粘贴剪贴板图片': 'Paste from clipboard',
    '清除壁纸': 'Clear wallpaper',
    '底纹浓度': 'Overlay strength',
    '角色表（剧本模式用，每行一个，可留空）': 'Characters (script mode, one per line, may be empty)',
    '每行一个角色名，可留空（例：鲸鱼娘）': 'One name per line. Can be left empty (e.g. 鲸鱼娘)',
    '保存角色表': 'Save characters',
    '关闭': 'Close',
    '语言': 'Language',
    '新建子文件': 'New subfile',
    '重命名': 'Rename',
    '复制标题': 'Copy title',
    '展开子级': 'Expand children',
    '折叠子级': 'Collapse children',
    '移到顶层': 'Move to top level',
    '剧本模式：每行【角色/旁白】：“文本”，回车自动换到下一行': 'Script mode: each line 【character/narration】：“text”; Enter goes to the next line automatically',
    'TXT 只有纯文字；Word / HTML / PDF 保留颜色和荧光笔；Excel 会生成「目录清单」和「台词表」两个工作表；PPT 每篇文件一页大纲。': 'TXT is plain text only. Word/HTML/PDF keep colors and highlights. Excel creates an Index sheet and a Dialogue sheet. PPT gives one page per file.',
    '还没有文件，点「＋ 新建文件」': 'No files yet. Click "＋ New File".',
    '没有匹配的文件': 'No matching files',
    '在这篇下面新建子文件': 'New subfile under this file',
    '字号变小': 'Smaller text',
    '字号变大': 'Larger text',
    '切换深色模式': 'Toggle dark mode',
    '开启后，回车自动生成下一行台词模板': 'When on, Enter creates the next dialogue template',
    '关闭（不删除内容）': 'Close (keeps content)',
    '新建文件': 'New file',
    '中文': 'Chinese',
    '日本語': 'Japanese',
    'English': 'English'
  };

  var DYN = {
    zh: {
      ready: '就绪（自动保存已开启）', readyShort: '就绪',
      saved: '已自动保存 {time}', saving: '正在保存…', saveFail: '⚠ 保存失败：{err}',
      backup: '已备份 · {time}', backupFail: '⚠ 备份失败：{err}',
      exporting: '正在导出…', exportOk: '已导出：{file}', exportCanceled: '已取消', exportFail: '失败：{err}',
      restored: '已恢复备份：{n} 个文件',
      switched: '已切换保存位置', switchedMigrated: '已切换保存位置（已迁移）',
      settingsSaved: '已保存 ✓', dirChanged: '保存位置已更新',
      wallpaperSet: '壁纸已设置 ✓', wallpaperCleared: '壁纸已清除',
      deleteTitle: '删除文件',
      deleteConfirm: '确定删除「{title}」？删除后不能恢复。',
      deleteConfirmTree: '确定删除「{title}」及其 {n} 个子文件？删除后不能恢复。',
      renamePrompt: '新的文件名：', copied: '标题已复制',
      noFile: '先打开一个文件再导出。', cannotMove: '不能把文件移进它自己或它的子文件里。',
      ctxNewChild: '新建子文件', ctxRename: '重命名', ctxCopyTitle: '复制标题',
      ctxExpand: '展开子级', ctxCollapse: '折叠子级', ctxToTop: '移到顶层', ctxDelete: '删除',
      scriptHint: '剧本模式：每行 -【角色】：“文本”（动作），回车自动换到下一行',
      scriptHintDesc: '剧本模式（描写行）：每行以 - 开头，回车生成普通段落，适合写心境、风景、日常。',
      noFiles: '还没有文件，点「＋ 新建文件」', noMatch: '没有匹配的文件', noOpen: '没有打开的文件',
      historyTitle: '历史版本（最多 8 版，约每 3 分钟一版）',
      historyEmpty: '还没有历史版本，写一会儿就会出现。',
      restoreVer: '恢复这一版', restoreConfirm: '用这一版覆盖当前内容？当前内容会先存为历史版本。',
      close: '关闭', dataPath: '笔记保存在：', backupDir: '备份：',
      charsOnly: '{chars}字', childCount: '子{n} · {chars}字',
      noRole: '（无角色）', colorPick: '文字颜色 ', hlPick: '荧光笔 ',
      colorDefaultTitle: '默认色（浅色模式=黑，深色模式=白；点它恢复默认文字色）',
      insertDescBtn: '插入描写行', insertDialogueBtn: '插入台词行',
      roleCount: '共 {n} 个角色（每行一个，可留空）', roleCountEmpty: '角色表为空（剧本模式仍可用【】手写）',
      roleCountBlank: '共 {n} 个角色 + {k} 个空白行（空白行会保留）', blankRole: '（空白）',
      rolesCleared: '角色表已清空'
    },
    ja: {
      ready: '準備完了（自動保存オン）', readyShort: '準備完了',
      saved: '自動保存しました {time}', saving: '保存中…', saveFail: '⚠ 保存に失敗：{err}',
      backup: 'バックアップ完了 · {time}', backupFail: '⚠ バックアップに失敗：{err}',
      exporting: '書き出し中…', exportOk: '書き出し完了：{file}', exportCanceled: 'キャンセルしました', exportFail: '失敗：{err}',
      restored: 'バックアップを復元：{n} ファイル',
      switched: '保存先を切り替えました', switchedMigrated: '保存先を切り替えました（移行済み）',
      settingsSaved: '保存しました ✓', dirChanged: '保存先を更新しました',
      wallpaperSet: '壁紙を設定しました ✓', wallpaperCleared: '壁紙を削除しました',
      deleteTitle: 'ファイルを削除',
      deleteConfirm: '「{title}」を削除しますか？元に戻せません。',
      deleteConfirmTree: '「{title}」と子ファイル {n} 件を削除しますか？元に戻せません。',
      renamePrompt: '新しいファイル名：', copied: 'タイトルをコピーしました',
      noFile: '先にファイルを開いてください。', cannotMove: 'ファイル自身やその子ファイルの中には移動できません。',
      ctxNewChild: '子ファイルを作成', ctxRename: '名前を変更', ctxCopyTitle: 'タイトルをコピー',
      ctxExpand: '子を展開', ctxCollapse: '子を折りたたむ', ctxToTop: 'トップ階層へ移動', ctxDelete: '削除',
      scriptHint: '台本モード：各行 -【キャラ/ナレーション】：「テキスト」（動作）、Enterで次の行へ自動移動',
      scriptHintDesc: '台本モード（描写行）：各行は - で始まり、Enterで通常の段落を作成。心情・風景・日常の描写向け。',
      noFiles: 'ファイルがまだありません。「＋ 新規ファイル」へ', noMatch: '一致するファイルがありません',
      noOpen: '開いているファイルがありません',
      historyTitle: '履歴（最大8版、約3分ごと）',
      historyEmpty: 'まだ履歴はありません。少し書くと作成されます。',
      restoreVer: 'この版を復元', restoreConfirm: 'この版で上書きしますか？現在の内容は先に履歴へ保存されます。',
      close: '閉じる', dataPath: '保存先：', backupDir: 'バックアップ：',
      charsOnly: '{chars}文字', childCount: '子{n}・{chars}文字',
      noRole: '（キャラなし）', colorPick: '文字色 ', hlPick: 'マーカー ',
      colorDefaultTitle: '既定色（ライト＝黒／ダーク＝白。押すと既定の文字色に戻す）',
      insertDescBtn: '描写行を挿入', insertDialogueBtn: 'セリフ行を挿入',
      roleCount: '全 {n} 名（1行1名・空欄可）', roleCountEmpty: 'キャラ表は空です（【】で手書き可）',
      roleCountBlank: '全 {n} 名 + 空行 {k} 行（空行は保持されます）', blankRole: '（空白）',
      rolesCleared: 'キャラ表を空にしました'
    },
    en: {
      ready: 'Ready (autosave on)', readyShort: 'Ready',
      saved: 'Autosaved {time}', saving: 'Saving…', saveFail: '⚠ Save failed: {err}',
      backup: 'Backed up · {time}', backupFail: '⚠ Backup failed: {err}',
      exporting: 'Exporting…', exportOk: 'Exported: {file}', exportCanceled: 'Canceled', exportFail: 'Failed: {err}',
      restored: 'Backup restored: {n} files',
      switched: 'Save location changed', switchedMigrated: 'Save location changed (migrated)',
      settingsSaved: 'Saved ✓', dirChanged: 'Save location updated',
      wallpaperSet: 'Wallpaper set ✓', wallpaperCleared: 'Wallpaper cleared',
      deleteTitle: 'Delete file',
      deleteConfirm: 'Delete "{title}"? This cannot be undone.',
      deleteConfirmTree: 'Delete "{title}" and its {n} subfiles? This cannot be undone.',
      renamePrompt: 'New file name:', copied: 'Title copied',
      noFile: 'Open a file before exporting.', cannotMove: 'A file cannot be moved into itself or its subfiles.',
      ctxNewChild: 'New subfile', ctxRename: 'Rename', ctxCopyTitle: 'Copy title',
      ctxExpand: 'Expand children', ctxCollapse: 'Collapse children', ctxToTop: 'Move to top level', ctxDelete: 'Delete',
      scriptHint: 'Script mode: each line -【character/narration】：“text”（action）; Enter goes to the next line',
      scriptHintDesc: 'Script mode (description): each line starts with -; Enter creates a plain paragraph for mood, scenery or daily life.',
      noFiles: 'No files yet. Click "＋ New File".', noMatch: 'No matching files', noOpen: 'No file open',
      historyTitle: 'History (up to 8 versions, about one every 3 minutes)',
      historyEmpty: 'No history yet. It appears as you write.',
      restoreVer: 'Restore this version', restoreConfirm: 'Overwrite with this version? The current content is saved to history first.',
      close: 'Close', dataPath: 'Notes saved in: ', backupDir: 'Backup: ',
      charsOnly: '{chars} chars', childCount: '{n} sub · {chars} chars',
      noRole: '(no character)', colorPick: 'Text colour ', hlPick: 'Highlighter ',
      colorDefaultTitle: 'Default colour (black in light mode, white in dark; click to restore default text colour)',
      insertDescBtn: 'Insert description', insertDialogueBtn: 'Insert dialogue',
      roleCount: '{n} characters (one per line, may be empty)', roleCountEmpty: 'Character list is empty (you can still type 【】)',
      roleCountBlank: '{n} characters + {k} blank lines (blank lines are kept)', blankRole: '(blank)',
      rolesCleared: 'Character list cleared'
    }
  };

  var STATIC = { ja: STATIC_JA, en: STATIC_EN };
  var lang = 'zh';
  var translated = [];

  function t(key, vars) {
    var d = DYN[lang] || DYN.zh;
    var s = d[key];
    if (s === undefined) s = DYN.zh[key];
    if (s === undefined) s = key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? '' : String(vars[k]); });
    return s;
  }

  function collectTextNodes(root, out) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function apply(root) {
    root = root || document.body;
    for (var i = 0; i < translated.length; i++) {
      var rec = translated[i];
      if (rec.prop) {
        if (rec.node.getAttribute && rec.node.getAttribute(rec.prop) === rec.translated) rec.node.setAttribute(rec.prop, rec.original);
      } else if (rec.node.nodeValue === rec.translated) {
        rec.node.nodeValue = rec.original;
      }
    }
    translated = [];
    if (lang === 'zh') return;
    var map = STATIC[lang] || {};
    var nodes = collectTextNodes(root, []);
    nodes.forEach(function (node) {
      var raw = node.nodeValue;
      var trimmed = raw.trim();
      if (!trimmed) return;
      var target = map[trimmed];
      if (target === undefined) return;
      var next = raw.replace(trimmed, target);
      node.nodeValue = next;
      translated.push({ node: node, prop: null, original: raw, translated: next });
    });
    var els = root.querySelectorAll('[placeholder],[title]');
    Array.prototype.forEach.call(els, function (el) {
      ['placeholder', 'title'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        var t2 = map[v.trim()];
        if (t2 === undefined) return;
        el.setAttribute(attr, t2);
        translated.push({ node: el, prop: attr, original: v, translated: t2 });
      });
    });
  }

  function setLang(next) {
    lang = next === 'ja' ? 'ja' : (next === 'en' ? 'en' : 'zh');
    apply();
    document.documentElement.setAttribute('lang', lang === 'ja' ? 'ja' : (lang === 'en' ? 'en' : 'zh-CN'));
    return lang;
  }

  window.XZT_I18N = {
    t: t,
    apply: apply,
    setLang: setLang,
    get: function () { return lang; }
  };
})();
