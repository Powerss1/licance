// =================================================================
// ========== POWERSS COMMAND CENTER - FINAL FIXED EDITION =========
// =================================================================

const readline = require('readline');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

// === AYARLAR ===
const CONFIG = {
    licenseKey: 'emo5869', 
    repoOwner: 'Powerss1',
    repoName: 'licance',
    branch: 'main',       
    secretFileName: 'secret.txt', 
    refreshRate: 100,     
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

// ================= GITHUB KONTROL =================
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
        // Satır sonunu temizle (\x1b[K) ki eski yazılar kalmasın
        process.stdout.write(`  > ${log}\x1b[K\n`);
    });
    for(let i=0; i < maxLogs - logsToShow.length; i++) process.stdout.write("\x1b[K\n");

    process.stdout.write(greyGradient(`╚${border}╝`, animationTick));
    
    // Alt kısmı temizle (Taşan yazıları silmek için)
    process.stdout.write("\n\x1b[J"); 
}

function addLog(botName, text) {
    const time = new Date().toLocaleTimeString('tr-TR');
    // Renk kodlarını ve gereksiz boşlukları temizle
    const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!cleanText) return;

    // Log formatı
    const logLine = `\x1b[90m${time}\x1b[0m \x1b[36m[${botName}]\x1b[0m \x1b[37m${cleanText}\x1b[0m`;
    systemLogs.push(logLine);
    if (systemLogs.length > 20) systemLogs.shift();
}

// ================= BOT YÖNETİMİ (BUFFER FIX) =================
function startAllBots() {
    bots.forEach(bot => {
        if (!fs.existsSync(bot.file)) return; 
        if (bot.process) return; 

        bot.status = 'BAŞLATILIYOR';
        const proc = spawn('node', [bot.file]);
        bot.process = proc;

        // VERİ PARÇALAMA (BUFFER FIX)
        // Gelen veriyi biriktirip satır satır işleyeceğiz
        let dataBuffer = "";

        proc.stdout.on('data', (d) => {
            dataBuffer += d.toString();
            
            // Satır sonlarına göre böl
            const lines = dataBuffer.split('\n');
            
            // Son parça yarım kalmış olabilir, onu buffera geri at
            dataBuffer = lines.pop();

            lines.forEach(line => {
                const txt = line.trim();
                if (!txt) return;

                if (txt.includes('giriş yaptı') || txt.includes('Farm Başladı')) bot.status = 'AKTİF';
                
                if (txt.includes('[KAZANÇ]')) {
                    const moneyMatch = txt.match(/([0-9,.]+)k?/);
                    if(moneyMatch) bot.money = moneyMatch[0];
                }

                // Sadece önemli mesajları loga ekle
                if (txt.includes('HATA') || txt.includes('KAZANÇ') || txt.includes('TRANSFER')) {
                     // Ham metni temizleyip gönderiyoruz
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
    
    rl.question(greyGradient('LİSANS ANAHTARI: ', 0), async (key) => {
        if (key.trim() !== CONFIG.licenseKey) {
            console.log("\n    ❌ Hatalı Anahtar!");
            process.exit(0);
        }
        
        console.log("\n    ✅ Giriş Başarılı! Sunucu kontrol ediliyor...");
        
        const isSecretExists = await checkSecretFile();
        if (!isSecretExists) {
            console.log("\n    ❌ HATA: Lisans doğrulanamadı!");
            process.exit(1);
        }

        setTimeout(() => {
            rl.close();
            clearScreen();
            setInterval(renderDashboard, CONFIG.refreshRate);
            startAllBots();
        }, 1500);
    });
}

showLoginScreen();

process.on('exit', () => bots.forEach(b => b.process && b.process.kill()));

