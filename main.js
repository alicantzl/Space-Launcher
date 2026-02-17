const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, clipboard, Notification, Tray, Menu, nativeImage } = require('electron');

// Base64 icon for Tray (Simple white dot 16x16)
const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEUlEQVQ4T2P8z8AARQH//wUA+d0X5C/sOYcAAAAASUVORK5CYII=';

function createTray() {
    try {
        const icon = nativeImage.createFromDataURL(iconBase64);
        tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Space Hub', enabled: false },
            { type: 'separator' },
            { label: 'Göster / Gizle', click: () => toggleWindow() },
            { label: 'Yeniden Başlat', click: () => { app.relaunch(); app.exit(0); } },
            { type: 'separator' },
            { label: 'Çıkış', click: () => { app.quit(); } }
        ]);
        tray.setToolTip('Space Hub');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => toggleWindow());
    } catch (e) {
        console.error('Tray creation failed:', e);
    }
}

function toggleWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
        if (mainWindow.webContents) mainWindow.webContents.send('window-focused');
    }
}


const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');

// GPU flags moved to launcher script
// main.js continues...

// Data path
// Data path (Local for Dev, AppData for Prod)
if (!app.isPackaged) {
    const localDataPath = path.join(process.cwd(), '.space_system_data');
    if (!fs.existsSync(localDataPath)) fs.mkdirSync(localDataPath, { recursive: true });
    app.setPath('userData', localDataPath);
}

let mainWindow;
let tray = null;
let SHORTCUTS_FILE;
let clipboardHistory = [];
let clipboardWatcher = null;
let lastClipText = '';

// --- DEFAULT SHORTCUTS ---
const defaultShortcuts = [
    // Web & Social
    { id: 1, name: 'Google', desc: 'Arama Yap', icon: '🌐', color: '#4285F4', action: 'url:https://google.com', category: 'web' },
    { id: 2, name: 'ChatGPT', desc: 'AI Asistan', icon: '🤖', color: '#10a37f', action: 'url:https://chat.openai.com', category: 'web' },
    { id: 3, name: 'YouTube', desc: 'Video', icon: '📺', color: '#FF0000', action: 'url:https://youtube.com', category: 'web' },
    { id: 4, name: 'WhatsApp', desc: 'Mesajlaşma', icon: '💬', color: '#25D366', action: 'url:https://web.whatsapp.com', category: 'web' },
    { id: 5, name: 'GitHub', desc: 'Kod Deposu', icon: '🐙', color: '#8B5CF6', action: 'url:https://github.com', category: 'web' },
    { id: 6, name: 'Twitter / X', desc: 'Gündem', icon: '🐦', color: '#1DA1F2', action: 'url:https://twitter.com', category: 'web' },
    { id: 7, name: 'Instagram', desc: 'Sosyal Medya', icon: '📸', color: '#E1306C', action: 'url:https://instagram.com', category: 'web' },
    { id: 8, name: 'Netflix', desc: 'Dizi/Film', icon: '🎬', color: '#E50914', action: 'url:https://netflix.com', category: 'web' },
    // Tools
    { id: 11, name: 'Hesap Makinesi', desc: 'Matematik', icon: '🧮', color: '#f59e0b', action: 'app:calc', category: 'tools' },
    { id: 12, name: 'Not Defteri', desc: 'Hızlı Not', icon: '📝', color: '#6366f1', action: 'app:notepad', category: 'tools' },
    { id: 13, name: 'Görev Yöneticisi', desc: 'Sistem İzle', icon: '📊', color: '#0078d7', action: 'cmd:taskmgr', category: 'tools' },
    { id: 14, name: 'Ekran Alıntısı', desc: 'SS Al', icon: '✂️', color: '#d13438', action: 'cmd:explorer.exe ms-screenclip:', category: 'tools' },
    { id: 15, name: 'Boyama (Paint)', desc: 'Çizim', icon: '🎨', color: '#00bcf2', action: 'app:mspaint', category: 'tools' },
    { id: 16, name: 'Terminal', desc: 'PowerShell', icon: '💻', color: '#4B0082', action: 'app:powershell', category: 'tools' },
    // Folders
    { id: 21, name: 'İndirilenler', desc: 'Dosyalar', icon: '📂', color: '#3b82f6', action: 'folder:downloads', category: 'folders' },
    { id: 22, name: 'Belgeler', desc: 'Evraklar', icon: '📄', color: '#3b82f6', action: 'folder:documents', category: 'folders' },
    { id: 23, name: 'Masaüstü', desc: 'Desktop', icon: '🖥️', color: '#3b82f6', action: 'folder:desktop', category: 'folders' },
    { id: 24, name: 'Resimler', desc: 'Galeri', icon: '🖼️', color: '#3b82f6', action: 'folder:pictures', category: 'folders' },
    { id: 25, name: 'Müzik', desc: 'Müziklerim', icon: '🎵', color: '#3b82f6', action: 'folder:music', category: 'folders' },
    { id: 26, name: 'Videolar', desc: 'Videolarım', icon: '🎬', color: '#3b82f6', action: 'folder:videos', category: 'folders' },
    // System Commands
    { id: 31, name: 'PC Kapat', desc: 'Shutdown', icon: '🛑', color: '#e81123', action: 'cmd:shutdown /s /t 0', category: 'system' },
    { id: 32, name: 'Yeniden Başlat', desc: 'Restart', icon: '🔄', color: '#ffb900', action: 'cmd:shutdown /r /t 0', category: 'system' },
    { id: 33, name: 'Kilitle', desc: 'Lock Screen', icon: '🔒', color: '#0078d7', action: 'cmd:rundll32.exe user32.dll,LockWorkStation', category: 'system' },
    { id: 34, name: 'Çöpü Boşalt', desc: 'Clean', icon: '🗑️', color: '#555', action: 'cmd:powershell.exe -Command Clear-RecycleBin -Force', category: 'system' },
    { id: 35, name: 'Kamera', desc: 'Kamerayı Aç', icon: '🤳', color: '#00d1ff', action: 'cmd:start microsoft.windows.camera:', category: 'system' },
];

