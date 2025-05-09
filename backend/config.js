/**
 * Конфигурация приложения
 */
module.exports = {
    // Настройки сервера
    server: {
      port: process.env.PORT || 3001,
      environment: process.env.NODE_ENV || 'development'
    },
    
    // Настройки базы данных
    database: {
      path: process.env.DB_PATH || './backend/database/crypto.db',
      backupPath: './backend/database/backups/'
    },
    
    // Настройки CoinGecko API
    coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        fetchInterval: 60000, // Изменено с 30000 на 60000 (1 минута вместо 30 секунд)
        detailedFetchInterval: 600000, // Изменено с 300000 на 600000 (10 минут вместо 5)
        cryptoCount: 20 // Уменьшено с 50 до 20 криптовалют
    },
    
    // Настройки WebSocket
    websocket: {
      path: '/ws',
      clientsLimit: 100,
      sendInterval: 1000 // 1 секунда - частота отправки обновлений клиентам
    },
    
    // Настройки аналитики
    analytics: {
      // Параметры для определения аномалий
      anomaly: {
        priceThreshold: 5, // процент изменения цены для обнаружения аномалии
        volumeThreshold: 20 // процент изменения объема для обнаружения аномалии
      },
      
      // Параметры для технических индикаторов
      indicators: {
        // Настройки скользящих средних
        sma: {
          periods: [7, 25, 99] // периоды для SMA
        },
        
        // Настройки RSI
        rsi: {
          period: 14, // период для RSI
          overbought: 70, // уровень перекупленности
          oversold: 30 // уровень перепроданности
        },
        
        // Настройки MACD
        macd: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9
        }
      }
    },
    
    // Настройки кэширования
    cache: {
      ttl: 60 * 10, // время жизни кэша в секундах (10 минут)
      checkPeriod: 60 // период проверки устаревших записей (в секундах)
    },
  
    // Логирование
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      filename: './logs/app.log'
    }
  };