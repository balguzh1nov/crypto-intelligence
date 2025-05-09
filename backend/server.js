/**
 * Основной файл сервера приложения CryptoIntelligence
 */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// Инициализация базы данных
const db = require('./database/db');

// Инициализация сервисов
const coinGeckoService = require('./services/coingecko');
const dataProcessor = require('./services/dataProcessor');
const technicalAnalysis = require('./services/technicalAnalysis');
const correlationAnalysis = require('./services/correlationAnalysis');
const alertService = require('./services/alertService');

// Инициализация API маршрутов
const apiRoutes = require('./routes/api');

// Создаем экземпляр приложения Express
const app = express();

// Настройка приложения
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка статических файлов
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Использование маршрутов API
app.use('/api', apiRoutes);

// Маршрут для обслуживания React приложения
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Создаем HTTP сервер
const server = http.createServer(app);

// Создаем WebSocket сервер
const wss = new WebSocket.Server({
  server,
  path: config.websocket.path
});

// Инициализация системы
async function initializeSystem() {
  try {
    console.log('Инициализация системы...');
    
    // Инициализация базы данных
    await db.init();
    console.log('База данных инициализирована');
    
    // Настройка обработчиков событий для сервисов
    setupEventHandlers();
    
    // Запуск получения данных
    await coinGeckoService.startFetching();
    console.log('Получение данных запущено');
    
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации системы:', error);
    return false;
  }
}

