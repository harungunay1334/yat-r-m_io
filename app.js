/**
 * InvestIQ — app.js
 * Kişisel Yatırım Takip Uygulaması
 * ─────────────────────────────────────────────────────────────
 * Özellikler:
 *   • LocalStorage ile veri kalıcılığı
 *   • Yahoo Finance (cors-proxy üzerinden) ile canlı fiyat çekme
 *   • Fallback: kur.doviz.com API (TL bazlı veriler için)
 *   • Ortalama maliyet hesabı (FIFO/ağırlıklı ortalama)
 *   • Chart.js Doughnut + Line grafik
 *   • Toast bildirimleri, yükleme ekranı
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ============================================================
   1. SABITLER ve KONFİGÜRASYON
   ============================================================ */

/**
 * Varlık konfigürasyonu — Her girişin getirilen fiyatı
 * TL cinsinden yorumlanması için gerekli meta bilgiler.
 *
 * currencyPair: Yahoo Finance ticker
 * displayName : Tablodaki kısa ad
 * type        : 'forex' | 'crypto' | 'stock' | 'commodity'
 * isTRY       : Fiyat zaten TL ise true (BIST hisseleri)
 */
const ASSET_CONFIG = {
    // Kıymetli Madenler (USD bazlı → TL'ye çevrilecek, 1 gram için/31.1035)
    'XAU-TRY':  { displayName: 'Altın (Gram)',       type: 'commodity', yahooTicker: 'GC=F',       isGoldGram: true  },
    'XAG-TRY':  { displayName: 'Gümüş (Gram)',       type: 'commodity', yahooTicker: 'SI=F',       isSilverGram: true },
    // Döviz
    'USD-TRY':  { displayName: 'Dolar (USD)',         type: 'forex',     yahooTicker: 'USDTRY=X'  },
    'EUR-TRY':  { displayName: 'Euro (EUR)',          type: 'forex',     yahooTicker: 'EURTRY=X'  },
    'GBP-TRY':  { displayName: 'Sterlin (GBP)',       type: 'forex',     yahooTicker: 'GBPTRY=X'  },
    // Kripto
    'BTC-TRY':  { displayName: 'Bitcoin (BTC)',       type: 'crypto',    yahooTicker: 'BTC-TRY'   },
    'ETH-TRY':  { displayName: 'Ethereum (ETH)',      type: 'crypto',    yahooTicker: 'ETH-TRY'   },
    'BNB-TRY':  { displayName: 'BNB',                 type: 'crypto',    yahooTicker: 'BNB-TRY'   },
    'SOL-TRY':  { displayName: 'Solana (SOL)',        type: 'crypto',    yahooTicker: 'SOL-TRY'   },
    // BIST Hisseleri (Genişletilmiş Liste)
    'THYAO.IS': { displayName: 'Türk Hava Yolları',  type: 'stock', isTRY: true, yahooTicker: 'THYAO.IS' },
    'SISE.IS':  { displayName: 'Şişe Cam',          type: 'stock', isTRY: true, yahooTicker: 'SISE.IS'  },
    'GARAN.IS': { displayName: 'Garanti BBVA',      type: 'stock', isTRY: true, yahooTicker: 'GARAN.IS' },
    'AKBNK.IS': { displayName: 'Akbank',            type: 'stock', isTRY: true, yahooTicker: 'AKBNK.IS' },
    'EREGL.IS': { displayName: 'Ereğli Demir Çelik',type: 'stock', isTRY: true, yahooTicker: 'EREGL.IS' },
    'KCHOL.IS': { displayName: 'Koç Holding',       type: 'stock', isTRY: true, yahooTicker: 'KCHOL.IS' },
    'BIMAS.IS': { displayName: 'BİM Mağazalar',     type: 'stock', isTRY: true, yahooTicker: 'BIMAS.IS' },
    'ASELS.IS': { displayName: 'Aselsan',           type: 'stock', isTRY: true, yahooTicker: 'ASELS.IS' },
    'TUPRS.IS': { displayName: 'Tüpraş',            type: 'stock', isTRY: true, yahooTicker: 'TUPRS.IS' },
    'SASA.IS':  { displayName: 'Sasa Polyester',    type: 'stock', isTRY: true, yahooTicker: 'SASA.IS'  },
    'KOTON.IS': { displayName: 'Koton Mağazacılık', type: 'stock', isTRY: true, yahooTicker: 'KOTON.IS' },
    'AKFYE.IS': { displayName: 'Akfen Yen. Enerji', type: 'stock', isTRY: true, yahooTicker: 'AKFYE.IS' },
    'ALTNY.IS': { displayName: 'Altınay Savunma',   type: 'stock', isTRY: true, yahooTicker: 'ALTNY.IS' },
    'AGYO.IS':  { displayName: 'Ağaoğlu GMYO',      type: 'stock', isTRY: true, yahooTicker: 'AGYO.IS'  },
    'PETKM.IS': { displayName: 'Petkim',            type: 'stock', isTRY: true, yahooTicker: 'PETKM.IS' },
    'TCELL.IS': { displayName: 'Turkcell',          type: 'stock', isTRY: true, yahooTicker: 'TCELL.IS' },
    'FROTO.IS': { displayName: 'Ford Otosan',       type: 'stock', isTRY: true, yahooTicker: 'FROTO.IS' },
    'TOASO.IS': { displayName: 'Tofaş Oto',         type: 'stock', isTRY: true, yahooTicker: 'TOASO.IS' },
    'ISCTR.IS': { displayName: 'İş Bankası (C)',    type: 'stock', isTRY: true, yahooTicker: 'ISCTR.IS' },
    'YKBNK.IS': { displayName: 'Yapı Kredi',        type: 'stock', isTRY: true, yahooTicker: 'YKBNK.IS' },
    'HALKB.IS': { displayName: 'Halkbank',          type: 'stock', isTRY: true, yahooTicker: 'HALKB.IS' },
    'PGSUS.IS': { displayName: 'Pegasus',           type: 'stock', isTRY: true, yahooTicker: 'PGSUS.IS' },
    'HEKTS.IS': { displayName: 'Hektaş',            type: 'stock', isTRY: true, yahooTicker: 'HEKTS.IS' },
    'KOZAL.IS': { displayName: 'Koza Altın',        type: 'stock', isTRY: true, yahooTicker: 'KOZAL.IS' },
    'MGROS.IS': { displayName: 'Migros',            type: 'stock', isTRY: true, yahooTicker: 'MGROS.IS' },
    'ENKAI.IS': { displayName: 'Enka İnşaat',       type: 'stock', isTRY: true, yahooTicker: 'ENKAI.IS' },
    'ARCLK.IS': { displayName: 'Arçelik',           type: 'stock', isTRY: true, yahooTicker: 'ARCLK.IS' },
    'VESTL.IS': { displayName: 'Vestel',            type: 'stock', isTRY: true, yahooTicker: 'VESTL.IS' },
    'DOAS.IS':  { displayName: 'Doğuş Otomotiv',    type: 'stock', isTRY: true, yahooTicker: 'DOAS.IS'  },
    'SOKM.IS':  { displayName: 'Şok Marketler',     type: 'stock', isTRY: true, yahooTicker: 'SOKM.IS'  },
    'TTKOM.IS': { displayName: 'Türk Telekom',      type: 'stock', isTRY: true, yahooTicker: 'TTKOM.IS' },
    'AEFES.IS': { displayName: 'Anadolu Efes',      type: 'stock', isTRY: true, yahooTicker: 'AEFES.IS' },
    'CCOLA.IS': { displayName: 'Coca-Cola İçecek',  type: 'stock', isTRY: true, yahooTicker: 'CCOLA.IS' },
    'SAHOL.IS': { displayName: 'Sabancı Holding',   type: 'stock', isTRY: true, yahooTicker: 'SAHOL.IS' },
    // ABD Hisseleri (USD → TL)
    'AAPL':     { displayName: 'Apple (AAPL)',         type: 'stock',     yahooTicker: 'AAPL'       },
    'MSFT':     { displayName: 'Microsoft (MSFT)',     type: 'stock',     yahooTicker: 'MSFT'       },
    'GOOGL':    { displayName: 'Alphabet (GOOGL)',     type: 'stock',     yahooTicker: 'GOOGL'      },
    'NVDA':     { displayName: 'NVIDIA (NVDA)',        type: 'stock',     yahooTicker: 'NVDA'       },
    'TSLA':     { displayName: 'Tesla (TSLA)',         type: 'stock',     yahooTicker: 'TSLA'       },
    'AMZN':     { displayName: 'Amazon (AMZN)',        type: 'stock',     yahooTicker: 'AMZN'       },
};

