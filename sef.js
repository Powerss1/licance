// =================================================================
// ========== POWERSS COMMAND CENTER - AUTO UPDATE & PM2 EDITION ===
// =================================================================

const readline = require('readline');
const { spawn, execSync, exec } = require('child_process'); // exec eklendi
const fs = require('fs');
const https = require('https');

// === OTOMATİK MODÜL KONTROL FONKSİYONU ===
function checkAndInstallModules() {
    // PM2'yi de listeye ekledik, ancak PM2 genelde global kurulmalıdır.
    const REQUIRED_MODULES = ['mineflayer', 'node-telegram-bot-api', 'mineflayer-pathfinder'];
    let missing = [];

    // 1. Standart Modül Kontrolü
    for (const mod of REQUIRED_MODULES) {
        try {
            require.resolve(mod);
        } catch (e) {
            missing.push(mod);
        }
    }

    // 2. PM2 Global Kontrolü (Özel Kontrol)
    let pm2Missing = false;
    try {
        execSync('pm2 -v', { stdio: 'ignore' });
    } catch (e) {
        pm2Missing = true;
        console.log("\x1b[93m[!] PM2 Process Manager bulunamadı, listeye ekleniyor...\x1b[0m");
    }

    // Eksik varsa yükle
    if (missing.length > 0 || pm2Missing) {
        console.log(`\n\x1b[93m[!] Eksik modüller tamamlanıyor...\x1b[0m`);
        console.log("\x1b[94m[*] Otomatik kurulum yapılıyor, lütfen bekleyin...\x1b[0m");
        
        try {
            // Normal modüller
            if (missing.length > 0) {
                execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
            }
            // PM2 Global Kurulumu
            if (pm2Missing) {
                console.log("\x1b[94m[*] PM2 Global olarak kuruluyor...\x1b[0m");
                execSync('npm install pm2 -g', { stdio: 'inherit' });
            }
            console.log("\x1b[92m[+] Tüm kurulumlar tamamlandı!\x1b[0m\n");
        } catch (err) {
            console.log("\x1b[91m[-] Yükleme başarısız. Lütfen internetinizi kontrol edin veya yönetici olarak çalıştırın.\x1b[0m");
            process.exit(1);
        }
    }
}

// === AYARLAR ===
const CONFIG = {
    licenseKey: 'emo5869', 
    repoOwner: 'Powerss1',
    repoName: 'licance',
    branch: 'main',       
    secretFileName: 'secret.txt', 
    refreshRate: 500, // Render hızı PM2 modunda biraz düşürülebilir
    
    // Güncellenecek Dosyalar
    filesToUpdate: ['sef.js', 'bot.js', 'telegrambot.js', 'package.json']     
};

// === MANUEL BOT LİSTESİ ===
const bots = [
    { id: 'bot1', file: 'bot.js', name: 'Bot 1', status: 'OFFLINE', money: '0' },
    { id: 'bot2', file: 'bot2.js', name: 'Bot 2', status: 'OFFLINE', money: '0' },
    { id: 'bot3', file: 'bot3.js', name: 'Bot 3', status: 'OFFLINE', money: '0' }
];

// === GLOBAL DEĞİŞKENLER ===
const systemLogs = [];
let animationTick = 0;
let isRunning = true;
let activeMode = 'FARM'; // Varsayılan mod

// === GHOST TEMA MOTORU ===
function greyGradient(text, offset = 0) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const wave = Math.sin((i + offset) * 0.15); 
        const brightness = Math.floor(180 + (wave * 75)); 
        result += `\x1b[38;2;${brightness};${brightness};${brightness}m${text[i]}`;
    }
    return result + '\x1b[0m';
}

const cursorTo = (x, y) => process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
const clearScreen = () => process.stdout.write('\x1Bc');

// ================= GÜNCELLEME SİSTEMİ =================

function fetchString(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.trim()));
        }).on('error', () => resolve(null));
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(true));
            });
        }).on('error', () => {
            fs.unlink(dest, () => resolve(false)); 
        });
    });
}

