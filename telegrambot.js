// ------------------ ATHENAX OS - V3 PLATINUM (STABLE CONNECT EDIT) ------------------

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const mineflayer = require('mineflayer');
const TelegramBot = require('node-telegram-bot-api');

// === HESAPLAR VE CONFIG ===
const tgToken = '8357212422:AAFuvGXPLFybOvGfwFJwEOIsE7jbtAj3Q0g';
const adminChatId = '7550492553';
const ADMIN_PIN = "8402";
const lockFile = path.join(__dirname, 'bot.lock');

const HESAPLAR = [
    { user: 'AthenaX', pass: '/login power111' },
    { user: 'Korty', pass: '/login power111' },
    { user: 'Lauya', pass: '/login power111' }
];

const CONFIG = {
    host: 'oyna.craftluna.net',
    port: 25565,
    version: '1.20.1',
    towny_item: 'netherite_chestplate',
    eroutine_loop: 15,
    rest_time: 15000,
    gold_amount: 100000,
    anti_afk: false
};

// === GLOBAL DEĞİŞKENLER ===
let bot;
let currentAccountIndex = 0;
let failCount = 0; 
let incomeFailCount = 0;
let isBusy = false;
let isFarmerActive = false;
let loopCount = 0;
let anchorPoint = null;
let lastIncome = "0";
let lastIncomeTime = Date.now();
let panelMessageId = null;
let currentView = 'MAIN';
let pinBuffer = "";
let adminAuthorized = false;
let statusNote = "Sistem Başlatılıyor...";

// 🔒 TEKİL SİSTEM KORUMASI
if (fs.existsSync(lockFile)) {
    try { process.kill(fs.readFileSync(lockFile, 'utf8'), 0); process.exit(0); } catch (e) { fs.unlinkSync(lockFile); }
}
fs.writeFileSync(lockFile, process.pid.toString());
process.on('exit', () => { if(fs.existsSync(lockFile)) fs.unlinkSync(lockFile); });

// [DÜZELTME 1] Telegram Botu Hata Yakalama (Polling Error Fix)
const tBot = new TelegramBot(tgToken, { polling: true });

tBot.on('polling_error', (error) => {
    // Bu blok Telegram bağlantısı kopsa bile scriptin çökmesini engeller
    console.log(`[TG-SİSTEM] Bağlantı Hatası (Yoksayıldı): ${error.code}`);
});

tBot.on('webhook_error', (error) => {
    console.log(`[TG-WEBHOOK] Hata: ${error.code}`);
});

// ============== YARDIMCI MEKANİKLER ==============

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function safeChat(msg) { if (bot && bot._client && bot._client.chat) bot.chat(msg); }

async function waitForWindow(timeout = 5000) {
    try {
        return await Promise.race([
            new Promise(r => bot.once('windowOpen', r)),
            new Promise(r => setTimeout(() => r(null), timeout))
        ]);
    } catch { return null; }
}

// ============== WATCHDOG (GELİR KORUMASI) ==============
setInterval(() => {
    if (!isFarmerActive || !bot) return;

    const timeSinceLastIncome = Date.now() - lastIncomeTime;
    const limit = 3 * 60 * 1000; 

    if (timeSinceLastIncome > limit) {
        if (incomeFailCount >= 1) {
            console.log("⚠️ 3 Dakika kuralı (2. kez): Hesap değiştiriliyor.");
            statusNote = "Gelir yok! Hesap Değişiyor...";
            render();
            incomeFailCount = 0;
            lastIncomeTime = Date.now(); 
            currentAccountIndex = (currentAccountIndex + 1) % HESAPLAR.length;
            if(bot) bot.quit(); 
        } else {
            console.log("⚠️ 3 Dakika kuralı (1. kez): Bot yeniden başlatılıyor.");
            statusNote = "Gelir yok! Yeniden Başlatılıyor...";
            render();
            incomeFailCount++;
            lastIncomeTime = Date.now(); 
            if(bot) bot.quit();
        }
    }
}, 60000);

