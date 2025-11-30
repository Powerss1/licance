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
    'gitbot3.js',
    'gitbot4.js',
    'gitbot5.js',// <-- Bu dosya güncellenecek listesinde zaten var.
    'baslat1.bat',
    'manuel_loader.js',
    'manuel_loader.bat',
    'package.json',
    'package-lock.json', 
    'version.txt' // Sürüm kontrol dosyası
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

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

    console.log('\n[TOOL] Modül kontrolü tamamlandı, botlar başlatılıyor...\n');

    // Botların listesi, gitbot2.js eklendi
    const bots = [
        { name: 'Farm', file: 'bot.js' },
        { name: 'AFK', file: 'gitbot.js' },
        { name: 'AFK2', file: 'gitbot2.js' }, // <-- Yeni bot eklendi
        { name: 'AFK3', file: 'gitbot3.js' }, // <-- Yeni bot eklendi
        { name: 'AFK4', file: 'gitbot4.js' }, // <-- Yeni bot eklendi
        { name: 'AFK5', file: 'gitbot5.js' } // <-- Yeni bot eklendi
    ];

    let farmProc;

    for (const b of bots) {
        if (!fs.existsSync(b.file)) {
            console.log(`⚠️  ${b.file} bulunamadı, atlanıyor.`);
            continue;
        }
        const proc = spawn('node', [b.file]);
        if (b.name === 'Farm') farmProc = proc;
        setupProc(proc, b.name);
    }

    function setupProc(proc, tag) {
        proc.stdout.on('data', d => handleOutput(tag, d.toString()));
        proc.stderr.on('data', d => handleOutput(tag, d.toString()));
        proc.on('close', code => console.log(`💤 [${tag}] kapandı (${code ?? '?'})`));
    }

    // === Botlardan gelen logları yakala ===
    function handleOutput(src, txt) {
        const lines = txt.split(/\r?\n/);
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Farm botuna ait özel log yakalama (sadece 'Farm' botu için geçerli)
            if (src === 'Farm') {
                if (line.startsWith('[BOT_STATUS] LOOP')) {
                    const num = parseInt(line.split(' ')[2]);
                    if (num % 500 === 0) console.log(`♻️ [Farm] ${num}. döngü (planlı restart)`);
                }
                else if (line.includes('RESTART')) console.log('🔄 [Farm] Planlı restart başladı.');
                else if (line.includes('FARM STARTED')) console.log('🌾 [Farm] Başladı.');
                else if (line.startsWith('+$')) console.log(`💰 [Farm] Kazanç: ${line}`);
                else if (line.includes('altın gonder')) console.log('💸 [Farm] Altın gönderimi yapılıyor...');
                else if (line.includes('10,000') && line.includes('altın')) console.log('🏅 [Altın] Gönderildi!');
                else if (line.includes('KICK')) {
                    console.log('⚠️ [Farm] Sunucudan atıldı! 10 s sonra yeniden başlatılıyor...');
                    restartFarm();
                }
            } else {
                 // Diğer botlar için genel log çıktısı
                 // Bot2 veya AFK botlarının loglarını izlemek için bu kısmı kullanabilirsiniz.
                 // Örneğin: console.log(`[${src}] ${line}`); 
                 // Ancak orijinal kod yapısını bozmamak için sadece Farm için özel logları tuttum.
                 if (line.includes('KICK')) {
                    console.log(`⚠️ [${src}] Sunucudan atıldı!`);
                    // AFK botlarının otomatik yeniden başlatılması gerekirse buraya eklenebilir.
                }
            }
        }
    }

    // === Farm botu yeniden başlatma (gerçek atılma sonrası) ===
    function restartFarm() {
        if (!farmProc) return;
        try { farmProc.kill(); } catch {}
        setTimeout(() => {
            console.log('🔁 [TOOL] Farm bot yeniden başlatıldı.');
            farmProc = spawn('node', ['bot.js']);
            setupProc(farmProc, 'Farm');
        }, 10000);
    }
}





