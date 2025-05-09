/**
 * API сервис для работы с бэкендом
 */

// Базовый URL API
const API_BASE_URL = 'http://localhost:3011';

/**
 * Обертка для fetch с обработкой ошибок
 * @param {string} url - URL для запроса
 * @param {Object} options - Опции для fetch
 * @returns {Promise} - Промис с результатом запроса
 */
const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    // Проверяем, успешен ли запрос
    if (!response.ok) {
      // Пробуем получить детали ошибки из ответа
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorData.error || '';
      } catch (e) {
        // Если не удалось распарсить JSON, используем текст ответа
        errorDetail = await response.text();
      }
      
      throw new Error(`API запрос не удался: ${response.status} ${response.statusText}. ${errorDetail}`);
    }
    
    // Парсим JSON только если ответ не пустой
    if (response.status !== 204) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        console.warn('Получен не JSON ответ:', contentType);
        return await response.text();
      }
    }
    
    return null;
  } catch (error) {
    console.error('API запрос завершился с ошибкой:', error);
    throw error;
  }
};

/**
 * Получение данных о рынке криптовалют
 * @param {number} limit - Максимальное количество криптовалют
 * @returns {Promise<Array>} - Массив с данными о криптовалютах
 */
export const fetchMarketData = async (limit = 50) => {
  try {
    const data = await fetchWithErrorHandling(
      `${API_BASE_URL}/api/market?limit=${limit}`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении данных о рынке:', error);
    throw error;
  }
};

// Кэш данных рынка для использования в качестве резервных данных
let marketDataCache = [];

/**
 * Получение детальной информации о криптовалюте
 * @param {string} id - Идентификатор криптовалюты
 * @returns {Promise<Object>} - Объект с детальной информацией
 */
export const fetchCryptoDetail = async (id) => {
    try {
      // Попытка получить данные через API
      const data = await fetchWithErrorHandling(
        `${API_BASE_URL}/api/crypto/${id}`
      );
      
      // Проверяем, что получили корректные данные
      if (!data || !data.id) {
        throw new Error('Получены некорректные данные от API');
      }
      
      return data;
    } catch (error) {
      console.error(`Ошибка при получении данных о криптовалюте ${id}:`, error);
      
      // Пробуем получить данные из списка рынка
      try {
        // Если кэш пуст, запрашиваем данные
        if (marketDataCache.length === 0) {
          marketDataCache = await fetchMarketData(100);
        }
        
        // Ищем криптовалюту в кэше рыночных данных
        const cryptoFromMarket = marketDataCache.find(crypto => 
          crypto.id === id || crypto.symbol === id || 
          crypto.id.toLowerCase() === id.toLowerCase() || 
          crypto.symbol.toLowerCase() === id.toLowerCase()
        );
        
        if (cryptoFromMarket) {
          console.log(`Найдены данные для ${id} в рыночных данных`, cryptoFromMarket);
          // Дополняем данные другими полями, которые могут ожидаться компонентами
          return {
            ...cryptoFromMarket,
            description: `${cryptoFromMarket.name} (${cryptoFromMarket.symbol.toUpperCase()}) - актуальная цена: $${cryptoFromMarket.current_price.toFixed(2)}`
          };
        }
      } catch (marketError) {
        console.error(`Ошибка при получении резервных данных из рынка для ${id}:`, marketError);
      }
      
      // Если все способы не сработали, повторно выбрасываем ошибку
      throw new Error(`Не удалось получить данные о криптовалюте ${id}`);
    }
  };

/**
 * Получение исторических данных о цене криптовалюты
 * @param {string} id - Идентификатор криптовалюты
 * @param {number|string} days - Количество дней для истории или 'max'
 * @returns {Promise<Object>} - Объект с историческими данными
 */
export const fetchHistoricalData = async (id, days = 7) => {
  try {
    const data = await fetchWithErrorHandling(
      `${API_BASE_URL}/api/history/${id}?days=${days}`
    );
    return data;
  } catch (error) {
    console.error(`Ошибка при получении исторических данных для ${id}:`, error);
    throw error;
  }
};

/**
 * Мок функция для получения технических индикаторов (в реальной системе была бы интеграция с API)
 * @param {string} cryptoId - Идентификатор криптовалюты
 * @param {string} timeframe - Временной интервал для индикаторов
 * @returns {Promise<Object>} - Объект с техническими индикаторами
 */
export const fetchTechnicalIndicators = async (cryptoId, timeframe = '24h') => {
  try {
    // В реальном приложении здесь был бы запрос к API
    // Сейчас просто возвращаем моковые данные
    
    // Случайное значение RSI между 20 и 80
    const rsiValue = 30 + Math.random() * 40;
    
    // Определяем MACD на основе RSI (просто для примера)
    const macdValue = rsiValue > 50 ? 0.5 + Math.random() * 2 : -2 + Math.random() * 2;
    const signalValue = macdValue * 0.8;
    
    // Определяем сигналы на основе индикаторов
    const rsiSignal = rsiValue > 70 ? 'sell' : rsiValue < 30 ? 'buy' : 'neutral';
    const macdSignal = macdValue > signalValue ? 'buy' : macdValue < signalValue ? 'sell' : 'neutral';
    const smaSignal = Math.random() > 0.5 ? 'bullish' : 'bearish';
    
    // Общий сигнал
    const signals = [rsiSignal, macdSignal, smaSignal].filter(s => s !== 'neutral');
    const buySignals = signals.filter(s => s === 'buy' || s === 'bullish').length;
    const sellSignals = signals.filter(s => s === 'sell' || s === 'bearish').length;
    
    let overallSignal = 'neutral';
    if (buySignals > sellSignals) {
      overallSignal = 'buy';
    } else if (sellSignals > buySignals) {
      overallSignal = 'sell';
    }
    
    // Возвращаем структурированные данные
    return {
      crypto_id: cryptoId,
      timeframe: timeframe,
      timestamp: new Date().toISOString(),
      indicators: {
        rsi: {
          period: 14,
          value: rsiValue
        },
        macd: {
          fast_period: 12,
          slow_period: 26,
          signal_period: 9,
          macd: macdValue,
          signal: signalValue,
          histogram: macdValue - signalValue
        },
        stochastic: {
          k_period: 14,
          d_period: 3,
          slowing: 3,
          k: 50 + Math.random() * 30,
          d: 50 + Math.random() * 20
        }
      },
      interpretation: {
        rsi: {
          signal: rsiSignal
        },
        macd: {
          signal: macdSignal === 'neutral' ? 
            (Math.random() > 0.5 ? 'buy' : 'sell') : 
            macdSignal
        },
        sma: {
          periods: [20, 50],
          crossover: smaSignal
        },
        ema: {
          periods: [12, 26],
          crossover: Math.random() > 0.5 ? 'bullish' : 'bearish'
        },
        overall: {
          signal: overallSignal,
          confidence: Math.floor(50 + Math.random() * 50)
        }
      }
    };
  } catch (error) {
    console.error(`Ошибка при получении технических индикаторов для ${cryptoId}:`, error);
    throw error;
  }
};

/**
 * Функция для получения списка доступных криптовалют
 * @returns {Promise<Array>} - Массив с доступными криптовалютами
 */
export const fetchCryptoList = async () => {
  try {
    const data = await fetchWithErrorHandling(
      `${API_BASE_URL}/api/list`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка криптовалют:', error);
    throw error;
  }
};

/**
 * Получение ML-прогноза цены криптовалюты
 * @param {string} id - Идентификатор криптовалюты
 * @param {number} days - Количество дней для прогноза
 * @returns {Promise<Object>} - Объект с прогнозом цены
 */
export const fetchPricePrediction = async (id, days = 7) => {
  try {
    return await fetchWithErrorHandling(`${API_BASE_URL}/api/predict/${id}?days=${days}`);
  } catch (error) {
    console.error('Ошибка при получении прогноза:', error);
    throw new Error(`Не удалось получить прогноз для ${id}: ${error.message}`);
  }
};