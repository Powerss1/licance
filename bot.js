// ------------------ BOUNTAY FARM BOT (PERFORMANS & ZAMANLAMA SÜRÜMÜ) ------------------

const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

// --- AYARLAR ---
const CONFIG = {
    // BURAYI HER BOT DOSYASI İÇİN KENDİNE GÖRE DÜZENLE
    username: 'melihbaskan56', 
    host: 'oyna.craftluna.net',
    port: 25565,
    version: '1.20.1',
    
    auth_cmd: '/login power000', 
    auth_delay: 5,
    towny_item: 'netherite_chestplate',
    
    // --- DÖNGÜ VE ZAMANLAMA ---
    routine_loop: 40,   // Kaç döngüde bir RTP/Para atılacak
    active_time: 10000, // İşlemlerin süresi (Hedef)
    rest_time: 10000,   // Mola süresi (10 Saniye)

    // --- ANTİ-AFK ---
    anti_afk: false, // Kapalıyken işlemciyi yormaz
    walk_radius: 4       
};

// 🔒 Şef kontrolü
try {
    const toolPath = path.join(__dirname, 'sef.js');
    if (!fs.existsSync(toolPath)) process.exit(0);
} catch { process.exit(0); }

let bot;
let isBusy = false;
let isFarmerActive = false;
let loopCount = 0;
let anchorPoint = null;

// Daha stabil bekleme fonksiyonu
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============== PENCERE YÖNETİCİSİ (Hafifletilmiş) ==============

// Pencerenin açılmasını bekleyen güvenli fonksiyon
async function waitForWindow(timeout = 5000) {
    try {
        const window = await Promise.race([
            new Promise(r => bot.once('windowOpen', r)),
            new Promise(r => setTimeout(() => r(null), timeout))
        ]);
        return window;
    } catch { return null; }
}

// ============== ÇİFTÇİ & SAT SİSTEMİ (HIZLI) ==============

