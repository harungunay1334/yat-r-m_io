/**
 * InvestIQ — app.js (Full Repair Version)
 */
'use strict';

// 1. SABITLER
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
    'KOTON.IS': { displayName: 'Koton Mağazacılık', type: 'stock', isTRY: true, yahooTicker: 'KOTON.IS' },
    'AKFYE.IS': { displayName: 'Akfen Yen. Enerji', type: 'stock', isTRY: true, yahooTicker: 'AKFYE.IS' },
    'ALTNY.IS': { displayName: 'Altınay Savunma',   type: 'stock', isTRY: true, yahooTicker: 'ALTNY.IS' },
    'AGYO.IS':  { displayName: 'Ağaoğlu GMYO',      type: 'stock', isTRY: true, yahooTicker: 'AGYO.IS'  },
    'AAPL':     { displayName: 'Apple (AAPL)',         type: 'stock',     yahooTicker: 'AAPL'       }
};

const state = {
    transactions: JSON.parse(localStorage.getItem('investiq_v2_transactions')) || [],
    prices: JSON.parse(localStorage.getItem('investiq_v2_prices')) || {},
    lastPriceUpdate: null,
    charts: { pie: null, line: null },
    usdTry: 32.50
};

const el = {};

function mapElements() {
    [
        'transactionForm','portfolioBody','historyBody','totalWealth','wealthCost',
        'totalProfitLoss','profitTrend','plIcon','bestPerformer','bestPerformerPct',
        'assetCount','txCount','clearData','refreshBtn','loadingOverlay','lastUpdateTime',
        'priceStatusBadge','distributionChart','lineChart','chartEmpty','lineChartEmpty',
        'portfolioEmpty','historyEmpty','assetCategory','assetSearch','searchDropdown',
        'clearSearch','selectedTicker','exportBtn','importBtn','type','typeBuy',
        'typeSell','autoFillPrice','toast','date','amount','price','note'
    ].forEach(id => { el[id] = document.getElementById(id); });
    
    // Alias'lar
    el.form = el.transactionForm;
    el.priceStatus = el.priceStatusBadge;
    el.pieCanvas = el.distributionChart;
    el.lineCanvas = el.lineChart;
    el.typeInput = el.type;
}

// 2. BAŞLATMA
async function init() {
    mapElements();
    
    // LOADING EKRANINI HEMEN KALDIRMAYA ÇALIŞ (En önemli nokta)
    if (el.loadingOverlay) el.loadingOverlay.style.display = 'none';
    
    try {
        if (el.date) el.date.valueAsDate = new Date();
        bindEvents();
        updateUI();
        fetchAllPrices();
        setInterval(fetchAllPrices, 5 * 60 * 1000);
    } catch (e) {
        console.error("Init Error:", e);
    }
}

function bindEvents() {
    const safeOn = (name, ev, fn) => { if(el[name]) el[name].addEventListener(ev, fn); };
    
    safeOn('form', 'submit', handleSubmit);
    safeOn('refreshBtn', 'click', fetchAllPrices);
    safeOn('assetSearch', 'input', handleSearchInput);
    safeOn('clearSearch', 'click', clearSearch);
    safeOn('typeBuy', 'click', () => setType('AL'));
    safeOn('typeSell', 'click', () => setType('SAT'));
    safeOn('autoFillPrice', 'click', autoFillCurrentPrice);
    safeOn('exportBtn', 'click', handleExport);
    safeOn('importBtn', 'click', handleImport);
    safeOn('clearData', 'click', () => {
        if(confirm('Silinsin mi?')) { state.transactions = []; saveTransactions(); updateUI(); }
    });
}

// 3. FORM VE İŞLEMLER
async function handleSubmit(e) {
    e.preventDefault();
    const ticker = getSelectedTicker();
    if (!ticker) return showToast("Varlık seçin", "error");

    const newTx = {
        id: Date.now(),
        date: el.date.value,
        ticker: ticker,
        name: getDisplayName(ticker),
        type: el.typeInput.value,
        amount: parseFloat(el.amount.value),
        price: parseFloat(el.price.value),
        note: el.note.value.trim()
    };

    state.transactions.push(newTx);
    saveTransactions();
    updateUI();
    el.form.reset();
    el.date.valueAsDate = new Date();
    showToast("Kaydedildi");
}

function getSelectedTicker() {
    let t = el.selectedTicker.value.trim().toUpperCase();
    if (!t) {
        t = el.assetSearch.value.trim().toUpperCase();
        if (t.length >= 4 && t.length <= 6 && !t.includes('.') && !t.includes('-')) t += '.IS';
    }
    return t || null;
}

// 4. FİYAT ÇEKME (PARALEL)
async function fetchAllPrices() {
    if (el.refreshBtn) el.refreshBtn.classList.add('spinning');
    try {
        const tickers = new Set();
        state.transactions.forEach(tx => tickers.add(tx.ticker));
        if (tickers.size === 0) return;

        // Önce Dolar
        await fetchPriceForTicker('USD-TRY');
        
        // Diğerleri paralel
        const others = [...tickers].filter(t => t !== 'USD-TRY');
        await Promise.allSettled(others.map(t => fetchPriceForTicker(t)));
        
        state.lastPriceUpdate = new Date();
        if (el.lastUpdateTime) el.lastUpdateTime.textContent = state.lastPriceUpdate.toLocaleTimeString();
        updateUI();
    } catch(e) {} finally {
        if (el.refreshBtn) el.refreshBtn.classList.remove('spinning');
    }
}

