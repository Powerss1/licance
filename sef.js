// === ŞEF TOOL (ping tabanlı lisans kontrol ve GÜNCELLEME) ===
const readline = require('readline');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

// === Lisans yapılandırması ===
const LICENSE_KEY = 'emo5869';
// Lisans dosyasının URL'si (HEAD isteği için, indirilmeyecek)
const LICENSE_URL = 'https://github.com/Powerss1/licanceforAFK/blob/main/emo5869.txt'; 
// Güncelleme kontrolü ve dosya indirme için depo ayarları
const REPO_OWNER = 'Powerss1';
const REPO_NAME = 'licanceforAFK';
const REPO_BRANCH = 'main';

// Güncellenecek dosyaların listesi (Lisans dosyası hariç)
const FILES_TO_UPDATE = [
    'sef.js', // Bu dosyanın adı
    'gitbot3.js',
    'gitbot4.js',
    'gitbot5.js',
    'baslat1.bat',
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
        // Yeni süreç başlattık ve mevcut süreci sonlandırdık. detached: true kaldırıldı.
        spawn(process.execPath, [__filename], {
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

    // AFK Botlarının listesi
    const bots = [
        { name: 'AFK3', file: 'gitbot3.js' },
        { name: 'AFK4', file: 'gitbot4.js' },
        { name: 'AFK5', file: 'gitbot5.js' }
    ];

    for (const b of bots) {
        if (!fs.existsSync(b.file)) {
            console.log(`⚠️  ${b.file} bulunamadı, atlanıyor.`);
            continue;
        }
        const proc = spawn('node', [b.file]);
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

            // Genel bot log çıktısı
            if (line.includes('KICK')) {
                console.log(`⚠️ [${src}] Sunucudan atıldı!`);
            } else {
                // Diğer logları görmek isterseniz bu yorumu kaldırın:
                // console.log(`[${src}] ${line}`); 
            }
        }
    }
    
    // --- 1 SAATLİK PLANLI RESTART FONKSİYONUNU ÇAĞIR ---
    scheduleHourlyRestart();
}


// ========================================================================
// ====================== PLANLI RESTART MEKANİZMASI ======================

function scheduleHourlyRestart() {
    // 1 saat = 3600000 milisaniye
    const ONE_HOUR = 3600000; 
    
    // İlk restart'ı bir saat sonrasına ayarla ve her saat tekrar et
    setInterval(() => {
        console.log('\n--- 🔄 [TOOL] Planlı 1 saatlik restart başlatılıyor... ---');
        
        // Kendi kendini yeniden başlatma mantığı:
        // Mevcut Node.js çalıştırıcısını (process.execPath) bu dosya (__filename) ile yeniden çalıştır.
        // `stdio: 'inherit'` ayarı ile terminal akışını korur.
        spawn(process.execPath, [__filename], {
            stdio: 'inherit',
            detached: false // Önemli: Yeni bir pencere açmasını engeller
        });

        // Yeni süreç başladıktan hemen sonra mevcut süreci sonlandır.
        process.exit(0); 

    }, ONE_HOUR);

    console.log(`[TOOL] Otomatik restart her 1 saatte bir (${ONE_HOUR / 1000 / 60} dakikada bir) başarıyla planlandı.`);
}
