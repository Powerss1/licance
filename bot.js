// ------------------ BOUNTAY FARM BOT (MULTI-ACCOUNT SYSTEM) ------------------

const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

// === HESAP LİSTESİ (BURAYI DOLDUR) ===
const HESAPLAR = [
    { user: 'serdar046', pass: '/login power000' }, // 1. Hesap
    { user: 'Lauya', pass: '/login power111' }, // 2. Hesap
    { user: 'Korty', pass: '/login power111' }  // 3. Hesap
];

// === GENEL AYARLAR ===
const CONFIG = {
    host: 'oyna.craftluna.net',
    port: 25565,
    version: '1.20.1',
    
    towny_item: 'netherite_chestplate',
    
    // --- DÖNGÜ VE ZAMANLAMA ---
    eroutine_loop: 15,   // Tam olarak her 15 döngüde bir Rutin RTP ve Para atılacak
    rest_time: 15000,   // Mola süresi (15 Saniye)
    gold_amount: 1000, // Gönderilecek altın miktarı

    // --- ANTİ-AFK ---
    anti_afk: false, 
    walk_radius: 4       
};

// 🔒 Şef kontrolü
try {
    const toolPath = path.join(__dirname, 'sef.js');
    if (!fs.existsSync(toolPath)) process.exit(0);
} catch { process.exit(0); }

// === GLOBAL DEĞİŞKENLER ===
let bot;
let currentAccountIndex = 0; // Şu anki hesap sırası (0, 1, 2)
let failCount = 0;            // Hata sayacı
let isBusy = false;
let isFarmerActive = false;
let loopCount = 0;
let anchorPoint = null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============== HESAP YÖNETİMİ ==============

function switchAccount() {
    currentAccountIndex++;
    if (currentAccountIndex >= HESAPLAR.length) {
        currentAccountIndex = 0; // Başa dön
    }
    failCount = 0; // Hatayı sıfırla çünkü yeni hesaba geçtik
    console.log(`[SİSTEM] ⚠️ Hesap Değiştiriliyor... Yeni Hesap: ${HESAPLAR[currentAccountIndex].user}`);
}

function handleConnectionError() {
    failCount++;
    console.log(`[HATA] Bağlantı başarısız! (Hata: ${failCount}/2)`);
    
    if (failCount >= 2) {
        console.log(`[SİSTEM] ❌ Bu hesap 2 kez giremedi.`);
        switchAccount();
    }
}

// ============== PENCERE YÖNETİCİSİ ==============

async function waitForWindow(timeout = 5000) {
    try {
        const window = await Promise.race([
            new Promise(r => bot.once('windowOpen', r)),
            new Promise(r => setTimeout(() => r(null), timeout))
        ]);
        return window;
    } catch { return null; }
}

// ============== ÇİFTÇİ & SAT SİSTEMİ ==============

async function doFarmer() {
    bot.chat('/çiftçi');
    const win = await waitForWindow(3000);
    
    if (win) {
        try {
            await bot.clickWindow(21, 0, 1);
            await sleep(1500); 
            bot.closeWindow(win);
        } catch (e) {
            bot.closeWindow(win);
        }
    }
}

async function doSell() {
    bot.chat('/sat');
    const win = await waitForWindow(3000);

    if (win) {
        for (let slot = 45; slot <= 80; slot++) {
            if (!win.slots[slot]) continue; 
            try {
                bot.clickWindow(slot, 0, 1); 
                await sleep(140); 
            } catch {}
        }
        await sleep(500); 
        bot.closeWindow(win);
    }
}

// ============== RTP İŞLEMİ (DÜZELTİLMİŞ) ==============
async function executeRTP() {
    bot.chat('/rtp');
    const rtpWin = await waitForWindow(5000);

    if (rtpWin) {
        console.log('[SİSTEM] Menü açıldı, eşyalar yükleniyor (2sn)...');
        await sleep(2000); 

        const compass = rtpWin.slots.find(item => item && item.name.includes('recovery_compass'));

        if (compass) {
            await sleep(800);
            try {
                await bot.clickWindow(compass.slot, 0, 0);
                console.log('[HAREKET] RTP atıldı, ışınlanma bekleniyor... (8sn)');
                await sleep(8000); 
                
                if (bot.entity) {
                    anchorPoint = bot.entity.position.clone();
                    console.log('[MERKEZ] Yeni konum kaydedildi.');
                }
            } catch (e) { console.log(`[HATA] Tıklama sorunu: ${e.message}`); }
        } else {
            console.log('[HATA] RTP menüsünde "recovery_compass" bulunamadı!');
            bot.closeWindow(rtpWin);
        }
    }
}

// ============== RUTİN İŞLEMLERİ ==============

