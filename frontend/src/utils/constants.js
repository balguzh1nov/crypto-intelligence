// Константы для приложения криптовалютного дашборда

// API Endpoints
export const API_ENDPOINTS = {
    MARKET_DATA: '/api/market/data',
    CRYPTO_DETAIL: '/api/crypto/:id',
    HISTORICAL_DATA: '/api/crypto/:id/history',
    TECHNICAL_INDICATORS: '/api/crypto/:id/indicators',
    ALERTS: '/api/alerts'
  };
  
  // WebSocket Events
  export const WEBSOCKET_EVENTS = {
    MARKET_UPDATE: 'marketUpdate',
    NEW_ALERTS: 'newAlerts',
    INITIAL_DATA: 'initialData',
    LATEST_ALERTS: 'latestAlerts',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error'
  };
  
  // Состояния загрузки
  export const LOADING_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  };
  
  // Параметры графиков
  export const CHART_TIMEFRAMES = {
    ONE_DAY: '1d',
    ONE_WEEK: '7d',
    ONE_MONTH: '30d',
    THREE_MONTHS: '90d',
    ONE_YEAR: '365d',
    MAX: 'max'
  };
  
  // Цветовые схемы
  export const CHART_COLORS = {
    PRIMARY: 'rgba(75, 192, 192, 1)',
    PRIMARY_LIGHT: 'rgba(75, 192, 192, 0.2)',
    SECONDARY: 'rgba(54, 162, 235, 1)',
    SECONDARY_LIGHT: 'rgba(54, 162, 235, 0.2)',
    WARNING: 'rgba(255, 159, 64, 1)',
    WARNING_LIGHT: 'rgba(255, 159, 64, 0.2)',
    DANGER: 'rgba(255, 99, 132, 1)',
    DANGER_LIGHT: 'rgba(255, 99, 132, 0.2)',
    SUCCESS: 'rgba(75, 192, 192, 1)',
    SUCCESS_LIGHT: 'rgba(75, 192, 192, 0.2)'
  };
  
  // Типы оповещений
  export const ALERT_TYPES = {
    PRICE_SURGE: 'price_surge',
    PRICE_DROP: 'price_drop',
    PRICE_INCREASE: 'price_increase',
    PRICE_DECREASE: 'price_decrease',
    VOLUME_SPIKE: 'volume_spike',
    VOLUME_CHANGE: 'volume_change',
    RSI_OVERBOUGHT: 'rsi_overbought',
    RSI_OVERSOLD: 'rsi_oversold',
    MACD_BULLISH_CROSS: 'macd_bullish_cross',
    MACD_BEARISH_CROSS: 'macd_bearish_cross',
    SMA_BULLISH_CROSS: 'sma_bullish_cross',
    SMA_BEARISH_CROSS: 'sma_bearish_cross',
    STRONG_BUY_SIGNAL: 'strong_buy_signal',
    STRONG_SELL_SIGNAL: 'strong_sell_signal'
  };
  
  // Уровни важности оповещений
  export const ALERT_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  };
  
  // Технические индикаторы
  export const TECHNICAL_INDICATORS = {
    RSI: 'rsi',
    MACD: 'macd',
    SMA: 'sma',
    EMA: 'ema',
    BOLLINGER: 'bollinger',
    STOCHASTIC: 'stochastic'
  };
  
  // Торговые сигналы
  export const TRADING_SIGNALS = {
    BUY: 'buy',
    SELL: 'sell',
    NEUTRAL: 'neutral',
    BULLISH: 'bullish',
    BEARISH: 'bearish'
  };
  
  // Пределы для RSI
  export const RSI_THRESHOLDS = {
    OVERSOLD: 30,
    OVERBOUGHT: 70
  };
  
  // Языковые настройки
  export const LOCALES = {
    EN: 'en',
    RU: 'ru',
    ES: 'es',
    FR: 'fr',
    DE: 'de',
    CN: 'cn',
    JP: 'jp'
  };
  
  // Максимальное количество отображаемых оповещений
  export const MAX_VISIBLE_ALERTS = 50;
  
  // Опции для форматирования валют
  export const CURRENCY_FORMAT_OPTIONS = {
    USD: { style: 'currency', currency: 'USD' },
    EUR: { style: 'currency', currency: 'EUR' },
    GBP: { style: 'currency', currency: 'GBP' },
    JPY: { style: 'currency', currency: 'JPY' }
  };
  
  // Пороговые значения для значимых изменений цены (в процентах)
  export const PRICE_CHANGE_THRESHOLDS = {
    MINOR: 1,   // 1%
    MODERATE: 5, // 5%
    MAJOR: 10    // 10%
  };