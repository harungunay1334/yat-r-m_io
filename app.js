/**
 * InvestIQ — app.js (Düzeltilmiş Sürüm)
 * Düzeltmeler:
 * 1. Çoklu CORS proxy fallback sistemi
 * 2. Fiyat durumu göstergesi (yüklendi/hata)
 * 3. PWA mobil görünüm düzeltmeleri
 */
'use strict';

const ASSET_CONFIG = {
    'XAU-TRY':  { displayName: 'Altın (Gram)',       type: 'commodity', yahooTicker: 'GC=F',       isGoldGram: true  },
    'XAG-TRY':  { displayName: 'Gümüş (Gram)',       type: 'commodity', yahooTicker: 'SI=F',       isSilverGram: true },
    'USD-TRY':  { displayName: 'Dolar (USD)',         type: 'forex',     yahooTicker: 'USDTRY=X'  },
    'EUR-TRY':  { displayName: 'Euro (EUR)',          type: 'forex',     yahooTicker: 'EURTRY=X'  },
    'GBP-TRY':  { displayName: 'Sterlin (GBP)',       type: 'forex',     yahooTicker: 'GBPTRY=X'  },
    'BTC-TRY':  { displayName: 'Bitcoin (BTC)',       type: 'crypto',    yahooTicker: 'BTC-TRY'   },
    'ETH-TRY':  { displayName: 'Ethereum (ETH)',      type: 'crypto',    yahooTicker: 'ETH-TRY'   },
    'THYAO.IS': { displayName: 'Türk Hava Yolları',  type: 'stock', isTRY: true, yahooTicker: 'THYAO.IS' },
    'SISE.IS':  { displayName: 'Şişe Cam',          type: 'stock', isTRY: true, yahooTicker: 'SISE.IS'  },
    'EREGL.IS': { displayName: 'Ereğli Demir Çelik',type: 'stock', isTRY: true, yahooTicker: 'EREGL.IS' },
    'KOTON.IS': { displayName: 'Koton Mağazacılık', type: 'stock', isTRY: true, yahooTicker: 'KOTON.IS' },
    'AKFYE.IS': { displayName: 'Akfen Yen. Enerji', type: 'stock', isTRY: true, yahooTicker: 'AKFYE.IS' },
    'ALTNY.IS': { displayName: 'Altınay Savunma',   type: 'stock', isTRY: true, yahooTicker: 'ALTNY.IS' },
    'AGYO.IS':  { displayName: 'Ağaoğlu GMYO',      type: 'stock', isTRY: true, yahooTicker: 'AGYO.IS'  },
    'AAPL':     { displayName: 'Apple (AAPL)',         type: 'stock',     yahooTicker: 'AAPL'       },
    'NVDA':     { displayName: 'NVIDIA (NVDA)',        type: 'stock',     yahooTicker: 'NVDA'       }
};

// Birden fazla proxy tanımla — biri çalışmazsa diğerine geç
const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

const state = {
    transactions: JSON.parse(localStorage.getItem('investiq_v2_transactions')) || [],
    prices: JSON.parse(localStorage.getItem('investiq_v2_prices')) || {},
    usdTry: 38.50,
    charts: { pie: null, line: null },
    pricesFetched: false,
    fetchErrors: 0
};

const el = {};

function mapElements() {
    [
        'transactionForm','portfolioBody','historyBody','totalWealth','totalProfitLoss',
        'profitTrend','plIcon','bestPerformer','bestPerformerPct',
        'assetCount','txCount','clearData','refreshBtn','loadingOverlay','lastUpdateTime',
        'priceStatusBadge','distributionChart','lineChart','chartEmpty','lineChartEmpty',
        'portfolioEmpty','historyEmpty','assetSearch','searchDropdown',
        'clearSearch','selectedTicker','exportBtn','importBtn','type','typeBuy',
        'typeSell','autoFillPrice','toast','date','amount','price','note'
    ].forEach(id => { el[id] = document.getElementById(id); });

    el.form = el.transactionForm;
    el.priceStatus = el.priceStatusBadge;
}