/** 
 * CORS Proxies — Yahoo Finance direkt CORS izni vermez.
 * Birisi çalışmazsa diğeri denenir (Fallback sistemi).
 */
const PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?'
];

/** Güncelleme aralığı (ms) */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

/** Grafik renk paleti */
const CHART_COLORS = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#e879f9', '#22d3ee', '#fb923c', '#a3e635'
];

/* ============================================================
   2. UYGULAMA DURUMU (STATE)
   ============================================================ */
const state = {
    /** İşlem listesi — localStorage'da saklanır */
    transactions: JSON.parse(localStorage.getItem('investiq_v2_transactions')) || [],

    /**
     * Güncel fiyat haritası (TL cinsinden)
     * { 'XAU-TRY': 3200.50, 'BTC-TRY': 3400000, ... }
     */
    prices: JSON.parse(localStorage.getItem('investiq_v2_prices')) || {},

    /** Fiyatların son güncellenme zamanı */
    lastPriceUpdate: null,

    /** Chart.js instance'ları */
    charts: {
        pie:  null,
        line: null
    },

    /** USD/TRY kuru (ABD hisseleri için) */
    usdTry: 0
};

/* ============================================================
   3. DOM REFERANSLARI
   ============================================================ */
const el = {
    form:            document.getElementById('transactionForm'),
    portfolioBody:   document.getElementById('portfolioBody'),
    historyBody:     document.getElementById('historyBody'),
    totalWealth:     document.getElementById('totalWealth'),
    wealthCost:      document.getElementById('wealthCost'),
    totalPL:         document.getElementById('totalProfitLoss'),
    profitTrend:     document.getElementById('profitTrend'),
    plIcon:          document.getElementById('plIcon'),
    bestPerformer:   document.getElementById('bestPerformer'),
    bestPct:         document.getElementById('bestPerformerPct'),
    assetCount:      document.getElementById('assetCount'),
    txCount:         document.getElementById('txCount'),
    clearData:       document.getElementById('clearData'),
    refreshBtn:      document.getElementById('refreshBtn'),
    loadingOverlay:  document.getElementById('loadingOverlay'),
    lastUpdateTime:  document.getElementById('lastUpdateTime'),
    priceStatus:     document.getElementById('priceStatusBadge'),
    pieCanvas:       document.getElementById('distributionChart'),
    lineCanvas:      document.getElementById('lineChart'),
    chartEmpty:      document.getElementById('chartEmpty'),
    lineChartEmpty:  document.getElementById('lineChartEmpty'),
    portfolioEmpty:  document.getElementById('portfolioEmpty'),
    historyEmpty:    document.getElementById('historyEmpty'),
    assetCategory:   document.getElementById('assetCategory'),
    presetGroup:     document.getElementById('presetGroup'),
    customGroup:     document.getElementById('customGroup'),
    assetSearch:     document.getElementById('assetSearch'),
    searchDropdown:  document.getElementById('searchDropdown'),
    clearSearch:     document.getElementById('clearSearch'),
    selectedTicker:  document.getElementById('selectedTicker'),
    exportBtn:       document.getElementById('exportBtn'),
    importBtn:       document.getElementById('importBtn'),
    typeInput:       document.getElementById('type'),
    typeBuy:         document.getElementById('typeBuy'),
    typeSell:        document.getElementById('typeSell'),
    autoFillPrice:   document.getElementById('autoFillPrice'),
    toast:           document.getElementById('toast'),
};