async function fetchPriceForTicker(ticker) {
    const config = ASSET_CONFIG[ticker];
    const yahooTick = config ? config.yahooTicker : ticker;
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + yahooTick)}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        const json = JSON.parse(data.contents);
        const quote = json?.quoteResponse?.result?.[0];
        if (quote) {
            let p = quote.regularMarketPrice || 0;
            if (!config?.isTRY && quote.currency !== 'TRY') {
                const usd = state.prices['USD-TRY'] || 32.5;
                if (config?.isGoldGram) p = (p / 31.1035) * usd;
                else if (ticker !== 'USD-TRY') p = p * usd;
            }
            state.prices[ticker] = p;
        }
    } catch(e) {}
}

// 5. UI VE YARDIMCILAR
function updateUI() {
    const portfolio = calculatePortfolio();
    renderPortfolioTable(portfolio);
    renderSummary(portfolio);
    renderCharts(portfolio);
}

function calculatePortfolio() {
    const p = {};
    state.transactions.forEach(tx => {
        if (!p[tx.ticker]) p[tx.ticker] = { amount: 0, totalCost: 0, firstDate: tx.date };
        if (tx.type === 'AL') {
            p[tx.ticker].amount += tx.amount;
            p[tx.ticker].totalCost += tx.amount * tx.price;
        } else {
            const avg = p[tx.ticker].totalCost / p[tx.ticker].amount;
            p[tx.ticker].amount -= tx.amount;
            p[tx.ticker].totalCost -= tx.amount * avg;
        }
    });
    Object.keys(p).forEach(k => { if(p[k].amount <= 0) delete p[k]; else p[k].avgCost = p[k].totalCost / p[k].amount; });
    return p;
}

function renderPortfolioTable(portfolio) {
    if (!el.portfolioBody) return;
    el.portfolioBody.innerHTML = '';
    Object.entries(portfolio).forEach(([t, pos]) => {
        const price = state.prices[t] || 0;
        const value = pos.amount * price;
        const pl = value - pos.totalCost;
        const plPct = (pl / pos.totalCost) * 100;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${getDisplayName(t)}</td>
            <td>${pos.firstDate}</td>
            <td>${pos.amount.toFixed(2)}</td>
            <td>₺${pos.avgCost.toFixed(2)}</td>
            <td onclick="editPrice('${t}')">₺${price.toFixed(2)}</td>
            <td>₺${value.toFixed(2)}</td>
            <td class="${pl >= 0 ? 'text-success' : 'text-danger'}">%${plPct.toFixed(2)}</td>
        `;
        el.portfolioBody.appendChild(tr);
    });
}

function renderSummary(p) {
    let val = 0, cost = 0;
    Object.entries(p).forEach(([t, pos]) => {
        val += pos.amount * (state.prices[t] || pos.avgCost);
        cost += pos.totalCost;
    });
    if(el.totalWealth) el.totalWealth.textContent = '₺' + val.toLocaleString();
    if(el.totalProfitLoss) el.totalProfitLoss.textContent = '₺' + (val - cost).toLocaleString();
}

// Grafik, Arama vb. (Basitleştirilmiş)
function handleSearchInput() {
    const v = el.assetSearch.value.toLowerCase();
    el.searchDropdown.innerHTML = '';
    Object.entries(ASSET_CONFIG).forEach(([t, c]) => {
        if (t.toLowerCase().includes(v) || c.displayName.toLowerCase().includes(v)) {
            const d = document.createElement('div');
            d.className = 'search-item';
            d.textContent = c.displayName;
            d.onclick = () => { el.assetSearch.value = c.displayName; el.selectedTicker.value = t; el.searchDropdown.classList.add('hidden'); };
            el.searchDropdown.appendChild(d);
        }
    });
    el.searchDropdown.classList.remove('hidden');
}

function clearSearch() { el.assetSearch.value = ''; el.selectedTicker.value = ''; el.searchDropdown.classList.add('hidden'); }
function setType(v) { el.typeInput.value = v; el.typeBuy.classList.toggle('active', v==='AL'); el.typeSell.classList.toggle('active', v==='SAT'); }
function getDisplayName(t) { return ASSET_CONFIG[t]?.displayName || t; }
function saveTransactions() { localStorage.setItem('investiq_v2_transactions', JSON.stringify(state.transactions)); }
function hideLoading() { if(el.loadingOverlay) el.loadingOverlay.style.display = 'none'; }
function showToast(m) { if(el.toast) { el.toast.textContent = m; el.toast.classList.add('show'); setTimeout(()=>el.toast.classList.remove('show'), 2000); } }
function editPrice(t) { const p = prompt("Fiyat:", state.prices[t]); if(p) { state.prices[t] = parseFloat(p); updateUI(); } }
function autoFillCurrentPrice() { const t = getSelectedTicker(); if(state.prices[t]) el.price.value = state.prices[t].toFixed(2); }
function handleExport() { navigator.clipboard.writeText(JSON.stringify(state.transactions)); alert("Kopyalandı"); }
function handleImport() { const d = prompt("Kod:"); if(d) { state.transactions = JSON.parse(d); saveTransactions(); updateUI(); } }

function renderCharts() { /* Chart.js kodları buraya gerekirse tekrar eklenir, öncelik açılması */ }

// GLOBALS
window.editPrice = editPrice;
window.deleteTx = (id) => { state.transactions = state.transactions.filter(t=>t.id!==id); saveTransactions(); updateUI(); };

// RUN
window.onload = init;
