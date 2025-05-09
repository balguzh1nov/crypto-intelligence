/**
 * Сервис для работы с WebSocket соединением
 */

import { warning, alert, prediction } from './notificationService';

let websocket = null;
let reconnectAttempts = 0;
let callbacks = {};
let reconnectTimer = null;
let heartbeatTimer = null;
let lastReconnectAttempt = 0;

// Константы
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 секунда
const MAX_RECONNECT_DELAY = 30000; // 30 секунд
const HEARTBEAT_INTERVAL = 30000; // 30 секунд

// Мок-данные для разработки (используются когда сервер недоступен)
const mockMarketData = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 55000,
    market_cap: 1050000000000,
    market_cap_rank: 1,
    total_volume: 32000000000,
    price_change_percentage_24h: 2.5,
    circulating_supply: 19000000
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 3500,
    market_cap: 420000000000,
    market_cap_rank: 2,
    total_volume: 18000000000,
    price_change_percentage_24h: 1.8,
    circulating_supply: 120000000
  },
  {
    id: "binancecoin",
    symbol: "bnb",
    name: "Binance Coin",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    current_price: 450,
    market_cap: 70000000000,
    market_cap_rank: 3,
    total_volume: 2500000000,
    price_change_percentage_24h: -0.7,
    circulating_supply: 155000000
  }
];

const mockAlerts = [
  {
    id: "alert-1",
    crypto_id: "bitcoin",
    crypto_symbol: "btc",
    alert_type: "price_surge",
    message: "Значительный рост цены Bitcoin за последний час",
    timestamp: new Date().toISOString(),
    percentage_change: 3.2,
    severity: "medium"
  },
  {
    id: "alert-2",
    crypto_id: "ethereum",
    crypto_symbol: "eth",
    alert_type: "volume_spike",
    message: "Резкое увеличение объема торгов Ethereum",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    percentage_change: 45.8,
    severity: "high"
  }
];

const mockHistoricalData = {
  prices: Array(30).fill(0).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    return [date.getTime(), 50000 + Math.random() * 10000];
  })
};

const mockTechnicalIndicators = {
  crypto_id: "bitcoin",
  timeframe: "24h",
  timestamp: new Date().toISOString(),
  indicators: {
    rsi: {
      period: 14,
      value: 68.5
    },
    macd: {
      fast_period: 12,
      slow_period: 26,
      signal_period: 9,
      macd: 120.5,
      signal: 110.2,
      histogram: 10.3
    }
  },
  interpretation: {
    rsi: {
      signal: "нейтральный"
    },
    macd: {
      signal: "покупка"
    },
    sma: {
      crossover: "бычий"
    },
    overall: {
      signal: "покупка",
      confidence: 75
    }
  }
};

/**
 * Настраивает мок-реализацию WebSocket для разработки
 */
function setupMockWebSocket() {
  if (!websocket) {
    websocket = {
      readyState: 1, // WebSocket.OPEN
      send: (data) => {
        console.log('Мок WebSocket: отправка данных', data);
        processMockRequest(data);
      },
      close: () => {
        console.log('Мок WebSocket: соединение закрыто');
      }
    };
  }
  
  // Вызываем onConnect сразу
  if (callbacks.onConnect) {
    callbacks.onConnect();
  }
  
  // Отправляем начальные данные
  setTimeout(() => {
    if (callbacks.onInitialData) {
      callbacks.onInitialData({
        marketData: mockMarketData,
        lastUpdated: new Date().toISOString()
      });
    }
    
    if (callbacks.onLatestAlerts) {
      callbacks.onLatestAlerts(mockAlerts);
    }
  }, 500);
}

/**
 * Обработка мок-запросов для режима разработки
 * @param {string} data JSON строка с запросом
 */
