/**
 * Модель данных цены криптовалюты
 */
const db = require('../database/db');

class Price {
  /**
   * Создает новый экземпляр записи о цене
   * @param {Object} data Данные о цене
   */
  constructor(data) {
    this.id = data.id;
    this.crypto_id = data.crypto_id;
    this.price = data.price;
    this.market_cap = data.market_cap;
    this.total_volume = data.total_volume;
    this.timestamp = data.timestamp;
  }

  /**
   * Сохраняет запись о цене в базу данных
   * @returns {Promise<boolean>} Успешность операции
   */
  async save() {
    try {
      if (this.id) {
        // Если id присутствует, обновляем существующую запись
        await db.run(
          `UPDATE price_history SET 
            crypto_id = ?, price = ?, market_cap = ?, 
            total_volume = ?, timestamp = ?
          WHERE id = ?`,
          [
            this.crypto_id, this.price, this.market_cap,
            this.total_volume, this.timestamp, this.id
          ]
        );
      } else {
        // Если id отсутствует, создаем новую запись
        const result = await db.run(
          `INSERT INTO price_history (
            crypto_id, price, market_cap, total_volume, timestamp
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            this.crypto_id, this.price, this.market_cap,
            this.total_volume, this.timestamp || new Date().toISOString()
          ]
        );
        
        this.id = result.lastID;
      }
      
      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении записи о цене для ${this.crypto_id}:`, error);
      return false;
    }
  }

  /**
   * Находит запись о цене по ID
   * @param {number} id ID записи
   * @returns {Promise<Price|null>} Найденная запись или null
   */
  static async findById(id) {
    try {
      const data = await db.get(
        'SELECT * FROM price_history WHERE id = ?',
        [id]
      );
      
      if (data) {
        return new Price(data);
      }
      
      return null;
    } catch (error) {
      console.error(`Ошибка при поиске записи о цене с ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Получает историю цен для указанной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {number} limit Максимальное количество записей
   * @param {number} offset Смещение для пагинации
   * @returns {Promise<Array<Price>>} Массив объектов цен
   */
  static async findByCryptoId(cryptoId, limit = 100, offset = 0) {
    try {
      const data = await db.all(
        `SELECT * FROM price_history 
         WHERE crypto_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ? OFFSET ?`,
        [cryptoId, limit, offset]
      );
      
      return data.map(item => new Price(item));
    } catch (error) {
      console.error(`Ошибка при получении истории цен для ${cryptoId}:`, error);
      return [];
    }
  }

  /**
   * Получает цены за указанный период времени
   * @param {string} cryptoId ID криптовалюты
   * @param {string} startDate Начальная дата в формате ISO
   * @param {string} endDate Конечная дата в формате ISO
   * @returns {Promise<Array<Price>>} Массив объектов цен
   */
  static async findByDateRange(cryptoId, startDate, endDate) {
    try {
      const data = await db.all(
        `SELECT * FROM price_history 
         WHERE crypto_id = ? AND timestamp BETWEEN ? AND ? 
         ORDER BY timestamp ASC`,
        [cryptoId, startDate, endDate]
      );
      
      return data.map(item => new Price(item));
    } catch (error) {
      console.error(`Ошибка при получении истории цен по диапазону дат для ${cryptoId}:`, error);
      return [];
    }
  }

  /**
   * Получает последнюю запись о цене для указанной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @returns {Promise<Price|null>} Последняя запись о цене или null
   */
  static async findLatestByCryptoId(cryptoId) {
    try {
      const data = await db.get(
        `SELECT * FROM price_history 
         WHERE crypto_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [cryptoId]
      );
      
      if (data) {
        return new Price(data);
      }
      
      return null;
    } catch (error) {
      console.error(`Ошибка при получении последней записи о цене для ${cryptoId}:`, error);
      return null;
    }
  }

  /**
   * Рассчитывает статистику цены для указанной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {number} days Количество дней для анализа
   * @returns {Promise<Object>} Объект со статистикой
   */
  static async calculateStats(cryptoId, days = 30) {
    try {
      // Вычисляем дату начала периода
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      // Получаем статистику из базы данных
      const stats = await db.get(
        `SELECT 
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price,
          MIN(total_volume) as min_volume,
          MAX(total_volume) as max_volume,
          AVG(total_volume) as avg_volume
         FROM price_history
         WHERE crypto_id = ? AND timestamp >= ?`,
        [cryptoId, startDateStr]
      );
      
      // Получаем первую и последнюю запись за период
      const firstRecord = await db.get(
        `SELECT price, timestamp
         FROM price_history
         WHERE crypto_id = ? AND timestamp >= ?
         ORDER BY timestamp ASC
         LIMIT 1`,
        [cryptoId, startDateStr]
      );
      
      const lastRecord = await db.get(
        `SELECT price, timestamp
         FROM price_history
         WHERE crypto_id = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [cryptoId]
      );
      
      // Рассчитываем изменение цены за период
      let priceChange = null;
      let priceChangePercentage = null;
      
      if (firstRecord && lastRecord) {
        priceChange = lastRecord.price - firstRecord.price;
        priceChangePercentage = (priceChange / firstRecord.price) * 100;
      }
      
      // Формируем результат
      return {
        cryptoId,
        period: {
          days,
          startDate: startDateStr,
          endDate: new Date().toISOString()
        },
        price: {
          min: stats.min_price,
          max: stats.max_price,
          avg: stats.avg_price,
          change: priceChange,
          changePercentage: priceChangePercentage
        },
        volume: {
          min: stats.min_volume,
          max: stats.max_volume,
          avg: stats.avg_volume
        },
        firstRecord,
        lastRecord
      };
    } catch (error) {
      console.error(`Ошибка при расчете статистики цены для ${cryptoId}:`, error);
      return null;
    }
  }

  /**
   * Удаляет устаревшие записи о ценах
   * @param {number} daysToKeep Количество дней, за которые сохраняются данные
   * @returns {Promise<number>} Количество удаленных записей
   */
  static async cleanupOldRecords(daysToKeep = 30) {
    try {
      // Вычисляем дату, до которой удаляем записи
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString();
      
      // Удаляем записи старше указанной даты
      const result = await db.run(
        'DELETE FROM price_history WHERE timestamp < ?',
        [cutoffDateStr]
      );
      
      return result.changes;
    } catch (error) {
      console.error('Ошибка при удалении устаревших записей о ценах:', error);
      return 0;
    }
  }
}

module.exports = Price;