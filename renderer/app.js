// ============================================
// SPACE HUB v5.0 — Complete Application Logic
// ============================================

// --- DOM REFS ---
const masterSearch = document.getElementById('master-search');
const searchOverlay = document.getElementById('search-overlay');
const resultsList = document.getElementById('results-list');
const shortcutsGrid = document.getElementById('shortcuts-grid');
const addBtn = document.getElementById('add-action');
const modal = document.getElementById('add-modal');
const stickyNote = document.getElementById('sticky-note');
const categoryFilter = document.getElementById('category-filter');

// --- STATE ---
let actions = [];
let activeIndex = -1;
let currentList = [];
let searchTimer = null;
let settings = { theme: 'midnight', pomodoroWork: 25, pomodoroBreak: 5 };

// Pomodoro State
let pomoState = {
    running: false,
    isWork: true,
    timeLeft: 25 * 60,
    totalSeconds: 25 * 60,
    interval: null,
    sessions: 0,
    totalMinutes: 0,
};

// ========================================
// BOOT
// ========================================
async function boot() {
    try {
        // Load settings & theme
        settings = await window.electronAPI.getSettings();
        applyTheme(settings.theme || 'midnight');

        // Load shortcuts
        actions = await window.electronAPI.getShortcuts();
        renderActions();

        // Sticky note
        const savedNote = localStorage.getItem('space_note');
        if (savedNote) stickyNote.value = savedNote;

        // Pomodoro settings
        pomoState.totalSeconds = (settings.pomodoroWork || 25) * 60;
        pomoState.timeLeft = pomoState.totalSeconds;
        updatePomodoroDisplay();

        // Start widgets
        updateClock();
        fetchSysInfo();
        fetchWeather();
        fetchCurrency();
        loadSnippets();
        loadClipboardHistory();
        loadAlarms();

        // Intervals
        setInterval(updateClock, 1000);
        setInterval(fetchLiveStats, 3000);
        setInterval(fetchWeather, 300000); // 5 min
        setInterval(fetchCurrency, 600000); // 10 min
        setInterval(loadClipboardHistory, 2000);
        setInterval(updateAlarmCountdowns, 1000);

        // Settings inputs
        document.getElementById('pomo-work-input').value = settings.pomodoroWork || 25;
        document.getElementById('pomo-break-input').value = settings.pomodoroBreak || 5;

    } catch (err) {
        console.error('Boot error:', err);
    }
}

// ========================================
// THEME
// ========================================
function applyTheme(theme) {
    document.getElementById('app-shell').setAttribute('data-theme', theme);
    // Update theme card active states
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === theme);
    });
    settings.theme = theme;
}

document.getElementById('theme-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.theme-card');
    if (!card) return;
    const theme = card.dataset.theme;
    applyTheme(theme);
    window.electronAPI.saveSettings({ ...settings, theme });
});

// ========================================
// TAB NAVIGATION
// ========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.querySelector(`[data-page="${tab}"]`).classList.add('active');
    });
});

// ========================================
// SHORTCUTS / ACTIONS
// ========================================
function renderActions(filter = 'all') {
    const filtered = filter === 'all' ? actions : actions.filter(a => a.category === filter);

    shortcutsGrid.innerHTML = filtered.map(a => {
        const colorStyle = a.color ? `--card-accent: ${a.color}` : '';
        return `
        <div class="action-card" style="${colorStyle}" data-action="${escapeAttr(a.action)}" data-id="${a.id}">
            <button class="card-del" data-del-id="${a.id}" title="Sil">✕</button>
            <span class="card-icon">${a.icon || '🔗'}</span>
            <span class="card-name">${escapeHtml(a.name)}</span>
            <span class="card-desc">${escapeHtml(a.desc || '')}</span>
        </div>`;
    }).join('');
}

// Event delegation for action cards
shortcutsGrid.addEventListener('click', async (e) => {
    // Delete button
    const delBtn = e.target.closest('[data-del-id]');
    if (delBtn) {
        e.stopPropagation();
        const id = Number(delBtn.dataset.delId);
        if (confirm('Bu aksiyonu silmek istediğine emin misin?')) {
            actions = await window.electronAPI.deleteShortcut(id);
            renderActions(categoryFilter.value);
        }
        return;
    }

    // Card click
    const card = e.target.closest('.action-card');
    if (card && card.dataset.action) {
        triggerAction(card.dataset.action);
    }
});

