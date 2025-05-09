/**
 * Сервис для расчета технических индикаторов криптовалют
 */
const { EventEmitter } = require('events');
const db = require('../database/db');
const config = require('../config');
const technicalindicators = require('technicalindicators');

class TechnicalAnalysisService extends EventEmitter {
  constructor() {
    super();
    
    // Настройки для технических индикаторов
    this.smaSettings = config.analytics.indicators.sma;
    this.rsiSettings = config.analytics.indicators.rsi;
    this.macdSettings = config.analytics.indicators.macd;
  }

  /**
   * Запускает расчет технических индикаторов для указанной криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @param {number} days Количество дней для анализа (по умолчанию 30)
   * @returns {Promise<Object>} Результаты расчета индикаторов
   */
  async calculateIndicators(cryptoId, days = 30) {
    try {
      // Получаем исторические данные о ценах
      const priceData = await this.getHistoricalPriceData(cryptoId, days);
      
      if (!priceData || priceData.length === 0) {
        throw new Error(`Нет исторических данных для ${cryptoId}`);
      }

      // Извлекаем цены закрытия из данных
      const prices = priceData.map(item => item.price);
      
      // Результаты расчетов
      const results = {
        cryptoId,
        timestamp: new Date().toISOString(),
        prices: prices,
        indicators: {}
      };

      // Рассчитываем SMA для разных периодов
      results.indicators.sma = this.calculateSMA(prices);
      
      // Рассчитываем RSI
      results.indicators.rsi = this.calculateRSI(prices);
      
      // Рассчитываем MACD
      results.indicators.macd = this.calculateMACD(prices);

      // Сохраняем результаты в базу данных
      await this.saveIndicators(results);
      
      // Генерируем событие о завершении расчета
      this.emit('indicatorsCalculated', results);
      
      return results;
    } catch (error) {
      console.error(`Ошибка при расчете индикаторов для ${cryptoId}:`, error);
      
      // Генерируем событие об ошибке
      this.emit('error', {
        message: `Ошибка при расчете индикаторов для ${cryptoId}`,
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
        `SELECT price, market_cap, total_volume, timestamp 
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
   * Рассчитывает Simple Moving Average (SMA) для разных периодов
   * @param {Array} prices Массив цен
   * @returns {Object} Результаты расчета SMA
   */
  calculateSMA(prices) {
    const results = {};
    
    // Рассчитываем SMA для каждого периода из настроек
    for (const period of this.smaSettings.periods) {
      const sma = technicalindicators.SMA.calculate({
        period: period,
        values: prices
      });
      
      // Добавляем результаты в объект с учетом смещения
      results[`period_${period}`] = {
        period: period,
        values: sma,
        // Последнее значение индикатора (текущее)
        current: sma.length > 0 ? sma[sma.length - 1] : null
      };
    }
    
    return results;
  }

  /**
   * Рассчитывает Relative Strength Index (RSI)
   * @param {Array} prices Массив цен
   * @returns {Object} Результаты расчета RSI
   */
  calculateRSI(prices) {
    const rsi = technicalindicators.RSI.calculate({
      period: this.rsiSettings.period,
      values: prices
    });
    
    const currentValue = rsi.length > 0 ? rsi[rsi.length - 1] : null;
    
    // Определяем состояние рынка на основе RSI
    let marketCondition = 'neutral';
    
    if (currentValue !== null) {
      if (currentValue >= this.rsiSettings.overbought) {
        marketCondition = 'overbought';
      } else if (currentValue <= this.rsiSettings.oversold) {
        marketCondition = 'oversold';
      }
    }
    
    return {
      period: this.rsiSettings.period,
      values: rsi,
      current: currentValue,
      overbought: this.rsiSettings.overbought,
      oversold: this.rsiSettings.oversold,
      condition: marketCondition
    };
  }

  /**
   * Рассчитывает Moving Average Convergence Divergence (MACD)
   * @param {Array} prices Массив цен
   * @returns {Object} Результаты расчета MACD
   */
  calculateMACD(prices) {
    const macd = technicalindicators.MACD.calculate({
      fastPeriod: this.macdSettings.fastPeriod,
      slowPeriod: this.macdSettings.slowPeriod,
      signalPeriod: this.macdSettings.signalPeriod,
      values: prices
    });
    
    // Определяем текущее значение
    const current = macd.length > 0 ? macd[macd.length - 1] : null;
    
    // Определяем сигнал на основе MACD
    let signal = 'neutral';
    
    if (current) {
      // Если MACD пересекает сигнальную линию снизу вверх - сигнал на покупку
      if (current.MACD > current.signal && 
          macd.length > 1 && 
          macd[macd.length - 2].MACD <= macd[macd.length - 2].signal) {
        signal = 'buy';
      } 
      // Если MACD пересекает сигнальную линию сверху вниз - сигнал на продажу
      else if (current.MACD < current.signal && 
               macd.length > 1 && 
               macd[macd.length - 2].MACD >= macd[macd.length - 2].signal) {
        signal = 'sell';
      }
    }
    
    return {
      fastPeriod: this.macdSettings.fastPeriod,
      slowPeriod: this.macdSettings.slowPeriod,
      signalPeriod: this.macdSettings.signalPeriod,
      values: macd,
      current: current,
      signal: signal
    };
  }

  /**
   * Сохраняет рассчитанные индикаторы в базу данных
   * @param {Object} results Результаты расчета индикаторов
   * @returns {Promise<boolean>} Успешность сохранения
   */
  async saveIndicators(results) {
    try {
      const queries = [];
      const timestamp = results.timestamp;
      const cryptoId = results.cryptoId;
      
      // Сохраняем SMA индикаторы
      for (const [key, sma] of Object.entries(results.indicators.sma)) {
        if (sma.current !== null) {
          // Дополнительная проверка на null
          if (sma.current === null || sma.current === undefined) continue;
          
          queries.push({
            sql: `INSERT INTO technical_indicators 
                  (crypto_id, indicator_type, value, parameters, timestamp) 
                  VALUES (?, ?, ?, ?, ?)`,
            params: [
              cryptoId,
              'SMA',
              sma.current,
              JSON.stringify({ period: sma.period }),
              timestamp
            ]
          });
        }
      }
      
      // Сохраняем RSI индикатор
      if (results.indicators.rsi.current !== null) {
        // Дополнительная проверка на null
        if (results.indicators.rsi.current === null || results.indicators.rsi.current === undefined) {
            // Пропускаем этот индикатор
            console.log("Пропуск RSI индикатора из-за null значения");
          } else {
            queries.push({
              sql: `INSERT INTO technical_indicators 
                    (crypto_id, indicator_type, value, parameters, timestamp) 
                    VALUES (?, ?, ?, ?, ?)`,
              params: [
                cryptoId,
                'RSI',
                results.indicators.rsi.current,
                JSON.stringify({ 
                  period: results.indicators.rsi.period,
                  condition: results.indicators.rsi.condition
                }),
                timestamp
              ]
            });
          }
        
        queries.push({
          sql: `INSERT INTO technical_indicators 
                (crypto_id, indicator_type, value, parameters, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
          params: [
            cryptoId,
            'RSI',
            results.indicators.rsi.current,
            JSON.stringify({ 
              period: results.indicators.rsi.period,
              condition: results.indicators.rsi.condition
            }),
            timestamp
          ]
        });
      }
      
        // Дополнительная проверка на null
        if (!results.indicators.macd.current || results.indicators.macd.current.MACD === null || results.indicators.macd.current.MACD === undefined) {
            // Пропускаем этот индикатор
            console.log("Пропуск MACD индикатора из-за null значения");
          } else {

        // Сохраняем линию MACD
        queries.push({
          sql: `INSERT INTO technical_indicators 
                (crypto_id, indicator_type, value, parameters, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
          params: [
            cryptoId,
            'MACD_line',
            results.indicators.macd.current.MACD,
            JSON.stringify({ 
              fastPeriod: results.indicators.macd.fastPeriod,
              slowPeriod: results.indicators.macd.slowPeriod,
              signalPeriod: results.indicators.macd.signalPeriod,
              signal: results.indicators.macd.signal
            }),
            timestamp
          ]
        });
        
        // Сохраняем сигнальную линию
        queries.push({
          sql: `INSERT INTO technical_indicators 
                (crypto_id, indicator_type, value, parameters, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
          params: [
            cryptoId,
            'MACD_signal',
            results.indicators.macd.current.signal,
            JSON.stringify({ 
              fastPeriod: results.indicators.macd.fastPeriod,
              slowPeriod: results.indicators.macd.slowPeriod,
              signalPeriod: results.indicators.macd.signalPeriod
            }),
            timestamp
          ]
        });
        
        // Сохраняем гистограмму
        queries.push({
          sql: `INSERT INTO technical_indicators 
                (crypto_id, indicator_type, value, parameters, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
          params: [
            cryptoId,
            'MACD_histogram',
            results.indicators.macd.current.histogram,
            JSON.stringify({ 
              fastPeriod: results.indicators.macd.fastPeriod,
              slowPeriod: results.indicators.macd.slowPeriod,
              signalPeriod: results.indicators.macd.signalPeriod
            }),
            timestamp
          ]
        });
      }
      
      // Выполняем все запросы к базе данных
      await db.transaction(queries);
      
      return true;
    } catch (error) {
      console.error(`Ошибка при сохранении индикаторов для ${results.cryptoId}:`, error);
      throw error;
    }
  }

  /**
   * Получает последние значения технических индикаторов для криптовалюты
   * @param {string} cryptoId ID криптовалюты
   * @returns {Promise<Object>} Объект с последними значениями индикаторов
   */
  async getLatestIndicators(cryptoId) {
    try {
      // Получаем последние значения SMA для разных периодов
      const smaPeriods = this.smaSettings.periods;
      const smaResults = {};
      
      for (const period of smaPeriods) {
        const sma = await db.get(
          `SELECT value, timestamp, parameters
           FROM technical_indicators
           WHERE crypto_id = ? AND indicator_type = 'SMA'
           AND JSON_EXTRACT(parameters, '$.period') = ?
           ORDER BY timestamp DESC
           LIMIT 1`,
          [cryptoId, period]
        );
        
        if (sma) {
          smaResults[`period_${period}`] = {
            value: sma.value,
            timestamp: sma.timestamp,
            parameters: JSON.parse(sma.parameters)
          };
        }
      }
      
      // Получаем последнее значение RSI
      const rsi = await db.get(
        `SELECT value, timestamp, parameters
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'RSI'
         ORDER BY timestamp DESC
         LIMIT 1`,
        [cryptoId]
      );
      
      // Получаем последние значения MACD
      const macdLine = await db.get(
        `SELECT value, timestamp, parameters
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'MACD_line'
         ORDER BY timestamp DESC
         LIMIT 1`,
        [cryptoId]
      );
      
      const macdSignal = await db.get(
        `SELECT value, timestamp, parameters
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'MACD_signal'
         ORDER BY timestamp DESC
         LIMIT 1`,
        [cryptoId]
      );
      
      const macdHistogram = await db.get(
        `SELECT value, timestamp, parameters
         FROM technical_indicators
         WHERE crypto_id = ? AND indicator_type = 'MACD_histogram'
         ORDER BY timestamp DESC
         LIMIT 1`,
        [cryptoId]
      );
      
      // Формируем объект с результатами
      return {
        cryptoId,
        timestamp: new Date().toISOString(),
        indicators: {
          sma: smaResults,
          rsi: rsi ? {
            value: rsi.value,
            timestamp: rsi.timestamp,
            parameters: JSON.parse(rsi.parameters)
          } : null,
          macd: macdLine ? {
            line: {
              value: macdLine.value,
              timestamp: macdLine.timestamp,
              parameters: JSON.parse(macdLine.parameters)
            },
            signal: macdSignal ? {
              value: macdSignal.value,
              timestamp: macdSignal.timestamp
            } : null,
            histogram: macdHistogram ? {
              value: macdHistogram.value,
              timestamp: macdHistogram.timestamp
            } : null
          } : null
        }
      };
    } catch (error) {
      console.error(`Ошибка при получении индикаторов для ${cryptoId}:`, error);
      throw error;
    }
  }

  /**
   * Интерпретирует технические индикаторы и формирует общий сигнал
   * @param {Object} indicators Объект с техническими индикаторами
   * @returns {Object} Интерпретация индикаторов
   */
  interpretIndicators(indicators) {
    // Базовая проверка входных данных
    if (!indicators || !indicators.indicators) {
      return { status: 'error', message: 'Некорректные данные индикаторов' };
    }
    
    const { sma, rsi, macd } = indicators.indicators;
    
    // Счетчики для разных сигналов
    let buySignals = 0;
    let sellSignals = 0;
    let neutralSignals = 0;
    
    const interpretation = {
      sma: {},
      rsi: null,
      macd: null,
      overall: {}
    };
    
    // Интерпретация SMA
    if (sma && Object.keys(sma).length > 0) {
      // Получаем периоды SMA в порядке возрастания
      const periods = Object.keys(sma)
        .map(key => parseInt(key.replace('period_', '')))
        .sort((a, b) => a - b);
      
      // Проверяем пересечение SMA с разными периодами
      if (periods.length >= 2) {
        // Короткая SMA и длинная SMA
        const shortPeriod = periods[0];
        const longPeriod = periods[periods.length - 1];
        
        if (sma[`period_${shortPeriod}`] && sma[`period_${longPeriod}`]) {
          const shortSMA = sma[`period_${shortPeriod}`].value;
          const longSMA = sma[`period_${longPeriod}`].value;
          
          if (shortSMA > longSMA) {
            interpretation.sma.crossover = 'bullish';
            buySignals++;
          } else if (shortSMA < longSMA) {
            interpretation.sma.crossover = 'bearish';
            sellSignals++;
          } else {
            interpretation.sma.crossover = 'neutral';
            neutralSignals++;
          }
        }
      }
    }
    
    // Интерпретация RSI
    if (rsi && rsi.value !== null) {
      interpretation.rsi = {};
      
      // Значение RSI
      const rsiValue = rsi.value;
      const overbought = this.rsiSettings.overbought;
      const oversold = this.rsiSettings.oversold;
      
      if (rsiValue >= overbought) {
        interpretation.rsi.condition = 'overbought';
        interpretation.rsi.signal = 'sell';
        sellSignals++;
      } else if (rsiValue <= oversold) {
        interpretation.rsi.condition = 'oversold';
        interpretation.rsi.signal = 'buy';
        buySignals++;
      } else {
        interpretation.rsi.condition = 'neutral';
        interpretation.rsi.signal = 'neutral';
        neutralSignals++;
      }
    }
    
    // Интерпретация MACD
    if (macd && macd.line && macd.signal) {
      interpretation.macd = {};
      
      const macdValue = macd.line.value;
      const signalValue = macd.signal.value;
      
      // Проверяем пересечение MACD и сигнальной линии
      if (macdValue > signalValue) {
        interpretation.macd.crossover = 'bullish';
        interpretation.macd.signal = 'buy';
        buySignals++;
      } else if (macdValue < signalValue) {
        interpretation.macd.crossover = 'bearish';
        interpretation.macd.signal = 'sell';
        sellSignals++;
      } else {
        interpretation.macd.crossover = 'neutral';
        interpretation.macd.signal = 'neutral';
        neutralSignals++;
      }
      
      // Проверяем гистограмму MACD (если доступна)
      if (macd.histogram) {
        const histogramValue = macd.histogram.value;
        
        if (histogramValue > 0 && histogramValue > macd.histogram.previousValue) {
          interpretation.macd.histogram = 'increasing_positive';
        } else if (histogramValue > 0 && histogramValue < macd.histogram.previousValue) {
          interpretation.macd.histogram = 'decreasing_positive';
        } else if (histogramValue < 0 && histogramValue < macd.histogram.previousValue) {
          interpretation.macd.histogram = 'decreasing_negative';
        } else if (histogramValue < 0 && histogramValue > macd.histogram.previousValue) {
          interpretation.macd.histogram = 'increasing_negative';
        } else {
          interpretation.macd.histogram = 'neutral';
        }
      }
    }
    
    // Формируем общий сигнал
    if (buySignals > sellSignals && buySignals > neutralSignals) {
      interpretation.overall.signal = 'buy';
      interpretation.overall.strength = buySignals / (buySignals + sellSignals + neutralSignals);
    } else if (sellSignals > buySignals && sellSignals > neutralSignals) {
      interpretation.overall.signal = 'sell';
      interpretation.overall.strength = sellSignals / (buySignals + sellSignals + neutralSignals);
    } else {
      interpretation.overall.signal = 'neutral';
      interpretation.overall.strength = neutralSignals / (buySignals + sellSignals + neutralSignals);
    }
    
    interpretation.overall.buySignals = buySignals;
    interpretation.overall.sellSignals = sellSignals;
    interpretation.overall.neutralSignals = neutralSignals;
    
    return interpretation;
  }
}

// Создаем и экспортируем экземпляр сервиса анализа
const technicalAnalysis = new TechnicalAnalysisService();
module.exports = technicalAnalysis;