function processMockRequest(data) {
  try {
    const request = JSON.parse(data);
    console.log('Мок WebSocket: обработка запроса', request);
    
    switch (request.type) {
      case 'getAlerts':
        if (callbacks.onLatestAlerts) {
          setTimeout(() => {
            callbacks.onLatestAlerts(mockAlerts);
          }, 300);
        }
        break;
      case 'getHistoricalData':
        if (callbacks.onHistoricalData) {
          setTimeout(() => {
            callbacks.onHistoricalData(mockHistoricalData);
          }, 500);
        }
        break;
      case 'getTechnicalIndicators':
        if (callbacks.onTechnicalIndicators) {
          setTimeout(() => {
            callbacks.onTechnicalIndicators(mockTechnicalIndicators);
          }, 400);
        }
        break;
      default:
        console.log('Мок WebSocket: необработанный тип запроса', request.type);
    }
  } catch (error) {
    console.error('Мок WebSocket: ошибка обработки запроса', error);
  }
}

/**
 * Отправка heartbeat для поддержания соединения
 */
function sendHeartbeat() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    try {
      websocket.send(JSON.stringify({ type: 'heartbeat' }));
    } catch (error) {
      console.warn('Ошибка отправки heartbeat:', error);
    }
  }
}

/**
 * Запуск таймера для регулярной отправки heartbeat
 */
function startHeartbeat() {
  stopHeartbeat(); // Сначала останавливаем существующий таймер, если есть
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

/**
 * Остановка таймера heartbeat
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Расчет задержки перед повторным подключением с экспоненциальным увеличением
 * @param {number} attempt Номер попытки
 * @returns {number} Задержка в миллисекундах
 */
function getReconnectDelay(attempt) {
  // Экспоненциальное увеличение задержки с ограничением максимума
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(1.5, attempt),
    MAX_RECONNECT_DELAY
  );
  
  // Добавляем случайный "джиттер" (±20% от задержки), чтобы избежать эффекта громады
  return delay * (0.8 + Math.random() * 0.4);
}

/**
 * Инициализирует WebSocket соединение
 * @param {Object} handlers Обработчики событий WebSocket
 * @returns {Promise} Промис, разрешающийся при успешном подключении
 */