categoryFilter.addEventListener('change', () => {
    renderActions(categoryFilter.value);
});

// ========================================
// SEARCH ENGINE
// ========================================
masterSearch.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearTimeout(searchTimer);

    if (val.length > 0) {
        searchOverlay.classList.remove('hidden');
        processSearch(val);
        searchTimer = setTimeout(() => searchFiles(val), 300);
    } else {
        searchOverlay.classList.add('hidden');
        activeIndex = -1;
        currentList = [];
    }
});

async function processSearch(val) {
    let results = [];

    // 1. Translation (ç:text)
    if (val.startsWith('ç:') || val.startsWith('c:')) {
        const text = val.slice(2).trim();
        if (text.length > 1) {
            try {
                const trans = await window.electronAPI.translateText(text);
                results.push({
                    title: `Çeviri: ${trans}`,
                    sub: 'Tıkla → panoya kopyala',
                    icon: '🌍',
                    action: `copy:${trans}`
                });
            } catch (e) { }
        }
    }

    // 2. Math evaluation
    try {
        if (/^[0-9+\-*/().,%\s]+$/.test(val) && val.length > 0) {
            const sanitized = val.replace(/%/g, '/100*').replace(/,/g, '.');
            const res = Function('"use strict"; return (' + sanitized + ')')();
            if (typeof res === 'number' && isFinite(res)) {
                results.push({
                    title: `= ${res}`,
                    sub: 'Sonucu kopyala',
                    icon: '🧮',
                    action: `copy:${res}`
                });
            }
        }
    } catch (e) { }

    // 3. Color preview
    if (val.startsWith('renk:') || val.startsWith('color:')) {
        const c = val.includes(':') ? val.split(':')[1].trim() : '';
        if (c) {
            results.push({
                title: `Renk: ${c}`,
                sub: 'CSS kodunu kopyala',
                icon: '🎨',
                action: `copy:${c}`
            });
        }
    }

    // 4. Match existing shortcuts
    const q = val.toLowerCase();
    const matched = actions.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.desc && a.desc.toLowerCase().includes(q))
    ).slice(0, 5);
    matched.forEach(a => {
        results.push({
            title: a.name,
            sub: a.desc || a.action,
            icon: a.icon || '🔗',
            action: a.action
        });
    });

    // 5. Default web searches
    results.push({
        title: `Google: "${val}"`,
        sub: 'Web\'de ara',
        icon: '🔍',
        action: `url:https://google.com/search?q=${encodeURIComponent(val)}`
    });
    results.push({
        title: `YouTube: "${val}"`,
        sub: 'Video ara',
        icon: '📺',
        action: `url:https://youtube.com/results?search_query=${encodeURIComponent(val)}`
    });

    displayResults(results, true);
}

async function searchFiles(query) {
    try {
        const files = await window.electronAPI.searchFiles(query);
        if (!Array.isArray(files)) return;
        const fileResults = files.map(f => ({
            title: f.name,
            sub: f.path,
            icon: f.type === 'folder' ? '📂' : getFileIcon(f.name),
            action: f.type === 'folder' ? `folder:${f.path}` : `file:${f.path}`,
            extra: f.size ? formatSize(f.size) : '',
        }));
        displayResults(fileResults, false);
    } catch (e) {
        console.error('File search error:', e);
    }
}

function getFileIcon(name) {
    if (!name) return '📄';
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📊', 'xlsx': '📊',
        'ppt': '📙', 'pptx': '📙', 'txt': '📝', 'jpg': '🖼️', 'jpeg': '🖼️',
        'png': '🖼️', 'gif': '🖼️', 'mp3': '🎵', 'mp4': '🎬', 'zip': '📦',
        'rar': '📦', 'exe': '⚙️', 'js': '💻', 'py': '🐍', 'html': '🌐',
        'css': '🎨', 'json': '📋',
    };
    return icons[ext] || '📄';
}

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}

function displayResults(data, isBase) {
    if (isBase) {
        currentList = data;
    } else {
        // Merge: keep non-file results, add new file results
        currentList = [...currentList.filter(r => !r.action.startsWith('file:') && !r.action.startsWith('folder:')), ...data];
    }

    activeIndex = -1;

    resultsList.innerHTML = currentList.map((r, i) => `
        <div class="result-item ${i === activeIndex ? 'active' : ''}" data-idx="${i}" data-action="${escapeAttr(r.action)}">
            <div class="res-icon">${r.icon}</div>
            <div class="res-text">
                <span class="res-title">${escapeHtml(r.title)}</span>
                <span class="res-sub">${escapeHtml(r.sub)}</span>
            </div>
            ${r.extra ? `<span class="res-extra">${r.extra}</span>` : ''}
        </div>
    `).join('');
}