async function performRoutine() {
    isBusy = true;
    if(CONFIG.anti_afk) bot.clearControlStates();

    console.log(`[RUTİN] ${loopCount}. döngü: Para gönderiliyor...`);
    
    // 1. Para Gönder (10.000 Altın)
    bot.chat(`/altin gonder emo5869 ${CONFIG.gold_amount}`);
    await sleep(2000);

    // 2. Planlı RTP
    console.log('[RUTİN] Planlı RTP atılıyor...');
    await executeRTP();
    
    isBusy = false;
}

// ============== AFK KONTROL VE KAÇIŞ ==============
async function checkAndEscapeAFK() {
    if (!bot.entity || !anchorPoint) return false;

    const distance = bot.entity.position.distanceTo(anchorPoint);

    if (distance > 20) {
        console.log(`[GÜVENLİK] DİKKAT! Bot merkezden ${Math.floor(distance)} blok uzakta!`);
        console.log('[GÜVENLİK] ACİL RTP atılıyor...');
        await executeRTP(); 
        return true; 
    }
    return false; 
}

// ============== ANA DÖNGÜ ==============

async function startFarmerLoop() {
    console.log(`[SİSTEM] Farm Başladı (${HESAPLAR[currentAccountIndex].user}).`);

    while (isFarmerActive) {
        try {
            loopCount++;
            
            // A. Rutin (Her 15 döngüde bir)
            if (loopCount % CONFIG.eroutine_loop === 0) await performRoutine();

            // B. Restart
            if (loopCount % 500 === 0) {
                console.log('[BAKIM] Planlı Restart...');
                isFarmerActive = false;
                bot.quit('Restart'); 
                return;
            }

            // C. İşlemler
            await doFarmer();
            await sleep(3000); 
            await doSell();
            
            // D. Mola & Güvenlik
            const escaped = await checkAndEscapeAFK();
            if (!escaped) await sleep(CONFIG.rest_time);

        } catch (e) {
            console.log(`[DÖNGÜ HATA] ${e.message}`);
            await sleep(5000); 
        }
    }
}

// ============== HAREKET SİSTEMİ ==============
async function movementLoop() {
    while (true) {
        if (isFarmerActive && !isBusy && CONFIG.anti_afk) {
            if (bot.entity) {
                const yaw = (Math.random() * Math.PI * 2) - Math.PI;
                const pitch = (Math.random() * Math.PI / 2) - (Math.PI / 4);
                await bot.look(yaw, pitch);
            }
        }
        await sleep(5000);
    }
}

// ============== BOT OLUŞTURMA ==============
function createBot() {
    const currentAccount = HESAPLAR[currentAccountIndex];
    
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: currentAccount.user, 
        version: CONFIG.version,
        checkTimeoutInterval: 60000 
    });

    bot.loadPlugin(pathfinder);

    bot.once('spawn', () => {
        failCount = 0; 
        console.log(`[BAĞLANTI] ${currentAccount.user} sunucuya girdi.`);
        
        setTimeout(() => bot.chat(currentAccount.pass), 5000);

        const moves = new Movements(bot);
        bot.pathfinder.setMovements(moves);

        setTimeout(() => { bot.chat('/menu'); }, 7000);
    });

    bot.on('message', (msg) => {
        const text = msg.toString().trim();

        if (text.includes('+$')) {
            console.log(`💰 [KAZANÇ] ${text}`);
        }
        else if (text.includes('gönderdiniz') || text.includes('gönderildi')) {
            console.log(`💸 [TRANSFER] ${text}`);
        }
    });

    bot.on('windowOpen', async (window) => {
        if (isFarmerActive) return;

        const townyItem = window.slots.find(i => i && i.name === CONFIG.towny_item);
        if (townyItem) {
            console.log('[NAVİGASYON] Towny seçiliyor...');
            isBusy = true;
            try {
                await sleep(1500);
                await bot.clickWindow(townyItem.slot, 0, 0);
                
                setTimeout(() => {
                    if (bot.entity) {
                        anchorPoint = bot.entity.position.clone();
                        console.log(`[MERKEZ] Konum alındı. Döngü başlatılıyor.`);
                    }
                    
                    if (!isFarmerActive) {
                        isFarmerActive = true;
                        isBusy = false;
                        startFarmerLoop();
                        if (CONFIG.anti_afk) movementLoop(); 
                    }
                }, 5000);

            } catch (e) { isBusy = false; }
        }
    });

    bot.on('end', (reason) => {
        console.log(`[BAĞLANTI] Koptu (${reason}).`);
        isFarmerActive = false;
        
        if (reason === 'Restart' || reason === 'Planlı Restart') {
             setTimeout(createBot, 10000);
        } else {
            handleConnectionError();
            setTimeout(createBot, 10000);
        }
    });

    bot.on('error', (err) => {
        console.log(`[HATA] ${err.message}`);
    });
    
    bot.on('kicked', (reason) => {
        console.log(`[ATILDI] ${reason}`);
    });
}

createBot();

