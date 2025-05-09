/**
 * Маршруты API для приложения CryptoIntelligence
 */
const express = require('express');
const router = express.Router();

// Подключение сервисов
const coinGeckoService = require('../services/coingecko');
const dataProcessor = require('../services/dataProcessor');
const technicalAnalysis = require('../services/technicalAnalysis');
const correlationAnalysis = require('../services/correlationAnalysis');
const alertService = require('../services/alertService');
const db = require('../database/db');
const pricePrediction = require('../services/pricePrediction');

/**
 * Middleware для обработки ошибок
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Глобальный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: true, 
    message: err.message || 'Внутренняя ошибка сервера',
    path: req.path
  });
};

/**
 * @route GET /api/status
 * @desc Получение статуса системы
 */
router.get('/status', asyncHandler(async (req, res) => {
  const cacheData = coinGeckoService.getCachedData();
  const processingStats = await dataProcessor.getProcessingStats();
  
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    lastDataUpdate: cacheData.lastUpdated,
    cryptoCount: processingStats.cryptocurrencies,
    dataPoints: processingStats.priceHistoryRecords,
    anomaliesDetected: processingStats.anomalies
  });
}));

/**
 * @route GET /api/cryptocurrencies
 * @desc Получение списка всех криптовалют
 */
router.get('/cryptocurrencies', asyncHandler(async (req, res) => {
  const cryptos = await db.all(
    'SELECT * FROM cryptocurrencies ORDER BY market_cap_rank ASC'
  );
  
  res.json(cryptos);
}));

/**
 * @route GET /api/cryptocurrencies/:id
 * @desc Получение данных о конкретной криптовалюте
 */
router.get('/cryptocurrencies/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  
  // Получаем базовую информацию о криптовалюте из базы данных
  const cryptoData = await db.get(
    'SELECT * FROM cryptocurrencies WHERE id = ?',
    [cryptoId]
  );
  
  if (!cryptoData) {
    return res.status(404).json({ 
      error: true, 
      message: `Криптовалюта с ID ${cryptoId} не найдена` 
    });
  }
  
  // Получаем дополнительные данные о криптовалюте от CoinGecko API
  let detailedData = null;
  try {
    detailedData = await coinGeckoService.getCoinData(cryptoId);
  } catch (error) {
    console.warn(`Не удалось получить детальные данные для ${cryptoId}:`, error.message);
    // Продолжаем работу, используя только данные из базы
  }
  
  // Объединяем данные
  const result = detailedData || cryptoData;
  
  res.json(result);
}));

/**
 * @route GET /api/market
 * @desc Получение рыночных данных для фронтенда
 */
router.get('/market', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const detailed = req.query.detailed;
  
  try {
    // Получаем данные из кэша CoinGecko сервиса
    const marketData = coinGeckoService.getCachedMarketData();
    
    if (marketData && marketData.length > 0) {
      // Ограничиваем количество возвращаемых данных
      const limitedData = marketData.slice(0, limit);
      
      if (detailed) {
        res.json({
          data: limitedData,
          lastUpdated: coinGeckoService.getCachedData().lastUpdated
        });
      } else {
        res.json(limitedData);
      }
    } else {
      // Если данных в кэше нет, запрашиваем их напрямую
      const freshData = await coinGeckoService.getMarketData(limit);
      
      if (detailed) {
        res.json({
          data: freshData,
          lastUpdated: coinGeckoService.getCachedData().lastUpdated
        });
      } else {
        res.json(freshData);
      }
    }
  } catch (error) {
    console.error('Ошибка при получении рыночных данных:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Не удалось получить рыночные данные',
      details: error.message
    });
  }
}));

/**
 * @route GET /api/crypto/:id
 * @desc Получение детальной информации о криптовалюте для фронтенда
 */
router.get('/crypto/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  
  try {
    // Проверяем кэш на наличие детальных данных
    const cachedData = coinGeckoService.getCachedCoinData(cryptoId);
    
    if (cachedData) {
      res.json(cachedData);
    } else {
      // Если данных в кэше нет, запрашиваем их напрямую
      const coinData = await coinGeckoService.getCoinData(cryptoId);
      res.json(coinData);
    }
  } catch (error) {
    console.error(`Ошибка при получении детальных данных для ${cryptoId}:`, error);
    res.status(500).json({ 
      error: true, 
      message: `Не удалось получить данные для криптовалюты ${cryptoId}`,
      details: error.message
    });
  }
}));

