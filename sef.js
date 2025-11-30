// === ŞEF TOOL (ping tabanlı lisans kontrol ve GÜNCELLEME) ===
const readline = require('readline');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

// === Lisans yapılandırması ===
const LICENSE_KEY = 'emo5869';
// Lisans dosyasının URL'si (HEAD isteği için, indirilmeyecek)
const LICENSE_URL = 'https://github.com/Powerss1/licance/blob/main/emo5869.txt';
// Güncelleme kontrolü ve dosya indirme için depo ayarları
const REPO_OWNER = 'Powerss1';
const REPO_NAME = 'licance'; // Örnek depo adı, gerçek depo adını buraya girin
const REPO_BRANCH = 'main';

// Güncellenecek dosyaların listesi (Lisans dosyası hariç)
const FILES_TO_UPDATE = [
    'sef.js', // Bu dosyanın adı
    'bot.js',
    'gitbot.js',
    'gitbot2.js',
    'baslat1.bat',
    'manuel_loader.js',
    'manuel_loader.bat',
    'package.json',
    'package-lock.json',
    'version.txt' // Sürüm kontrol dosyası
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// --- Global Değişkenler (Bot ve Kazanç Takibi için) ---
let hourlyEarnings = 0;
let lastLogTime = Date.now();
const LOG_FILE = 'log.txt';
const loggedEarnings = new Set(); // Çift loglamayı engellemek için
let activeBots = {}; // Bot süreçlerini (spawn objelerini) tutmak için sözlük
let farmProc; // Farm botunu KICK restart'ı için ayrı tutmak


// ---- Lisans sor ----
rl.question('🔐 Lisans şifresini giriniz: ', async (answer) => {
    if (answer.trim() !== LICENSE_KEY) {
        console.log('❌ Yanlış lisans şifresi, Tool kapatılıyor...');
        process.exit(0);
    }

    console.log('🌐 GitHub üzerinde lisans dosyası kontrol ediliyor...');
    const exists = await pingGitHubFile(LICENSE_URL);

    if (!exists) {
        console.log('❌ Lisans dosyası bulunamadı. Tool çalışmayacak.');
        process.exit(0);
    }

    console.log('✅ Lisans doğrulandı, güncellemeler kontrol ediliyor...\n');
    rl.close();
    
    await checkAndApplyUpdates();
    startTool();
});

// ---- GitHub dosyasını yalnızca pingler (HEAD isteği) ----
function pingGitHubFile(url) {
    // Lisans için blob URL'si, raw olarak çevrilmeli.
    const rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    
    return new Promise((resolve) => {
        const req = https.request(rawUrl, { method: 'HEAD' }, res => {
            // Sadece 200 OK yanıtı başarılı sayılır.
            if (res.statusCode === 200) resolve(true);
            else resolve(false);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

// ---- Güncelleme Kontrolü ve Uygulama Sistemi ----
async function checkAndApplyUpdates() {
    let currentVersion = '0.0';
    const tempVersionFile = 'temp_version.txt';
    const remoteVersionUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/version.txt`;

    // 1. Yerel Sürümü Oku
    if (fs.existsSync('version.txt')) {
        currentVersion = fs.readFileSync('version.txt', 'utf8').trim();
    }
    console.log(`[GÜNCELLEME] Yerel Sürüm: v${currentVersion}`);

    // 2. Uzak Sürümü İndir
    const remoteVersion = await downloadFile(remoteVersionUrl, tempVersionFile);
    if (!remoteVersion) {
        console.log('⚠️ [GÜNCELLEME] Uzak sürüm kontrol dosyası (version.txt) indirilemedi.');
        return;
    }
    
    let remoteVersionStr = fs.readFileSync(tempVersionFile, 'utf8').trim();
    fs.unlinkSync(tempVersionFile); // Geçici dosyayı sil

    console.log(`[GÜNCELLEME] Uzak Sürüm: v${remoteVersionStr}`);

    // 3. Sürüm Karşılaştırması
    if (parseFloat(remoteVersionStr) > parseFloat(currentVersion)) {
        console.log('\n🌟 [GÜNCELLEME] Yeni sürüm bulundu! Dosyalar indiriliyor...');
        await downloadAllUpdates(remoteVersionStr);
    } else {
        console.log('\n✅ [GÜNCELLEME] Tool güncel sürümde.');
    }
}

// ---- Dosya İndirme Fonksiyonu ----
function downloadFile(url, dest) {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => resolve(false)); // İndirilemezse dosyayı sil ve false döndür
                return;
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve(true)));
        });
        req.on('error', (err) => {
            fs.unlink(dest, () => resolve(false));
        });
    });
}

// ---- Tüm Güncelleme Dosyalarını İndir ----
async function downloadAllUpdates(newVersion) {
    let successCount = 0;
    
    for (const file of FILES_TO_UPDATE) {
        const remoteUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${file}`;
        console.log(`\t-> ${file} indiriliyor...`);
        const success = await downloadFile(remoteUrl, file);
        if (success) {
            console.log(`\t✅ ${file} güncellendi.`);
            successCount++;
        } else {
            console.log(`\t❌ ${file} indirilemedi.`);
        }
    }

    if (successCount === FILES_TO_UPDATE.length) {
        console.log(`\n🎉 [GÜNCELLEME] Tool başarıyla v${newVersion} sürümüne güncellendi.`);
        // Güncelleme sonrası kendini yeniden başlatma
        console.log('🔄 [TOOL] Güncelleme sonrası yeniden başlatılıyor...');
        // Node'u yeni dosyayla yeniden başlat
        spawn(process.execPath, [__filename], {
            detached: true,
            stdio: 'inherit'
        }).unref();
        process.exit(0);
    } else {
        console.log('\n❌ [GÜNCELLEME] Tüm dosyalar güncellenemedi, mevcut sürüm ile devam ediliyor.');
    }
}

// === En Yakın Saat Başına Yuvarlama Fonksiyonu ===
function roundToNearestHour(timestamp) {
    const d = new Date(timestamp);
    d.setMinutes(0, 0, 0); // Dakika, saniye, milisaniyeyi sıfırla
    return d.getTime(); 
}

// === Botların Tümünü Durdurma ve Yeniden Başlatma Fonksiyonları ===
function killAllBots() {
    console.log('\n🛑 [SAATLİK RESTART] Tüm botlar kapatılıyor...');
    for (const name in activeBots) {
        try {
            activeBots[name].kill();
            console.log(`\t✅ [${name}] süreci sonlandırıldı.`);
        } catch (e) {
            console.log(`\t⚠️ [${name}] sonlandırılamadı.`);
        }
    }
    activeBots = {}; // Sözlüğü temizle
    farmProc = undefined; // Farm referansını temizle
}

function startAllBots(bots, setupProc) {
    console.log('🔄 [SAATLİK RESTART] Tüm botlar yeniden başlatılıyor...');
    for (const b of bots) {
        if (!fs.existsSync(b.file)) {
            console.log(`⚠️  ${b.file} bulunamadı, atlanıyor.`);
            continue;
        }
        const proc = spawn('node', [b.file]);
        activeBots[b.name] = proc; // Süreci sözlüğe kaydet
        if (b.name === 'Farm') farmProc = proc;
        setupProc(proc, b.name);
    }
    console.log('✅ [SAATLİK RESTART] Tüm botlar başlatıldı.');
}

function scheduleHourlyRestart(bots, setupProc) {
    const now = new Date();
    // Bir sonraki tam saat başını hesapla
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); 

    // Bir sonraki saat başına kadar kalan süreyi hesapla
    const delay = nextHour.getTime() - now.getTime();

    console.log(`\n⏳ [SAATLİK RESTART] Sonraki otomatik restart: ${nextHour.toLocaleTimeString('tr-TR')} (Kalan süre: ${Math.round(delay / 60000)} dakika)`);

    setTimeout(() => {
        // İlk yeniden başlatma işlemini gerçekleştir
        killAllBots();
        setTimeout(() => {
            startAllBots(bots, setupProc);
            
            // İlk yeniden başlatmadan sonra 1 saat aralıklarla sürekli çalışacak zamanlayıcıyı kur
            setInterval(() => {
                // Saatlik loglama kontrolü
                checkHourlyLog(true); // interval içinde olduğu için loglama garantilenir
                
                killAllBots();
                // 5 saniye bekleme süresi, botların tamamen kapanması için
                setTimeout(() => {
                    startAllBots(bots, setupProc);
                }, 5000); 
            }, 3600000); // 1 saat (3,600,000 ms)
        }, 5000); // 5 saniye bekle
    }, delay);
}

// ========================================================================
// ====================== TOOL ANA KISIM BURADAN BAŞLAR ====================
function startTool() {
    // Gerekli modüllerin kontrolü ve kurulumu
    const modules = ['mineflayer', 'mineflayer-pathfinder', 'vec3'];
    for (const m of modules) {
        try { require.resolve(m); console.log(`✅ ${m} yüklü`); }
        catch {
            console.log(`📦 ${m} yükleniyor...`);
            execSync(`npm install ${m}`, { stdio: 'inherit' });
            console.log(`✅ ${m} kuruldu`);
        }
    }
    
    // Loglamanın düzgün saat başı aralıklarını takip edebilmesi için 
    // lastLogTime'ı yuvarlanmış saate ayarla
    lastLogTime = roundToNearestHour(lastLogTime);
    console.log(`\n[LOG] İlk kazanç takibi başlangıç saati: ${new Date(lastLogTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`);

    console.log('\n[TOOL] Modül kontrolü tamamlandı, botlar başlatılıyor...\n');

    // Botların listesi
    const bots = [
        { name: 'Farm', file: 'bot.js' },
        { name: 'AFK', file: 'gitbot.js' },
        { name: 'AFK2', file: 'gitbot2.js' },
    ];
    
    // --- Botların İlk Kez Başlatılması ---
    for (const b of bots) {
        if (!fs.existsSync(b.file)) {
            console.log(`⚠️  ${b.file} bulunamadı, atlanıyor.`);
            continue;
        }
        const proc = spawn('node', [b.file]);
        activeBots[b.name] = proc; // Botu takip listesine ekle
        if (b.name === 'Farm') farmProc = proc;
        setupProc(proc, b.name);
    }
    
    // --- Saatlik Zamanlayıcıyı Kur (Bot süreçlerini ve setupProc'u parametre olarak gönder) ---
    scheduleHourlyRestart(bots, setupProc);

    function setupProc(proc, tag) {
        proc.stdout.on('data', d => handleOutput(tag, d.toString()));
        proc.stderr.on('data', d => handleOutput(tag, d.toString()));
        proc.on('close', code => console.log(`💤 [${tag}] kapandı (${code ?? '?'})`));
    }

    // === Botlardan gelen logları yakala ve kazancı işle ===
    function handleOutput(src, txt) {
        const lines = txt.split(/\r?\n/);
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Farm botuna ait özel log yakalama
            if (src === 'Farm') {
                if (line.startsWith('[BOT_STATUS] LOOP')) {
                    const num = parseInt(line.split(' ')[2]);
                    if (num % 500 === 0) console.log(`♻️ [Farm] ${num}. döngü (planlı restart)`);
                }
                else if (line.includes('RESTART')) console.log('🔄 [Farm] Planlı restart başladı.');
                else if (line.includes('FARM STARTED')) console.log('🌾 [Farm] Başladı.');
                else if (line.startsWith('+$')) {
                    
                    // --- Yeni Kazanç Takip ve Çift Log Engeli ---
                    const earningsKey = line; 
                    if (loggedEarnings.has(earningsKey)) {
                        continue; // Çift loglamayı engelle
                    }
                    loggedEarnings.add(earningsKey);
                    
                    console.log(`💰 [Farm] Kazanç: ${line}`);

                    // Sayıyı al ve toplam kazanca ekle
                    const earningsValueMatch = line.match(/\+\$\s*([\d,.]+)/);
                    if (earningsValueMatch) {
                        const earning = parseFloat(earningsValueMatch[1].replace(',', '.'));
                        if (!isNaN(earning)) {
                            hourlyEarnings += earning;
                        }
                    }
                    // --- Kazanç Takip Sonu ---
                }
                else if (line.includes('altın gonder')) console.log('💸 [Farm] Altın gönderimi yapılıyor...');
                else if (line.includes('10,000') && line.includes('altın')) console.log('🏅 [Altın] Gönderildi!');
                else if (line.includes('KICK')) {
                    console.log('⚠️ [Farm] Sunucudan atıldı! 10 s sonra yeniden başlatılıyor...');
                    restartFarm(setupProc); // setupProc'u yeniden başlatmaya gönder
                }
            } else {
                 // Diğer botlar için genel log çıktısı
                if (line.includes('KICK')) {
                    console.log(`⚠️ [${src}] Sunucudan atıldı!`);
                }
            }
        }
        
        // --- Saatlik Loglama Kontrolü (Her log satırından sonra kontrol et) ---
        checkHourlyLog(false);
    }

    // === Saatlik Kazancı Tam Saat Aralıklarında Loglama Fonksiyonu ===
    function checkHourlyLog(forced) {
        const now = Date.now();
        const timeSinceLastLog = now - lastLogTime;
        
        // 1 saat dolduysa VEYA manuel olarak zorlandıysa (setInterval'dan)
        if (forced || timeSinceLastLog >= 3600000) {
            
            let currentTime = lastLogTime;
            // Bir saatlik dilimler halinde ilerle
            while (forced || now - currentTime >= 3600000) {
                
                // Eğer kazanç yoksa ve zorlanmamışsa, loglamayı atla (genellikle zorlanmamış durumda hep loglanır)
                if (hourlyEarnings === 0 && !forced) break;

                const logStartTime = currentTime;
                const logEndTime = currentTime + 3600000;

                // Loglanacak metni oluştur
                const startTimeStr = new Date(logStartTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const endTimeStr = new Date(logEndTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                const logEntry = `\n[${startTimeStr} - ${endTimeStr}] Toplam Kazanç: ${hourlyEarnings.toFixed(2)} TL`;
                
                // log.txt dosyasına ekle
                fs.appendFileSync(LOG_FILE, logEntry);
                
                console.log(`\n📄 [LOG] ${startTimeStr} - ${endTimeStr} arası kazanç (${hourlyEarnings.toFixed(2)} TL) loglandı.`);
                
                // Bir sonraki tam saate geç ve döngüden çık
                currentTime += 3600000; 
                break;
            }
            
            // Değişkenleri sıfırla ve yeni başlangıç zamanını ayarla
            hourlyEarnings = 0;
            lastLogTime = currentTime; // Loglama yapılan son tam saat (örneğin 12:00'dan 13:00'a geçer)
            loggedEarnings.clear(); // Set'i de temizle
        }
    }

    // === Farm botu yeniden başlatma (gerçek atılma sonrası) ===
    function restartFarm(setupProc) {
        if (!farmProc) return;
        try { farmProc.kill(); } catch {}
        setTimeout(() => {
            console.log('🔁 [TOOL] Farm bot yeniden başlatıldı.');
            const proc = spawn('node', ['bot.js']);
            activeBots['Farm'] = proc; // Yeni süreci kaydet
            farmProc = proc;
            setupProc(proc, 'Farm');
        }, 10000);
    }
}
