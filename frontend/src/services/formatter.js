/**
 * Форматирует число как валюту (USD)
 * @param {number} value - Число для форматирования
 * @returns {string} Отформатированная строка
 */
export const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value >= 1 ? 2 : 6
    });
    
    return formatter.format(value);
  };
  
  /**
   * Форматирует процентное изменение
   * @param {number} value - Процентное изменение
   * @returns {string} Отформатированная строка
   */
  export const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(value / 100);
  };
  
  /**
   * Форматирует дату и время
   * @param {string|Date} date - Дата для форматирования
   * @returns {string} Отформатированная строка
   */
  export const formatDateTime = (date) => {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Сокращает большие числа (миллионы, миллиарды)
   * @param {number} value - Число для форматирования
   * @returns {string} Отформатированная строка
   */
  export const formatLargeNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };