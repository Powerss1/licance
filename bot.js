// ------------------ BOUNTAY FARM BOT (FİNAL SÜRÜM - NO AES) ------------------

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
    towny_item: 'netherite_chestplate', // Towny sunucu seçim itemi
    
    // --- ANTİ-AFK AYARLARI ---
    anti_afk: false,      
    walk_radius: 4       
};

// 🔒 Şef kontrolü (Dosya kontrolü sadece)
try {
    const toolPath = path.join(__dirname, 'sef.js');
    if (!fs.existsSync(toolPath)) process.exit(0);
} catch { process.exit(0); }

let bot;
let isBusy = false; // KİLİT: True ise bot yürümez
let isFarmerActive = false;
let loopCount = 0;
let anchorPoint = null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============== İNSANSI HAREKET SİSTEMİ ==============

async function smoothLook(yaw, pitch) {
    if (!bot || !bot.entity) return;
    const steps = 20; 
    const interval = 15; 

    const currentYaw = bot.entity.yaw;
    const currentPitch = bot.entity.pitch;

    let yawDiff = yaw - currentYaw;
    if (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;
    if (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;
    const pitchDiff = pitch - currentPitch;

    for (let i = 1; i <= steps; i++) {
        if (isBusy) break; 
        const nextYaw = currentYaw + (yawDiff * (i / steps));
        const nextPitch = currentPitch + (pitchDiff * (i / steps));
        
        bot.look(nextYaw, nextPitch);
        await sleep(interval);
    }
}

async function naturalWalk() {
    // isBusy TRUE ise kesinlikle yürümez
    if (!CONFIG.anti_afk || isBusy || !bot || !bot.entity || !anchorPoint) return;

    const currentPos = bot.entity.position;
    const dist = currentPos.distanceTo(anchorPoint);

    // Eve dönüş
    if (dist > CONFIG.walk_radius) {
        await bot.lookAt(anchorPoint.offset(0, 1.6, 0)); 
        bot.setControlState('forward', true);
        const walkTime = Math.min(dist * 350, 2500); 
        await sleep(walkTime);
        bot.clearControlStates();
        return;
    }

    // Rastgele Gezinti
    try {
        const randomYaw = (Math.random() * Math.PI * 2) - Math.PI;
        await smoothLook(randomYaw, 0);

        bot.setControlState('forward', true);
        const walkDuration = 500 + Math.random() * 1500;
        
        const startTime = Date.now();
        while (Date.now() - startTime < walkDuration) {
            if (isBusy) break; 

            const v = bot.entity.velocity;
            const speed = Math.sqrt(v.x ** 2 + v.z ** 2);
            
            if (speed < 0.05 && (Date.now() - startTime > 200)) {
                bot.setControlState('forward', false);
                bot.setControlState('back', true);
                await sleep(600);
                bot.setControlState('back', false);
                break; 
            }
            await sleep(50);
        }
    } catch (e) {} finally {
        bot.clearControlStates(); 
    }
}

// ============== SATIŞ VE ÇİFTÇİ İŞLEMLERİ ==============

async function depositAllSellableItems(window) {
    for (let slot = 45; slot <= 80; slot++) {
        const item = window.slots[slot];
        if (!item) continue;
        try {
            await bot.clickWindow(slot, 0, 1); 
            await sleep(100); 
        } catch { break; }
    }
}

async function handleCiftci(window) {
    try {
        await sleep(2000);
        await bot.clickWindow(21, 0, 1);
        await sleep(3000);
        await bot.closeWindow(window);
    } catch {}
}

async function handleSat(window) {
    try {
        await depositAllSellableItems(window);
        await sleep(500);
        await bot.closeWindow(window);
    } catch {}
}

// ============== ANA FARM DÖNGÜSÜ ==============
async function startFarmerLoop() {
    console.log('[SİSTEM] Farm Başladı. (Sessiz Mod & RTP: 50 Döngü)');
    
    while (isFarmerActive) {
        try {
            loopCount++;
            
            // --- RUTİNLER (Her 50 döngüde bir) ---
            if (loopCount % 50 === 0) {
                isBusy = true; // KİLİT: Hareket etme
                bot.clearControlStates(); 
                
                console.log(`[RUTİN] ${loopCount}. döngü: Para gönderimi ve RTP...`);
                
                // 1. Para Gönder
                bot.chat('/altin gonder emo5869 100000');
                await sleep(3000);
                
                // 2. RTP (GUI Tıklamalı)
                bot.chat('/rtp');
                try {
                    // Menü açılmasını bekle
                    const rtpWin = await Promise.race([
                        new Promise(r => bot.once('windowOpen', r)),
                        new Promise(r => setTimeout(() => r('timeout'), 5000))
                    ]);

                    if (rtpWin !== 'timeout') {
                        // 'clock' (Kumpas) itemini bul
                        const clockItem = rtpWin.slots.find(item => item && item.name.includes('recovery_compass'));
                        
                        if (clockItem) {
                            // Tıkla
                            await sleep(1000);
                            await bot.clickWindow(clockItem.slot, 0, 0);
                            
                            // Işınlanma beklemesi (6 saniye)
                            console.log('[RUTİN] Saate tıklandı, ışınlanma bekleniyor...');
                            await sleep(6000); 
                        } else {
                            console.log('[HATA] RTP menüsünde saat bulunamadı.');
                            bot.closeWindow(rtpWin);
                        }
                    } else {
                        console.log('[HATA] RTP menüsü açılmadı (Timeout).');
                    }
                } catch (e) {
                    console.log('[HATA] RTP işlem hatası:', e.message);
                }
                
                // Işınlandığı yeri yeni EV MERKEZİ yap
                if (bot.entity) anchorPoint = bot.entity.position.clone(); 
                
                isBusy = false; // KİLİT AÇ: Artık yürüyebilir
            }

            // --- RESTART (Her 500 döngüde bir) ---
            if (loopCount % 500 === 0) {
                console.log('[BAKIM] 500 döngü tamamlandı. Restart atılıyor...');
                isBusy = true;
                isFarmerActive = false;
                bot.quit('Planlı Restart');
                return; 
            }

            // --- 1. ÇİFTÇİ İŞLEMİ ---
            isBusy = true; // Yürümeyi durdur
            bot.clearControlStates();
            bot.chat('/çiftçi');

            const farmWin = await Promise.race([
                new Promise(r => bot.once('windowOpen', r)),
                new Promise(r => setTimeout(() => r('timeout'), 8000))
            ]);

            if (farmWin !== 'timeout') await handleCiftci(farmWin);
            
            isBusy = false; // Yürüyebilir
            await sleep(2000); 

            // --- 2. SAT İŞLEMİ ---
            isBusy = true; // Yürümeyi durdur
            bot.clearControlStates();
            bot.chat('/sat');

            const satWin = await Promise.race([
                new Promise(r => bot.once('windowOpen', r)),
                new Promise(r => setTimeout(() => r('timeout'), 8000))
            ]);

            if (satWin !== 'timeout') await handleSat(satWin);

            isBusy = false; // Yürüyebilir
            await sleep(2000); 

        } catch (e) {
            isBusy = false; 
            await sleep(2000);
        }
    }
}

// ============== BOT KURULUMU ==============
function createBot() {
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        version: CONFIG.version
    });

    bot.loadPlugin(pathfinder);

    // --- HAREKET DÖNGÜSÜ ---
    async function movementLoop() {
        while (true) {
            // Sadece Farm aktifse, meşgul değilse ve ayar açıksa yürü
            if (isFarmerActive && !isBusy && CONFIG.anti_afk) {
                await naturalWalk();
            }
            await sleep(1000 + Math.random() * 2000);
        }
    }

    bot.once('spawn', () => {
        console.log(`[BAĞLANTI] ${CONFIG.username} sunucuya girdi.`);
        setTimeout(() => bot.chat(CONFIG.auth_cmd), CONFIG.auth_delay * 1000);

        const moves = new Movements(bot);
        bot.pathfinder.setMovements(moves);

        setTimeout(() => { bot.chat('/menu'); }, 7000);
    });

    // --- SADECE KAZANÇ LOGLARI ---
    bot.on('message', (msg) => {
        const text = msg.toString();
        if (text.includes('+$') || text.includes('hesabınıza') || text.includes('satıldı')) {
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
                        console.log(`[MERKEZ] Konum alındı. Farm başlatılıyor.`);
                    }
                    
                    if (!isFarmerActive) {
                        isFarmerActive = true;
                        isBusy = false;
                        startFarmerLoop();
                        movementLoop(); 
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