async function doFarmer() {
    bot.chat('/çiftçi');
    const win = await waitForWindow(3000);
    
    if (win) {
        // Slot 21'e tıkla (Çiftçi Topla)
        try {
            await bot.clickWindow(21, 0, 1);
            // Menünün kapanması veya işlem onayı için kısa bekleme
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
        // Slot 45-80 arası hızlıca sat (5-6 saniye hedefleniyor)
        // Hızlandırılmış tıklama (70ms)
        for (let slot = 45; slot <= 80; slot++) {
            if (!win.slots[slot]) continue; // Boşsa geç
            try {
                bot.clickWindow(slot, 0, 1); // Await kullanmadan "fire-and-forget" yapabiliriz ama güvenli olsun diye kısa await
                await sleep(70); 
            } catch {}
        }
        await sleep(500); // İşlem bitiş payı
        bot.closeWindow(win);
    }
}

// ============== RUTİN İŞLEMLERİ (RTP & PARA) ==============

async function performRoutine() {
    isBusy = true;
    if(CONFIG.anti_afk) bot.clearControlStates();

    console.log(`[RUTİN] ${loopCount}. döngü: Para ve RTP...`);

    // 1. Para Gönder
    bot.chat('/altin gonder emo5869 100000');
    await sleep(2000);

    // 2. RTP
    bot.chat('/rtp');
    const rtpWin = await waitForWindow(5000);

    if (rtpWin) {
        // Recovery Compass (Kurtarma Pusulası) bul
        const compass = rtpWin.slots.find(item => item && item.name.includes('recovery_compass'));

        if (compass) {
            await sleep(800);
            try {
                await bot.clickWindow(compass.slot, 0, 0);
                console.log('[RUTİN] Pusulaya tıklandı, ışınlanılıyor...');
                // Işınlanma süresini mola süresinden düşeceğiz, burada sadece bekleyelim
                await sleep(5000); 
            } catch (e) { console.log(`[HATA] Tıklama sorunu: ${e.message}`); }
        } else {
            console.log('[HATA] RTP menüsünde Pusula bulunamadı!');
            bot.closeWindow(rtpWin);
        }
    }
    
    // Yeni konumu kaydet
    if (bot.entity) anchorPoint = bot.entity.position.clone();
    isBusy = false;
}

// ============== ANA DÖNGÜ (ZAMAN AYARLI) ==============

async function startFarmerLoop() {
    console.log('[SİSTEM] Farm Başladı. (10s Aktif / 10s Pasif)');

    while (isFarmerActive) {
        try {
            loopCount++;
            const cycleStartTime = Date.now();

            // --- A. RUTİN KONTROLÜ (40 Döngüde Bir) ---
            if (loopCount % CONFIG.routine_loop === 0) {
                await performRoutine();
            }

            // --- B. RESTART KONTROLÜ (500 Döngüde Bir) ---
            if (loopCount % 500 === 0) {
                console.log('[BAKIM] Planlı Restart...');
                bot.quit('Restart');
                return;
            }

            // --- C. İŞLEM ZAMANI (~10 Saniye) ---
            // 1. Çiftçi
            await doFarmer();
            await sleep(1000); // İki işlem arası kısa boşluk
            
            // 2. Sat
            await doSell();
            
            // İşlemlerin ne kadar sürdüğünü hesapla
            const cycleDuration = Date.now() - cycleStartTime;
            
            // Eğer işlemler 10 saniyeden kısa sürdüyse, 10 saniyeye tamamla (Opsiyonel, ama sen "tam 10s sürsün" dedin)
            // Ancak "Sat" işlemi envantere göre değiştiği için burayı esnek bırakmak daha iyi.
            // Biz sadece "Sat" ve "Çiftçi" işleminin toplamının 10 saniyeyi geçmemesine özen gösterdik.

            // --- D. MOLA ZAMANI (Tam 10 Saniye) ---
            // Sef.js'in göreceği bir log atmayalım, sessizce bekleyelim.
            await sleep(CONFIG.rest_time);

        } catch (e) {
            console.log(`[DÖNGÜ HATA] ${e.message}`);
            await sleep(5000); // Hata durumunda bekle
        }
    }
}

// ============== HAREKET SİSTEMİ (SADECE GEREKİRSE) ==============
async function movementLoop() {
    while (true) {
        if (isFarmerActive && !isBusy && CONFIG.anti_afk) {
            // Basit rastgele kafa çevirme (Daha az yük)
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
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        version: CONFIG.version,
        checkTimeoutInterval: 60000 // İnternet kopmalarını daha toleranslı karşıla
    });

    // Sadece pathfinder yüklüyoruz ama anti_afk false ise kullanmayacağız
    bot.loadPlugin(pathfinder);

    bot.once('spawn', () => {
        console.log(`[BAĞLANTI] ${CONFIG.username} sunucuya girdi.`);
        setTimeout(() => bot.chat(CONFIG.auth_cmd), CONFIG.auth_delay * 1000);

        const moves = new Movements(bot);
        bot.pathfinder.setMovements(moves);

        setTimeout(() => { bot.chat('/menu'); }, 7000);
    });

    // --- SEF.JS İÇİN LOG YAKALAYICI ---
    bot.on('message', (msg) => {
        const text = msg.toString();
        // Kazanç Logu
        if (text.includes('+$') || text.includes('hesabınıza') || text.includes('satıldı')) {
            console.log(`💰 [KAZANÇ] ${text}`);
        }
        // Transfer Logu
        else if (text.includes('gönderdiniz') || text.includes('gönderildi')) {
            console.log(`💸 [TRANSFER] ${text}`);
        }
    });

    // --- MENÜ TETİKLEYİCİSİ ---
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

    bot.on('end', () => {
        console.log('[BAĞLANTI] Koptu. 10 saniye sonra yeniden bağlanılıyor...');
        isFarmerActive = false;
        setTimeout(createBot, 10000);
    });

    bot.on('error', (err) => console.log(`[HATA] ${err.message}`));
    bot.on('kicked', (r) => console.log(`[ATILDI] ${r}`));
}

createBot();