async function checkForUpdates() {
    console.log(greyGradient("\n    📡 Güncellemeler Denetleniyor...", 0));

    if (!fs.existsSync('version.txt')) fs.writeFileSync('version.txt', '1.0');
    let localVer = parseFloat(fs.readFileSync('version.txt', 'utf8'));
    if (isNaN(localVer)) localVer = 1.0;

    const versionUrl = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/${CONFIG.branch}/version.txt`;
    const remoteVerStr = await fetchString(versionUrl);
    
    if (!remoteVerStr) {
        console.log("    ⚠️ Sunucuya erişilemedi, güncelleme atlanıyor.");
        return;
    }

    const remoteVer = parseFloat(remoteVerStr);

    if (remoteVer > localVer) {
        console.log(greyGradient(`    ⬇️ YENİ SÜRÜM BULUNDU: v${remoteVer} (Mevcut: v${localVer})`, 5));
        console.log("    Dosyalar indiriliyor, lütfen bekleyin...");

        for (const file of CONFIG.filesToUpdate) {
            const fileUrl = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/${CONFIG.branch}/${file}`;
            process.stdout.write(`    > ${file} indiriliyor... `);
            const success = await downloadFile(fileUrl, file);
            if (success) console.log("✅");
            else console.log("❌");
        }

        fs.writeFileSync('version.txt', remoteVer.toString());
        
        console.log("\n    ✅ GÜNCELLEME TAMAMLANDI! Tool yeniden başlatılıyor...");
        await new Promise(r => setTimeout(r, 2000));

        spawn(process.argv[0], process.argv.slice(1), { stdio: 'inherit' }).unref();
        process.exit();
    } else {
        console.log(greyGradient(`    ✅ SİSTEM GÜNCEL (v${localVer})`, 10));
        await new Promise(r => setTimeout(r, 1000));
    }
}

