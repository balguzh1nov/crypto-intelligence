/**
 * Настройка WebSocket для приложения CryptoIntelligence
 */
const WebSocket = require('ws');
const config = require('../config');

// Подключение сервисов
const coinGeckoService = require('../services/coingecko');
const technicalAnalysis = require('../services/technicalAnalysis');
const correlationAnalysis = require('../services/correlationAnalysis');
const alertService = require('../services/alertService');

/**
 * Настройка WebSocket сервера
 * @param {Object} server HTTP сервер
 * @returns {Object} WebSocket сервер
 */
function setupWebSocket(server) {
  // Создаем WebSocket сервер
  const wss = new WebSocket.Server({
    server,
    path: config.websocket.path
  });
  
  // Обработка новых подключений
  wss.on('connection', handleConnection);
  
  return wss;
}

/**
 * Обработка нового WebSocket подключения
 * @param {Object} ws WebSocket соединение
 * @param {Object} req HTTP запрос
 */
function handleConnection(ws, req) {
  console.log(`Новое WebSocket подключение: ${req.socket.remoteAddress}`);
  
  // Ограничение количества клиентов
  if (this.clients.size > config.websocket.clientsLimit) {
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
}

/**
 * Отправка начальных данных клиенту
 * @param {Object} ws WebSocket соединение
 */
async function sendInitialData(ws) {
  try {
    // Получение кэшированных данных о рынке
    const marketData = coinGeckoService.getCachedData();
    
    // Отправка данных клиенту
    if (marketData && marketData.marketData) {
      ws.send(JSON.stringify({
        type: 'initialData',
        data: {
          marketData: marketData.marketData,
          lastUpdated: marketData.lastUpdated
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

/**
 * Отправка сообщения всем подключенным клиентам
 * @param {Object} wss WebSocket сервер
 * @param {Object} message Сообщение для отправки
 */
function broadcastToClients(wss, message) {
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcastToClients
};