// ============== TELEGRAM PANEL ==============
async function render() {
    let text = `👑 **ATHENAX ULTIMATE CONTROL**\n━━━━━━━━━━━━━━━━━━━━\n`;
    let keyboard = [];
    const diffMs = Date.now() - lastIncomeTime;
    const diffMins = Math.floor(diffMs / 60000);
    let timeString = diffMins < 3 ? "Şuan" : `${diffMins} dakika önce`;

    if (currentView === 'MAIN') {
        text += `👤 **Aktif:** \`${HESAPLAR[currentAccountIndex].user}\`\n💰 **Kazanç:** \`+$${lastIncome}\`\n🕒 **Son Satış:** \`${timeString}\`\n📍 **Not:** \`${statusNote}\`\n━━━━━━━━━━━━━━━━━━━━`;
        keyboard = [
            [{ text: isFarmerActive ? "⏹️ Farmı Durdur" : "▶️ Farmı Başlat", callback_data: 'toggle_farm' }],
            [{ text: "👥 Hesap Seç", callback_data: 'view_accounts' }, { text: "📍 Manuel RTP", callback_data: 'manual_rtp' }],
            [{ text: "💸 Altın Gönder", callback_data: 'ask_pay' }, { text: !adminAuthorized ? "🔐 Admin Girişi" : "⚙️ Admin Menüsü", callback_data: !adminAuthorized ? 'view_pin' : 'view_admin' }],
            [{ text: "🔄 Yenile", callback_data: 'refresh' }]
        ];
    } 
    else if (currentView === 'PIN') {
        text += `🔐 **GÜVENLİK GİRİŞİ**\nPIN: \`${"*".repeat(pinBuffer.length)}\`\n━━━━━━━━━━━━━━━━━━━━`;
        keyboard = [
            [{ text: "1", callback_data: "p_1" }, { text: "2", callback_data: "p_2" }, { text: "3", callback_data: "p_3" }],
            [{ text: "4", callback_data: "p_4" }, { text: "5", callback_data: "p_5" }, { text: "6", callback_data: "p_6" }],
            [{ text: "7", callback_data: "p_7" }, { text: "8", callback_data: "p_8" }, { text: "9", callback_data: "p_9" }],
            [{ text: "❌ Sil", callback_data: "p_clear" }, { text: "0", callback_data: "p_0" }, { text: "🔙 Geri", callback_data: "view_main" }]
        ];
    }
    else if (currentView === 'ACCOUNTS') {
        text += `👥 **HESAP LİSTESİ**\n━━━━━━━━━━━━━━━━━━━━`;
        HESAPLAR.forEach((acc, idx) => {
            keyboard.push([{ text: `${currentAccountIndex === idx ? '✅' : '👤'} ${acc.user}`, callback_data: `switch_${idx}` }]);
        });
        keyboard.push([{ text: "🔙 Geri", callback_data: "view_main" }]);
    }
    else if (currentView === 'ADMIN') {
        text += `⚙️ **ADMİN PANELİ**\n━━━━━━━━━━━━━━━━━━━━`;
        keyboard = [
            [{ text: "📥 Git Pull", callback_data: 'git_pull' }, { text: "♻️ Reload System", callback_data: 'reload' }],
            [{ text: "🔙 Geri", callback_data: "view_main" }]
        ];
    }

    if (!panelMessageId) {
        try {
            const sent = await tBot.sendMessage(adminChatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
            panelMessageId = sent.message_id;
        } catch(e) { console.log("TG Mesaj Hatası:", e.code); }
    } else {
        try { await tBot.editMessageText(text, { chat_id: adminChatId, message_id: panelMessageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }); } catch (e) {}
    }
}

// ============== FARM LOOP ==============
async function executeRTP() {
    isBusy = true;
    safeChat('/rtp');
    const rtpWin = await waitForWindow(5000);
    if (rtpWin) {
        await sleep(2000); 
        const compass = rtpWin.slots.find(item => item && item.name.includes('recovery_compass'));
        if (compass) {
            try {
                await bot.clickWindow(compass.slot, 0, 0);
                statusNote = "Işınlanılıyor (8sn)..."; render();
                await sleep(8000);
                if (bot.entity) anchorPoint = bot.entity.position.clone();
            } catch (e) { statusNote = "Tıklama Hatası!"; }
        } else { bot.closeWindow(rtpWin); }
    }
    isBusy = false;
    render();
}

async function startFarmerLoop() {
    statusNote = "🟢 Farm Aktif"; render();
    while (isFarmerActive) {
        try {
            if (isBusy) { await sleep(2000); continue; }
            loopCount++;

            if (loopCount % CONFIG.eroutine_loop === 0) {
                isBusy = true;
                statusNote = "📦 Rutin: Para + RTP"; render();
                safeChat(`/altin gonder emo5869 ${CONFIG.gold_amount}`);
                await sleep(2000);
                await executeRTP();
                isBusy = false;
            }

            safeChat('/çiftçi');
            const cwin = await waitForWindow(3000);
            if (cwin) { try { await bot.clickWindow(21, 0, 1); await sleep(1500); bot.closeWindow(cwin); } catch(e){} }
            
            await sleep(2000);
            
            safeChat('/sat');
            const swin = await waitForWindow(3000);
            if (swin) {
                for (let slot = 45; slot <= 80; slot++) {
                    if (swin.slots[slot]) { try { bot.clickWindow(slot, 0, 1); await sleep(140); } catch(e){} }
                }
                bot.closeWindow(swin);
            }

            if (bot.entity && anchorPoint) {
                const dist = bot.entity.position.distanceTo(anchorPoint);
                if (dist > 20) {
                    statusNote = "⚠️ Kaçış Algılandı! RTP..."; render();
                    await executeRTP();
                }
            }
            statusNote = "🟢 Hasat Tamamlandı"; render();
            await sleep(CONFIG.rest_time);
        } catch (e) { 
            console.log("Döngü hatası, devam ediliyor...");
            await sleep(2000); 
        }
    }
}

// ============== TELEGRAM BUTONLAR ==============
let awaitingGold = false;
tBot.on('callback_query', async (query) => {
    const data = query.data;
    if (query.message.chat.id.toString() !== adminChatId) return;

    if (data === 'view_main') currentView = 'MAIN';
    if (data === 'view_pin') { currentView = 'PIN'; pinBuffer = ""; }
    if (data === 'view_accounts') currentView = 'ACCOUNTS';
    if (data === 'view_admin' && adminAuthorized) currentView = 'ADMIN';

    if (data.startsWith('p_')) {
        const val = data.split('_')[1];
        if (val === 'clear') pinBuffer = "";
        else pinBuffer += val;
        if (pinBuffer === ADMIN_PIN) { adminAuthorized = true; currentView = 'MAIN'; statusNote = "Admin Girişi Başarılı"; }
        else if (pinBuffer.length >= 4) { pinBuffer = ""; statusNote = "PIN Hatalı!"; }
    }

    if (data === 'toggle_farm') {
        isFarmerActive = !isFarmerActive;
        if (isFarmerActive) startFarmerLoop();
    }

    if (data === 'manual_rtp') executeRTP();

    if (data === 'ask_pay') {
        awaitingGold = true;
        tBot.sendMessage(adminChatId, "💸 Gönderilecek: `İsim Miktar` (Örn: `AthenaX 5000`) yazın:");
    }

    if (data.startsWith('switch_')) {
        const idx = parseInt(data.split('_')[1]);
        if (idx !== currentAccountIndex) {
            statusNote = `🔄 ${HESAPLAR[idx].user} Geçiliyor...`;
            currentAccountIndex = idx;
            isFarmerActive = false;
            incomeFailCount = 0; 
            bot.quit();
        }
    }
    if (data === 'git_pull') exec('git pull', (e, out) => tBot.sendMessage(adminChatId, out || "Hata"));
    if (data === 'reload') process.exit(1);
    render();
});

tBot.on('message', (msg) => {
    if (awaitingGold && msg.text) {
        const parts = msg.text.split(' ');
        if (parts.length === 2) {
            safeChat(`/altin gonder ${parts[0]} ${parts[1]}`);
            statusNote = `✅ ${parts[1]} Altın Gönderildi`;
            awaitingGold = false;
            render();
        }
    }
});

// ============== BOT OLUŞTURMA VE HATA YÖNETİMİ ==============
function createBot() {
    const acc = HESAPLAR[currentAccountIndex];
    console.log(`[SİSTEM] ${acc.user} için bot oluşturuluyor...`);
    
    bot = mineflayer.createBot({ 
        host: CONFIG.host, 
        port: CONFIG.port, 
        username: acc.user, 
        version: CONFIG.version,
        checkTimeoutInterval: 30000 // 30 saniyede bir bağlantı kontrolü
    });

    bot.once('spawn', () => {
        failCount = 0; 
        statusNote = `${acc.user} Oyuna Girdi`; 
        lastIncomeTime = Date.now(); 
        render();
        setTimeout(() => safeChat(acc.pass), 5000);
        setTimeout(() => safeChat('/menu'), 7000);
    });

    bot.on('message', (msg) => {
        const text = msg.toString();
        if (text.includes('+$')) {
            lastIncome = text.split('$')[1].split(' ')[0];
            lastIncomeTime = Date.now();
            incomeFailCount = 0; 
            render();
        }
    });

    bot.on('windowOpen', async (window) => {
        if (isFarmerActive) return;
        const towny = window.slots.find(i => i && i.name === CONFIG.towny_item);
        if (towny) {
            statusNote = "Towny Seçiliyor..."; render();
            await sleep(1500);
            try {
                await bot.clickWindow(towny.slot, 0, 0);
                setTimeout(async () => {
                    if (bot.entity) anchorPoint = bot.entity.position.clone();
                    await executeRTP();
                    isFarmerActive = true;
                    startFarmerLoop();
                }, 5000);
            } catch (e) {}
        }
    });

    bot.on('kicked', (reason) => console.log(`Atıldı: ${reason}`));

    // [DÜZELTME 2] Hata Yakalama (ETIMEDOUT için)
    bot.on('error', (err) => {
        console.log(`[BOT-HATA] ${err.code || err.message}`);
        // Eğer ETIMEDOUT (Zaman aşımı) olursa 'end' eventi bazen tetiklenmez, manuel kapatalım:
        if (err.code === 'ETIMEDOUT') {
            console.log("[BOT] Zaman aşımı! Manuel yeniden başlatma tetikleniyor...");
            bot.end(); // Bu, aşağıdaki 'end' listener'ı tetikler
        }
    });

    // --- FAILOVER MANTIĞI ---
    bot.on('end', (reason) => {
        isFarmerActive = false;
        failCount++; 

        console.log(`[BOT-SON] Bağlantı koptu. Sebep: ${reason}. Hata Sayısı: ${failCount}`);

        if (failCount >= 2) {
            statusNote = `⚠️ ${acc.user} başarısız! Diğer hesaba geçiliyor...`;
            render();
            failCount = 0;
            incomeFailCount = 0; 
            currentAccountIndex = (currentAccountIndex + 1) % HESAPLAR.length;
        } else {
            statusNote = `🔴 Bağlantı Koptu (${failCount}/2). Tekrar deneniyor...`;
            render();
        }

        setTimeout(createBot, 10000);
    });
}

// Başlat
createBot();
render();
