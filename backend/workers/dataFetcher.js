/**
 * Воркер для получения данных от CoinGecko API
 */
const coinGeckoService = require('../services/coingecko');
const dataProcessor = require('../services/dataProcessor');
const db = require('../database/db');
const config = require('../config');

class DataFetcher {
  constructor() {
    this.fetchInterval = config.coingecko.fetchInterval;
    this.fetchTimer = null;
    this.isRunning = false;
  }

  /**
   * Запуск процесса получения данных
   */
  async start() {
    if (this.isRunning) {
      console.log('DataFetcher уже запущен');
      return;
    }

    console.log('Запуск DataFetcher...');
    this.isRunning = true;

    // Инициализация базы данных
    await db.init();

    // Запуск сервиса CoinGecko
    await coinGeckoService.startFetching();

    // Установка обработчиков событий
    this.setupEventListeners();

    console.log(`DataFetcher запущен. Интервал обновления: ${this.fetchInterval}ms`);
  }

  /**
   * Остановка процесса получения данных
   */
  stop() {
    if (!this.isRunning) {
      console.log('DataFetcher уже остановлен');
      return;
    }

    console.log('Остановка DataFetcher...');
    
    // Останавливаем получение данных
    coinGeckoService.stopFetching();
    
    // Очищаем таймер
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }

    this.isRunning = false;
    console.log('DataFetcher остановлен');
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Обработка получения новых данных о рынке
    coinGeckoService.on('marketDataUpdated', async (marketData) => {
      console.log(`Получены данные о ${marketData.length} криптовалютах`);
      
      // Обработка данных
      await dataProcessor.processMarketData(marketData);
    });

    // Обработка ошибок получения данных
    coinGeckoService.on('error', (error) => {
      console.error('Ошибка в сервисе CoinGecko:', error);
    });
  }
}

module.exports = new DataFetcher();