/* ============================================================
   4. BAŞLATMA
   ============================================================ */

/** Uygulama başlatma — önce UI'ı yükle, sonra fiyatları çek */
async function init() {
    // Bugünkü tarihi varsayılan olarak ayarla
    document.getElementById('date').valueAsDate = new Date();

    // Event listener'ları kaydet
    bindEvents();

    // UI'ı mevcut (kayıtlı) verilerle anında göster
    updateUI();
    
    // Yükleme ekranını hemen kaldır (kullanıcıyı bekletme)
    hideLoading();

    // Fiyat güncellemesini arka planda başlat
    fetchAllPrices();

    // Her 5 dakikada bir otomatik güncelle
    setInterval(fetchAllPrices, REFRESH_INTERVAL_MS);
}

/* ============================================================
   5. EVENT LISTENERS
   ============================================================ */
function bindEvents() {
    // Form gönderimi
    el.form.addEventListener('submit', handleSubmit);

    // Tüm verileri sil
    el.clearData.addEventListener('click', () => {
        if (confirm('Tüm işlemler ve kaydedilmiş veriler silinecek. Emin misiniz?')) {
            state.transactions = [];
            saveTransactions();
            updateUI();
            showToast('Tüm veriler silindi.', 'info');
        }
    });

    // Manuel fiyat güncelleme
    el.refreshBtn.addEventListener('click', async () => {
        el.refreshBtn.classList.add('spinning');
        await fetchAllPrices();
        el.refreshBtn.classList.remove('spinning');
    });

    // Arama kutusu etkileşimi
    el.assetSearch.addEventListener('input', handleSearchInput);
    el.assetSearch.addEventListener('focus', () => { if (el.assetSearch.value) handleSearchInput(); });
    el.clearSearch.addEventListener('click', clearSearch);

    // Kapatma: Dışarı tıklanınca dropdown'ı gizle
    document.addEventListener('click', (e) => {
        if (!el.assetSearch.contains(e.target) && !el.searchDropdown.contains(e.target)) {
            el.searchDropdown.classList.add('hidden');
        }
    });

    // Alım / Satım toggle
    el.typeBuy.addEventListener('click', () => setType('AL'));
    el.typeSell.addEventListener('click', () => setType('SAT'));

    // Otomatik fiyat doldur
    el.autoFillPrice.addEventListener('click', autoFillCurrentPrice);

    // Dışa/İçe aktar
    el.exportBtn.addEventListener('click', handleExport);
    el.importBtn.addEventListener('click', handleImport);
}

/** Alım/Satım tipini ayarla */
function setType(value) {
    el.typeInput.value = value;
    el.typeBuy.classList.toggle('active', value === 'AL');
    el.typeSell.classList.toggle('active', value === 'SAT');
    if (window.lucide) lucide.createIcons();
}

/**
 * Seçili varlığın güncel fiyatını fiyat alanına otomatik doldurur.
 */
function autoFillCurrentPrice() {
    const ticker = getSelectedTicker();
    if (!ticker) { showToast('Önce bir varlık seçin.', 'error'); return; }

    const price = state.prices[ticker];
    if (price && price > 0) {
        document.getElementById('price').value = price.toFixed(4);
        showToast(`${getDisplayName(ticker)} güncel fiyatı dolduruldu: ${formatTL(price)}`, 'success');
    } else {
        showToast('Bu varlık için güncel fiyat bulunamadı. Lütfen manuel girin.', 'error');
    }
}

/* ============================================================
   6. FORM İŞLEMİ
   ============================================================ */