async function init() {
    mapElements();
    if (el.loadingOverlay) el.loadingOverlay.style.display = 'none';

    try {
        if (el.date) el.date.valueAsDate = new Date();
        bindEvents();
        updateUI();
        await fetchAllPrices();
        setInterval(fetchAllPrices, 5 * 60 * 1000);
    } catch (e) { console.error("Init Error:", e); }
}

function bindEvents() {
    const on = (id, ev, fn) => { if(el[id]) el[id].addEventListener(ev, fn); };
    on('form', 'submit', handleSubmit);
    on('refreshBtn', 'click', fetchAllPrices);
    on('assetSearch', 'input', handleSearchInput);
    on('clearSearch', 'click', clearSearch);
    on('typeBuy', 'click', () => setType('AL'));
    on('typeSell', 'click', () => setType('SAT'));
    on('autoFillPrice', 'click', autoFillCurrentPrice);
    on('exportBtn', 'click', handleExport);
    on('importBtn', 'click', handleImport);
    on('clearData', 'click', () => {
        if(confirm('Tüm veriler silinecek?')) {
            state.transactions = [];
            saveTransactions();
            updateUI();
        }
    });

    // Dropdown dışına tıklanınca kapat
    document.addEventListener('click', (e) => {
        if (el.searchDropdown && !el.searchDropdown.contains(e.target) && e.target !== el.assetSearch) {
            el.searchDropdown.classList.add('hidden');
        }
    });
}

async function handleSubmit(e) {
    e.preventDefault();
    const ticker = getSelectedTicker();
    if(!ticker) return showToast("Lütfen bir varlık seçin", 'error');

    const tx = {
        id: Date.now(),
        date: el.date.value,
        ticker: ticker,
        name: getDisplayName(ticker),
        type: document.getElementById('type').value,
        amount: parseFloat(el.amount.value),
        price: parseFloat(el.price.value),
        note: el.note.value
    };

    state.transactions.push(tx);
    saveTransactions();
    updateUI();
    el.form.reset();
    el.date.valueAsDate = new Date();
    setType('AL'); // reset type toggle
    clearSearch();
    showToast("İşlem kaydedildi ✓", 'success');
}

function getSelectedTicker() {
    let t = el.selectedTicker ? el.selectedTicker.value : '';
    if(!t) {
        t = el.assetSearch.value.trim().toUpperCase();
        if(t.length >= 3) {
            // BIST hisseleri için .IS ekle
            if(!t.includes('.') && !t.includes('-') && t.length <= 6) t += '.IS';
        }
    }
    return t || null;
}

// ============================================================
// FİYAT ÇEKME — Çoklu proxy fallback sistemi
// ============================================================

async function fetchWithProxy(yahooUrl) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxyUrl = CORS_PROXIES[i](yahooUrl);
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const text = await res.text();
            
            // allorigins.win JSON wrapper
            try {
                const wrapper = JSON.parse(text);
                if (wrapper.contents) return JSON.parse(wrapper.contents);
            } catch(_) {}
            
            // Diğer proxy'ler direkt JSON döner
            return JSON.parse(text);
        } catch(e) {
            console.warn(`Proxy ${i+1} başarısız:`, e.message);
        }
    }
    return null;
}

