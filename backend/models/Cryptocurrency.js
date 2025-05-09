/**
 * Модель данных криптовалюты
 */
const db = require('../database/db');

class Cryptocurrency {
  /**
   * Создает новый экземпляр криптовалюты
   * @param {Object} data Данные о криптовалюте
   */
  constructor(data) {
    this.id = data.id;
    this.symbol = data.symbol;
    this.name = data.name;
    this.image = data.image;
    this.current_price = data.current_price;
    this.market_cap = data.market_cap;
    this.market_cap_rank = data.market_cap_rank;
    this.total_volume = data.total_volume;
    this.high_24h = data.high_24h;
    this.low_24h = data.low_24h;
    this.price_change_24h = data.price_change_24h;
    this.price_change_percentage_24h = data.price_change_percentage_24h;
    this.circulating_supply = data.circulating_supply;
    this.total_supply = data.total_supply;
    this.max_supply = data.max_supply;
    this.last_updated = data.last_updated;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Сохраняет криптовалюту в базу данных
   * @returns {Promise<boolean>} Успешность операции
   */
  async save() {
    try {
      // Проверяем, существует ли криптовалюта в базе данных
      const existingCrypto = await Cryptocurrency.findById(this.id);
      
      if (existingCrypto) {
        // Если криптовалюта существует, обновляем ее
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
            this.symbol, this.name, this.image, this.current_price,
            this.market_cap, this.market_cap_rank, this.total_volume,
            this.high_24h, this.low_24h, this.price_change_24h,
            this.price_change_percentage_24h, this.circulating_supply,
            this.total_supply, this.max_supply, this.last_updated,
            this.id
          ]
        );
      } else {
        // Если криптовалюта не существует, создаем новую запись
        await db.run(
          `INSERT INTO cryptocurrencies (
            id, symbol, name, image, current_price, market_cap, 
            market_cap_rank, total_volume, high_24h, low_24h, 
            price_change_24h, price_change_percentage_24h, 
            circulating_supply, total_supply, max_supply, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            this.id, this.symbol, this.name, this.image, this.current_price,
            this.market_cap, this.market_cap_rank, this.total_volume,
            this.high_24h, this.low_24h, this.price_change_24h,
            this.price_change_percentage_24h, this.circulating_supply,
            this.total_supply, this.max_supply, this.last_updated
          ]
        );
      }
      
      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении криптовалюты ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Получает историю цен для криптовалюты
   * @param {number} limit Максимальное количество записей
   * @returns {Promise<Array>} Массив с историей цен
   */
  async getPriceHistory(limit = 100) {
    try {
      const history = await db.all(
        `SELECT price, market_cap, total_volume, timestamp
         FROM price_history
         WHERE crypto_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [this.id, limit]
      );
      
      return history;
    } catch (error) {
      console.error(`Ошибка при получении истории цен для ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Получает технические индикаторы для криптовалюты
   * @returns {Promise<Object>} Объект с техническими индикаторами
   */
  async getTechnicalIndicators() {
    try {
      // Получаем последние значения SMA
      const sma = await db.all(
        `SELECT indicator_type, value, parameters, timestamp
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'SMA'
         ORDER BY timestamp DESC
         LIMIT 10`,
        [this.id]
      );
      
      // Получаем последнее значение RSI
      const rsi = await db.get(
        `SELECT value, parameters, timestamp
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'RSI'
         ORDER BY timestamp DESC
         LIMIT 1`,
        [this.id]
      );
      
      // Получаем последние значения MACD
      const macd = await db.all(
        `SELECT indicator_type, value, parameters, timestamp
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type LIKE 'MACD%'
         ORDER BY timestamp DESC
         LIMIT 3`,
        [this.id]
      );
      
      return {
        sma: sma.map(item => ({
          ...item,
          parameters: JSON.parse(item.parameters)
        })),
        rsi: rsi ? {
          ...rsi,
          parameters: JSON.parse(rsi.parameters)
        } : null,
        macd: macd.map(item => ({
          ...item,
          parameters: JSON.parse(item.parameters)
        }))
      };
    } catch (error) {
      console.error(`Ошибка при получении технических индикаторов для ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Получает оповещения для криптовалюты
   * @param {number} limit Максимальное количество оповещений
   * @returns {Promise<Array>} Массив оповещений
   */
  async getAlerts(limit = 10) {
    try {
      const alerts = await db.all(
        `SELECT id, alert_type, old_value, new_value, percentage_change, 
                message, severity, timestamp
         FROM alerts
         WHERE crypto_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [this.id, limit]
      );
      
      return alerts;
    } catch (error) {
      console.error(`Ошибка при получении оповещений для ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Добавляет запись о цене в историю
   * @param {number} price Цена
   * @param {number} marketCap Рыночная капитализация
   * @param {number} volume Объем торгов
   * @returns {Promise<boolean>} Успешность операции
   */
  async addPriceRecord(price, marketCap, volume) {
    try {
      const timestamp = new Date().toISOString();
      
      await db.run(
        `INSERT INTO price_history (
          crypto_id, price, market_cap, total_volume, timestamp
        ) VALUES (?, ?, ?, ?, ?)`,
        [this.id, price, marketCap, volume, timestamp]
      );
      
      return true;
    } catch (error) {
      console.error(`Ошибка при добавлении записи о цене для ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Находит криптовалюту по ID
   * @param {string} id ID криптовалюты
   * @returns {Promise<Cryptocurrency|null>} Найденная криптовалюта или null
   */
  static async findById(id) {
    try {
      const data = await db.get(
        'SELECT * FROM cryptocurrencies WHERE id = ?',
        [id]
      );
      
      if (data) {
        return new Cryptocurrency(data);
      }
      
      return null;
    } catch (error) {
      console.error(`Ошибка при поиске криптовалюты ${id}:`, error);
      return null;
    }
  }

  /**
   * Получает список всех криптовалют
   * @param {number} limit Максимальное количество криптовалют
   * @param {number} offset Смещение для пагинации
   * @returns {Promise<Array<Cryptocurrency>>} Массив объектов криптовалют
   */
  static async findAll(limit = 50, offset = 0) {
    try {
      const data = await db.all(
        'SELECT * FROM cryptocurrencies ORDER BY market_cap_rank ASC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      return data.map(item => new Cryptocurrency(item));
    } catch (error) {
      console.error('Ошибка при получении списка криптовалют:', error);
      return [];
    }
  }

  /**
   * Находит криптовалюты по символу или названию
   * @param {string} query Поисковый запрос
   * @param {number} limit Максимальное количество результатов
   * @returns {Promise<Array<Cryptocurrency>>} Массив найденных криптовалют
   */
  static async search(query, limit = 10) {
    try {
      const data = await db.all(
        `SELECT * FROM cryptocurrencies 
         WHERE symbol LIKE ? OR name LIKE ? 
         ORDER BY market_cap_rank ASC
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, limit]
      );
      
      return data.map(item => new Cryptocurrency(item));
    } catch (error) {
      console.error(`Ошибка при поиске криптовалют по запросу ${query}:`, error);
      return [];
    }
  }

  /**
   * Получает топ криптовалют по рыночной капитализации
   * @param {number} limit Количество криптовалют
   * @returns {Promise<Array<Cryptocurrency>>} Массив объектов криптовалют
   */
  static async getTopByMarketCap(limit = 10) {
    try {
      const data = await db.all(
        'SELECT * FROM cryptocurrencies ORDER BY market_cap DESC LIMIT ?',
        [limit]
      );
      
      return data.map(item => new Cryptocurrency(item));
    } catch (error) {
      console.error('Ошибка при получении топ криптовалют:', error);
      return [];
    }
  }

  /**
   * Получает топ криптовалют по изменению цены за 24 часа
   * @param {number} limit Количество криптовалют
   * @param {boolean} gainers Если true - возрастание, если false - падение
   * @returns {Promise<Array<Cryptocurrency>>} Массив объектов криптовалют
   */
  static async getTopByPriceChange(limit = 10, gainers = true) {
    try {
      const order = gainers ? 'DESC' : 'ASC';
      
      const data = await db.all(
        `SELECT * FROM cryptocurrencies 
         WHERE price_change_percentage_24h IS NOT NULL
         ORDER BY price_change_percentage_24h ${order} 
         LIMIT ?`,
        [limit]
      );
      
      return data.map(item => new Cryptocurrency(item));
    } catch (error) {
      console.error('Ошибка при получении топ криптовалют по изменению цены:', error);
      return [];
    }
  }

  /**
   * Получает общее количество криптовалют в базе данных
   * @returns {Promise<number>} Количество криптовалют
   */
  static async count() {
    try {
      const result = await db.get(
        'SELECT COUNT(*) as count FROM cryptocurrencies'
      );
      
      return result.count;
    } catch (error) {
      console.error('Ошибка при получении количества криптовалют:', error);
      return 0;
    }
  }
}

module.exports = Cryptocurrency;