async function handleSubmit(e) {
    e.preventDefault();

    // Seçilen ticker'ı belirle
    const ticker = getSelectedTicker();
    if (!ticker) {
        showToast('Geçerli bir varlık kodu girin (örn: PETKM.IS)', 'error');
        return;
    }

    const newTx = {
        id:     Date.now(),
        date:   document.getElementById('date').value,
        ticker: ticker,
        name:   getDisplayName(ticker),
        type:   el.typeInput.value,
        amount: parseFloat(document.getElementById('amount').value),
        price:  parseFloat(document.getElementById('price').value),
        note:   document.getElementById('note').value.trim()
    };

    // Satış için yeterli bakiye kontrolü
    if (newTx.type === 'SAT') {
        const portfolio = calculatePortfolio();
        const holding = portfolio[ticker];
        if (!holding || holding.amount < newTx.amount) {
            showToast(`Satış için yeterli ${newTx.name} bakiyeniz yok.`, 'error');
            return;
        }
    }

    state.transactions.push(newTx);
    saveTransactions();

    // Eğer bu varlık için daha önce fiyat çekilmemişse çek
    if (!state.prices[ticker]) {
        await fetchPriceForTicker(ticker);
    }

    updateUI();
    el.form.reset();
    document.getElementById('date').valueAsDate = new Date();
    setType('AL'); // toggle'ı sıfırla

    showToast(`${newTx.name} — ${newTx.type} işlemi kaydedildi ✓`, 'success');
}

/** Şu an seçili ticker'ı döndürür */
function getSelectedTicker() {
    // 1. Eğer bir sonuç seçildiyse (hidden input doluysa)
    let ticker = el.selectedTicker.value.trim().toUpperCase();
    
    // 2. Eğer seçim yoksa, arama kutusuna yazılanı kullan
    if (!ticker) {
        ticker = el.assetSearch.value.trim().toUpperCase();
        
        // BIST İpucu: Eğer 5 karakterli bir kod ise ve sonuna .IS eklenmemişse otomatik ekle (Örn: THYAO -> THYAO.IS)
        if (ticker.length >= 4 && ticker.length <= 6 && !ticker.includes('.') && !ticker.includes('-')) {
            ticker += '.IS';
        }
    }
    
    return ticker || null;
}

/** Arama Girişi Yönetimi */
function handleSearchInput() {
    const val = el.assetSearch.value.trim().toLowerCase();
    el.clearSearch.classList.toggle('hidden', val === '');
    
    if (val.length < 1) {
        el.searchDropdown.classList.add('hidden');
        return;
    }

    const results = [];
    
    // 1. ASSET_CONFIG içinde ara
    for (const [ticker, config] of Object.entries(ASSET_CONFIG)) {
        if (ticker.toLowerCase().includes(val) || config.displayName.toLowerCase().includes(val)) {
            results.push({ ticker, name: config.displayName });
        }
    }

    renderSearchResults(results, val.toUpperCase());
}

/** Arama Sonuçlarını Listele */
function renderSearchResults(results, rawVal) {
    el.searchDropdown.innerHTML = '';
    
    // Eğer sonuç yoksa veya özel giriş istenirse manuel ekleme seçeneği sun
    const isTickerInResults = results.some(r => r.ticker === rawVal || r.ticker === `${rawVal}.IS`);
    
    // Mevcut sonuçları ekle
    results.slice(0, 10).forEach(res => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `<span class="name">${res.name}</span> <span class="ticker">${res.ticker}</span>`;
        div.onclick = () => selectSearchResult(res.ticker, res.name);
        el.searchDropdown.appendChild(div);
    });

    // Manuel Giriş Seçeneği (Eğer tam eşleşme yoksa)
    if (!isTickerInResults && rawVal.length >= 2) {
        const div = document.createElement('div');
        div.className = 'search-item manual-entry';
        div.innerHTML = `<span class="name">"${rawVal}" Kodunu Ekle</span> <span class="ticker">YENİ</span>`;
        div.onclick = () => selectSearchResult(rawVal, rawVal);
        el.searchDropdown.appendChild(div);
    }

    el.searchDropdown.classList.toggle('hidden', el.searchDropdown.children.length === 0);
}

/** Bir Sonuç Seçildiğinde */
function selectSearchResult(ticker, name) {
    el.assetSearch.value = name;
    el.selectedTicker.value = ticker;
    el.searchDropdown.classList.add('hidden');
    el.clearSearch.classList.remove('hidden');
    showToast(`${name} seçildi.`, 'info');
}

/** Aramayı Temizle */
function clearSearch() {
    el.assetSearch.value = '';
    el.selectedTicker.value = '';
    el.searchDropdown.classList.add('hidden');
    el.clearSearch.classList.add('hidden');
    el.assetSearch.focus();
}

/** Ticker için görüntülenecek ismi döndürür */
function getDisplayName(ticker) {
    if (ASSET_CONFIG[ticker]) return ASSET_CONFIG[ticker].displayName;
    // Manuel girilmiş ticker için ticker adı kullan
    return ticker;
}

/* ============================================================
   7. PORTFÖY HESAPLAMA
   ============================================================ */

/**
 * Tüm işlemlerden güncel portföy pozisyonlarını hesaplar.
 * Ağırlıklı ortalama maliyet yöntemi kullanır.
 *
 * Döndürdüğü yapı:
 * {
 *   'XAU-TRY': {
 *     amount: 10,        // elinde bulunan miktar
 *     totalCost: 32000,  // toplam maliyet (TL)
 *     avgCost: 3200      // ağırlıklı ortalama birim maliyet
 *   }, ...
 * }
 */
