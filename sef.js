// === ŞEF TOOL (ping tabanlı lisans kontrol) ===
const readline = require('readline');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

// === Lisans yapılandırması ===
const LICENSE_KEY = 'emo5869';
const LICENSE_URL = 'https://github.com/Powerss1/licance/blob/main/emo5869.txt';
// örnek: https://raw.githubusercontent.com/emo5869/LunaLicense/main/emo5869.txt

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ---- Lisans sor ----
rl.question('🔐 Lisans şifresini giriniz: ', async (answer) => {
  if (answer.trim() !== LICENSE_KEY) {
    console.log('❌ Yanlış lisans şifresi, Tool kapatılıyor...');
    process.exit(0);
  }

  console.log('🌐 GitHub üzerinde lisans dosyası kontrol ediliyor...');
  const exists = await pingGitHubFile();

  if (!exists) {
    console.log('❌ Lisans dosyası bulunamadı. Tool çalışmayacak.');
    process.exit(0);
  }

  console.log('✅ Lisans doğrulandı, Tool başlatılıyor...\n');
  rl.close();
  startTool();
});

// ---- GitHub dosyasını yalnızca pingler (HEAD isteği) ----
function pingGitHubFile() {
  return new Promise((resolve) => {
    const req = https.request(LICENSE_URL, { method: 'HEAD' }, res => {
      if (res.statusCode === 200) resolve(true);
      else resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// ========================================================================
// ====================== TOOL ANA KISIM BURADAN BAŞLAR ====================
function startTool() {
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

  const bots = [
    { name: 'Farm', file: 'bot.js' },
    { name: 'AFK', file: 'gitbot.js' }
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
          console.log('⚠️ [Farm] Sunucudan atıldı! 10 s sonra yeniden başlatılıyor...');
          restartFarm();
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