// Event delegation for results
resultsList.addEventListener('click', (e) => {
    const item = e.target.closest('.result-item');
    if (item && item.dataset.action) {
        triggerAction(item.dataset.action);
    }
});

// ========================================
// KEYBOARD NAVIGATION
// ========================================
masterSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!searchOverlay.classList.contains('hidden')) {
            searchOverlay.classList.add('hidden');
            masterSearch.value = '';
            activeIndex = -1;
        } else {
            window.electronAPI.hideWindow();
        }
        return;
    }

    if (currentList.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(currentList.length - 1, activeIndex + 1);
        updateActiveResult();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        updateActiveResult();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = activeIndex >= 0 ? currentList[activeIndex] : currentList[0];
        if (target) triggerAction(target.action);
    }
});

// Also handle ESC globally
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modal first
        const openModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (openModal) {
            openModal.classList.add('hidden');
            return;
        }
        if (!searchOverlay.classList.contains('hidden')) {
            searchOverlay.classList.add('hidden');
            masterSearch.value = '';
            activeIndex = -1;
            return;
        }
        window.electronAPI.hideWindow();
    }
});

function updateActiveResult() {
    document.querySelectorAll('.result-item').forEach((el, i) => {
        el.classList.toggle('active', i === activeIndex);
    });
    const activeEl = resultsList.querySelector('.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function triggerAction(action) {
    window.electronAPI.runAction(action);
    masterSearch.value = '';
    searchOverlay.classList.add('hidden');
    activeIndex = -1;
}

// ========================================
// ADD SHORTCUT MODAL
// ========================================
addBtn.addEventListener('click', () => {
    clearModalInputs('add-modal');
    modal.classList.remove('hidden');
    document.getElementById('new-name').focus();
});

document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('cancel-modal').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('save-modal').addEventListener('click', async () => {
    const name = document.getElementById('new-name').value.trim();
    const cmd = document.getElementById('new-cmd').value.trim();
    const icon = document.getElementById('new-icon').value.trim() || '🚀';
    const color = document.getElementById('new-color').value;
    const category = document.getElementById('new-category').value;

    if (!name || !cmd) {
        shakeElement(document.querySelector('.modal-card'));
        return;
    }

    actions = await window.electronAPI.saveShortcut({
        name, action: cmd, icon, color, desc: 'Kullanıcı', category
    });
    renderActions(categoryFilter.value);
    modal.classList.add('hidden');
    clearModalInputs('add-modal');
});

// ========================================
// STICKY NOTE
// ========================================
stickyNote.addEventListener('input', (e) => {
    localStorage.setItem('space_note', e.target.value);
});

// ========================================
// CLOCK
// ========================================
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('time-now').textContent = `${h}:${m}`;
    document.getElementById('time-seconds').textContent = s;
    document.getElementById('date-now').textContent = now.toLocaleDateString('tr-TR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

// ========================================
// SYSTEM INFO
// ========================================
async function fetchSysInfo() {
    try {
        const si = await window.electronAPI.getSysInfo();
        document.getElementById('si-user').textContent = si.user;
        document.getElementById('si-cpu').textContent = si.cpu;
        document.getElementById('si-ram').textContent = si.ram;
        document.getElementById('si-uptime').textContent = si.uptime;
        updateBars(si.cpuPercent, si.ramPercent);
    } catch (e) {
        console.error('SysInfo error:', e);
    }
}

async function fetchLiveStats() {
    try {
        const stats = await window.electronAPI.getLiveStats();
        updateBars(stats.cpuPercent, stats.ramPercent);
    } catch (e) { }
}

function updateBars(cpu, ram) {
    const cpuBar = document.getElementById('cpu-bar');
    const ramBar = document.getElementById('ram-bar');
    const cpuLabel = document.getElementById('cpu-percent');
    const ramLabel = document.getElementById('ram-percent');

    if (cpuBar) cpuBar.style.width = cpu + '%';
    if (ramBar) ramBar.style.width = ram + '%';
    if (cpuLabel) cpuLabel.textContent = cpu + '%';
    if (ramLabel) ramLabel.textContent = ram + '%';

    // Color coding
    if (cpuBar) {
        cpuBar.style.background = cpu > 80 ? 'linear-gradient(90deg, #ef4444, #f97316)' :
            cpu > 50 ? 'linear-gradient(90deg, #f59e0b, #eab308)' :
                'linear-gradient(90deg, var(--primary), var(--accent))';
    }
    if (ramBar) {
        ramBar.style.background = ram > 80 ? 'linear-gradient(90deg, #ef4444, #f97316)' :
            ram > 50 ? 'linear-gradient(90deg, #f59e0b, #eab308)' :
                'linear-gradient(90deg, var(--accent2), var(--primary))';
    }
}

// ========================================
// WEATHER
// ========================================
async function fetchWeather() {
    try {
        const w = await window.electronAPI.getWeather();
        document.getElementById('weather-temp').textContent = w.temp + '°';
        document.getElementById('weather-desc').textContent = w.desc;
        document.getElementById('weather-humidity').textContent = w.humidity;
        document.getElementById('weather-wind').textContent = w.wind;
        document.getElementById('weather-city').textContent = w.city;
    } catch (e) {
        console.error('Weather error:', e);
    }
}

// ========================================
// CURRENCY
// ========================================
async function fetchCurrency() {
    try {
        const c = await window.electronAPI.getCurrency();
        document.getElementById('usd-val').textContent = '₺' + c.usdTry;
        document.getElementById('eur-val').textContent = '₺' + c.eurTry;
        document.getElementById('gbp-val').textContent = '₺' + c.gbpTry;
    } catch (e) {
        console.error('Currency error:', e);
    }
}

// ========================================
// SNIPPETS
// ========================================
async function loadSnippets() {
    try {
        const snippets = await window.electronAPI.getSnippets();
        renderSnippets(snippets);
    } catch (e) { }
}

function renderSnippets(snippets) {
    const list = document.getElementById('snippets-list');
    if (!snippets || snippets.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>Henüz snippet yok. Sık kullandığın metinleri buraya kaydet!</p>
            </div>`;
        return;
    }

    list.innerHTML = snippets.map(s => `
        <div class="snippet-card" data-id="${s.id}">
            <div class="snippet-header">
                <span class="snippet-title">${escapeHtml(s.title)}</span>
                <div class="snippet-actions">
                    <button class="snippet-btn" data-copy-snippet="${s.id}">📋 Kopyala</button>
                    <button class="snippet-btn danger" data-del-snippet="${s.id}">🗑️ Sil</button>
                </div>
            </div>
            <div class="snippet-content">${escapeHtml(s.content)}</div>
            ${s.tags && s.tags.length ? `
                <div class="snippet-tags">
                    ${s.tags.map(t => `<span class="snippet-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Snippet event delegation
document.getElementById('snippets-list').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-copy-snippet]');
    if (copyBtn) {
        const snippets = await window.electronAPI.getSnippets();
        const id = Number(copyBtn.dataset.copySnippet);
        const snippet = snippets.find(s => s.id === id);
        if (snippet) {
            await window.electronAPI.copyToClipboard(snippet.content);
            copyBtn.textContent = '✅ Kopyalandı!';
            setTimeout(() => copyBtn.textContent = '📋 Kopyala', 1500);
        }
        return;
    }

    const delBtn = e.target.closest('[data-del-snippet]');
    if (delBtn) {
        if (confirm('Bu snippet\'i silmek istediğine emin misin?')) {
            const id = Number(delBtn.dataset.delSnippet);
            const snippets = await window.electronAPI.deleteSnippet(id);
            renderSnippets(snippets);
        }
    }
});

// Add Snippet Modal
document.getElementById('add-snippet-btn').addEventListener('click', () => {
    clearModalInputs('snippet-modal');
    document.getElementById('snippet-modal').classList.remove('hidden');
    document.getElementById('snippet-title').focus();
});

document.getElementById('close-snippet-modal').addEventListener('click', () => {
    document.getElementById('snippet-modal').classList.add('hidden');
});
document.getElementById('cancel-snippet-modal').addEventListener('click', () => {
    document.getElementById('snippet-modal').classList.add('hidden');
});

document.getElementById('save-snippet-modal').addEventListener('click', async () => {
    const title = document.getElementById('snippet-title').value.trim();
    const content = document.getElementById('snippet-content').value.trim();
    const tagsStr = document.getElementById('snippet-tags').value.trim();

    if (!title || !content) {
        shakeElement(document.querySelector('#snippet-modal .modal-card'));
        return;
    }

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const snippets = await window.electronAPI.saveSnippet({ title, content, tags });
    renderSnippets(snippets);
    document.getElementById('snippet-modal').classList.add('hidden');
    clearModalInputs('snippet-modal');
});

// ========================================
// CLIPBOARD HISTORY
// ========================================
async function loadClipboardHistory() {
    try {
        const history = await window.electronAPI.getClipboardHistory();
        renderClipboard(history);
    } catch (e) { }
}

function renderClipboard(history) {
    const list = document.getElementById('clipboard-list');
    const empty = document.getElementById('clipboard-empty');

    if (!history || history.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = history.map((item, i) => `
        <div class="clip-item" data-clip-idx="${i}">
            <span class="clip-text">${escapeHtml(item.text.substring(0, 200))}</span>
            <span class="clip-time">${timeAgo(item.time)}</span>
            <button class="clip-copy" data-clip-text="${escapeAttr(item.text.substring(0, 500))}">Kopyala</button>
        </div>
    `).join('');
}

document.getElementById('clipboard-list').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-clip-text]');
    if (copyBtn) {
        await window.electronAPI.copyToClipboard(copyBtn.dataset.clipText);
        copyBtn.textContent = '✅';
        setTimeout(() => copyBtn.textContent = 'Kopyala', 1200);
    }
});