export const initializeWebSocket = (handlers) => {
  return new Promise((resolve, reject) => {
    try {
      callbacks = handlers || {};
      const wsUrl = 'ws://localhost:3011/ws';
      
      // Останавливаем таймеры
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      stopHeartbeat();
      
      // Временная блокировка быстрых повторных подключений
      if (websocket && Date.now() - lastReconnectAttempt < 5000) {
        console.log('Предотвращение быстрых повторных подключений WebSocket');
        setTimeout(() => initializeWebSocket(handlers), 1000);
        return;
      }
      
      lastReconnectAttempt = Date.now();
      
      // Если уже есть открытое соединение, закрываем его
      if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        console.log('Закрываем существующее WebSocket соединение');
        
        try {
          websocket.onclose = null; // Отключаем обработчик, чтобы избежать рекурсивного повторного подключения
          websocket.onerror = null;
          websocket.close();
        } catch (e) {
          console.log('Ошибка при закрытии WebSocket:', e);
        }
      }
      
      console.log(`Попытка подключения к WebSocket: ${wsUrl}`);
      
      try {
        websocket = new WebSocket(wsUrl);
        
        // Увеличиваем таймаут на соединение
        const connectionTimeout = setTimeout(() => {
          if (websocket.readyState !== WebSocket.OPEN) {
            console.log('Таймаут WebSocket соединения');
            websocket.close();
            
            // Используем фиктивный WebSocket для режима разработки
            if (process.env.NODE_ENV === 'development') {
              console.warn('Использование мок-реализации WebSocket для режима разработки');
              setupMockWebSocket();
              resolve();
            } else {
              reject(new Error('WebSocket connection timeout'));
            }
          }
        }, 10000);
        
        // Обработчик открытия соединения
        websocket.onopen = () => {
          console.log('WebSocket соединение установлено');
          reconnectAttempts = 0; // Сбрасываем счетчик попыток
          
          // Запускаем механизм heartbeat
          startHeartbeat();
          
          if (callbacks.onConnect) {
            callbacks.onConnect();
          }
          
          resolve();
        };
        
        // Обработчик сообщений
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Обработка различных типов сообщений
            switch (data.type) {
              case 'marketUpdate':
                if (callbacks.onMarketUpdate) {
                  callbacks.onMarketUpdate(data.data);
                }
                
                // Уведомления о значительных изменениях цены
                if (data.data && Array.isArray(data.data)) {
                  data.data.slice(0, 5).forEach(crypto => {
                    if (Math.abs(crypto.price_change_percentage_24h) > 10) {
                      const isPositive = crypto.price_change_percentage_24h > 0;
                      const changeText = isPositive 
                        ? `вырос на ${crypto.price_change_percentage_24h.toFixed(2)}%` 
                        : `упал на ${Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%`;
                      
                      alert(
                        `${crypto.name} (${crypto.symbol.toUpperCase()}) ${changeText} за последние 24 часа`,
                        5000,
                        true,
                        { 
                          title: 'Значительное изменение цены',
                          actions: [
                            { 
                              label: 'Подробнее', 
                              onClick: () => window.location.href = `/crypto/${crypto.id}`
                            }
                          ]
                        }
                      );
                    }
                  });
                }
                break;
                
              case 'newAlerts':
                if (callbacks.onNewAlerts) {
                  callbacks.onNewAlerts(data.data);
                }
                
                // Показываем уведомление о новом алерте
                if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                  const newestAlert = data.data[0];
                  alert(
                    newestAlert.message,
                    8000,
                    true,
                    {
                      title: 'Новое оповещение',
                      actions: [
                        { 
                          label: 'Просмотреть все', 
                          onClick: () => window.location.href = '/alerts'
                        }
                      ]
                    }
                  );
                }
                break;
                
              case 'technicalIndicatorsUpdate':
                if (callbacks.onTechnicalIndicators) {
                  callbacks.onTechnicalIndicators(data.data);
                }
                
                // Показываем уведомление о сильных сигналах
                if (data.data && data.data.interpretation && data.data.interpretation.overall) {
                  const signal = data.data.interpretation.overall.signal;
                  const strength = data.data.interpretation.overall.strength || 'medium';
                  
                  if ((signal === 'buy' || signal === 'sell') && strength === 'strong') {
                    const cryptoId = data.cryptoId;
                    const signalText = signal === 'buy' ? 'ПОКУПАТЬ' : 'ПРОДАВАТЬ';
                    
                    prediction(
                      `Сильный сигнал "${signalText}" для ${cryptoId}`,
                      10000,
                      true,
                      {
                        title: 'Технический анализ',
                        actions: [
                          { 
                            label: 'Подробнее', 
                            onClick: () => window.location.href = `/crypto/${cryptoId}`
                          }
                        ]
                      }
                    );
                  }
                }
                break;
                
              case 'initialData':
                if (callbacks.onInitialData) {
                  callbacks.onInitialData(data.data);
                }
                break;
              case 'heartbeatResponse':
                // Подтверждение heartbeat от сервера
                console.log('Получен ответ на heartbeat');
                break;
              case 'error':
                console.error('Ошибка от сервера:', data.message);
                if (callbacks.onError) {
                  callbacks.onError(data.message);
                }
                break;
              default:
                console.warn('Получено необработанное сообщение типа:', data.type);
            }
          } catch (error) {
            console.error('Ошибка при обработке сообщения WebSocket:', error);
          }
        };
        
        // Обработчик ошибок
        websocket.onerror = (error) => {
          console.error('Ошибка WebSocket:', error);
          
          if (callbacks.onError) {
            callbacks.onError('Произошла ошибка соединения с сервером');
          }
        };
        
        // Обработчик закрытия соединения
        websocket.onclose = (event) => {
          stopHeartbeat();
          
          console.log(`WebSocket соединение закрыто. Код: ${event.code}, Причина: ${event.reason || 'Не указана'}`);
          
          if (callbacks.onDisconnect) {
            callbacks.onDisconnect();
          }
          
          // Планируем переподключение, если это не было чистое закрытие
          if (event.code !== 1000 && event.code !== 1001) {
            scheduleReconnect();
          }
        };
        
      } catch (error) {
        console.error('Ошибка при инициализации WebSocket:', error);
        
        if (callbacks.onError) {
          callbacks.onError('Не удалось инициализировать соединение с сервером');
        }
        
        // В production режиме пробуем переподключиться
        if (process.env.NODE_ENV !== 'development') {
          scheduleReconnect();
        }
        
        reject(error);
      }
    } catch (error) {
      console.error('Ошибка при инициализации WebSocket:', error);
      
      if (callbacks.onError) {
        callbacks.onError('Не удалось инициализировать соединение с сервером');
      }
      
      // В production режиме пробуем переподключиться
      if (process.env.NODE_ENV !== 'development') {
        scheduleReconnect();
      }
      
      reject(error);
    }
  });
};

