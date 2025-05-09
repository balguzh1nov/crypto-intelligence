// Скрипт для настройки React-фронтенда
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Основные директории
const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'frontend');

console.log('Настройка React-фронтенда для CryptoIntelligence...');

// Проверка существования директории
if (!fs.existsSync(frontendDir)) {
  console.log('Создание директории frontend...');
  fs.mkdirSync(frontendDir);
}

// Проверка наличия package.json в frontend папке
const frontendPackageJsonPath = path.join(frontendDir, 'package.json');
if (!fs.existsSync(frontendPackageJsonPath)) {
  console.log('Инициализация нового React-проекта...');
  
  try {
    // Создание package.json для React-проекта
    const packageJson = {
      "name": "crypto-intelligence-frontend",
      "version": "0.1.0",
      "private": true,
      "dependencies": {
        "@testing-library/jest-dom": "^5.16.5",
        "@testing-library/react": "^13.4.0",
        "@testing-library/user-event": "^13.5.0",
        "chart.js": "^4.3.0",
        "chartjs-adapter-date-fns": "^3.0.0",
        "date-fns": "^2.30.0",
        "react": "^18.2.0",
        "react-chartjs-2": "^5.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.11.2",
        "react-scripts": "5.0.1",
        "web-vitals": "^2.1.4"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      },
      "eslintConfig": {
        "extends": [
          "react-app",
          "react-app/jest"
        ]
      },
      "browserslist": {
        "production": [
          ">0.2%",
          "not dead",
          "not op_mini all"
        ],
        "development": [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
      },
      "proxy": "http://localhost:3001"
    };
    
    fs.writeFileSync(frontendPackageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✓ package.json создан');
    
    // Создание public директории
    const publicDir = path.join(frontendDir, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
      
      // Создание index.html
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="CryptoIntelligence - Real-time cryptocurrency analytics"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>CryptoIntelligence</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
      
      fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
      
      // Создание manifest.json
      const manifestJson = {
        "short_name": "CryptoIntelligence",
        "name": "CryptoIntelligence - Real-time cryptocurrency analytics",
        "icons": [
          {
            "src": "favicon.ico",
            "sizes": "64x64 32x32 24x24 16x16",
            "type": "image/x-icon"
          }
        ],
        "start_url": ".",
        "display": "standalone",
        "theme_color": "#000000",
        "background_color": "#ffffff"
      };
      
      fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2));
      
      // Создание простого favicon
      const faviconBuffer = Buffer.from(
        'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==',
        'base64'
      );
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconBuffer);
      
      console.log('✓ Директория public создана');
    }
  } catch (error) {
    console.error('Ошибка при создании package.json:', error);
  }
}

// Обновление конфигурации сервера
console.log('Обновление конфигурации сервера...');
const serverPath = path.join(rootDir, 'backend', 'server.js');
if (fs.existsSync(serverPath)) {
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Меняем пути для статических файлов на React-билд
  if (!serverContent.includes('express.static(path.join(__dirname, \'../frontend/build\'))')) {
    serverContent = serverContent.replace(
      "express.static(path.join(__dirname, '../frontend/public'))",
      "express.static(path.join(__dirname, '../frontend/build'))"
    );
    
    serverContent = serverContent.replace(
      "res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'))",
      "res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'))"
    );
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✓ Конфигурация сервера обновлена');
  } else {
    console.log('✓ Конфигурация сервера уже настроена правильно');
  }
}

// Проверка и создание директорий для структуры React-приложения
console.log('Создание структуры проекта React...');

const createDirIfNotExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Создана директория: ${path.relative(rootDir, dirPath)}`);
  }
};

// Создаем основные директории
const srcDir = path.join(frontendDir, 'src');
createDirIfNotExists(srcDir);
createDirIfNotExists(path.join(srcDir, 'components'));
createDirIfNotExists(path.join(srcDir, 'components', 'common'));
createDirIfNotExists(path.join(srcDir, 'components', 'Dashboard'));
createDirIfNotExists(path.join(srcDir, 'components', 'CryptoDetail'));
createDirIfNotExists(path.join(srcDir, 'components', 'Alerts'));
createDirIfNotExists(path.join(srcDir, 'context'));
createDirIfNotExists(path.join(srcDir, 'services'));
createDirIfNotExists(path.join(srcDir, 'utils'));

console.log('✓ Структура проекта React создана');

// Проверка наличия .env файла
const envPath = path.join(frontendDir, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Создание .env файла...');
  const envContent = 'PORT=3000\nREACT_APP_API_URL=http://localhost:3001\nPROXY=http://localhost:3001';
  fs.writeFileSync(envPath, envContent);
  console.log('✓ .env файл создан');
}

console.log('\nНастройка React-фронтенда завершена!');
console.log('\nДля установки зависимостей выполните:');
console.log('cd frontend && npm install');
console.log('\nДля запуска фронтенда в режиме разработки:');
console.log('cd frontend && npm start');
console.log('\nДля сборки фронтенда:');
console.log('cd frontend && npm run build');