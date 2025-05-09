/**
 * Модель данных оповещения
 */
const db = require('../database/db');

class Alert {
  /**
   * Создает новый экземпляр оповещения
   * @param {Object} data Данные оповещения
   */
  constructor(data) {
    this.id = data.id;
    this.crypto_id = data.crypto_id;
    this.alert_type = data.alert_type;
    this.old_value = data.old_value;
    this.new_value = data.new_value;
    this.percentage_change = data.percentage_change;
    this.message = data.message;
    this.severity = data.severity || 'medium';
    this.timestamp = data.timestamp;
    
    // Дополнительные поля из JOIN с таблицей cryptocurrencies
    this.crypto_name = data.crypto_name;
    this.crypto_symbol = data.crypto_symbol;
  }

  /**
   * Сохраняет оповещение в базу данных
   * @returns {Promise<boolean>} Успешность операции
   */
  async save() {
    try {
      if (this.id && !isNaN(this.id)) {
        // Если id присутствует и является числом, обновляем существующую запись
        await db.run(
          `UPDATE alerts SET 
            crypto_id = ?, alert_type = ?, old_value = ?, 
            new_value = ?, percentage_change = ?, message = ?, 
            severity = ?, timestamp = ?
          WHERE id = ?`,
          [
            this.crypto_id, this.alert_type, this.old_value,
            this.new_value, this.percentage_change, this.message,
            this.severity, this.timestamp, this.id
          ]
        );
      } else {
        // Если id отсутствует или не является числом, создаем новую запись
        const result = await db.run(
          `INSERT INTO alerts (
            crypto_id, alert_type, old_value, new_value, 
            percentage_change, message, severity, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            this.crypto_id, this.alert_type, this.old_value,
            this.new_value, this.percentage_change, this.message,
            this.severity, this.timestamp || new Date().toISOString()
          ]
        );
        
        this.id = result.lastID;
      }
      
      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении оповещения для ${this.crypto_id}:`, error);
      return false;
    }
  }

  /**
   * Находит оповещение по ID
   * @param {number} id ID оповещения
   * @returns {Promise<Alert|null>} Найденное оповещение или null
   */
  static async findById(id) {
    try {
      const data = await db.get(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.id = ?`,
        [id]
      );
      
      if (data) {
        return new Alert(data);
      }
      
      return null;
    } catch (error) {
      console.error(`Ошибка при поиске оповещения с ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Получает оповещения для указанной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {number} limit Максимальное количество оповещений
   * @param {number} offset Смещение для пагинации
   * @returns {Promise<Array<Alert>>} Массив объектов оповещений
   */
  static async findByCryptoId(cryptoId, limit = 10, offset = 0) {
    try {
      const data = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.crypto_id = ? 
         ORDER BY a.timestamp DESC 
         LIMIT ? OFFSET ?`,
        [cryptoId, limit, offset]
      );
      
      return data.map(item => new Alert(item));
    } catch (error) {
      console.error(`Ошибка при получении оповещений для ${cryptoId}:`, error);
      return [];
    }
  }

  /**
   * Получает последние оповещения
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array<Alert>>} Массив объектов оповещений
   */
  static async findLatest(limit = 10) {
    try {
      const data = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [limit]
      );
      
      return data.map(item => new Alert(item));
    } catch (error) {
      console.error('Ошибка при получении последних оповещений:', error);
      return [];
    }
  }

  /**
   * Получает оповещения по типу
   * @param {string} alertType Тип оповещения
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array<Alert>>} Массив объектов оповещений
   */
  static async findByType(alertType, limit = 10) {
    try {
      const data = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.alert_type = ?
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [alertType, limit]
      );
      
      return data.map(item => new Alert(item));
    } catch (error) {
      console.error(`Ошибка при получении оповещений типа ${alertType}:`, error);
      return [];
    }
  }

  /**
   * Получает оповещения по уровню важности
   * @param {string} severity Уровень важности ('low', 'medium', 'high')
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array<Alert>>} Массив объектов оповещений
   */
  static async findBySeverity(severity, limit = 10) {
    try {
      const data = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.severity = ?
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [severity, limit]
      );
      
      return data.map(item => new Alert(item));
    } catch (error) {
      console.error(`Ошибка при получении оповещений с уровнем важности ${severity}:`, error);
      return [];
    }
  }

  /**
   * Получает оповещения за указанный период времени
   * @param {string} startDate Начальная дата в формате ISO
   * @param {string} endDate Конечная дата в формате ISO
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array<Alert>>} Массив объектов оповещений
   */
  static async findByDateRange(startDate, endDate, limit = 50) {
    try {
      const data = await db.all(
        `SELECT a.*, c.name as crypto_name, c.symbol as crypto_symbol
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.timestamp BETWEEN ? AND ?
         ORDER BY a.timestamp DESC
         LIMIT ?`,
        [startDate, endDate, limit]
      );
      
      return data.map(item => new Alert(item));
    } catch (error) {
      console.error('Ошибка при получении оповещений по диапазону дат:', error);
      return [];
    }
  }

  /**
   * Удаляет устаревшие оповещения
   * @param {number} daysToKeep Количество дней, за которые сохраняются оповещения
   * @returns {Promise<number>} Количество удаленных оповещений
   */
  static async cleanupOldAlerts(daysToKeep = 30) {
    try {
      // Вычисляем дату, до которой удаляем оповещения
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString();
      
      // Удаляем оповещения старше указанной даты
      const result = await db.run(
        'DELETE FROM alerts WHERE timestamp < ?',
        [cutoffDateStr]
      );
      
      return result.changes;
    } catch (error) {
      console.error('Ошибка при удалении устаревших оповещений:', error);
      return 0;
    }
  }

  /**
   * Группирует оповещения по типам и подсчитывает их количество
   * @param {number} days Количество дней для анализа
   * @returns {Promise<Object>} Объект со статистикой по типам оповещений
   */
  static async getAlertStats(days = 7) {
    try {
      // Вычисляем дату начала периода
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();
      
      // Получаем статистику по типам оповещений
      const stats = await db.all(
        `SELECT alert_type, COUNT(*) as count
         FROM alerts
         WHERE timestamp >= ?
         GROUP BY alert_type
         ORDER BY count DESC`,
        [startDateStr]
      );
      
      // Получаем статистику по уровням важности
      const severityStats = await db.all(
        `SELECT severity, COUNT(*) as count
         FROM alerts
         WHERE timestamp >= ?
         GROUP BY severity
         ORDER BY CASE 
           WHEN severity = 'high' THEN 1
           WHEN severity = 'medium' THEN 2
           WHEN severity = 'low' THEN 3
           ELSE 4
         END`,
        [startDateStr]
      );
      
      // Получаем статистику по криптовалютам
      const cryptoStats = await db.all(
        `SELECT a.crypto_id, c.name, c.symbol, COUNT(*) as count
         FROM alerts a
         JOIN cryptocurrencies c ON a.crypto_id = c.id
         WHERE a.timestamp >= ?
         GROUP BY a.crypto_id
         ORDER BY count DESC
         LIMIT 10`,
        [startDateStr]
      );
      
      // Формируем результат
      return {
        period: {
          days,
          startDate: startDateStr,
          endDate: new Date().toISOString()
        },
        totalAlerts: stats.reduce((sum, item) => sum + item.count, 0),
        byType: stats,
        bySeverity: severityStats,
        byCrypto: cryptoStats
      };
    } catch (error) {
      console.error('Ошибка при получении статистики оповещений:', error);
      return null;
    }
  }
}

module.exports = Alert;