function calculatePortfolio() {
    const portfolio = {};

    // İşlemleri tarihe ve ekleme sırasına göre sırala (doğru maliyet hesabı için)
    const sorted = [...state.transactions].sort((a, b) => {
        const d = new Date(a.date) - new Date(b.date);
        return d !== 0 ? d : a.id - b.id;
    });

    for (const tx of sorted) {
        const key = tx.ticker;

        if (!portfolio[key]) {
            portfolio[key] = { amount: 0, totalCost: 0, firstDate: tx.date };
        }

        const pos = portfolio[key];

        if (tx.type === 'AL') {
            pos.amount    += tx.amount;
            pos.totalCost += tx.amount * tx.price;
        } else {
            // SATIM: Ortalama maliyeti koruyarak miktarı düş
            const avgCost  = pos.amount > 0 ? pos.totalCost / pos.amount : 0;
            pos.amount    -= tx.amount;
            pos.totalCost -= tx.amount * avgCost;
        }
    }

    // Sıfır veya negatif miktardaki varlıkları temizle
    for (const key of Object.keys(portfolio)) {
        if (portfolio[key].amount <= 1e-9) delete portfolio[key];
    }

    // Her pozisyon için ortalama maliyeti hesapla
    for (const key of Object.keys(portfolio)) {
        const pos = portfolio[key];
        pos.avgCost = pos.amount > 0 ? pos.totalCost / pos.amount : 0;
    }

    return portfolio;
}

/* ============================================================
   8. CANLI FİYAT ÇEKME
   ============================================================ */

/**
 * Portföydeki tüm varlıkların ve dropdown'daki tüm varlıkların
 * güncel fiyatlarını Yahoo Finance'ten çeker.
 */
async function fetchAllPrices() {
    if (el.refreshBtn.classList.contains('spinning')) return;
    
    try {
        setPriceStatus('loading', 'Güncelleniyor...');
        el.refreshBtn.classList.add('spinning');

        const tickers = new Set();
        state.transactions.forEach(tx => { if(tx.ticker) tickers.add(tx.ticker); });

        if (tickers.size === 0) {
            setPriceStatus('live', 'Portföy Boş');
            el.refreshBtn.classList.remove('spinning');
            return;
        }

        // Dolar kuru gerekliliği kontrolü
        const hasGlobal = [...tickers].some(t => {
            const conf = ASSET_CONFIG[t];
            return conf && !conf.isTRY;
        });
        if (hasGlobal) tickers.add('USD-TRY');

        // Fiyatları çek
        for (const ticker of tickers) {
            try {
                await fetchPriceForTicker(ticker);
                updateUI();
            } catch (e) { console.log(ticker + " atlandı."); }
        }

    } catch (err) {
        console.error("Hata:", err);
    } finally {
        state.lastPriceUpdate = new Date();
        el.lastUpdateTime.textContent = state.lastPriceUpdate.toLocaleTimeString('tr-TR', {
            hour: '2-digit', minute: '2-digit'
        });
        localStorage.setItem('investiq_v2_prices', JSON.stringify(state.prices));
        setPriceStatus('live', 'Canlı Fiyatlar');
        el.refreshBtn.classList.remove('spinning');
        updateUI();
    }
}