// ========================================
// POMODORO TIMER
// ========================================
const pomoStartBtn = document.getElementById('pomo-start');
const pomoResetBtn = document.getElementById('pomo-reset');

pomoStartBtn.addEventListener('click', () => {
    if (pomoState.running) {
        pausePomodoro();
    } else {
        startPomodoro();
    }
});

pomoResetBtn.addEventListener('click', () => {
    resetPomodoro();
});

function startPomodoro() {
    pomoState.running = true;
    pomoStartBtn.textContent = '⏸ Duraklat';

    pomoState.interval = setInterval(() => {
        pomoState.timeLeft--;
        if (pomoState.timeLeft <= 0) {
            // Session complete
            if (pomoState.isWork) {
                pomoState.sessions++;
                pomoState.totalMinutes += (settings.pomodoroWork || 25);
                pomoState.isWork = false;
                pomoState.totalSeconds = (settings.pomodoroBreak || 5) * 60;
                pomoState.timeLeft = pomoState.totalSeconds;
                // Notify
                showToast('Pomodoro', 'Mola zamanı! 🎉');
            } else {
                pomoState.isWork = true;
                pomoState.totalSeconds = (settings.pomodoroWork || 25) * 60;
                pomoState.timeLeft = pomoState.totalSeconds;
                showToast('Pomodoro', 'Çalışma zamanı! 💪');
            }
        }
        updatePomodoroDisplay();
    }, 1000);
}

