// Вспомогательные функции для работы с данными криптовалют

import { PRICE_CHANGE_THRESHOLDS, RSI_THRESHOLDS } from './constants';

/**
 * Форматирует число как валюту
 * @param {number} value - Число для форматирования
 * @param {string} locale - Локаль (default: 'en-US')
 * @param {string} currency - Валюта (default: 'USD')
 * @returns {string} Отформатированная строка
 */
export const formatCurrency = (value, locale = 'en-US', currency = 'USD') => {
  if (value === undefined || value === null) return 'N/A';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Форматирует большие числа в удобочитаемом формате (M, B, T)
 * @param {number} value - Число для форматирования
 * @param {number} decimals - Количество десятичных знаков (default: 2)
 * @returns {string} Отформатированная строка
 */
export const formatLargeNumber = (value, decimals = 2) => {
  if (value === undefined || value === null) return 'N/A';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    return (value / 1e12).toFixed(decimals) + 'T';
  } else if (absValue >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B';
  } else if (absValue >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  } else if (absValue >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  } else {
    return value.toFixed(decimals);
  }
};

/**
 * Форматирует процентное изменение
 * @param {number} value - Значение для форматирования
 * @param {number} decimals - Количество десятичных знаков (default: 2)
 * @returns {string} Отформатированная строка
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === undefined || value === null) return 'N/A';
  
  return value.toFixed(decimals) + '%';
};

/**
 * Форматирует дату и время
 * @param {string|number|Date} date - Дата для форматирования
 * @param {string} locale - Локаль (default: 'en-US')
 * @returns {string} Отформатированная строка
 */
export const formatDateTime = (date, locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  
  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Определяет, является ли изменение цены значительным
 * @param {number} percentChange - Процентное изменение
 * @returns {string|null} Степень значимости или null
 */
export const getPriceChangeSignificance = (percentChange) => {
  const absChange = Math.abs(percentChange);
  
  if (absChange >= PRICE_CHANGE_THRESHOLDS.MAJOR) {
    return 'major';
  } else if (absChange >= PRICE_CHANGE_THRESHOLDS.MODERATE) {
    return 'moderate';
  } else if (absChange >= PRICE_CHANGE_THRESHOLDS.MINOR) {
    return 'minor';
  }
  
  return null;
};

/**
 * Определяет состояние RSI (перекупленность/перепроданность)
 * @param {number} rsiValue - Значение RSI
 * @returns {string|null} Состояние RSI или null
 */
export const getRSICondition = (rsiValue) => {
  if (rsiValue >= RSI_THRESHOLDS.OVERBOUGHT) {
    return 'overbought';
  } else if (rsiValue <= RSI_THRESHOLDS.OVERSOLD) {
    return 'oversold';
  }
  
  return null;
};

/**
 * Получает CSS класс для отображения изменения цены
 * @param {number} percentChange - Процентное изменение
 * @returns {string} CSS класс
 */
export const getPriceChangeClass = (percentChange) => {
  if (percentChange > 0) {
    return 'price-up';
  } else if (percentChange < 0) {
    return 'price-down';
  }
  
  return '';
};

/**
 * Получает иконку для отображения направления изменения
 * @param {number} percentChange - Процентное изменение
 * @returns {string} Unicode-символ
 */
export const getPriceChangeIcon = (percentChange) => {
  if (percentChange > 0) {
    return '▲';
  } else if (percentChange < 0) {
    return '▼';
  }
  
  return '•';
};

/**
 * Обрезает текст до указанной длины
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина (default: 100)
 * @returns {string} Обрезанный текст
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Вычисляет процентное изменение между двумя значениями
 * @param {number} currentValue - Текущее значение
 * @param {number} previousValue - Предыдущее значение
 * @returns {number} Процентное изменение
 */
export const calculatePercentageChange = (currentValue, previousValue) => {
  if (!previousValue) return 0;
  
  return ((currentValue - previousValue) / previousValue) * 100;
};

/**
 * Добавляет протокол к URL, если его нет
 * @param {string} url - URL для проверки
 * @returns {string} URL с протоколом
 */
export const ensureHttpProtocol = (url) => {
  if (!url) return '';
  
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url;
  }
  
  return url;
};

/**
 * Группирует данные по заданному полю
 * @param {Array} array - Массив данных
 * @param {string} key - Ключ для группировки
 * @returns {Object} Сгруппированные данные
 */
export const groupBy = (array, key) => {
  if (!array || !array.length) return {};
  
  return array.reduce((result, item) => {
    const groupKey = item[key];
    
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    
    result[groupKey].push(item);
    return result;
  }, {});
};