async function fetchPriceForTicker(ticker) {
    const config = ASSET_CONFIG[ticker];
    const yahooTick = config ? config.yahooTicker : ticker;
    const baseUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooTick}`;
    
    // Basit ve güvenli çekme metodu (Önce AllOrigins, sonra Codetabs)
    try {
        const url = `https://api.allorigins.win/get?url=${encodeURIComponent(baseUrl)}&_=${Date.now()}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const json = JSON.parse(data.contents);
        const quote = json?.quoteResponse?.result?.[0];
        if (quote) return processQuote(ticker, quote);
    } catch (e) {}

    try {
        const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(baseUrl)}`;
        const resp = await fetch(url);
        const json = await resp.json();
        const quote = json?.quoteResponse?.result?.[0];
        if (quote) return processQuote(ticker, quote);
    } catch (e) {}

    return state.prices[ticker] ?? 0;
}

/** API'den gelen veriyi işle ve state.prices'a yaz */
function processQuote(ticker, quote) {
    const config = ASSET_CONFIG[ticker];
    let priceUSD = quote.regularMarketPrice || quote.previousClose || 0;
    
    let priceTRY;
    if (config?.isTRY || quote.currency === 'TRY') {
        priceTRY = priceUSD;
    } else if (config?.isGoldGram || config?.isSilverGram) {
        const usdTry = state.usdTry || state.prices['USD-TRY'] || 32.50;
        priceTRY = (priceUSD / 31.1035) * usdTry;
    } else if (ticker === 'USD-TRY') {
        priceTRY = priceUSD;
        state.usdTry = priceUSD;
    } else {
        const usdTry = state.usdTry || state.prices['USD-TRY'] || 32.50;
        priceTRY = priceUSD * usdTry;
    }

    state.prices[ticker] = priceTRY;
    return priceTRY;
}

/** Manuel Fiyat Güncelleme (API çalışmazsa kullanıcı girebilir) */
function editPrice(ticker) {
    const current = state.prices[ticker] || 0;
    const newPrice = prompt(`${getDisplayName(ticker)} için güncel fiyatı girin (TL):`, current.toFixed(2));
    
    if (newPrice !== null && !isNaN(newPrice)) {
        state.prices[ticker] = parseFloat(newPrice);
        updateUI();
        showToast("Fiyat manuel olarak güncellendi.", "success");
    }
}

/* ============================================================
   9. UI GÜNCELLEME
   ============================================================ */

/** Tüm UI bileşenlerini günceller */
function updateUI() {
    const portfolio = calculatePortfolio();
    renderPortfolioTable(portfolio);
    renderHistoryTable();
    renderSummaryWidgets(portfolio);
    renderPieChart(portfolio);
    renderLineChart();

    // Dinamik eklenen Lucide ikonlarını yenile
    if (window.lucide) lucide.createIcons();
}

/* -------- 9a. Özet Widget'ları -------- */
function renderSummaryWidgets(portfolio) {
    let totalValue     = 0;
    let totalCost      = 0;
    let bestPct        = -Infinity;
    let bestAssetName  = '-';
    let bestAssetPctTx = 0;

    for (const [ticker, pos] of Object.entries(portfolio)) {
        const price      = state.prices[ticker] ?? pos.avgCost;
        const curVal     = pos.amount * price;
        const profitPct  = pos.avgCost > 0 ? ((price - pos.avgCost) / pos.avgCost) * 100 : 0;

        totalValue += curVal;
        totalCost  += pos.totalCost;

        if (profitPct > bestPct) {
            bestPct        = profitPct;
            bestAssetName  = getDisplayName(ticker);
            bestAssetPctTx = profitPct;
        }
    }

    const totalPL    = totalValue - totalCost;
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const isPositive = totalPL >= 0;

    // Toplam Değer
    el.totalWealth.textContent = formatTL(totalValue);
    el.wealthCost.textContent  = `Maliyet: ${formatTL(totalCost)}`;
    el.wealthCost.className    = 'trend neutral';

    // Kar / Zarar
    el.totalPL.textContent      = `${isPositive ? '+' : ''}${formatTL(totalPL)}`;
    el.totalPL.className        = `value ${isPositive ? 'text-success' : 'text-danger'}`;
    el.profitTrend.textContent  = `${isPositive ? '▲' : '▼'} %${Math.abs(totalPLPct).toFixed(2)} Değişim`;
    el.profitTrend.className    = `trend ${isPositive ? 'up' : 'down'}`;
    el.plIcon.textContent       = isPositive ? '🚀' : '📉';

    // En iyi varlık
    el.bestPerformer.textContent = bestAssetName;
    el.bestPct.textContent       = bestPct > -Infinity
        ? `%${bestAssetPctTx.toFixed(2)} Getiri`
        : '-';
    el.bestPct.className         = `trend ${bestAssetPctTx >= 0 ? 'up' : 'down'}`;

    // Varlık ve işlem sayısı
    el.assetCount.textContent = Object.keys(portfolio).length;
    el.txCount.textContent    = `${state.transactions.length} işlem`;
}

/* -------- 9b. Portföy Tablosu -------- */
function renderPortfolioTable(portfolio) {
    el.portfolioBody.innerHTML = '';
    const entries = Object.entries(portfolio);

    if (entries.length === 0) {
        el.portfolioEmpty.classList.remove('hidden');
        return;
    }
    el.portfolioEmpty.classList.add('hidden');

    for (const [ticker, pos] of entries) {
        const price      = state.prices[ticker] ?? 0;
        const curVal     = pos.amount * price;
        const pl         = curVal - pos.totalCost;
        const plPct      = pos.avgCost > 0 ? ((price - pos.avgCost) / pos.avgCost) * 100 : 0;
        const isPos      = pl >= 0;
        const plClass    = isPos ? 'text-success' : 'text-danger';
        const arrow      = isPos ? '▲' : '▼';

        // Vade hesaplama
        const firstDateObj = new Date(pos.firstDate + 'T00:00:00');
        const today        = new Date();
        const diffTime     = Math.abs(today - firstDateObj);
        const diffDays     = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="asset-badge">${getDisplayName(ticker)}</span></td>
            <td style="font-size: 0.8rem; line-height: 1.2">
                <div style="color: var(--text-1)">${formatDate(pos.firstDate)}</div>
                <div style="color: var(--text-3)">${diffDays} gündür</div>
            </td>
            <td>${formatNum(pos.amount, 4)}</td>
            <td>${formatTL(pos.avgCost)}</td>
            <td style="font-weight:600; cursor: pointer; color: ${price === 0 ? 'var(--warning)' : 'inherit'}" 
                onclick="editPrice('${ticker}')" title="Fiyatı elle düzeltmek için tıklayın">
                ${price > 0 ? formatTL(price) : '<i data-lucide="edit-3" style="width:12px"></i> Fiyat Gir'}
            </td>
            <td style="font-weight:700">${formatTL(curVal)}</td>
            <td class="${plClass}" style="font-weight:600">
                <div>${isPos ? '+' : ''}${formatTL(pl)}</div>
                <div style="font-size: 0.75rem">${arrow} %${Math.abs(plPct).toFixed(2)}</div>
            </td>
        `;
        el.portfolioBody.appendChild(tr);
    }
}

