const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: function () { return ipcRenderer.invoke('data:load'); },
  save: function (data) { return ipcRenderer.invoke('data:save', data); },
  backupNow: function (data) { return ipcRenderer.invoke('data:backup', data); },
  openFolder: function () { return ipcRenderer.invoke('data:openFolder'); },
  saveAs: function (content, defaultName) { return ipcRenderer.invoke('file:saveAs', content, defaultName); },
  openBackup: function () { return ipcRenderer.invoke('file:openBackup'); },
  info: function () { return ipcRenderer.invoke('app:info'); },
  configGet: function () { return ipcRenderer.invoke('config:get'); },
  chooseDir: function () { return ipcRenderer.invoke('config:chooseDir'); },
  exportDocument: function (kind, payload, defaultName) { return ipcRenderer.invoke('export:document', kind, payload, defaultName); },
  wallpaperGet: function () { return ipcRenderer.invoke('wallpaper:get'); },
  wallpaperChoose: function () { return ipcRenderer.invoke('wallpaper:choose'); },
  wallpaperSetData: function (dataUrl) { return ipcRenderer.invoke('wallpaper:setData', dataUrl); },
  wallpaperSetUrl: function (url) { return ipcRenderer.invoke('wallpaper:setUrl', url); },
  wallpaperClear: function () { return ipcRenderer.invoke('wallpaper:clear'); },
  wallpaperSetOpacity: function (opacity) { return ipcRenderer.invoke('wallpaper:setOpacity', opacity); },
  onFlush: function (cb) { ipcRenderer.on('app:flush', function () { cb(); }); }
});