/**
 * @route GET /api/history/:id
 * @desc Получение исторических данных о цене криптовалюты для фронтенда
 */
router.get('/history/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const days = req.query.days ? (req.query.days === 'max' ? 'max' : parseInt(req.query.days)) : 7;
  
  try {
    // Проверяем кэш на наличие исторических данных
    const cachedData = coinGeckoService.getCachedHistoricalData(cryptoId, days);
    
    if (cachedData) {
      res.json(cachedData);
    } else {
      // Если данных в кэше нет, запрашиваем их напрямую
      const historicalData = await coinGeckoService.getHistoricalData(cryptoId, days);
      res.json(historicalData);
    }
  } catch (error) {
    console.error(`Ошибка при получении исторических данных для ${cryptoId}:`, error);
    res.status(500).json({ 
      error: true, 
      message: `Не удалось получить исторические данные для криптовалюты ${cryptoId}`,
      details: error.message
    });
  }
}));

/**
 * @route GET /api/list
 * @desc Получение списка всех доступных криптовалют для фронтенда
 */
router.get('/list', asyncHandler(async (req, res) => {
  try {
    // Проверяем кэш на наличие списка криптовалют
    const cachedList = coinGeckoService.getCachedCoinList();
    
    if (cachedList && cachedList.length > 0) {
      res.json(cachedList);
    } else {
      // Если данных в кэше нет, запрашиваем их напрямую
      const coinList = await coinGeckoService.getCoinList();
      res.json(coinList);
    }
  } catch (error) {
    console.error('Ошибка при получении списка криптовалют:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Не удалось получить список криптовалют',
      details: error.message
    });
  }
}));

/**
 * @route GET /api/historical/:id
 * @desc Получение исторических данных о цене криптовалюты
 */
router.get('/historical/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const days = req.query.days || '30';
  const interval = req.query.interval || 'daily';
  
  try {
    const historicalData = await coinGeckoService.getCoinMarketChart(
      cryptoId,
      days,
      interval
    );
    
    res.json(historicalData);
  } catch (error) {
    res.status(404).json({ 
      error: true, 
      message: `Не удалось получить исторические данные: ${error.message}` 
    });
  }
}));

/**
 * @route GET /api/price-history/:id
 * @desc Получение истории цен из базы данных
 */
