// ------------------ FARM BOT (ŞEF UYUMLU) ------------------
// ------------------ FARM BOT (ŞEF KONTROLLÜ) ------------------

const fs = require('fs');
const path = require('path');

// 🔒 Şef kontrolü
try {
const toolPath = path.join(__dirname, 'sef.js'); // tool aynı klasörde
if (!fs.existsSync(toolPath)) process.exit(0); // şef.js yoksa sessiz çık
} catch {
process.exit(0);
}
const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

const settings = {
minecraft: {
host: 'oyna.craftluna.net',
port: 25565,
username: 'Certelo',
version: '1.20.1'
},
Auth: { auth_enabled: true, auth_password: '/login power111', auth_delay: 5 },
GUI: { gui_click_enabled: true, gui_click_item: ['netherite_chestplate', 'clock'] } // netherite_chestplate (13. slot) Towny menüsüdür
};

let bot;
let isFarmerActive = false;
let loopCount = 0;
let menuNavigationStep = 0; // 0: Hazır, 1: /menu açıldı
let isRestarting = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============== TEMEL ÇİFTÇİ/SAT ==============
async function depositAllSellableItems(window) {
for (let slot = 45; slot <= 80; slot++) {
const item = window.slots[slot];
if (!item) continue;
try {
await bot.clickWindow(slot, 0, 1);
await sleep(100);
} catch {
break;
}
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

async function goTowny() {
bot.chat('/menu');
menuNavigationStep = 1;
}

// ============== FARM DÖNGÜSÜ ==============
async function startFarmerLoop() {
while (isFarmerActive) {
try {
loopCount++;
console.log(`[BOT_STATUS] LOOP ${loopCount}`);

// Her 20 döngüde bir /altin + /rtp
if (loopCount % 20 === 0) {
bot.chat('/altin gonder emo5869 100000');
await sleep(3000);
bot.chat('/rtp');
await sleep(3000);
}

// Her 500 döngüde bir planlı restart
if (loopCount % 500 === 0) {
console.log('[BOT_STATUS] RESTART');
isRestarting = true;
isFarmerActive = false;
try { bot.quit('500 döngüde planlı restart'); } catch {}
setTimeout(() => createBot(), 10000);
return;
}

// /çiftçi
bot.chat('/çiftçi');
const farmWin = await Promise.race([
new Promise(r => bot.once('windowOpen', r)),
new Promise(r => setTimeout(() => r('timeout'), 8000))
]);
if (farmWin !== 'timeout') await handleCiftci(farmWin);
await sleep(2000);

// /sat
bot.chat('/sat');
const satWin = await Promise.race([
new Promise(r => bot.once('windowOpen', r)),
new Promise(r => setTimeout(() => r('timeout'), 8000))
]);
if (satWin !== 'timeout') await handleSat(satWin);
await sleep(2000);

} catch {
await sleep(2000);
}
}
console.log('[FARM] Döngü durdu.');
}

// ============== BOT OLUŞTURMA ==============
function createBot() {
bot = mineflayer.createBot({
host: settings.minecraft.host,
port: settings.minecraft.port,
username: settings.minecraft.username,
version: settings.minecraft.version
});

bot.loadPlugin(pathfinder);

bot.once('spawn', async () => {
console.log('[BOT_STATUS] FARM STARTED');
if (settings.Auth.auth_enabled)
setTimeout(() => bot.chat(settings.Auth.auth_password), settings.Auth.auth_delay * 1000);

const moves = new Movements(bot);
bot.pathfinder.setMovements(moves);

// Otomatik girişten sonra /menu ile Towny'ye git
setTimeout(() => { bot.chat('/menu'); menuNavigationStep = 1; }, 5000);
});

// Menü geçişleri
bot.on('windowOpen', async (window) => {
// Menü navigasyonu (Towny'ye geçiş)
if (menuNavigationStep === 1) {
// Netherite Chestplate'i bul ve tıkla
const targetItemName = settings.GUI.gui_click_item[0];
let targetSlot = -1;

for (let i = 0; i < window.slots.length; i++) {
const item = window.slots[i];
if (item && item.name === targetItemName) {
targetSlot = i;
break;
}
}

if (targetSlot !== -1) {
console.log(`[MENU_NAV] Tıklanıyor: ${targetItemName} (Slot ${targetSlot})`);
await sleep(2000);
try { await bot.clickWindow(targetSlot, 0, 0); } catch {}
} else {
console.log(`[MENU_NAV] ${targetItemName} bulunamadı.`);
// Pencereyi kapatıp döngüye geçmek için bekleyelim
await bot.closeWindow(window);
}

menuNavigationStep = 0; // Towny'ye geçiş tamamlandı

// Farmer döngüsünü başlat
setTimeout(() => {
if (!isFarmerActive) {
isFarmerActive = true;
startFarmerLoop();
}
}, 5000);
return;
}

// GUI tıklama (Towny'ye geçiş menüsü dışındaki menüler için)
if (settings.GUI.gui_click_enabled && menuNavigationStep === 0) {
for (let i = 0; i < window.slots.length; i++) {
const item = window.slots[i]; if (!item) continue;
if (settings.GUI.gui_click_item.includes(item.name)) {
await sleep(1200);
try { await bot.clickWindow(i, 0, 0); } catch {}
break;
}
}
}
});

// === Sohbet takibi ===
bot.on('message', (msg) => {
const line = msg.toString();
if (line.startsWith('+$')) console.log(line); // Tool bunu 💰 olarak gösterir
if (line.includes('100,000 altın gönderdiniz')) console.log(line); // Tool bunu 🏅 olarak gösterir
});

bot.on('kicked', r => console.log('[BOT_STATUS] KICK', r));
bot.on('end', () => {
if (!isRestarting) console.log('[BOT_STATUS] KICK');
else isRestarting = false;
});
}

createBot();