/* -------- 9c. İşlem Geçmişi -------- */
function renderHistoryTable() {
    el.historyBody.innerHTML = '';

    if (state.transactions.length === 0) {
        el.historyEmpty.classList.remove('hidden');
        return;
    }
    el.historyEmpty.classList.add('hidden');

    // En yeni önce
    const sorted = [...state.transactions].sort((a, b) =>
        new Date(b.date) - new Date(a.date) || b.id - a.id
    );

    for (const tx of sorted) {
        const isAl   = tx.type === 'AL';
        const color  = isAl ? 'var(--success)' : 'var(--danger)';
        const total  = tx.amount * tx.price;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-2);font-size:0.8rem">${formatDate(tx.date)}</td>
            <td><span class="asset-badge">${tx.name || getDisplayName(tx.ticker)}</span></td>
            <td>
                <span style="color:${color};font-weight:700;font-size:0.8rem;
                             padding:0.2rem 0.5rem;background:${color}1a;border-radius:0.4rem">
                    ${tx.type}
                </span>
            </td>
            <td>${formatNum(tx.amount, 4)}</td>
            <td>${formatTL(tx.price)}</td>
            <td style="font-weight:600">${formatTL(total)}</td>
            <td style="color:var(--text-2);font-size:0.8rem;max-width:120px;overflow:hidden;text-overflow:ellipsis"
                title="${tx.note || ''}">${tx.note || '—'}</td>
            <td>
                <button class="btn-delete" onclick="deleteTx(${tx.id})" title="Sil">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        el.historyBody.appendChild(tr);
    }
}

/* ============================================================
   10. GRAFİKLER
   ============================================================ */

/* -------- 10a. Pasta Grafik (Doughnut) -------- */
function renderPieChart(portfolio) {
    const entries = Object.entries(portfolio);

    if (entries.length === 0) {
        el.chartEmpty.classList.remove('hidden');
        el.pieCanvas.classList.add('hidden');
        if (state.charts.pie) { state.charts.pie.destroy(); state.charts.pie = null; }
        return;
    }

    el.chartEmpty.classList.add('hidden');
    el.pieCanvas.classList.remove('hidden');

    const labels  = entries.map(([t]) => getDisplayName(t));
    const values  = entries.map(([t, pos]) => pos.amount * (state.prices[t] ?? pos.avgCost));

    if (state.charts.pie) state.charts.pie.destroy();

    state.charts.pie = new Chart(el.pieCanvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: CHART_COLORS.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#09090f',
                hoverOffset: 14
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 14,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { family: 'Outfit', size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const val   = ctx.raw;
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${formatTL(val)}  (%${pct})`;
                        }
                    },
                    backgroundColor: '#1a2234',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: 'Outfit', weight: '600' },
                    bodyFont: { family: 'Outfit' }
                }
            }
        }
    });
}

/* -------- 10b. Çizgi Grafik (Portföy Değer Geçmişi) -------- */
/**
 * İşlem tarihlerini şimdiye kadar olan her gün için portföy değerini
 * hesaplayarak çizgi grafik oluşturur.
 *
 * Not: Tarihsel fiyatlar için sadece mevcut fiyatlar kullanılır.
 * Bu, "yaklaşık" bir geçmiş grafik sağlar.
 */
function renderLineChart() {
    // Benzersiz tarihleri al ve sırala
    const dates = [...new Set(
        state.transactions.map(tx => tx.date)
    )].sort();

    if (dates.length < 2) {
        el.lineChartEmpty.classList.remove('hidden');
        el.lineCanvas.classList.add('hidden');
        if (state.charts.line) { state.charts.line.destroy(); state.charts.line = null; }
        return;
    }

    el.lineChartEmpty.classList.add('hidden');
    el.lineCanvas.classList.remove('hidden');

    // Her tarihte kümülatif portföy değerini hesapla
    const portfolioValues = [];
    const costValues      = [];

    for (const date of dates) {
        // O tarihe kadar (dahil) olan işlemler
        const txsUpTo = state.transactions.filter(tx => tx.date <= date);
        const tempState = { transactions: txsUpTo };
        const snapPortfolio = calculatePortfolioFromTxs(txsUpTo);

        let val = 0, cost = 0;
        for (const [ticker, pos] of Object.entries(snapPortfolio)) {
            const price = state.prices[ticker] ?? pos.avgCost;
            val  += pos.amount * price;
            cost += pos.totalCost;
        }
        portfolioValues.push(parseFloat(val.toFixed(2)));
        costValues.push(parseFloat(cost.toFixed(2)));
    }

    if (state.charts.line) state.charts.line.destroy();

    const gradient1 = el.lineCanvas.getContext('2d').createLinearGradient(0, 0, 0, 320);
    gradient1.addColorStop(0, 'rgba(99,102,241,0.35)');
    gradient1.addColorStop(1, 'rgba(99,102,241,0)');

    const gradient2 = el.lineCanvas.getContext('2d').createLinearGradient(0, 0, 0, 320);
    gradient2.addColorStop(0, 'rgba(236,72,153,0.2)');
    gradient2.addColorStop(1, 'rgba(236,72,153,0)');

    state.charts.line = new Chart(el.lineCanvas, {
        type: 'line',
        data: {
            labels: dates.map(d => formatDate(d)),
            datasets: [
                {
                    label: 'Portföy Değeri',
                    data: portfolioValues,
                    borderColor: '#6366f1',
                    backgroundColor: gradient1,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 5,
                    pointHoverRadius: 8
                },
                {
                    label: 'Toplam Maliyet',
                    data: costValues,
                    borderColor: '#ec4899',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ec4899',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderDash: [5, 4]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { family: 'Outfit', size: 12 },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${formatTL(ctx.raw)}`
                    },
                    backgroundColor: '#1a2234',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: 'Outfit', weight: '600' },
                    bodyFont: { family: 'Outfit' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#475569', font: { family: 'Outfit', size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#475569',
                        font: { family: 'Outfit', size: 11 },
                        callback: val => formatTLShort(val)
                    }
                }
            }
        }
    });
}