async function fetchPrice(ticker) {
    const config = ASSET_CONFIG[ticker];
    const yahoo = config ? config.yahooTicker : ticker;
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahoo}&fields=regularMarketPrice,previousClose,currency`;

    try {
        const json = await fetchWithProxy(yahooUrl);
        if (!json) return false;

        const q = json?.quoteResponse?.result?.[0];
        if (!q) return false;

        let p = q.regularMarketPrice || q.previousClose || 0;
        if (!p || p === 0) return false;

        // TL'ye çevir (gerekirse)
        if (!config?.isTRY && q.currency !== 'TRY') {
            const usd = state.prices['USD-TRY'] || state.usdTry;
            if (config?.isGoldGram) {
                // Troy ons'tan gram altına çevir ve USD→TRY
                p = (p / 31.1035) * usd;
            } else if (config?.isSilverGram) {
                p = (p / 31.1035) * usd;
            } else if (ticker !== 'USD-TRY') {
                p = p * usd;
            }
        }

        state.prices[ticker] = p;
        localStorage.setItem('investiq_v2_prices', JSON.stringify(state.prices));
        return true;
    } catch(e) {
        console.warn(`Fiyat çekilemedi (${ticker}):`, e.message);
        return false;
    }
}

async function fetchAllPrices() {
    if (el.refreshBtn) el.refreshBtn.classList.add('spinning');
    setPriceStatus('loading');

    try {
        const tickers = new Set(['USD-TRY']); // Her zaman USD/TRY'yi çek
        state.transactions.forEach(tx => tickers.add(tx.ticker));

        // Önce USD/TRY'yi çek (diğer hesaplamalar için lazım)
        await fetchPrice('USD-TRY');

        // Geri kalanları paralel çek
        const otherTickers = [...tickers].filter(t => t !== 'USD-TRY');
        const results = await Promise.allSettled(otherTickers.map(t => fetchPrice(t)));

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        const totalCount = otherTickers.length;

        if (el.lastUpdateTime) {
            el.lastUpdateTime.textContent = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
        }

        if (totalCount === 0 || successCount > 0) {
            setPriceStatus('ok');
        } else {
            setPriceStatus('error');
        }

        state.pricesFetched = true;
        updateUI();
    } catch(e) {
        console.error("fetchAllPrices hatası:", e);
        setPriceStatus('error');
    } finally {
        if (el.refreshBtn) el.refreshBtn.classList.remove('spinning');
    }
}

function setPriceStatus(status) {
    if (!el.priceStatus) return;
    const labels = {
        loading: '⏳ Fiyatlar yükleniyor...',
        ok:      '🟢 Fiyatlar güncel',
        error:   '🔴 Fiyat alınamadı — Manuel girin'
    };
    el.priceStatus.textContent = labels[status] || labels.loading;
    el.priceStatus.className = 'price-status ' + status;
}

// ============================================================
// PORTFÖY HESAPLAMA
// ============================================================

function calculatePortfolio() {
    const p = {};
    state.transactions.forEach(tx => {
        if (!p[tx.ticker]) p[tx.ticker] = { amount: 0, cost: 0, date: tx.date };
        if (tx.type === 'AL') {
            p[tx.ticker].amount += tx.amount;
            p[tx.ticker].cost += tx.amount * tx.price;
        } else {
            const avg = p[tx.ticker].amount > 0 ? p[tx.ticker].cost / p[tx.ticker].amount : 0;
            p[tx.ticker].amount -= tx.amount;
            p[tx.ticker].cost -= tx.amount * avg;
        }
    });
    return p;
}

// ============================================================
// UI GÜNCELLEME
// ============================================================

function updateUI() {
    const portfolio = calculatePortfolio();
    renderPortfolioTable(portfolio);
    renderSummary(portfolio);
    renderPieChart(portfolio);
    renderHistoryTable();
    if (window.lucide) lucide.createIcons();
}

function renderPortfolioTable(portfolio) {
    if (!el.portfolioBody) return;
    el.portfolioBody.innerHTML = '';

    const entries = Object.entries(portfolio).filter(([t, pos]) => pos.amount > 0.00001);

    if (entries.length === 0) {
        if (el.portfolioEmpty) el.portfolioEmpty.classList.remove('hidden');
        return;
    }
    if (el.portfolioEmpty) el.portfolioEmpty.classList.add('hidden');

    entries.forEach(([t, pos]) => {
        const price = state.prices[t] || 0;
        const avgCost = pos.amount > 0 ? pos.cost / pos.amount : 0;
        const val = pos.amount * price;
        const pl = val - pos.cost;
        const plPct = pos.cost > 0 ? (pl / pos.cost) * 100 : 0;
        const priceDisplay = price > 0 ? `₺${price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:4})}` : `<span style="color:var(--warning)">Manuel gir</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="asset-badge">${getDisplayName(t)}</span></td>
            <td>${pos.date}</td>
            <td>${pos.amount.toLocaleString('tr-TR', {maximumFractionDigits:4})}</td>
            <td>₺${avgCost.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:4})}</td>
            <td onclick="editPrice('${t}')" style="cursor:pointer" title="Tıkla: Fiyatı manuel gir">${priceDisplay}</td>
            <td style="font-weight:700">₺${val > 0 ? val.toLocaleString('tr-TR',{minimumFractionDigits:2}) : '?'}</td>
            <td class="${pl >= 0 ? 'text-success' : 'text-danger'}">
                ${price > 0 ? `${pl >= 0 ? '+' : ''}${pl.toLocaleString('tr-TR',{minimumFractionDigits:2})} TL<br><small>%${plPct.toFixed(2)}</small>` : '<small>Fiyat bekleniyor</small>'}
            </td>
        `;
        el.portfolioBody.appendChild(tr);
    });
}

function renderSummary(p) {
    let total = 0, cost = 0;
    let bestTicker = null, bestPct = -Infinity;

    Object.entries(p).forEach(([t, pos]) => {
        if (pos.amount <= 0) return;
        const price = state.prices[t] || (pos.cost / pos.amount);
        const val = pos.amount * price;
        total += val;
        cost += pos.cost;

        const pct = pos.cost > 0 ? ((val - pos.cost) / pos.cost) * 100 : 0;
        if (pct > bestPct) { bestPct = pct; bestTicker = t; }
    });

    const pl = total - cost;
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;

    if (el.totalWealth) el.totalWealth.textContent = '₺' + total.toLocaleString('tr-TR', {minimumFractionDigits:2});
    if (el.totalProfitLoss) {
        el.totalProfitLoss.textContent = (pl >= 0 ? '+' : '') + '₺' + pl.toLocaleString('tr-TR', {minimumFractionDigits:2});
        el.totalProfitLoss.style.color = pl >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (el.profitTrend) {
        el.profitTrend.textContent = `%${plPct.toFixed(2)} Değişim`;
        el.profitTrend.className = 'trend ' + (pl >= 0 ? 'up' : 'down');
    }
    if (el.bestPerformer) el.bestPerformer.textContent = bestTicker ? getDisplayName(bestTicker) : '-';
    if (el.bestPerformerPct) el.bestPerformerPct.textContent = bestTicker ? `%${bestPct.toFixed(2)}` : '-';
    if (el.assetCount) el.assetCount.textContent = Object.keys(p).filter(k => p[k].amount > 0).length;
    if (el.txCount) el.txCount.textContent = state.transactions.length + ' işlem';
}

function renderHistoryTable() {
    if (!el.historyBody) return;
    el.historyBody.innerHTML = '';
    [...state.transactions].reverse().slice(0, 20).forEach(tx => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date}</td>
            <td>${tx.name}</td>
            <td><span style="color:${tx.type==='AL'?'var(--success)':'var(--danger)'}">${tx.type}</span></td>
            <td>${tx.amount}</td>
            <td>₺${parseFloat(tx.price).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td>
            <td>₺${(tx.amount * tx.price).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td>
            <td>${tx.note || '-'}</td>
            <td><button onclick="deleteTx(${tx.id})" class="btn-delete">×</button></td>
        `;
        el.historyBody.appendChild(tr);
    });
}