// Настройка обработчиков событий для сервисов
function setupEventHandlers() {
  // Обработка обновлений данных о рынке
  coinGeckoService.on('marketDataUpdated', async (marketData) => {
    // Обработка полученных данных
    const processingResult = await dataProcessor.processMarketData(marketData);
    
    // Отправка обновлений клиентам через WebSocket
    broadcastToClients({
      type: 'marketUpdate',
      data: marketData,
      timestamp: new Date().toISOString()
    });
    
    // Запуск технического анализа для топ-10 криптовалют
    if (marketData && marketData.length > 0) {
      const top10Cryptos = marketData.slice(0, 10);
      
      for (const crypto of top10Cryptos) {
        try {
          // Расчет технических индикаторов
          const indicators = await technicalAnalysis.calculateIndicators(crypto.id);
          
          // Интерпретация индикаторов
          const interpretation = technicalAnalysis.interpretIndicators(indicators);
          
          // Обработка технических индикаторов для создания оповещений
          await alertService.processIndicators(crypto.id, indicators, interpretation);
          
          // Отправка обновлений о технических индикаторах клиентам
          broadcastToClients({
            type: 'technicalIndicatorsUpdate',
            cryptoId: crypto.id,
            data: { indicators, interpretation },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Ошибка при анализе технических индикаторов для ${crypto.id}:`, error);
        }
      }
      
      // Расчет корреляций между топ-10 криптовалютами раз в час
      const currentHour = new Date().getHours();
      const cryptoIds = top10Cryptos.map(crypto => crypto.id);
      
      if (currentHour % 1 === 0) {
        try {
          const correlations = await correlationAnalysis.calculateCorrelations(cryptoIds);
          
          // Отправка обновлений о корреляциях клиентам
          broadcastToClients({
            type: 'correlationsUpdate',
            data: correlations,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Ошибка при расчете корреляций:', error);
        }
      }
    }
  });
  
  // Обработка обнаруженных аномалий
  dataProcessor.on('anomalyDetected', async (anomalies) => {
    // Обработка аномалий и создание оповещений
    const alerts = await alertService.processAnomalies(anomalies);
    
    // Отправка оповещений клиентам
    if (alerts && alerts.length > 0) {
      broadcastToClients({
        type: 'newAlerts',
        data: alerts,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Обработка созданных оповещений
  alertService.on('alertCreated', (alert) => {
    // Дополнительная обработка оповещений может быть добавлена здесь
    console.log(`Создано оповещение: ${alert.message}`);
  });
  
  // Обработка ошибок в сервисах
  coinGeckoService.on('error', (error) => {
    console.error('Ошибка в сервисе CoinGecko:', error);
  });
  
  dataProcessor.on('error', (error) => {
    console.error('Ошибка в сервисе обработки данных:', error);
  });
  
  technicalAnalysis.on('error', (error) => {
    console.error('Ошибка в сервисе технического анализа:', error);
  });
  
  correlationAnalysis.on('error', (error) => {
    console.error('Ошибка в сервисе анализа корреляций:', error);
  });
  
  alertService.on('error', (error) => {
    console.error('Ошибка в сервисе оповещений:', error);
  });
}

// Отправка сообщения всем подключенным клиентам
function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Обработка WebSocket подключений
wss.on('connection', (ws, req) => {
  console.log(`Новое WebSocket подключение: ${req.socket.remoteAddress}`);
  
  // Ограничение количества клиентов
  if (wss.clients.size > config.websocket.clientsLimit) {
    ws.close(1013, 'Превышено максимальное количество подключений');
    console.warn(`Отклонено подключение: ${req.socket.remoteAddress} (превышен лимит)`);
    return;
  }
  
  // Отправка начальных данных клиенту
  sendInitialData(ws);
  
  // Обработка сообщений от клиента
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Обработка различных типов сообщений от клиента
      switch (data.type) {
        case 'getCryptoData':
          // Отправка данных о конкретной криптовалюте
          if (data.cryptoId) {
            try {
              const cryptoData = await coinGeckoService.getCoinData(data.cryptoId);
              
              ws.send(JSON.stringify({
                type: 'cryptoData',
                requestId: data.requestId,
                data: cryptoData,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                requestId: data.requestId,
                error: `Не удалось получить данные о криптовалюте: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
          }
          break;
          
        case 'getHistoricalData':
          // Отправка исторических данных
          if (data.cryptoId && data.days) {
            try {
              const historicalData = await coinGeckoService.getCoinMarketChart(
                data.cryptoId, 
                data.days,
                data.interval || 'daily'
              );
              
              ws.send(JSON.stringify({
                type: 'historicalData',
                requestId: data.requestId,
                data: historicalData,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                requestId: data.requestId,
                error: `Не удалось получить исторические данные: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
          }
          break;
          
        case 'getTechnicalIndicators':
          // Отправка технических индикаторов
          if (data.cryptoId) {
            try {
              const indicators = await technicalAnalysis.getLatestIndicators(data.cryptoId);
              const interpretation = technicalAnalysis.interpretIndicators(indicators);
              
              ws.send(JSON.stringify({
                type: 'technicalIndicators',
                requestId: data.requestId,
                data: { indicators, interpretation },
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                requestId: data.requestId,
                error: `Не удалось получить технические индикаторы: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
          }
          break;
          
        case 'getCorrelations':
          // Отправка корреляций
          try {
            const correlations = await correlationAnalysis.getLatestCorrelations(
              data.timeFrame || '30d',
              data.limit || 10
            );
            
            ws.send(JSON.stringify({
              type: 'correlations',
              requestId: data.requestId,
              data: correlations,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: `Не удалось получить корреляции: ${error.message}`,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'getAlerts':
          // Отправка оповещений
          try {
            const alerts = await alertService.getLatestAlerts(data.limit || 10);
            
            ws.send(JSON.stringify({
              type: 'alerts',
              requestId: data.requestId,
              data: alerts,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: `Не удалось получить оповещения: ${error.message}`,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'ping':
          // Проверка соединения
          ws.send(JSON.stringify({ 
            type: 'pong',
            timestamp: new Date().toISOString() 
          }));
          break;
          
        case 'heartbeat':
          // Просто подтверждаем, что соединение живо, без логирования
          ws.send(JSON.stringify({ 
            type: 'heartbeat_ack',
            timestamp: new Date().toISOString() 
          }));
          break;
          
        default:
          console.warn(`Получен неизвестный тип сообщения: ${data.type}`);
      }
    } catch (error) {
      console.error('Ошибка при обработке сообщения WebSocket:', error);
      
      // Отправка ошибки клиенту
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Некорректный формат сообщения',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Обработка закрытия соединения
  ws.on('close', () => {
    console.log(`WebSocket соединение закрыто: ${req.socket.remoteAddress}`);
  });
  
  // Обработка ошибок
  ws.on('error', (error) => {
    console.error(`Ошибка WebSocket: ${error.message}`);
  });
});

// Отправка начальных данных клиенту
async function sendInitialData(ws) {
  try {
    // Получение данных о рынке из кэша
    const marketData = coinGeckoService.cache?.marketData?.data || [];
    const lastUpdated = coinGeckoService.cache?.marketData?.timestamp ? new Date(coinGeckoService.cache.marketData.timestamp) : new Date();
    
    // Отправка данных клиенту
    if (marketData && marketData.length > 0) {
      ws.send(JSON.stringify({
        type: 'initialData',
        data: {
          marketData: marketData,
          lastUpdated: lastUpdated
        },
        timestamp: new Date().toISOString()
      }));
    }
    
    // Получение и отправка последних оповещений
    try {
      const latestAlerts = await alertService.getLatestAlerts(5);
      
      if (latestAlerts && latestAlerts.length > 0) {
        ws.send(JSON.stringify({
          type: 'latestAlerts',
          data: latestAlerts,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Ошибка при получении последних оповещений:', error);
    }
  } catch (error) {
    console.error('Ошибка при отправке начальных данных:', error);
  }
}

// Запуск сервера
async function startServer() {
  // Инициализация системы
  const initialized = await initializeSystem();
  
  if (!initialized) {
    console.error('Не удалось инициализировать систему. Завершение работы.');
    process.exit(1);
  }
  
  // Запуск сервера
  const port = config.server.port;
  
  server.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
    console.log(`Окружение: ${config.server.environment}`);
    console.log(`WebSocket: ws://localhost:${port}${config.websocket.path}`);
  });
}

// Обработка сигналов завершения работы
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Корректное завершение работы сервера
async function gracefulShutdown() {
  console.log('Получен сигнал завершения работы. Закрытие ресурсов...');
  
  // Остановка получения данных
  coinGeckoService.stopFetching();
  
  // Закрытие WebSocket сервера
  wss.close(() => {
    console.log('WebSocket сервер закрыт');
  });
  
  // Закрытие базы данных
  await db.close();
  
  // Создание резервной копии базы данных
  try {
    await db.backup();
  } catch (error) {
    console.error('Ошибка при создании резервной копии базы данных:', error);
  }
  
  // Закрытие HTTP сервера
  server.close(() => {
    console.log('HTTP сервер закрыт');
    process.exit(0);
  });
  
  // Принудительное завершение через 5 секунд, если сервер не закрылся корректно
  setTimeout(() => {
    console.error('Принудительное завершение работы');
    process.exit(1);
  }, 5000);
}

// Запуск сервера
if (require.main === module) {
  startServer();
}

module.exports = { app, server, wss };