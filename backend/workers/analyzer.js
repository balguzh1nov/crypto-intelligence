/**
 * Воркер для анализа данных и генерации индикаторов
 */
const technicalAnalysis = require('../services/technicalAnalysis');
const correlationAnalysis = require('../services/correlationAnalysis');
const alertService = require('../services/alertService');
const db = require('../database/db');
const config = require('../config');

class Analyzer {
  constructor() {
    this.analyzeInterval = 300000; // 5 минут
    this.analyzeTimer = null;
    this.isRunning = false;
  }

  /**
   * Запуск процесса анализа
   */
  async start() {
    if (this.isRunning) {
      console.log('Analyzer уже запущен');
      return;
    }

    console.log('Запуск Analyzer...');
    this.isRunning = true;

    // Запускаем анализ сразу при старте
    await this.runAnalysis();

    // Запускаем периодический анализ
    this.analyzeTimer = setInterval(() => this.runAnalysis(), this.analyzeInterval);

    console.log(`Analyzer запущен. Интервал анализа: ${this.analyzeInterval}ms`);
  }

  /**
   * Остановка процесса анализа
   */
  stop() {
    if (!this.isRunning) {
      console.log('Analyzer уже остановлен');
      return;
    }

    console.log('Остановка Analyzer...');
    
    // Очищаем таймер
    if (this.analyzeTimer) {
      clearInterval(this.analyzeTimer);
      this.analyzeTimer = null;
    }

    this.isRunning = false;
    console.log('Analyzer остановлен');
  }

  /**
   * Запуск процесса анализа данных
   */
  async runAnalysis() {
    try {
      console.log('Запуск анализа данных...');
      
      // Получаем список криптовалют для анализа
      const cryptos = await this.getTopCryptos(10);
      
      if (!cryptos || cryptos.length === 0) {
        console.log('Нет данных для анализа');
        return;
      }
      
      // Выполняем технический анализ для каждой криптовалюты
      for (const crypto of cryptos) {
        try {
          const indicators = await technicalAnalysis.calculateIndicators(crypto.id);
          const interpretation = technicalAnalysis.interpretIndicators(indicators);
          
          // Создаем оповещения на основе технических индикаторов
          await alertService.processIndicators(crypto.id, indicators, interpretation);
        } catch (error) {
          console.error(`Ошибка при анализе ${crypto.id}:`, error);
        }
      }
      
      // Выполняем корреляционный анализ
      try {
        const cryptoIds = cryptos.map(crypto => crypto.id);
        await correlationAnalysis.calculateCorrelations(cryptoIds);
      } catch (error) {
        console.error('Ошибка при расчете корреляций:', error);
      }
      
      console.log('Анализ данных завершен');
    } catch (error) {
      console.error('Ошибка при запуске анализа:', error);
    }
  }

  /**
   * Получение списка топ-криптовалют для анализа
   * @param {number} limit Количество криптовалют
   * @returns {Promise<Array>} Массив криптовалют
   */
  async getTopCryptos(limit = 10) {
    try {
      const cryptos = await db.all(
        'SELECT id, name, symbol FROM cryptocurrencies ORDER BY market_cap_rank ASC LIMIT ?',
        [limit]
      );
      
      return cryptos;
    } catch (error) {
      console.error('Ошибка при получении списка криптовалют:', error);
      return [];
    }
  }
}

module.exports = new Analyzer();