/**
 * Сервис для анализа корреляций между криптовалютами
 */
const { EventEmitter } = require('events');
const db = require('../database/db');

class CorrelationAnalysisService extends EventEmitter {
  constructor() {
    super();
    this.insufficientDataLogged = false; // Добавляем флаг для логирования
  }

  /**
   * Рассчитывает корреляции между указанными криптовалютами
   * @param {Array} cryptoIds Массив ID криптовалют для анализа
   * @param {number} days Количество дней для анализа (по умолчанию 30)
   * @returns {Promise<Object>} Матрица корреляций
   */
  async calculateCorrelations(cryptoIds, days = 30) {
    try {
      if (!cryptoIds || !Array.isArray(cryptoIds) || cryptoIds.length < 2) {
        throw new Error('Для расчета корреляций необходимо указать минимум 2 криптовалюты');
      }

      // Получаем исторические данные для всех указанных криптовалют
      const historicalData = {};
      
      for (const cryptoId of cryptoIds) {
        const priceData = await this.getHistoricalPriceData(cryptoId, days);
        if (priceData && priceData.length > 0) {
          historicalData[cryptoId] = priceData;
        }
      }

      // Проверяем наличие данных для всех криптовалют
      const availableCryptos = Object.keys(historicalData);
      
      if (availableCryptos.length < 2) {
        throw new Error('Недостаточно данных для расчета корреляций');
      }

      // Подготавливаем временные ряды для расчета корреляций
      const timeSeries = this.prepareTimeSeries(historicalData);

      // Рассчитываем матрицу корреляций
      const correlationMatrix = this.calculateCorrelationMatrix(timeSeries);

      // Сохраняем результаты в базу данных
      await this.saveCorrelations(correlationMatrix, days);

      // Генерируем событие о завершении расчета
      this.emit('correlationsCalculated', correlationMatrix);

      return correlationMatrix;
    } catch (error) {
      console.error('Ошибка при расчете корреляций:', error);
      
      // Генерируем событие об ошибке
      this.emit('error', {
        message: 'Ошибка при расчете корреляций',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Получает исторические данные о ценах из базы данных
   * @param {string} cryptoId ID криптовалюты
   * @param {number} days Количество дней
   * @returns {Promise<Array>} Массив с историческими данными
   */
  async getHistoricalPriceData(cryptoId, days) {
    try {
      // Вычисляем дату начала периода
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      // Получаем данные из базы
      const data = await db.all(
        `SELECT price, timestamp 
         FROM price_history 
         WHERE crypto_id = ? AND timestamp >= ? 
         ORDER BY timestamp ASC`,
        [cryptoId, startDateStr]
      );

      return data;
    } catch (error) {
      console.error(`Ошибка при получении исторических данных для ${cryptoId}:`, error);
      throw error;
    }
  }

  /**
   * Подготавливает временные ряды для расчета корреляций
   * @param {Object} historicalData Объект с историческими данными по криптовалютам
   * @returns {Object} Объект с подготовленными временными рядами
   */
  prepareTimeSeries(historicalData) {
    // Создаем объект для хранения временных рядов
    const timeSeries = {};
    
    // Для каждой криптовалюты получаем временной ряд с ценами и метками времени
    for (const [cryptoId, data] of Object.entries(historicalData)) {
      timeSeries[cryptoId] = data.map(item => ({
        timestamp: new Date(item.timestamp).getTime(),
        price: item.price
      }));
    }
    
    return timeSeries;
  }

  /**
   * Рассчитывает матрицу корреляций между временными рядами
   * @param {Object} timeSeries Объект с временными рядами
   * @returns {Object} Матрица корреляций
   */
  calculateCorrelationMatrix(timeSeries) {
    const cryptoIds = Object.keys(timeSeries);
    const result = {
      timestamp: new Date().toISOString(),
      timeFrame: 'daily',
      correlations: {}
    };
    
    // Для каждой пары криптовалют рассчитываем корреляцию
    for (let i = 0; i < cryptoIds.length; i++) {
      const crypto1 = cryptoIds[i];
      
      // Создаем вложенный объект для текущей криптовалюты
      if (!result.correlations[crypto1]) {
        result.correlations[crypto1] = {};
      }
      
      // Устанавливаем корреляцию с самой собой равной 1
      result.correlations[crypto1][crypto1] = 1;
      
      for (let j = i + 1; j < cryptoIds.length; j++) {
        const crypto2 = cryptoIds[j];
        
        // Создаем вложенный объект для второй криптовалюты, если он еще не существует
        if (!result.correlations[crypto2]) {
          result.correlations[crypto2] = {};
        }
        
        // Рассчитываем коэффициент корреляции
        const correlation = this.calculatePearsonCorrelation(
          timeSeries[crypto1],
          timeSeries[crypto2]
        );
        
        // Записываем результат в матрицу (в обоих направлениях)
        result.correlations[crypto1][crypto2] = correlation;
        result.correlations[crypto2][crypto1] = correlation;
      }
    }
    
    return result;
  }

  /**
   * Рассчитывает коэффициент корреляции Пирсона между двумя временными рядами
   * @param {Array} series1 Первый временной ряд
   * @param {Array} series2 Второй временной ряд
   * @returns {number} Коэффициент корреляции Пирсона
   */
  calculatePearsonCorrelation(series1, series2) {
    // Объединяем временные ряды по общим меткам времени
    const combinedData = this.alignTimeSeries(series1, series2);
    
    if (combinedData.prices1.length < 2) {
      // console.warn('Недостаточно данных для расчета корреляции');
      // Вместо вывода в консоль, устанавливаем флаг, что была попытка расчета с недостаточными данными
      if (!this.insufficientDataLogged) {
        console.warn('Недостаточно данных для расчета некоторых корреляций. Это сообщение будет показано только один раз.');
        this.insufficientDataLogged = true;
      }
      return 0;
    }
    
    const { prices1, prices2 } = combinedData;
    
    // Рассчитываем средние значения
    const mean1 = prices1.reduce((sum, price) => sum + price, 0) / prices1.length;
    const mean2 = prices2.reduce((sum, price) => sum + price, 0) / prices2.length;
    
    // Рассчитываем компоненты для формулы корреляции Пирсона
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    
    for (let i = 0; i < prices1.length; i++) {
      const diff1 = prices1[i] - mean1;
      const diff2 = prices2[i] - mean2;
      
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }
    
    // Если один из рядов не имеет вариации, корреляция неопределена
    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }
    
    // Рассчитываем коэффициент корреляции
    const correlation = numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
    
    // Округляем до 4 знаков после запятой для лучшей читаемости
    return parseFloat(correlation.toFixed(4));
  }

  /**
   * Выравнивает два временных ряда по общим меткам времени
   * @param {Array} series1 Первый временной ряд
   * @param {Array} series2 Второй временной ряд
   * @returns {Object} Объект с выровненными ценами
   */
  alignTimeSeries(series1, series2) {
    // Индексируем ряды по меткам времени
    const map1 = new Map(series1.map(item => [item.timestamp, item.price]));
    const map2 = new Map(series2.map(item => [item.timestamp, item.price]));
    
    // Находим общие метки времени
    const commonTimestamps = [...map1.keys()].filter(ts => map2.has(ts));
    
    // Создаем выровненные массивы цен
    const prices1 = [];
    const prices2 = [];
    
    for (const ts of commonTimestamps) {
      prices1.push(map1.get(ts));
      prices2.push(map2.get(ts));
    }
    
    return { prices1, prices2 };
  }

  /**
   * Сохраняет результаты расчета корреляций в базу данных
   * @param {Object} correlationMatrix Матрица корреляций
   * @param {number} days Количество дней для анализа
   * @returns {Promise<boolean>} Успешность сохранения
   */
  async saveCorrelations(correlationMatrix, days) {
    try {
      const { timestamp, correlations } = correlationMatrix;
      const timeFrame = `${days}d`;
      
      // Подготавливаем запросы для сохранения
      const queries = [];
      
      // Обрабатываем матрицу корреляций
      for (const [crypto1, correlationsMap] of Object.entries(correlations)) {
        for (const [crypto2, correlationValue] of Object.entries(correlationsMap)) {
          // Пропускаем корреляцию с самим собой
          if (crypto1 === crypto2) continue;
          
          // Пропускаем дублирующие пары (каждую пару сохраняем только один раз)
          if (crypto1 > crypto2) continue;
          
          queries.push({
            sql: `INSERT INTO correlations (
                    crypto_id_1, crypto_id_2, correlation_value, 
                    time_frame, timestamp
                  ) VALUES (?, ?, ?, ?, ?)`,
            params: [
              crypto1, crypto2, correlationValue,
              timeFrame, timestamp
            ]
          });
        }
      }
      
      // Если есть запросы, выполняем их в рамках транзакции
      if (queries.length > 0) {
        await db.transaction(queries);
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении корреляций:', error);
      throw error;
    }
  }

  /**
   * Получает последние рассчитанные корреляции из базы данных
   * @param {string} timeFrame Временной период (например, '30d')
   * @param {number} limit Максимальное количество пар
   * @returns {Promise<Array>} Массив с корреляциями
   */
  async getLatestCorrelations(timeFrame = '30d', limit = 10) {
    try {
      // Получаем последние рассчитанные корреляции
      const correlations = await db.all(
        `SELECT c.*, c1.name as crypto_name_1, c1.symbol as symbol_1, 
                c2.name as crypto_name_2, c2.symbol as symbol_2
         FROM correlations c
         JOIN cryptocurrencies c1 ON c.crypto_id_1 = c1.id
         JOIN cryptocurrencies c2 ON c.crypto_id_2 = c2.id
         WHERE c.time_frame = ?
         ORDER BY c.timestamp DESC, ABS(c.correlation_value) DESC
         LIMIT ?`,
        [timeFrame, limit]
      );
      
      return correlations;
    } catch (error) {
      console.error('Ошибка при получении корреляций:', error);
      throw error;
    }
  }

  /**
   * Получает корреляции для конкретной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {string} timeFrame Временной период (например, '30d')
   * @param {number} limit Максимальное количество пар
   * @returns {Promise<Array>} Массив с корреляциями
   */
  async getCorrelationsForCrypto(cryptoId, timeFrame = '30d', limit = 10) {
    try {
      // Получаем корреляции для указанной криптовалюты
      const correlations = await db.all(
        `SELECT c.*, 
                CASE 
                    WHEN c.crypto_id_1 = ? THEN c.crypto_id_2 
                    ELSE c.crypto_id_1 
                END as paired_crypto_id,
                CASE 
                    WHEN c.crypto_id_1 = ? THEN c2.name
                    ELSE c1.name
                END as paired_crypto_name,
                CASE 
                    WHEN c.crypto_id_1 = ? THEN c2.symbol
                    ELSE c1.symbol
                END as paired_crypto_symbol
         FROM correlations c
         JOIN cryptocurrencies c1 ON c.crypto_id_1 = c1.id
         JOIN cryptocurrencies c2 ON c.crypto_id_2 = c2.id
         WHERE (c.crypto_id_1 = ? OR c.crypto_id_2 = ?)
         AND c.time_frame = ?
         ORDER BY c.timestamp DESC, ABS(c.correlation_value) DESC
         LIMIT ?`,
        [
          cryptoId, cryptoId, cryptoId,
          cryptoId, cryptoId, timeFrame, limit
        ]
      );
      
      return correlations;
    } catch (error) {
      console.error(`Ошибка при получении корреляций для ${cryptoId}:`, error);
      throw error;
    }
  }
}

// Создаем и экспортируем экземпляр сервиса анализа корреляций
const correlationAnalysis = new CorrelationAnalysisService();
module.exports = correlationAnalysis;