/**
 * Планирует повторное подключение к WebSocket серверу
 */
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  reconnectAttempts++;
  
  if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    const delay = getReconnectDelay(reconnectAttempts);
    console.log(`Повторное подключение (попытка ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) через ${Math.round(delay / 1000)} секунд...`);
    
    reconnectTimer = setTimeout(() => {
      console.log(`Выполняем повторное подключение (попытка ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      initializeWebSocket(callbacks).catch(error => {
        console.error(`Неудачная попытка подключения ${reconnectAttempts}:`, error);
      });
    }, delay);
  } else {
    console.error(`Достигнуто максимальное количество попыток (${MAX_RECONNECT_ATTEMPTS}). Переподключение остановлено.`);
    
    if (callbacks.onError) {
      callbacks.onError('Не удалось установить соединение после нескольких попыток. Пожалуйста, проверьте соединение с интернетом или перезагрузите страницу.');
    }
    
    // Если мы в режиме разработки, используем мок-данные
    if (process.env.NODE_ENV === 'development') {
      console.warn('Переключение на мок-реализацию WebSocket после исчерпания попыток');
      setupMockWebSocket();
    }
  }
}

/**
 * Отправляет запрос через WebSocket
 * @param {string} type Тип запроса
 * @param {Object} params Параметры запроса
 * @returns {Promise} Промис, разрешающийся при отправке запроса
 */
export const sendRequest = (type, params = {}) => {
  return new Promise((resolve, reject) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      // Если соединение закрыто, но мы в режиме разработки
      if (process.env.NODE_ENV === 'development') {
        console.warn('WebSocket не подключен. Использование мок-данных');
        processMockRequest(JSON.stringify({ type, ...params }));
        resolve();
        return;
      }
      
      reject(new Error('WebSocket соединение не установлено'));
      return;
    }
    
    try {
      websocket.send(JSON.stringify({ type, ...params }));
      resolve();
    } catch (error) {
      console.error('Ошибка при отправке запроса через WebSocket:', error);
      reject(error);
    }
  });
};

/**
 * Возвращает текущее состояние WebSocket соединения
 * @returns {Object} Объект с информацией о состоянии соединения
 */
export const getWebSocketState = () => {
  if (!websocket) {
    return {
      connected: false,
      state: 'CLOSED',
      reconnecting: reconnectAttempts > 0
    };
  }
  
  const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
  
  return {
    connected: websocket.readyState === WebSocket.OPEN,
    state: states[websocket.readyState],
    reconnecting: reconnectAttempts > 0,
    reconnectAttempts: reconnectAttempts
  };
};

/**
 * Закрывает WebSocket соединение
 */
export const closeWebSocket = () => {
  // Останавливаем таймеры
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopHeartbeat();
  
  if (websocket) {
    try {
      websocket.close(1000, 'Закрытие по запросу пользователя');
    } catch (error) {
      console.error('Ошибка при закрытии WebSocket:', error);
    }
  }
};