function renderPieChart(portfolio) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas || !window.Chart) return;

    const entries = Object.entries(portfolio).filter(([t, pos]) => pos.amount > 0);
    if (entries.length === 0) {
        if (el.chartEmpty) el.chartEmpty.classList.remove('hidden');
        canvas.style.display = 'none';
        return;
    }
    if (el.chartEmpty) el.chartEmpty.classList.add('hidden');
    canvas.style.display = '';

    const data = entries.map(([t, pos]) => pos.amount * (state.prices[t] || (pos.cost / pos.amount)));
    const labels = entries.map(([t]) => getDisplayName(t));

    if (state.charts.pie) state.charts.pie.destroy();
    state.charts.pie = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: ['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#84cc16'] }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } }
        }
    });
}

// ============================================================
// ARAMA
// ============================================================

function handleSearchInput() {
    const v = el.assetSearch.value.toLowerCase().trim();
    el.searchDropdown.innerHTML = '';

    if (v === '') {
        el.searchDropdown.classList.add('hidden');
        if (el.clearSearch) el.clearSearch.classList.add('hidden');
        return;
    }

    if (el.clearSearch) el.clearSearch.classList.remove('hidden');

    Object.entries(ASSET_CONFIG).forEach(([t, c]) => {
        if (t.toLowerCase().includes(v) || c.displayName.toLowerCase().includes(v)) {
            const d = document.createElement('div');
            d.className = 'search-item';
            d.innerHTML = `<span>${c.displayName}</span><small>${t}</small>`;
            d.onclick = () => {
                el.assetSearch.value = c.displayName;
                el.selectedTicker.value = t;
                el.searchDropdown.classList.add('hidden');
                // Mevcut fiyatı göster
                if (state.prices[t]) {
                    showToast(`Güncel fiyat: ₺${state.prices[t].toFixed(2)}`, 'info');
                }
            };
            el.searchDropdown.appendChild(d);
        }
    });

    el.searchDropdown.classList.toggle('hidden', el.searchDropdown.children.length === 0);
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

function getDisplayName(t) { return ASSET_CONFIG[t]?.displayName || t; }
function saveTransactions() { localStorage.setItem('investiq_v2_transactions', JSON.stringify(state.transactions)); }

function showToast(m, type = '') {
    if (el.toast) {
        el.toast.textContent = m;
        el.toast.className = 'toast show' + (type ? ' ' + type : '');
        setTimeout(() => el.toast.classList.remove('show'), 3000);
    }
}

function setType(v) {
    document.getElementById('type').value = v;
    if (el.typeBuy) el.typeBuy.classList.toggle('active', v === 'AL');
    if (el.typeSell) el.typeSell.classList.toggle('active', v === 'SAT');
}

function clearSearch() {
    if (el.assetSearch) el.assetSearch.value = '';
    if (el.selectedTicker) el.selectedTicker.value = '';
    if (el.searchDropdown) el.searchDropdown.classList.add('hidden');
    if (el.clearSearch) el.clearSearch.classList.add('hidden');
}

function handleExport() {
    const data = JSON.stringify(state.transactions, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'investiq_portfoy.json'; a.click();
    URL.revokeObjectURL(url);
    showToast("Dışa aktarıldı ✓", 'success');
}

function handleImport() {
    const d = prompt("Portföy JSON kodunu yapıştırın:");
    if (d) {
        try {
            state.transactions = JSON.parse(d);
            saveTransactions();
            updateUI();
            showToast("İçe aktarıldı ✓", 'success');
        } catch(e) {
            showToast("Hatalı kod!", 'error');
        }
    }
}

function autoFillCurrentPrice() {
    const t = getSelectedTicker();
    if (t && state.prices[t]) {
        el.price.value = state.prices[t].toFixed(4);
        showToast(`Fiyat dolduruldu: ₺${state.prices[t].toFixed(2)}`, 'info');
    } else {
        showToast("Önce bir varlık seçin veya fiyatları güncelleyin", 'error');
    }
}

window.editPrice = (t) => {
    const current = state.prices[t] ? state.prices[t].toFixed(4) : '';
    const p = prompt(`${getDisplayName(t)} için güncel fiyat (TL):`, current);
    if (p !== null && !isNaN(parseFloat(p))) {
        state.prices[t] = parseFloat(p);
        localStorage.setItem('investiq_v2_prices', JSON.stringify(state.prices));
        updateUI();
        showToast("Fiyat güncellendi ✓", 'success');
    }
};

window.deleteTx = (id) => {
    if (confirm('Bu işlem silinsin mi?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveTransactions();
        updateUI();
        showToast("İşlem silindi", 'info');
    }
};

window.onload = init;
