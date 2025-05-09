// Файл: setup-frontend-rus.js
const fs = require('fs');
const path = require('path');

// Создаем директории, если их нет
console.log('Создание директорий для фронтенда...');
const frontendDir = path.join(__dirname, 'frontend');
const publicDir = path.join(frontendDir, 'public');

if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir);
  console.log('Создана директория: frontend');
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
  console.log('Создана директория: frontend/public');
}

// Записываем HTML-файл
console.log('Создание HTML-файла...');
const htmlContent = fs.readFileSync(path.join(__dirname, 'frontend-ru.html'), 'utf8');
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

// Модифицируем server.js для обслуживания статических файлов
console.log('Обновление конфигурации сервера...');
const serverPath = path.join(__dirname, 'backend', 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Проверяем, нужно ли обновлять код
if (!serverContent.includes('express.static(path.join(__dirname, \'../frontend/public\'))')) {
  serverContent = serverContent.replace(
    "app.use(express.static(path.join(__dirname, '../frontend/build')));",
    "app.use(express.static(path.join(__dirname, '../frontend/public')));"
  );
  
  serverContent = serverContent.replace(
    "res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));",
    "res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));"
  );
  
  fs.writeFileSync(serverPath, serverContent);
  console.log('Конфигурация сервера обновлена');
} else {
  console.log('Конфигурация сервера уже обновлена');
}

// Обновление конфигурации для снижения частоты запросов к API
console.log('Обновление настроек API...');
const configPath = path.join(__dirname, 'backend', 'config.js');

if (fs.existsSync(configPath)) {
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Изменяем настройки CoinGecko
  configContent = configContent.replace(
    /fetchInterval: \d+/,
    'fetchInterval: 60000' // 1 минута вместо 30 секунд
  );
  
  configContent = configContent.replace(
    /detailedFetchInterval: \d+/,
    'detailedFetchInterval: 600000' // 10 минут вместо 5
  );
  
  configContent = configContent.replace(
    /cryptoCount: \d+/,
    'cryptoCount: 20' // Уменьшаем количество криптовалют
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('Настройки API обновлены');
} else {
  console.log('Файл конфигурации не найден');
}

// Обновление БД для создания таблицы alerts, если её нет
console.log('Проверка схемы базы данных...');
const dbPath = path.join(__dirname, 'backend', 'database', 'db.js');
let dbContent = fs.readFileSync(dbPath, 'utf8');

if (!dbContent.includes('CREATE TABLE IF NOT EXISTS alerts')) {
  // Найдем место, где создаются таблицы
  const tableCreationRegex = /const queries = \[([\s\S]*?)\];/;
  const match = dbContent.match(tableCreationRegex);
  
  if (match) {
    const tableCreations = match[1];
    const updatedTableCreations = tableCreations + `,
      // Таблица для хранения оповещений
      \`CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        old_value REAL,
        new_value REAL,
        percentage_change REAL,
        message TEXT,
        severity TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies (id)
      )\``;
    
    dbContent = dbContent.replace(tableCreationRegex, `const queries = [${updatedTableCreations}];`);
    fs.writeFileSync(dbPath, dbContent);
    console.log('Схема базы данных обновлена: добавлена таблица alerts');
  } else {
    console.log('Не удалось найти место для добавления таблицы alerts');
  }
} else {
  console.log('Таблица alerts уже существует в схеме базы данных');
}

// Создание favicon.ico
console.log('Создание иконки сайта...');
const defaultFaviconPath = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(defaultFaviconPath)) {
  // Создаем простой 1x1 пиксель прозрачный ico файл
  const emptyIcon = Buffer.from('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==', 'base64');
  fs.writeFileSync(defaultFaviconPath, emptyIcon);
  console.log('Создан файл favicon.ico');
}

console.log('Настройка фронтенда завершена. Перезапустите сервер, чтобы применить изменения.');