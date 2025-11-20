// manual_loader.js (Manuel Tetiklemeli Captcha Çözücü)

const mineflayer = require('mineflayer');

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
    }
    // Manuel olduğu için GUI veya TPA ayarları gerekmez
};

// ======================= GLOBAL DURUM TAKİBİ =======================
let currentCaptchaAccountIndex = 0;
let activeBot = null;

// ======================= ZAMANLAYICILAR =======================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ======================= CAPTCHA İŞLEMLERİ (Önceki Yapıdan) =======================

function captureMapCaptchaImage(bot) {
    console.log('[CAPTCHA] Harita verisi yakalanmaya çalışılıyor...');
    return Buffer.from([0x01, 0x02, 0x03]); 
}

async function solveCaptchaWithApi(imageBuffer) {
    if (!imageBuffer) return null;
    console.log('[CAPTCHA_API] API\'ye görüntü gönderiliyor...');
    await sleep(10000); 
    console.log('[CAPTCHA_API] Captcha çözüldü. Yanıt alınıyor.');
    return 'ornekyanit123'; // Ham metin yanıtı
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
    
    // Uygulamayı kapat
    process.exit(0);
}

/**
 * Captcha çözümleme görevini sıradaki hesapla başlatır.
 */
function startNextCaptchaJob() {
    const accounts = GLOBAL_SETTINGS.captchaAccounts;
    const account = accounts[currentCaptchaAccountIndex];

    if (!account) {
        console.error('\n❌ [HATA] Tüm hesaplar denendi, hiçbiri çözülemedi.');
        process.exit(1); 
        return;
    }

    currentCaptchaAccountIndex = (currentCaptchaAccountIndex + 1); // Sıradaki hesaba geç

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
        
        // Giriş/Kayıt
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
                
                // Çözümü gönderdikten sonra sunucudan gelecek başarılı girişi bekleyeceğiz
            } else {
                console.error(`[${username}] Captcha Çözülemedi. Başarısız.`);
                // Çözüm başarısızsa, botu kapatıp sıradakine geç
                activeBot.quit('Çözüm başarısız.');
            }
        }
    });

    activeBot.on('end', (reason) => {
        if (reason && reason.includes('Başarısız')) { // Çözüm başarısız olduğunda
            console.log(`[${username}] Başarısızlık nedeniyle kapatıldı. Sıradaki hesaba geçiliyor...`);
            setTimeout(() => startNextCaptchaJob(), 5000);
        } else {
            // Başka bir nedenle atılırsa (örneğin Captcha çözülmediği için sunucu attı)
            console.log(`[${username}] Bağlantı kesildi (${reason}). Sıradaki hesaba geçiliyor...`);
            setTimeout(() => startNextCaptchaJob(), 5000);
        }
    });

    activeBot.on('message', (msg) => {
        const line = msg.toString();
        
        // CAPTCHA BAŞARISI TESPİTİ
        if (line.includes('Başarıyla giriş yaptınız')) { // VEYA Sunucuya özgü başka bir mesaj
            activeBot.removeAllListeners(); 
            handleSuccess(activeBot.username); // Başarılı, sistemi kapat
            return;
        }

        console.log(`[CHAT] ${line}`);
    });
}

// ======================= BAŞLATMA NOKTASI =======================
console.log(`\n=== MANUEL CAPTCHA ÇÖZÜCÜ BAŞLATILDI ===`);
startNextCaptchaJob();