function getShortcutsFile() {
    if (!SHORTCUTS_FILE) SHORTCUTS_FILE = path.join(app.getPath('userData'), 'shortcuts_v7.json');
    return SHORTCUTS_FILE;
}

function loadShortcuts() {
    try {
        const file = getShortcutsFile();
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { }
    return defaultShortcuts;
}

function saveShortcuts(s) {
    try {
        fs.writeFileSync(getShortcutsFile(), JSON.stringify(s, null, 2));
    } catch (e) { console.error('Save error:', e); }
}

// --- SNIPPETS ---
function getSnippetsFile() {
    return path.join(app.getPath('userData'), 'snippets.json');
}

function loadSnippets() {
    try {
        const file = getSnippetsFile();
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { }
    return [];
}

function saveSnippets(s) {
    try {
        fs.writeFileSync(getSnippetsFile(), JSON.stringify(s, null, 2));
    } catch (e) { console.error('Save snippets error:', e); }
}

// --- ALARMS ---
function getAlarmsFile() {
    return path.join(app.getPath('userData'), 'alarms.json');
}

function loadAlarms() {
    try {
        const file = getAlarmsFile();
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { }
    return [];
}

function saveAlarms(a) {
    try {
        fs.writeFileSync(getAlarmsFile(), JSON.stringify(a, null, 2));
    } catch (e) { console.error('Save alarms error:', e); }
}

// --- THEME ---
function getSettingsFile() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
    try {
        const file = getSettingsFile();
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { }
    return { theme: 'midnight', pomodoroWork: 25, pomodoroBreak: 5 };
}

function saveSettings(s) {
    try {
        fs.writeFileSync(getSettingsFile(), JSON.stringify(s, null, 2));
    } catch (e) { console.error('Save settings error:', e); }
}

// --- FOLDER PATH RESOLVER ---
function resolveFolder(folderAction) {
    const folderName = folderAction.replace('folder:', '');
    const folderMap = {
        'downloads': app.getPath('downloads'),
        'documents': app.getPath('documents'),
        'desktop': app.getPath('desktop'),
        'pictures': app.getPath('pictures'),
        'music': app.getPath('music'),
        'videos': app.getPath('videos'),
        'home': app.getPath('home'),
    };
    return folderMap[folderName] || folderName;
}

// --- HTTP FETCH HELPER (no external deps) ---
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : require('http');
        lib.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// --- CLIPBOARD WATCHER ---
function startClipboardWatcher() {
    lastClipText = clipboard.readText();
    clipboardWatcher = setInterval(() => {
        const current = clipboard.readText();
        if (current && current !== lastClipText) {
            lastClipText = current;
            clipboardHistory.unshift({
                text: current,
                time: Date.now(),
            });
            if (clipboardHistory.length > 50) clipboardHistory.pop();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('clipboard-update', clipboardHistory);
            }
        }
    }, 1000);
}

// --- ALARM CHECKER ---
let alarmInterval;
function startAlarmChecker() {
    alarmInterval = setInterval(() => {
        const alarms = loadAlarms();
        const now = Date.now();
        let changed = false;
        alarms.forEach(alarm => {
            if (!alarm.fired && alarm.time <= now) {
                alarm.fired = true;
                changed = true;
                // Show notification
                if (Notification.isSupported()) {
                    new Notification({
                        title: '⏰ Space Hatırlatıcı',
                        body: alarm.title || 'Alarm zamanı geldi!',
                        icon: null
                    }).show();
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('alarm-fired', alarm);
                }
            }
        });
        if (changed) saveAlarms(alarms);
    }, 5000);
}

// --- CPU USAGE HELPER ---
function getCpuUsage() {
    return new Promise((resolve) => {
        const cpus1 = os.cpus();
        setTimeout(() => {
            const cpus2 = os.cpus();
            let totalIdle = 0, totalTick = 0;
            for (let i = 0; i < cpus2.length; i++) {
                const c1 = cpus1[i].times;
                const c2 = cpus2[i].times;
                const idle = c2.idle - c1.idle;
                const total = (c2.user - c1.user) + (c2.nice - c1.nice) + (c2.sys - c1.sys) + (c2.irq - c1.irq) + idle;
                totalIdle += idle;
                totalTick += total;
            }
            resolve(Math.round((1 - totalIdle / totalTick) * 100));
        }, 500);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 780,
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
        },
    });

    mainWindow.loadFile('renderer/index.html');
    mainWindow.center();
    mainWindow.on('blur', () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();
        createTray(); // Initialize Tray
        startClipboardWatcher();
        startAlarmChecker();

        // Global shortcuts
        ['Alt+Space', 'Super+Space'].forEach(key => {
            try {
                globalShortcut.register(key, () => toggleWindow());

            } catch (e) { console.warn(`Could not register ${key}:`, e.message); }
        });

        // --- IPC HANDLERS ---
        ipcMain.on('force-hide', () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
        });

        // Shortcuts CRUD
        ipcMain.handle('get-shortcuts', () => loadShortcuts());
        ipcMain.handle('save-shortcut', (e, s) => {
            const c = loadShortcuts();
            c.unshift({ ...s, id: Date.now() });
            saveShortcuts(c);
            return c;
        });
        ipcMain.handle('delete-shortcut', (e, id) => {
            const c = loadShortcuts().filter(sc => sc.id !== id);
            saveShortcuts(c);
            return c;
        });
        ipcMain.handle('edit-shortcut', (e, updated) => {
            const c = loadShortcuts().map(sc => sc.id === updated.id ? { ...sc, ...updated } : sc);
            saveShortcuts(c);
            return c;
        });
        ipcMain.handle('reorder-shortcuts', (e, ids) => {
            const c = loadShortcuts();
            const ordered = ids.map(id => c.find(s => s.id === id)).filter(Boolean);
            const remaining = c.filter(s => !ids.includes(s.id));
            const result = [...ordered, ...remaining];
            saveShortcuts(result);
            return result;
        });

        // System Info
        ipcMain.handle('get-sys-info', async () => {
            const cpuUsage = await getCpuUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memPercent = Math.round((usedMem / totalMem) * 100);
            const uptimeH = Math.floor(os.uptime() / 3600);
            const uptimeM = Math.floor(os.uptime() / 60) % 60;
            return {
                ram: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)} / ${(totalMem / 1024 / 1024 / 1024).toFixed(0)} GB`,
                ramPercent: memPercent,
                cpu: os.cpus()[0].model.split('@')[0].trim(),
                cpuPercent: cpuUsage,
                uptime: `${uptimeH}s ${uptimeM}d`,
                user: os.userInfo().username,
                platform: `${os.type()} ${os.release()}`,
                cores: os.cpus().length,
                hostname: os.hostname(),
            };
        });

        // Live Stats for graph
        ipcMain.handle('get-live-stats', async () => {
            const cpuUsage = await getCpuUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            return {
                cpuPercent: cpuUsage,
                ramPercent: Math.round((usedMem / totalMem) * 100),
                timestamp: Date.now(),
            };
        });

        // File Search - FIXED
        ipcMain.handle('search-files', async (e, q) => {
            if (!q || q.length < 2) return [];
            const dirs = [app.getPath('desktop'), app.getPath('downloads'), app.getPath('documents')];
            return new Promise(resolve => {
                const safeDirs = dirs.map(d => `'${d.replace(/'/g, "''")}'`).join(',');
                const safeQ = q.replace(/'/g, "''").replace(/[[\]{}()*+?.,\\^$|#]/g, '');
                const cmd = `Get-ChildItem -Path ${safeDirs} -Filter '*${safeQ}*' -Recurse -ErrorAction SilentlyContinue -Force | Select-Object -First 15 | ForEach-Object { [PSCustomObject]@{ name = $_.Name; path = $_.FullName; type = if($_.PSIsContainer){'folder'}else{'file'}; size = if($_.PSIsContainer){0}else{$_.Length}; modified = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm') } } | ConvertTo-Json -Compress`;
                exec(`powershell -NoProfile -Command "${cmd}"`, { timeout: 5000 }, (err, stdout) => {
                    try {
                        if (!stdout || !stdout.trim()) return resolve([]);
                        let parsed = JSON.parse(stdout.trim());
                        // PowerShell returns object instead of array for single results
                        if (!Array.isArray(parsed)) parsed = [parsed];
                        resolve(parsed);
                    } catch (e) { resolve([]); }
                });
            });
        });

        // Translate
        ipcMain.handle('translate-text', async (e, t) => {
            try {
                const data = await httpGet(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(t)}`);
                const parsed = JSON.parse(data);
                return parsed[0][0][0];
            } catch (err) { return 'Çeviri hatası oluştu.'; }
        });

        // Weather - REAL
        ipcMain.handle('get-weather', async () => {
            try {
                const geoData = await httpGet('http://ip-api.com/json/?fields=lat,lon,city');
                const geo = JSON.parse(geoData);
                const weatherData = await httpGet(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=auto`);
                const weather = JSON.parse(weatherData);
                const codes = {
                    0: '☀️ Güneşli', 1: '🌤️ Az Bulutlu', 2: '⛅ Parçalı Bulutlu', 3: '☁️ Bulutlu',
                    45: '🌫️ Sisli', 48: '🌫️ Kırağılı', 51: '🌦️ Hafif Yağmur', 53: '🌧️ Yağmurlu',
                    55: '🌧️ Kuvvetli Yağmur', 61: '🌧️ Yağmurlu', 63: '🌧️ Orta Yağmur', 65: '🌧️ Şiddetli Yağmur',
                    71: '🌨️ Hafif Kar', 73: '❄️ Karlı', 75: '❄️ Yoğun Kar', 80: '🌧️ Sağanak',
                    95: '⛈️ Gök Gürültülü', 96: '⛈️ Dolulu',
                };
                return {
                    temp: Math.round(weather.current.temperature_2m),
                    desc: codes[weather.current.weathercode] || '🌡️ Bilinmiyor',
                    humidity: weather.current.relativehumidity_2m,
                    wind: Math.round(weather.current.windspeed_10m),
                    city: geo.city,
                };
            } catch (e) { return { temp: '--', desc: '❌ Veri alınamadı', humidity: '--', wind: '--', city: '--' }; }
        });

        // Currency - REAL
        ipcMain.handle('get-currency', async () => {
            try {
                const data = await httpGet('https://open.er-api.com/v6/latest/USD');
                const parsed = JSON.parse(data);
                const tryRate = parsed.rates.TRY;
                const eurRate = parsed.rates.EUR;
                const gbpRate = parsed.rates.GBP;
                return {
                    usdTry: tryRate ? tryRate.toFixed(2) : '--',
                    eurTry: tryRate && eurRate ? (tryRate / eurRate).toFixed(2) : '--',
                    gbpTry: tryRate && gbpRate ? (tryRate / gbpRate).toFixed(2) : '--',
                };
            } catch (e) { return { usdTry: '--', eurTry: '--', gbpTry: '--' }; }
        });

        // Snippets
        ipcMain.handle('get-snippets', () => loadSnippets());
        ipcMain.handle('save-snippet', (e, snippet) => {
            const snips = loadSnippets();
            snips.unshift({ ...snippet, id: Date.now(), createdAt: new Date().toISOString() });
            saveSnippets(snips);
            return snips;
        });
        ipcMain.handle('delete-snippet', (e, id) => {
            const snips = loadSnippets().filter(s => s.id !== id);
            saveSnippets(snips);
            return snips;
        });

        // Clipboard History
        ipcMain.handle('get-clipboard-history', () => clipboardHistory);
        ipcMain.handle('copy-to-clipboard', (e, text) => {
            clipboard.writeText(text);
            return true;
        });

        // Alarms
        ipcMain.handle('get-alarms', () => loadAlarms().filter(a => !a.fired));
        ipcMain.handle('save-alarm', (e, alarm) => {
            const alarms = loadAlarms();
            alarms.push({ ...alarm, id: Date.now(), fired: false });
            saveAlarms(alarms);
            return alarms.filter(a => !a.fired);
        });
        ipcMain.handle('delete-alarm', (e, id) => {
            const alarms = loadAlarms().filter(a => a.id !== id);
            saveAlarms(alarms);
            return alarms.filter(a => !a.fired);
        });

        // Settings/Theme
        ipcMain.handle('get-settings', () => loadSettings());
        ipcMain.handle('save-settings', (e, settings) => {
            saveSettings(settings);
            return settings;
        });

        // Run Action - FIXED
        ipcMain.on('run-action', (e, a) => {
            try {
                if (a.startsWith('url:')) {
                    shell.openExternal(a.substring(4));
                } else if (a.startsWith('app:')) {
                    exec(`start "" "${a.substring(4)}"`);
                } else if (a.startsWith('cmd:')) {
                    exec(a.substring(4));
                } else if (a.startsWith('folder:')) {
                    const resolved = resolveFolder(a);
                    shell.openPath(resolved);
                } else if (a.startsWith('file:')) {
                    shell.openPath(a.substring(5));
                } else if (a.startsWith('copy:')) {
                    clipboard.writeText(a.substring(5));
                }
            } catch (err) {
                console.error('Action error:', err);
            }
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
        });
    });
}

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (clipboardWatcher) clearInterval(clipboardWatcher);
    if (alarmInterval) clearInterval(alarmInterval);
});