/**
 * calculatePortfolio benzeri, ancak dıştaki state yerine
 * verilen işlem listesi üzerinde çalışır (snapshot için).
 */
function calculatePortfolioFromTxs(txs) {
    const portfolio = {};
    const sorted    = [...txs].sort((a, b) => {
        const d = new Date(a.date) - new Date(b.date);
        return d !== 0 ? d : a.id - b.id;
    });

    for (const tx of sorted) {
        const key = tx.ticker;
        if (!portfolio[key]) portfolio[key] = { amount: 0, totalCost: 0 };
        const pos = portfolio[key];

        if (tx.type === 'AL') {
            pos.amount    += tx.amount;
            pos.totalCost += tx.amount * tx.price;
        } else {
            const avg      = pos.amount > 0 ? pos.totalCost / pos.amount : 0;
            pos.amount    -= tx.amount;
            pos.totalCost -= tx.amount * avg;
        }
    }

    for (const k of Object.keys(portfolio)) {
        if (portfolio[k].amount <= 1e-9) delete portfolio[k];
        else portfolio[k].avgCost = portfolio[k].totalCost / portfolio[k].amount;
    }
    return portfolio;
}

/* ============================================================
   11. YARDIMCI FONKSİYONLAR
   ============================================================ */

/** İşlemi sil (global — onclick'te çağrılır) */
function deleteTx(id) {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveTransactions();
    updateUI();
    showToast('İşlem silindi.', 'info');
}

/** Veriyi localStorage'a kaydet */
function saveTransactions() {
    localStorage.setItem('investiq_v2_transactions', JSON.stringify(state.transactions));
}

/** Loading overlay'i gizle */
function hideLoading() {
    el.loadingOverlay.classList.add('hidden');
}

/** Fiyat durum badge'ini güncelle */
function setPriceStatus(type, text) {
    el.priceStatus.className = `price-status ${type}`;
    el.priceStatus.innerHTML = `<span class="status-dot"></span> ${text}`;
}

/** Toast bildirimi göster */
let toastTimer = null;
function showToast(message, type = 'info') {
    el.toast.textContent   = message;
    el.toast.className     = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.toast.classList.remove('show');
    }, 3500);
}

/** Türk Lirası formatı */
function formatTL(value) {
    if (value === null || value === undefined || isNaN(value)) return '₺—';
    return '₺' + value.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/** Kısa TL formatı (grafik eksen) */
function formatTLShort(value) {
    if (Math.abs(value) >= 1_000_000) return `₺${(value/1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000)     return `₺${(value/1_000).toFixed(0)}K`;
    return `₺${value.toFixed(0)}`;
}

/** Sayı formatı (miktar için) */
function formatNum(value, decimals = 2) {
    return value.toLocaleString('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/** Veriyi Dışa Aktar (Clipboard'a kopyalar) */
function handleExport() {
    const data = JSON.stringify(state.transactions);
    navigator.clipboard.writeText(data).then(() => {
        alert("Portföy verileri kopyalandı! Bu kodu telefonuna WhatsApp veya Mail ile atıp oradaki 'İçe Aktar' kısmına yapıştırabilirsin.");
        showToast("Veri panoya kopyalandı.", "success");
    }).catch(err => {
        console.error('Hata:', err);
        prompt("Kopyalanamadı, lütfen buradaki kodu seçip kopyalayın:", data);
    });
}

/** Veriyi İçe Aktar */
function handleImport() {
    const data = prompt("Lütfen dışa aktardığınız portföy kodunu buraya yapıştırın:");
    if (!data) return;

    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            if (confirm(`${parsed.length} adet işlem mevcut verilerin üzerine eklensin mi?`)) {
                state.transactions = [...state.transactions, ...parsed];
                saveTransactions();
                updateUI();
                showToast("Veriler başarıyla içe aktarıldı.", "success");
            }
        } else {
            throw new Error("Geçersiz veri formatı.");
        }
    } catch (e) {
        alert("Hata: Geçersiz veri yapıştırıldı.");
    }
}

/* ============================================================
   12. GLOBAL EXPORT (HTML onclick için)
   ============================================================ */
/** Tarih formatı */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch { return dateStr; }
}

/* ============================================================
   12. GLOBAL EXPORT (HTML onclick için)
   ============================================================ */
window.deleteTx = deleteTx;
window.editPrice = editPrice;

/* ============================================================
   13. BAŞLAT
   ============================================================ */
init();
