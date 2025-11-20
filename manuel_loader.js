// manual_loader.js (Manuel Tetiklemeli Captcha Çözücü - Tamamlanmış Versiyon)

const mineflayer = require('mineflayer');
const axios = require('axios'); // API isteği atmak için

// ======================= YAPILANDIRMA =======================
const GLOBAL_SETTINGS = {
    host: 'oyna.craftluna.net',
    port: 25565,
    version: '1.20.1',
    captchaAccounts: [
        { username: 'metropaz23', isReady: true },
        { username: '1v5sayko', isReady: true },
        { username: 'enlantika', isReady: true }
    ],
    Auth: {
        password: 'power000',
        loginDelay: 5000 
    },
    Captcha: {
        API_KEY: '3223283b05bc2a56027ad98aaa08690d', // 🔑 BURAYI GÜNCELLEYİNİZ!
        API_URL: 'https://api.2captcha.com/in.php' // 2Captcha Görüntü Yükleme Uç Noktası
    }
};

// ======================= GLOBAL DURUM TAKİBİ =======================
let currentCaptchaAccountIndex = 0;
let activeBot = null;

// ======================= ZAMANLAYICILAR =======================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ======================= CAPTCHA İŞLEMLERİ =======================

/**
 * Captcha görüntüsünü Mineflayer'dan yakalar (varsayımsal).
 * UYARI: Bu fonksiyon, harita verisini okuyan bir eklenti olmadığı sürece sadece simülasyondur.
 * Gerçekte burada harita verisi yakalanıp Buffer olarak döndürülmelidir.
 */
function captureMapCaptchaImage(bot) {
    console.log('[CAPTCHA] Harita verisi yakalanmaya çalışılıyor...');
    // DİKKAT: Gerçek kullanımda bu satır yerine harita verisi kullanılmalıdır.
    return Buffer.from([0x01, 0x02, 0x03]); 
}

/**
 * 2Captcha API'sine görüntüyü gönderir ve sonucu bekler (Simülasyon).
 */
async function solveCaptchaWithApi(imageBuffer) {
    if (!imageBuffer || !GLOBAL_SETTINGS.Captcha.API_KEY) {
        console.error('[CAPTCHA_API] Görüntü Buffer’ı veya API Anahtarı eksik.');
        return null;
    }

    console.log('[CAPTCHA_API] API\'ye görüntü gönderiliyor (Simülasyon)...');

    try {
        // API isteği simülasyonu
        // Gerçek API entegrasyonu için Map Captcha'yı BASE64 olarak göndermeniz gerekir.
        // Bu kısım, 2Captcha'nın Map Captcha'yı desteklemesi durumunda kullanılmalıdır.
        await sleep(10000); 
        
        console.log('[CAPTCHA_API] Captcha çözüldü (Simülasyon). Yanıt alınıyor.');
        // Çözüm metni olarak ham yanıtı döndür
        return 'ornekyanit123'; 
    } catch (error) {
        console.error('[CAPTCHA_API] API İsteği Hatası:', error.message);
        return null;
    }
}

// ======================= BOT YÖNETİMİ =======================

/**
 * Başarılı çözüm sonrası temiz çıkış yapar ve kullanıcıyı bilgilendirir.
 */
function handleSuccess(username) {
    console.log(`\n🎉🎉🎉 [BAŞARILI] Hesap: ${username} ile Captcha çözüldü.`);
    console.log('Lütfen şimdi manuel olarak sef.js dosyasını BAŞLATIN.');
    
    if (activeBot) {
        activeBot.quit('Captcha çözüldü, manuel Farm Bot başlatılıyor.');
    }
    
    process.exit(0);
}

/**
 * Captcha çözümleme görevini sıradaki hesapla başlatır.
 */
function startNextCaptchaJob() {
    const accounts = GLOBAL_SETTINGS.captchaAccounts;
    const account = accounts[currentCaptchaAccountIndex];

    if (!account) {
        console.error('\n❌ [HATA] Tüm hesaplar denendi, hiçbiri çözülemedi. Çıkılıyor.');
        process.exit(1); 
        return;
    }

    currentCaptchaAccountIndex = (currentCaptchaAccountIndex + 1);

    createBot(account.username);
}


function createBot(username) {
    console.log(`\n[MANUEL_LOADER] Deneniyor: ${username}`);
    
    if (activeBot) {
        try { activeBot.quit('Sıradaki hesaba geçiliyor.'); } catch {}
    }

    activeBot = mineflayer.createBot({
        host: GLOBAL_SETTINGS.host,
        port: GLOBAL_SETTINGS.port,
        username: username,
        version: GLOBAL_SETTINGS.version
    });

    activeBot.once('spawn', async () => {
        console.log(`[${username}] Sunucuya bağlandı.`);
        
        // Giriş
        setTimeout(() => {
            const authCommand = `/login ${GLOBAL_SETTINGS.Auth.password}`;
            activeBot.chat(authCommand);
        }, GLOBAL_SETTINGS.Auth.loginDelay);

        // Captcha Çözüm Akışı
        await sleep(10000);
        const imageBuffer = captureMapCaptchaImage(activeBot);
        
        if (imageBuffer) {
            const solution = await solveCaptchaWithApi(imageBuffer);
            
            if (solution) {
                console.log(`[${username}] Çözüm Metni Gönderiliyor: ${solution}`);
                activeBot.chat(solution);
            } else {
                console.error(`[${username}] Captcha Çözülemedi. Başarısız.`);
                activeBot.quit('Çözüm başarısız.');
            }
        }
    });

    activeBot.on('end', (reason) => {
        // Başka bir nedenle atılırsa veya başarısız çözüme bağlı kapanırsa
        console.log(`[${username}] Bağlantı kesildi (${reason}). Sıradaki hesaba geçiliyor...`);
        setTimeout(() => startNextCaptchaJob(), 5000);
    });

    activeBot.on('message', (msg) => {
        const line = msg.toString();
        
        // CAPTCHA BAŞARISI TESPİTİ (Sunucudan gelen başarı mesajı ile)
        if (line.includes('Başarıyla giriş yaptınız')) { 
            activeBot.removeAllListeners(); 
            handleSuccess(activeBot.username); 
            return;
        }

        console.log(`[CHAT] ${line}`);
    });
    
    activeBot.on('error', (err) => {
        console.error(`[${username}] Hata:`, err.message);
    });
}

// ======================= BAŞLATMA NOKTASI =======================
console.log(`\n=== MANUEL CAPTCHA ÇÖZÜCÜ BAŞLATILDI ===`);
startNextCaptchaJob();
