/**
 * Сервис оповещений о важных событиях на рынке криптовалют
 */
const { EventEmitter } = require('events');
const db = require('../database/db');
const config = require('../config');

class AlertService extends EventEmitter {
  constructor() {
    super();
    
    // Кэш для отправленных оповещений (для предотвращения дублирования)
    this.sentAlerts = new Map();
    
    // Настройки для обнаружения аномалий
    this.priceThreshold = config.analytics.anomaly.priceThreshold;
    this.volumeThreshold = config.analytics.anomaly.volumeThreshold;
  }

  /**
   * Обрабатывает обнаруженные аномалии и создает оповещения
   * @param {Array} anomalies Массив аномалий
   * @returns {Promise<Array>} Массив созданных оповещений
   */
  async processAnomalies(anomalies) {
    if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
      return [];
    }
    
    try {
      const alerts = [];
      
      for (const anomaly of anomalies) {
        // Создаем оповещение на основе аномалии
        const alert = await this.createAlertFromAnomaly(anomaly);
        
        if (alert) {
          alerts.push(alert);
          
          // Генерируем событие о создании оповещения
          this.emit('alertCreated', alert);
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Ошибка при обработке аномалий:', error);
      
      // Генерируем событие об ошибке
      this.emit('error', {
        message: 'Ошибка при обработке аномалий',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Создает оповещение на основе аномалии
   * @param {Object} anomaly Объект аномалии
   * @returns {Promise<Object|null>} Созданное оповещение или null
   */
  async createAlertFromAnomaly(anomaly) {
    try {
      // Получаем информацию о криптовалюте
      const crypto = await db.get(
        'SELECT name, symbol FROM cryptocurrencies WHERE id = ?',
        [anomaly.crypto_id]
      );
      
      if (!crypto) {
        console.warn(`Криптовалюта с ID ${anomaly.crypto_id} не найдена`);
        return null;
      }
      
      // Формируем уникальный ключ для оповещения
      const alertKey = `${anomaly.crypto_id}-${anomaly.anomaly_type}-${Math.floor(Date.now() / 60000)}`; // Ключ с точностью до минуты
      
      // Проверяем, не было ли уже отправлено аналогичное оповещение недавно
      if (this.sentAlerts.has(alertKey)) {
        console.log(`Пропуск дублирующего оповещения для ${crypto.name} (${alertKey})`);
        return null;
      }
      
      // Определяем тип оповещения
      let alertType = 'info';
      let severity = 'medium';
      
      if (anomaly.anomaly_type === 'price') {
        if (Math.abs(anomaly.percentage_change) >= this.priceThreshold * 2) {
          alertType = anomaly.percentage_change > 0 ? 'price_surge' : 'price_drop';
          severity = 'high';
        } else {
          alertType = anomaly.percentage_change > 0 ? 'price_increase' : 'price_decrease';
          severity = 'medium';
        }
      } else if (anomaly.anomaly_type === 'volume') {
        if (Math.abs(anomaly.percentage_change) >= this.volumeThreshold * 2) {
          alertType = 'volume_spike';
          severity = 'high';
        } else {
          alertType = 'volume_change';
          severity = 'medium';
        }
      }
      
      const timestamp = new Date().toISOString();
      
      // Формируем данные оповещения
      const alert = {
        id: Date.now().toString(),
        crypto_id: anomaly.crypto_id,
        crypto_name: crypto.name,
        crypto_symbol: crypto.symbol,
        alert_type: alertType,
        old_value: anomaly.old_value,
        new_value: anomaly.new_value,
        percentage_change: anomaly.percentage_change,
        message: anomaly.description,
        severity: severity,
        timestamp: timestamp
      };
      
      // Сохраняем оповещение в базе данных
      await this.saveAlert(alert);
      
      // Добавляем оповещение в кэш отправленных
      this.sentAlerts.set(alertKey, {
        timestamp: Date.now(),
        alert: alert
      });
      
      // Удаляем старые записи из кэша
      this.cleanupSentAlerts();
      
      return alert;
    } catch (error) {
      console.error(`Ошибка при создании оповещения для аномалии (${anomaly.crypto_id}):`, error);
      return null;
    }
  }

  /**
   * Сохраняет оповещение в базу данных
   * @param {Object} alert Объект оповещения
   * @returns {Promise<Object>} Результат операции
   */
  async saveAlert(alert) {
    try {
      await db.run(
        `INSERT INTO alerts (
          crypto_id, alert_type, old_value, new_value, 
          percentage_change, message, severity, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.crypto_id, alert.alert_type, alert.old_value,
          alert.new_value, alert.percentage_change, 
          alert.message, alert.severity, alert.timestamp
        ]
      );

      return { success: true, id: alert.id };
    } catch (error) {
      console.error('Ошибка при сохранении оповещения:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Очищает кэш отправленных оповещений от устаревших записей
   */
  cleanupSentAlerts() {
    const now = Date.now();
    const expirationTime = 3600000; // 1 час
    
    for (const [key, value] of this.sentAlerts.entries()) {
      if (now - value.timestamp > expirationTime) {
        this.sentAlerts.delete(key);
      }
    }
  }

  /**
   * Обрабатывает технические индикаторы и создает оповещения
   * @param {string} cryptoId ID криптовалюты
   * @param {Object} indicators Объект с техническими индикаторами
   * @param {Object} interpretation Интерпретация индикаторов
   * @returns {Promise<Array>} Массив созданных оповещений
   */
  async processIndicators(cryptoId, indicators, interpretation) {
    if (!indicators || !interpretation) {
      return [];
    }
    
    try {
      // Получаем информацию о криптовалюте
      const crypto = await db.get(
        'SELECT name, symbol FROM cryptocurrencies WHERE id = ?',
        [cryptoId]
      );
      
      if (!crypto) {
        console.warn(`Криптовалюта с ID ${cryptoId} не найдена`);
        return [];
      }
      
      const alerts = [];
      const timestamp = new Date().toISOString();
      
      // Проверяем сигналы от разных индикаторов
      
      // Проверяем RSI
      if (interpretation.rsi) {
        const rsiCondition = interpretation.rsi.condition;
        
        if (rsiCondition === 'overbought' || rsiCondition === 'oversold') {
          // Формируем уникальный ключ для оповещения
          const alertKey = `${cryptoId}-rsi-${rsiCondition}-${Math.floor(Date.now() / 3600000)}`; // Ключ с точностью до часа
          
          // Проверяем, не было ли уже отправлено аналогичное оповещение недавно
          if (!this.sentAlerts.has(alertKey)) {
            const alert = {
              id: Date.now().toString(),
              crypto_id: cryptoId,
              crypto_name: crypto.name,
              crypto_symbol: crypto.symbol,
              alert_type: rsiCondition === 'overbought' ? 'rsi_overbought' : 'rsi_oversold',
              old_value: null,
              new_value: indicators.indicators.rsi.value,
              percentage_change: null,
              message: `RSI для ${crypto.name} (${crypto.symbol.toUpperCase()}) находится в зоне ${rsiCondition === 'overbought' ? 'перекупленности' : 'перепроданности'} (${indicators.indicators.rsi.value.toFixed(2)})`,
              severity: 'medium',
              timestamp: timestamp
            };
            
            // Сохраняем оповещение в базе данных
            await this.saveAlert(alert);
            
            // Добавляем оповещение в кэш отправленных
            this.sentAlerts.set(alertKey, {
              timestamp: Date.now(),
              alert: alert
            });
            
            // Добавляем оповещение в результат
            alerts.push(alert);
            
            // Генерируем событие о создании оповещения
            this.emit('alertCreated', alert);
          }
        }
      }
      
      // Проверяем MACD
      if (interpretation.macd && interpretation.macd.signal) {
        const macdSignal = interpretation.macd.signal;
        
        if (macdSignal === 'buy' || macdSignal === 'sell') {
          // Формируем уникальный ключ для оповещения
          const alertKey = `${cryptoId}-macd-${macdSignal}-${Math.floor(Date.now() / 3600000)}`; // Ключ с точностью до часа
          
          // Проверяем, не было ли уже отправлено аналогичное оповещение недавно
          if (!this.sentAlerts.has(alertKey)) {
            const alert = {
              id: Date.now().toString(),
              crypto_id: cryptoId,
              crypto_name: crypto.name,
              crypto_symbol: crypto.symbol,
              alert_type: macdSignal === 'buy' ? 'macd_bullish_cross' : 'macd_bearish_cross',
              old_value: null,
              new_value: null,
              percentage_change: null,
              message: `MACD для ${crypto.name} (${crypto.symbol.toUpperCase()}) показывает сигнал на ${macdSignal === 'buy' ? 'покупку' : 'продажу'}`,
              severity: 'medium',
              timestamp: timestamp
            };
            
            // Сохраняем оповещение в базе данных
            await this.saveAlert(alert);
            
            // Добавляем оповещение в кэш отправленных
            this.sentAlerts.set(alertKey, {
              timestamp: Date.now(),
              alert: alert
            });
            
            // Добавляем оповещение в результат
            alerts.push(alert);
            
            // Генерируем событие о создании оповещения
            this.emit('alertCreated', alert);
          }
        }
      }
      
      // Проверяем SMA (пересечение)
      if (interpretation.sma && interpretation.sma.crossover) {
        const smaCrossover = interpretation.sma.crossover;
        
        if (smaCrossover === 'bullish' || smaCrossover === 'bearish') {
          // Формируем уникальный ключ для оповещения
          const alertKey = `${cryptoId}-sma-${smaCrossover}-${Math.floor(Date.now() / 3600000)}`; // Ключ с точностью до часа
          
          // Проверяем, не было ли уже отправлено аналогичное оповещение недавно
          if (!this.sentAlerts.has(alertKey)) {
            const alert = {
              id: Date.now().toString(),
              crypto_id: cryptoId,
              crypto_name: crypto.name,
              crypto_symbol: crypto.symbol,
              alert_type: smaCrossover === 'bullish' ? 'sma_bullish_cross' : 'sma_bearish_cross',
              old_value: null,
              new_value: null,
              percentage_change: null,
              message: `SMA для ${crypto.name} (${crypto.symbol.toUpperCase()}) показывает ${smaCrossover === 'bullish' ? 'бычье' : 'медвежье'} пересечение`,
              severity: 'medium',
              timestamp: timestamp
            };
            
            // Сохраняем оповещение в базе данных
            await this.saveAlert(alert);
            
            // Добавляем оповещение в кэш отправленных
            this.sentAlerts.set(alertKey, {
              timestamp: Date.now(),
              alert: alert
            });
            
            // Добавляем оповещение в результат
            alerts.push(alert);
            
            // Генерируем событие о создании оповещения
            this.emit('alertCreated', alert);
          }
        }
      }
      
      // Проверяем общий сигнал, если он сильный
      if (interpretation.overall && interpretation.overall.strength >= 0.7) {
        const overallSignal = interpretation.overall.signal;
        
        if (overallSignal === 'buy' || overallSignal === 'sell') {
          // Формируем уникальный ключ для оповещения
          const alertKey = `${cryptoId}-overall-${overallSignal}-${Math.floor(Date.now() / 3600000)}`; // Ключ с точностью до часа
          
          // Проверяем, не было ли уже отправлено аналогичное оповещение недавно
          if (!this.sentAlerts.has(alertKey)) {
            const alert = {
              id: Date.now().toString(),
              crypto_id: cryptoId,
              crypto_name: crypto.name,
              crypto_symbol: crypto.symbol,
              alert_type: overallSignal === 'buy' ? 'strong_buy_signal' : 'strong_sell_signal',
              old_value: null,
              new_value: null,
              percentage_change: null,
              message: `Сильный сигнал на ${overallSignal === 'buy' ? 'покупку' : 'продажу'} для ${crypto.name} (${crypto.symbol.toUpperCase()}) по техническим индикаторам`,
              severity: 'high',
              timestamp: timestamp
            };
            
            // Сохраняем оповещение в базе данных
            await this.saveAlert(alert);
            
            // Добавляем оповещение в кэш отправленных
            this.sentAlerts.set(alertKey, {
              timestamp: Date.now(),
              alert: alert
            });
            
            // Добавляем оповещение в результат
            alerts.push(alert);
            
            // Генерируем событие о создании оповещения
            this.emit('alertCreated', alert);
          }
        }
      }
      
      return alerts;
    } catch (error) {
      console.error(`Ошибка при обработке индикаторов для ${cryptoId}:`, error);
      
      // Генерируем событие об ошибке
      this.emit('error', {
        message: `Ошибка при обработке индикаторов для ${cryptoId}`,
        error: error.message
      });
      
      return [];
    }
  }

  /**
   * Получает последние оповещения из базы данных
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array>} Массив последних оповещений
   */
  async getLatestAlerts(limit = 10) {
    try {
      const alerts = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [limit]
      );

      return alerts;
    } catch (error) {
      console.error('Ошибка при получении последних оповещений:', error);
      throw error;
    }
  }

  /**
   * Получает оповещения для конкретной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array>} Массив оповещений
   */
  async getAlertsForCrypto(cryptoId, limit = 10) {
    try {
      const alerts = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.crypto_id = ?
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [cryptoId, limit]
      );

      return alerts;
    } catch (error) {
      console.error(`Ошибка при получении оповещений для ${cryptoId}:`, error);
      throw error;
    }
  }
}

// Создаем и экспортируем экземпляр сервиса оповещений
const alertService = new AlertService();
module.exports = alertService;