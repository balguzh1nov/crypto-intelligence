/**
 * Сервис для обработки и анализа данных криптовалют
 */
const config = require('../config');
const { EventEmitter } = require('events');
const db = require('../database/db');

class DataProcessor extends EventEmitter {
  constructor() {
    super();
    
    // Настройки для выявления аномалий
    this.priceThreshold = config.analytics.anomaly.priceThreshold;
    this.volumeThreshold = config.analytics.anomaly.volumeThreshold;
    
    // Кэш для предыдущих значений для сравнения
    this.previousValues = new Map();
  }

  /**
   * Обрабатывает новые данные о рынке
   * @param {Array} marketData Массив с данными о криптовалютах
   * @returns {Promise<Object>} Результаты обработки данных
   */
  async processMarketData(marketData) {
    if (!marketData || !Array.isArray(marketData)) {
      console.error('Некорректные данные для обработки:', marketData);
      return { success: false, error: 'Некорректные данные для обработки' };
    }

    try {
      // Результаты обработки
      const results = {
        updated: 0,
        newEntries: 0,
        anomalies: [],
        timeProcessed: new Date().toISOString()
      };

      // Обрабатываем данные о каждой криптовалюте
      for (const coin of marketData) {
        // Проверяем и сохраняем базовую информацию о криптовалюте
        const cryptoResult = await this.saveOrUpdateCrypto(coin);
        
        if (cryptoResult.isNew) {
          results.newEntries++;
        } else {
          results.updated++;
        }

        // Сохраняем историческую запись о цене
        await this.savePriceHistory(coin);

        // Проверяем наличие аномалий в данных
        const anomalies = this.detectAnomalies(coin);
        
        if (anomalies.length > 0) {
          // Сохраняем обнаруженные аномалии в базу данных
          await this.saveAnomalies(anomalies);
          
          // Добавляем аномалии к результатам
          results.anomalies.push(...anomalies);
          
          // Генерируем событие об обнаружении аномалии
          this.emit('anomalyDetected', anomalies);
        }

        // Обновляем предыдущие значения для будущего сравнения
        this.updatePreviousValues(coin);
      }

      // Генерируем событие об успешной обработке данных
      this.emit('dataProcessed', results);

      return { success: true, results };
    } catch (error) {
      console.error('Ошибка при обработке данных о рынке:', error);
      
      // Генерируем событие об ошибке обработки
      this.emit('error', {
        message: 'Ошибка при обработке данных о рынке',
        error: error.message
      });
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Сохраняет или обновляет информацию о криптовалюте в базе данных
   * @param {Object} coin Данные о криптовалюте
   * @returns {Promise<Object>} Результат операции
   */
  async saveOrUpdateCrypto(coin) {
    try {
      // Проверяем, существует ли криптовалюта в базе данных
      const existingCrypto = await db.get(
        'SELECT id FROM cryptocurrencies WHERE id = ?', 
        [coin.id]
      );

      if (!existingCrypto) {
        // Если криптовалюта не найдена, создаем новую запись
        await db.run(
          `INSERT INTO cryptocurrencies (
            id, symbol, name, image, current_price, market_cap, 
            market_cap_rank, total_volume, high_24h, low_24h, 
            price_change_24h, price_change_percentage_24h, 
            circulating_supply, total_supply, max_supply, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            coin.id, coin.symbol, coin.name, coin.image, coin.current_price,
            coin.market_cap, coin.market_cap_rank, coin.total_volume,
            coin.high_24h, coin.low_24h, coin.price_change_24h,
            coin.price_change_percentage_24h, coin.circulating_supply,
            coin.total_supply, coin.max_supply, coin.last_updated
          ]
        );

        return { success: true, isNew: true, id: coin.id };
      } else {
        // Если криптовалюта найдена, обновляем существующую запись
        await db.run(
          `UPDATE cryptocurrencies SET 
            symbol = ?, name = ?, image = ?, current_price = ?, 
            market_cap = ?, market_cap_rank = ?, total_volume = ?, 
            high_24h = ?, low_24h = ?, price_change_24h = ?, 
            price_change_percentage_24h = ?, circulating_supply = ?, 
            total_supply = ?, max_supply = ?, last_updated = ?,
            updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`,
          [
            coin.symbol, coin.name, coin.image, coin.current_price,
            coin.market_cap, coin.market_cap_rank, coin.total_volume,
            coin.high_24h, coin.low_24h, coin.price_change_24h,
            coin.price_change_percentage_24h, coin.circulating_supply,
            coin.total_supply, coin.max_supply, coin.last_updated,
            coin.id
          ]
        );

        return { success: true, isNew: false, id: coin.id };
      }
    } catch (error) {
      console.error(`Ошибка при сохранении/обновлении криптовалюты ${coin.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Сохраняет историческую запись о цене криптовалюты
   * @param {Object} coin Данные о криптовалюте
   * @returns {Promise<Object>} Результат операции
   */
  async savePriceHistory(coin) {
    try {
      const timestamp = new Date().toISOString();
      
      await db.run(
        `INSERT INTO price_history (
          crypto_id, price, market_cap, total_volume, timestamp
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          coin.id, coin.current_price, coin.market_cap,
          coin.total_volume, timestamp
        ]
      );

      return { success: true, id: coin.id, timestamp };
    } catch (error) {
      console.error(`Ошибка при сохранении истории цены для ${coin.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обнаруживает аномалии в данных о криптовалюте
   * @param {Object} coin Данные о криптовалюте
   * @returns {Array} Массив обнаруженных аномалий
   */
  detectAnomalies(coin) {
    const anomalies = [];
    const prevValues = this.previousValues.get(coin.id);
    
    // Если нет предыдущих значений, пропускаем анализ
    if (!prevValues) return anomalies;

    const timestamp = new Date().toISOString();

    // Проверяем аномалии в цене
    if (prevValues.price && coin.current_price) {
      const priceChange = ((coin.current_price - prevValues.price) / prevValues.price) * 100;
      
      if (Math.abs(priceChange) >= this.priceThreshold) {
        anomalies.push({
          crypto_id: coin.id,
          anomaly_type: 'price',
          old_value: prevValues.price,
          new_value: coin.current_price,
          percentage_change: priceChange,
          description: `Значительное изменение цены ${coin.name} (${coin.symbol.toUpperCase()}) на ${priceChange.toFixed(2)}%`,
          timestamp
        });
      }
    }

    // Проверяем аномалии в объеме торгов
    if (prevValues.volume && coin.total_volume) {
      const volumeChange = ((coin.total_volume - prevValues.volume) / prevValues.volume) * 100;
      
      if (Math.abs(volumeChange) >= this.volumeThreshold) {
        anomalies.push({
          crypto_id: coin.id,
          anomaly_type: 'volume',
          old_value: prevValues.volume,
          new_value: coin.total_volume,
          percentage_change: volumeChange,
          description: `Значительное изменение объема торгов ${coin.name} (${coin.symbol.toUpperCase()}) на ${volumeChange.toFixed(2)}%`,
          timestamp
        });
      }
    }

    return anomalies;
  }

  /**
   * Сохраняет информацию об обнаруженных аномалиях в базу данных
   * @param {Array} anomalies Массив аномалий
   * @returns {Promise<Object>} Результат операции
   */
  async saveAnomalies(anomalies) {
    try {
      for (const anomaly of anomalies) {
        await db.run(
          `INSERT INTO anomalies (
            crypto_id, anomaly_type, old_value, new_value, 
            percentage_change, description, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            anomaly.crypto_id, anomaly.anomaly_type, anomaly.old_value,
            anomaly.new_value, anomaly.percentage_change, 
            anomaly.description, anomaly.timestamp
          ]
        );
      }

      return { success: true, count: anomalies.length };
    } catch (error) {
      console.error('Ошибка при сохранении аномалий:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обновляет кэш предыдущих значений для криптовалюты
   * @param {Object} coin Данные о криптовалюте
   */
  updatePreviousValues(coin) {
    this.previousValues.set(coin.id, {
      price: coin.current_price,
      volume: coin.total_volume,
      marketCap: coin.market_cap,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Получает последние аномалии из базы данных
   * @param {number} limit Максимальное количество аномалий
   * @returns {Promise<Array>} Массив последних аномалий
   */
  async getLatestAnomalies(limit = 10) {
    try {
      const anomalies = await db.all(
        `SELECT a.*, c.name, c.symbol 
         FROM anomalies a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [limit]
      );

      return anomalies;
    } catch (error) {
      console.error('Ошибка при получении последних аномалий:', error);
      throw error;
    }
  }

  /**
   * Получает статистику по обработанным данным
   * @returns {Promise<Object>} Статистика обработки данных
   */
  async getProcessingStats() {
    try {
      // Количество криптовалют в базе данных
      const cryptoCount = await db.get(
        'SELECT COUNT(*) as count FROM cryptocurrencies'
      );

      // Количество записей истории цен
      const priceHistoryCount = await db.get(
        'SELECT COUNT(*) as count FROM price_history'
      );

      // Количество зафиксированных аномалий
      const anomalyCount = await db.get(
        'SELECT COUNT(*) as count FROM anomalies'
      );

      // Получаем время первой и последней записи
      const firstRecord = await db.get(
        'SELECT MIN(timestamp) as first FROM price_history'
      );

      const lastRecord = await db.get(
        'SELECT MAX(timestamp) as last FROM price_history'
      );

      return {
        cryptocurrencies: cryptoCount.count,
        priceHistoryRecords: priceHistoryCount.count,
        anomalies: anomalyCount.count,
        firstRecord: firstRecord.first,
        lastRecord: lastRecord.last,
        currentCacheSize: this.previousValues.size
      };
    } catch (error) {
      console.error('Ошибка при получении статистики обработки:', error);
      throw error;
    }
  }
}

// Создаем и экспортируем экземпляр процессора данных
const dataProcessor = new DataProcessor();
module.exports = dataProcessor;