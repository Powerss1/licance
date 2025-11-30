// === Basit Otomatik Mesaj ve Giriş Botu ===
// Başlamadan önce gerekli modülleri varsa yükle
const { execSync } = require('child_process');
const dependencies = ['mineflayer'];
for (const dep of dependencies) {
  try { require.resolve(dep); }
  catch {
    console.log(`📦 ${dep} bulunamadı, yükleniyor...`);
    execSync(`npm install ${dep}`, { stdio: 'inherit' });
  }
}

const mineflayer = require('mineflayer');
const fs = require('fs');

// === AYARLAR ===
// Bu yapı doğrudan örnekteki YAML içeriğinin sade JSON eşdeğeri
const config = {
  login: {
    username: 'Landpix',
    premium_password: '',
    type: '',
    server_ip: 'oyna.craftluna.net',
    server_port: 25565,
    server_version: '1.17'
  },
  Auth: {
    auth_enabled: true,
    auth_password: '/login power111',
    auth_delay: 5
  },
  AutoReconnect: {
    auto_reconnect: true,
    auto_reconnect_delay: 2
  },
  GUI: {
    gui_click_enabled: true,
    gui_click_item: ['netherite_chestplate', 'clock']
  },
  // 1‑4 mesaj kategorisi
  Message1: {
    mab_enabled: false,
    start_delay: 15,
    message_delay: 16,
    repeat: false,
    repeat_delay: 100,
    chatmessages: ["/t spawn Napoles"]
  },
  Message2: {
    mab_enabled: true,
    start_delay: 20,
    message_delay: 30,
    repeat: true,
    repeat_delay: 1000,
    chatmessages: ["/menu"]
  },
  Message3: {
    mab_enabled: true,
    start_delay: 30,
    message_delay: 60,
    repeat: true,
    repeat_delay: 200,
    chatmessages: ["/rtp"]
  },
  Message4: {
    mab_enabled: false,
    start_delay: 120,
    message_delay: 120,
    repeat: true,
    repeat_delay: 120,
    chatmessages: ["AVM Market ihtiyaçlarınız için /t spawn NapolesAVM"]
  }
};

// === Araç fonksiyonlar ===
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let bot;

// === BOT KURULUMU ===
function createBot() {
  console.log('[BOT] Başlatılıyor...');
  bot = mineflayer.createBot({
    host: config.login.server_ip,
    port: config.login.server_port,
    username: config.login.username,
    version: config.login.server_version
  });

  bot.once('spawn', async () => {
    console.log(`[BOT] Sunucuya bağlandı (${config.login.server_ip}).`);

    // Giriş sistemi
    if (config.Auth.auth_enabled) {
      console.log(`[AUTH] ${config.Auth.auth_delay} sn sonra giriş yapılacak...`);
      setTimeout(() => {
        console.log(`[AUTH] Giriş komutu gönderiliyor: ${config.Auth.auth_password}`);
        bot.chat(config.Auth.auth_password);
      }, config.Auth.auth_delay * 1000);
    }

    // Mesaj bloklarını başlat
    startMessageBlocks();
  });

  // GUI tıklama sistemi
  bot.on('windowOpen', async (window) => {
    if (!config.GUI.gui_click_enabled) return;
    console.log(`[GUI] Menü açıldı (${window.title.text || window.title}) kontrol ediliyor...`);
    for (let i = 0; i < window.slots.length; i++) {
      const item = window.slots[i];
      if (!item) continue;
      if (config.GUI.gui_click_item.includes(item.name)) {
        console.log(`[GUI] Tıklanacak item bulundu (${item.name}) slot: ${i}`);
        await sleep(1500);
        try {
          await bot.clickWindow(i, 0, 0);
          console.log(`[GUI] ${item.name} itemine tıklandı.`);
        } catch (e) {
          console.log(`[GUI] Tıklama hatası: ${e.message}`);
        }
        break;
      }
    }
  });

  bot.on('message', msg => console.log(`[CHAT]: ${msg.toString()}`));
  bot.on('kicked', reason => console.log(`[SUNUCU] Atıldı: ${reason}`));
  bot.on('end', () => {
    console.log('[BOT] Bağlantı sonlandı.');
    if (config.AutoReconnect.auto_reconnect) {
      console.log(`[Reconnect] ${config.AutoReconnect.auto_reconnect_delay}s içinde yeniden bağlanacak.`);
      setTimeout(createBot, config.AutoReconnect.auto_reconnect_delay * 1000);
    }
  });
}

// === MESAJ BLOKLARINI BAŞLATIR ===
function startMessageBlocks() {
  for (let i = 1; i <= 4; i++) {
    const block = config[`Message${i}`];
    if (!block || !block.mab_enabled) continue;
    console.log(`[Message${i}] aktif, ${block.start_delay}s sonra başlayacak.`);
    setTimeout(() => runMessageLoop(block, i), block.start_delay * 1000);
  }
}

// === MESAJ BLOĞU DÖNGÜSÜ ===
async function runMessageLoop(block, index) {
  console.log(`[Message${index}] başlatıldı.`);

  do {
    for (const msg of block.chatmessages) {
      try {
        bot.chat(msg);
        console.log(`[Message${index}] gönderildi: ${msg}`);
      } catch (err) {
        console.log(`[Message${index}] hata: ${err.message}`);
      }
      await sleep(block.message_delay * 1000);
    }

    if (block.repeat) {
      console.log(`[Message${index}] tekrar öncesi ${block.repeat_delay}s bekleniyor...`);
      await sleep(block.repeat_delay * 1000);
    }
  } while (block.repeat && bot && bot.player);
}

// === BOTU BAŞLAT ===
createBot();