router.get('/price-history/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const limit = parseInt(req.query.limit) || 100;
  
  const priceHistory = await db.all(
    `SELECT price, market_cap, total_volume, timestamp
     FROM price_history
     WHERE crypto_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [cryptoId, limit]
  );
  
  if (!priceHistory || priceHistory.length === 0) {
    return res.status(404).json({ 
      error: true, 
      message: `История цен для ${cryptoId} не найдена` 
    });
  }
  
  res.json(priceHistory);
}));

/**
 * @route GET /api/indicators/:id
 * @desc Получение технических индикаторов для криптовалюты
 */
router.get('/indicators/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  
  // Получаем технические индикаторы
  const indicators = await technicalAnalysis.getLatestIndicators(cryptoId);
  
  if (!indicators || !indicators.indicators) {
    return res.status(404).json({ 
      error: true, 
      message: `Индикаторы для ${cryptoId} не найдены` 
    });
  }
  
  // Интерпретируем индикаторы
  const interpretation = technicalAnalysis.interpretIndicators(indicators);
  
  res.json({
    indicators,
    interpretation
  });
}));

/**
 * @route GET /api/calculate-indicators/:id
 * @desc Расчет технических индикаторов для криптовалюты
 */
router.get('/calculate-indicators/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const days = parseInt(req.query.days) || 30;
  
  try {
    // Запускаем расчет индикаторов
    const result = await technicalAnalysis.calculateIndicators(cryptoId, days);
    
    // Интерпретируем результаты
    const interpretation = technicalAnalysis.interpretIndicators(result);
    
    res.json({
      success: true,
      indicators: result,
      interpretation
    });
  } catch (error) {
    res.status(500).json({ 
      error: true, 
      message: `Ошибка при расчете индикаторов: ${error.message}` 
    });
  }
}));

/**
 * @route GET /api/correlations
 * @desc Получение корреляций между криптовалютами
 */
router.get('/correlations', asyncHandler(async (req, res) => {
  const timeFrame = req.query.timeFrame || '30d';
  const limit = parseInt(req.query.limit) || 10;
  
  const correlations = await correlationAnalysis.getLatestCorrelations(timeFrame, limit);
  
  res.json(correlations);
}));

/**
 * @route GET /api/correlations/:id
 * @desc Получение корреляций для конкретной криптовалюты
 */
router.get('/correlations/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const timeFrame = req.query.timeFrame || '30d';
  const limit = parseInt(req.query.limit) || 10;
  
  const correlations = await correlationAnalysis.getCorrelationsForCrypto(
    cryptoId, 
    timeFrame, 
    limit
  );
  
  res.json(correlations);
}));

/**
 * @route POST /api/calculate-correlations
 * @desc Расчет корреляций между указанными криптовалютами
 */
router.post('/calculate-correlations', asyncHandler(async (req, res) => {
  const { cryptoIds, days } = req.body;
  
  if (!cryptoIds || !Array.isArray(cryptoIds) || cryptoIds.length < 2) {
    return res.status(400).json({ 
      error: true, 
      message: 'Необходимо указать минимум 2 криптовалюты' 
    });
  }
  
  try {
    const result = await correlationAnalysis.calculateCorrelations(
      cryptoIds, 
      days || 30
    );
    
    res.json({
      success: true,
      correlations: result
    });
  } catch (error) {
    res.status(500).json({ 
      error: true, 
      message: `Ошибка при расчете корреляций: ${error.message}` 
    });
  }
}));

/**
 * @route GET /api/anomalies
 * @desc Получение обнаруженных аномалий
 */
router.get('/anomalies', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const anomalies = await db.all(
    `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
     FROM anomalies a
     JOIN cryptocurrencies c ON a.crypto_id = c.id
     ORDER BY a.timestamp DESC
     LIMIT ?`,
    [limit]
  );
  
  res.json(anomalies);
}));

/**
 * @route GET /api/anomalies/:id
 * @desc Получение аномалий для конкретной криптовалюты
 */
router.get('/anomalies/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const limit = parseInt(req.query.limit) || 10;
  
  const anomalies = await db.all(
    `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
     FROM anomalies a
     JOIN cryptocurrencies c ON a.crypto_id = c.id
     WHERE a.crypto_id = ?
     ORDER BY a.timestamp DESC
     LIMIT ?`,
    [cryptoId, limit]
  );
  
  res.json(anomalies);
}));

/**
 * @route GET /api/alerts
 * @desc Получение всех оповещений
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const alerts = await alertService.getLatestAlerts(limit);
  
  res.json(alerts);
}));

/**
 * @route GET /api/alerts/:id
 * @desc Получение оповещений для конкретной криптовалюты
 */
router.get('/alerts/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const limit = parseInt(req.query.limit) || 10;
  
  const alerts = await alertService.getAlertsForCrypto(cryptoId, limit);
  
  res.json(alerts);
}));

/**
 * @route GET /api/global
 * @desc Получение данных о глобальном рынке криптовалют
 */
router.get('/global', asyncHandler(async (req, res) => {
  try {
    const globalData = await coinGeckoService.getGlobalMarketData();
    res.json(globalData);
  } catch (error) {
    res.status(500).json({ 
      error: true, 
      message: `Не удалось получить глобальные данные: ${error.message}` 
    });
  }
}));

/**
 * @route GET /api/stats/processing
 * @desc Получение статистики обработки данных
 */
router.get('/stats/processing', asyncHandler(async (req, res) => {
  const stats = await dataProcessor.getProcessingStats();
  res.json(stats);
}));

/**
 * @route GET /api/predict/:id
 * @desc Получение ML-прогноза цены криптовалюты
 */
router.get('/predict/:id', asyncHandler(async (req, res) => {
  const cryptoId = req.params.id;
  const days = parseInt(req.query.days) || 7;
  
  try {
    console.log(`Запрошен прогноз для ${cryptoId} на ${days} дней`);
    const prediction = await pricePrediction.getPricePrediction(cryptoId, days);
    res.json(prediction);
  } catch (error) {
    console.error(`Ошибка при создании прогноза для ${cryptoId}:`, error);
    res.status(500).json({ 
      error: true, 
      message: `Не удалось создать прогноз для криптовалюты ${cryptoId}`,
      details: error.message
    });
  }
}));

// Регистрация обработчика ошибок
router.use(errorHandler);

module.exports = router;