function pausePomodoro() {
    pomoState.running = false;
    clearInterval(pomoState.interval);
    pomoStartBtn.textContent = '▶ Devam Et';
}

function resetPomodoro() {
    pomoState.running = false;
    clearInterval(pomoState.interval);
    pomoState.isWork = true;
    pomoState.totalSeconds = (settings.pomodoroWork || 25) * 60;
    pomoState.timeLeft = pomoState.totalSeconds;
    pomoStartBtn.textContent = '▶ Başlat';
    updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
    const min = Math.floor(pomoState.timeLeft / 60);
    const sec = pomoState.timeLeft % 60;
    document.getElementById('pomo-time').textContent =
        `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    document.getElementById('pomo-label').textContent =
        pomoState.isWork ? 'ÇALIŞMA' : 'MOLA';

    // Ring progress
    const circumference = 2 * Math.PI * 90; // ~565.48
    const progress = pomoState.timeLeft / pomoState.totalSeconds;
    const offset = circumference * (1 - progress);
    const circle = document.getElementById('pomo-circle');
    if (circle) {
        circle.style.strokeDashoffset = offset;
        circle.style.stroke = pomoState.isWork ? 'var(--primary)' : 'var(--success)';
    }

    // Stats
    document.getElementById('pomo-sessions').textContent = pomoState.sessions;
    document.getElementById('pomo-total-time').textContent = pomoState.totalMinutes + 'dk';
    document.getElementById('pomo-mode').textContent = pomoState.isWork ? 'Çalışma' : 'Mola';
}

// ========================================
// ALARMS
// ========================================
async function loadAlarms() {
    try {
        const alarms = await window.electronAPI.getAlarms();
        renderAlarms(alarms);
    } catch (e) { }
}

function renderAlarms(alarms) {
    const list = document.getElementById('alarms-list');
    if (!alarms || alarms.length === 0) {
        list.innerHTML = '<div style="font-size:10px;color:var(--text-dim);text-align:center;padding:8px;">Hatırlatıcı yok</div>';
        return;
    }

    list.innerHTML = alarms.filter(a => !a.fired).map(a => {
        const remaining = Math.max(0, Math.floor((a.time - Date.now()) / 60000));
        return `
        <div class="alarm-item" data-alarm-id="${a.id}">
            <span class="alarm-item-title">${escapeHtml(a.title)}</span>
            <span class="alarm-item-time" data-alarm-time="${a.time}">${remaining} dk</span>
            <button class="alarm-item-del" data-del-alarm="${a.id}">✕</button>
        </div>`;
    }).join('');
}

function updateAlarmCountdowns() {
    document.querySelectorAll('[data-alarm-time]').forEach(el => {
        const target = Number(el.dataset.alarmTime);
        const remaining = Math.max(0, Math.floor((target - Date.now()) / 60000));
        el.textContent = remaining > 0 ? `${remaining} dk` : 'Şimdi!';
    });
}

document.getElementById('alarms-list').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-del-alarm]');
    if (delBtn) {
        const id = Number(delBtn.dataset.delAlarm);
        const alarms = await window.electronAPI.deleteAlarm(id);
        renderAlarms(alarms);
    }
});

// Add Alarm Modal
document.getElementById('add-alarm-btn').addEventListener('click', () => {
    clearModalInputs('alarm-modal');
    document.getElementById('alarm-modal').classList.remove('hidden');
    document.getElementById('alarm-title').focus();
});

document.getElementById('close-alarm-modal').addEventListener('click', () => {
    document.getElementById('alarm-modal').classList.add('hidden');
});
document.getElementById('cancel-alarm-modal').addEventListener('click', () => {
    document.getElementById('alarm-modal').classList.add('hidden');
});

document.getElementById('save-alarm-modal').addEventListener('click', async () => {
    const title = document.getElementById('alarm-title').value.trim();
    const minutes = parseInt(document.getElementById('alarm-minutes').value) || 30;

    if (!title) {
        shakeElement(document.querySelector('#alarm-modal .modal-card'));
        return;
    }

    const time = Date.now() + minutes * 60000;
    const alarms = await window.electronAPI.saveAlarm({ title, time });
    renderAlarms(alarms);
    document.getElementById('alarm-modal').classList.add('hidden');
    clearModalInputs('alarm-modal');
});

// Alarm Fired Handler
window.electronAPI.onAlarmFired((alarm) => {
    showToast(alarm.title || 'Hatırlatıcı', 'Zamanı geldi! ⏰');
    loadAlarms(); // Refresh list
});

// ========================================
// SETTINGS
// ========================================
document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const workMin = parseInt(document.getElementById('pomo-work-input').value) || 25;
    const breakMin = parseInt(document.getElementById('pomo-break-input').value) || 5;

    settings.pomodoroWork = workMin;
    settings.pomodoroBreak = breakMin;
    await window.electronAPI.saveSettings(settings);

    // Update pomodoro
    if (pomoState.isWork && !pomoState.running) {
        pomoState.totalSeconds = workMin * 60;
        pomoState.timeLeft = pomoState.totalSeconds;
        updatePomodoroDisplay();
    }

    showToast('Ayarlar', 'Ayarlar kaydedildi ✅');
});

// ========================================
// WINDOW FOCUS
// ========================================
window.addEventListener('window-focused', () => {
    masterSearch.value = '';
    masterSearch.focus();
    searchOverlay.classList.add('hidden');
    activeIndex = -1;
});

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(title, desc) {
    const toast = document.getElementById('alarm-toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-desc').textContent = desc;
    toast.classList.remove('hidden');

    setTimeout(() => toast.classList.add('hidden'), 5000);
}

document.getElementById('toast-close').addEventListener('click', () => {
    document.getElementById('alarm-toast').classList.add('hidden');
});

// ========================================
// UTILITY FUNCTIONS
// ========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clearModalInputs(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.querySelectorAll('input:not([type="color"]), textarea').forEach(el => el.value = '');
    }
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => el.style.animation = '', 400);
}

function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' dk önce';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' sa önce';
    return Math.floor(diff / 86400000) + ' gün önce';
}

// ========================================
// INIT
// ========================================
boot();
