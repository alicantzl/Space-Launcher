const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window
    hideWindow: () => ipcRenderer.send('force-hide'),

    // Shortcuts
    getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
    saveShortcut: (s) => ipcRenderer.invoke('save-shortcut', s),
    deleteShortcut: (id) => ipcRenderer.invoke('delete-shortcut', id),
    editShortcut: (s) => ipcRenderer.invoke('edit-shortcut', s),
    reorderShortcuts: (ids) => ipcRenderer.invoke('reorder-shortcuts', ids),

    // Search & Actions
    searchFiles: (query) => ipcRenderer.invoke('search-files', query),
    runAction: (action) => ipcRenderer.send('run-action', action),

    // System
    getSysInfo: () => ipcRenderer.invoke('get-sys-info'),
    getLiveStats: () => ipcRenderer.invoke('get-live-stats'),

    // Translate
    translateText: (text) => ipcRenderer.invoke('translate-text', text),

    // Weather & Currency
    getWeather: () => ipcRenderer.invoke('get-weather'),
    getCurrency: () => ipcRenderer.invoke('get-currency'),

    // Snippets
    getSnippets: () => ipcRenderer.invoke('get-snippets'),
    saveSnippet: (s) => ipcRenderer.invoke('save-snippet', s),
    deleteSnippet: (id) => ipcRenderer.invoke('delete-snippet', id),

    // Clipboard
    getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

    // Alarms
    getAlarms: () => ipcRenderer.invoke('get-alarms'),
    saveAlarm: (a) => ipcRenderer.invoke('save-alarm', a),
    deleteAlarm: (id) => ipcRenderer.invoke('delete-alarm', id),

    // Settings/Theme
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

    // Events
    onClipboardUpdate: (cb) => ipcRenderer.on('clipboard-update', (e, data) => cb(data)),
    onAlarmFired: (cb) => ipcRenderer.on('alarm-fired', (e, data) => cb(data)),
});

ipcRenderer.on('window-focused', () => {
    window.dispatchEvent(new Event('window-focused'));
});