// ================= GITHUB LİSANS DOSYA KONTROLÜ =================
function checkSecretFile() {
    return new Promise((resolve) => {
        const url = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/${CONFIG.branch}/${CONFIG.secretFileName}`;
        https.get(url, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => resolve(false));
    });
}

// ================= GÖSTERGE PANELİ =================
function renderDashboard() {
    if (!isRunning) return;
    animationTick += 1;
    cursorTo(0, 0); 

    // TELEGRAM MODU İÇİN GUI
    if (activeMode === 'TELEGRAM') {
        const width = 84;
        const border = "═".repeat(width - 2);
        process.stdout.write(greyGradient(`╔${border}╗\n`, animationTick));
        process.stdout.write(greyGradient(`║` + " ".repeat(28) + "TELEGRAM COMMAND CENTER" + " ".repeat(29) + ` ║\n`, -animationTick));
        process.stdout.write(greyGradient(`║` + " ".repeat(32) + "(PM2 MANAGED)" + " ".repeat(37) + ` ║\n`, -animationTick));
        process.stdout.write(greyGradient(`╠${border}╣\n`, animationTick));
        
        const logsToShow = systemLogs.slice(-11);
        logsToShow.forEach(log => {
             process.stdout.write(`  ${log}\x1b[K\n`);
        });
        for(let i=0; i < 11 - logsToShow.length; i++) process.stdout.write("\x1b[K\n");
        process.stdout.write(greyGradient(`╚${border}╝`, animationTick));
        return;
    }

    // FARM MODU
    const width = 84;
    const border = "═".repeat(width - 2);
    
    // 1. HEADER
    process.stdout.write(greyGradient(`╔${border}╗\n`, animationTick));
    const title = " POWERSS GHOST NETWORK ";
    const padT = Math.floor((width - title.length) / 2) - 1;
    const titleLine = `║${" ".repeat(padT)}${title}${" ".repeat(padT + (title.length % 2 === 0 ? 0 : 1))}║`;
    process.stdout.write(greyGradient(titleLine + "\n", -animationTick));
    process.stdout.write(greyGradient(`╠${border}╣\n`, animationTick));

    // 2. BOT GRID
    let displayOrder = [];
    const activeBots = bots.filter(b => fs.existsSync(b.file));

    if (activeBots.length >= 3) {
        const b1 = activeBots.find(b => b.id === 'bot1');
        const b2 = activeBots.find(b => b.id === 'bot2');
        const b3 = activeBots.find(b => b.id === 'bot3');
        if(b3) displayOrder.push(b3);
        if(b1) displayOrder.push(b1);
        if(b2) displayOrder.push(b2);
    } else {
        displayOrder = activeBots;
    }

    const topBots = displayOrder.slice(0, 3);
    const boxWidth = 26; 
    let line1 = "", line2 = "", line3 = "", line4 = "", line5 = "";
    
    let leftMargin = "";
    if (topBots.length === 1) leftMargin = " ".repeat(29);
    if (topBots.length === 2) leftMargin = " ".repeat(15);
    if (topBots.length === 3) leftMargin = " "; 
    
    topBots.forEach((bot, idx) => {
        const tick = animationTick + (idx * 5);
        const statusIcon = bot.status === 'AKTİF' ? '●' : (bot.status === 'OFFLINE' ? '○' : '◌');
        const tBorder = "═".repeat(boxWidth - 2);
        
        line1 += greyGradient(`╔${tBorder}╗  `, tick);
        
        const namePad = Math.floor((boxWidth - 2 - bot.name.length) / 2);
        const nameContent = " ".repeat(namePad) + bot.name + " ".repeat(boxWidth - 2 - namePad - bot.name.length);
        line2 += greyGradient(`║${nameContent}║  `, tick);
        
        const statusTxt = `${statusIcon} ${bot.status}`;
        const stPad = Math.floor((boxWidth - 2 - statusTxt.length) / 2); 
        const stColor = bot.status === 'AKTİF' ? '\x1b[37m' : '\x1b[90m'; 
        const stContent = " ".repeat(stPad) + stColor + statusTxt + "\x1b[0m" + " ".repeat(boxWidth - 2 - statusTxt.length - stPad);
        line3 += greyGradient("║", tick) + stContent + greyGradient("║  ", tick); 
        
        const moneyTxt = `₺${bot.money}`;
        const mnPad = Math.floor((boxWidth - 2 - moneyTxt.length) / 2);
        const mnContent = " ".repeat(mnPad) + `\x1b[37m${moneyTxt}\x1b[0m` + " ".repeat(boxWidth - 2 - moneyTxt.length - mnPad);
        line4 += greyGradient("║", tick) + mnContent + greyGradient("║  ", tick);

        line5 += greyGradient(`╚${tBorder}╝  `, tick);
    });

    process.stdout.write("\n" + leftMargin + line1 + "\n");
    process.stdout.write(leftMargin + line2 + "\n");
    process.stdout.write(leftMargin + line3 + "\n");
    process.stdout.write(leftMargin + line4 + "\n");
    process.stdout.write(leftMargin + line5 + "\n\n");

    // 3. LOG PANELİ
    process.stdout.write(greyGradient(`╠${border}╣\n`, animationTick));
    process.stdout.write("\x1b[90m  [SİSTEM LOGLARI]\x1b[0m\n"); 
    
    const maxLogs = 5;
    const logsToShow = systemLogs.slice(-maxLogs);
    logsToShow.forEach(log => {
        process.stdout.write(`  > ${log}\x1b[K\n`);
    });
    for(let i=0; i < maxLogs - logsToShow.length; i++) process.stdout.write("\x1b[K\n");

    process.stdout.write(greyGradient(`╚${border}╝`, animationTick));
    process.stdout.write("\n\x1b[J"); 
}

function addLog(botName, text) {
    const time = new Date().toLocaleTimeString('tr-TR');
    const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!cleanText) return;
    const logLine = `\x1b[90m${time}\x1b[0m \x1b[36m[${botName}]\x1b[0m \x1b[37m${cleanText}\x1b[0m`;
    systemLogs.push(logLine);
    if (systemLogs.length > 20) systemLogs.shift();
}

// ================= BOT YÖNETİMİ =================
function startAllBots() {
    checkAndInstallModules(); // PM2 kontrolü burada yapılır

    // ---------------------------------------------------------
    // TELEGRAM MODU (PM2 ENTEGRASYONU)
    // ---------------------------------------------------------
    if (activeMode === 'TELEGRAM') {
        if (!fs.existsSync('telegrambot.js')) {
            addLog("HATA", "telegrambot.js dosyası bulunamadı!");
            return;
        }

        addLog("PM2", "Eski süreçler temizleniyor...");
        try { execSync('pm2 delete AthenaxBot', { stdio: 'ignore' }); } catch(e) {}

        addLog("PM2", "Bot Başlatılıyor...");
        
        // PM2 BAŞLATMA KOMUTU
        const command = `pm2 start telegrambot.js --name "AthenaxBot" --max-memory-restart 500M`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                addLog("PM2 HATA", error.message);
                return;
            }
            addLog("SİSTEM", "✅ Bot PM2 ile başarıyla başlatıldı!");
            addLog("BİLGİ", "Logları görmek için terminale şunu yazın:");
            addLog("KOMUT", "pm2 logs AthenaxBot");
            addLog("BİLGİ", "Bu panel açık kalabilir veya kapatabilirsiniz.");
        });

        // Bu modda spawn kullanmıyoruz, logları stdout'tan okumuyoruz
        // çünkü PM2 arka planda çalışıyor.
        return;
    }

    // FARM MODU (ORİJİNAL)
    bots.forEach(bot => {
        if (!fs.existsSync(bot.file)) return; 
        if (bot.process) return; 

        bot.status = 'BAŞLATILIYOR';
        const proc = spawn('node', [bot.file]);
        bot.process = proc;

        let dataBuffer = "";

        proc.stdout.on('data', (d) => {
            dataBuffer += d.toString();
            const lines = dataBuffer.split('\n');
            dataBuffer = lines.pop();

            lines.forEach(line => {
                const txt = line.trim();
                if (!txt) return;

                if (txt.includes('giriş yaptı') || txt.includes('Farm Başladı')) bot.status = 'AKTİF';
                
                if (txt.includes('[KAZANÇ]')) {
                    const moneyMatch = txt.match(/([0-9,.]+)k?/);
                    if(moneyMatch) bot.money = moneyMatch[0];
                }

                if (txt.includes('HATA') || txt.includes('KAZANÇ') || txt.includes('TRANSFER')) {
                     const cleanLog = txt.replace(/\[.*?\]/g, '').trim(); 
                     addLog(bot.name, cleanLog);
                }
            });
        });

        proc.on('close', () => {
            bot.status = 'OFFLINE';
            bot.process = null;
            addLog(bot.name, "Kapandı. Yeniden başlatılıyor...");
            setTimeout(() => startAllBots(), 5000);
        });
    });
}

// ================= GİRİŞ EKRANI =================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function showLoginScreen() {
    clearScreen();
    console.log("\n\n");
    console.log(greyGradient("    ██████╗  ██████╗ ██╗    ██╗███████╗██████╗ ███████╗███████╗", 0));
    console.log(greyGradient("    ██╔══██╗██╔═══██╗██║    ██║██╔════╝██╔══██╗██╔════╝██╔════╝", 5));
    console.log(greyGradient("    ██████╔╝██║   ██║██║ █╗ ██║█████╗  ██████╔╝███████╗███████╗", 10));
    console.log(greyGradient("    ██╔═══╝ ██║   ██║██║███╗██║██╔══╝  ██╔══██╗╚════██║╚════██║", 15));
    console.log(greyGradient("    ██║     ╚██████╔╝╚███╔███╔╝███████╗██║  ██║███████║███████║", 20));
    console.log(greyGradient("    ╚═╝      ╚═════╝  ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝", 25));
    console.log("\n");
    
    rl.question(greyGradient(' LİSANS ANAHTARI: ', 0), async (key) => {
        if (key.trim() !== CONFIG.licenseKey) {
            console.log("\n    ❌ Hatalı Anahtar!");
            process.exit(0);
        }
        
        console.log("\n    ✅ Giriş Başarılı!");

        // 1. GÜNCELLEME KONTROLÜ
        await checkForUpdates();
        
        console.log("\n    🔄 Sunucu lisans dosyası kontrol ediliyor...");
        
        // 2. SECRET DOSYA KONTROLÜ
        const isSecretExists = await checkSecretFile();
        if (!isSecretExists) {
            console.log("\n    ❌ HATA: Lisans doğrulanamadı!");
            process.exit(1);
        }

        clearScreen();
        console.log(greyGradient("\n    ┌─ SİSTEM YÖNETİCİSİ ─────────────────────────────┐"));
        console.log(greyGradient("    │ [1] FARM BOTLARINI BAŞLAT (Orijinal Mod)        │"));
        console.log(greyGradient("    │ [2] TELEGRAM BOTUNU BAŞLAT (PM2 Korumalı Mod)   │"));
        console.log(greyGradient("    └─────────────────────────────────────────────────┘"));

        rl.question(greyGradient('\n    [>] SEÇİMİNİZ : '), (choice) => {
            if (choice === '2') activeMode = 'TELEGRAM';
            else activeMode = 'FARM';
            
            rl.close();
            clearScreen();
            setInterval(renderDashboard, CONFIG.refreshRate);
            startAllBots();
        });
    });
}

showLoginScreen();
process.on('exit', () => {
    // Farm modundaysa normal botları öldür, PM2 modundaysa PM2'ye dokunma!
    if (activeMode !== 'TELEGRAM') {
        bots.forEach(b => b.process && b.process.kill());
    }
});
