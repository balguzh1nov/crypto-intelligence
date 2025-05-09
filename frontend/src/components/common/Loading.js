import React from 'react';

/**
 * Компонент для отображения индикатора загрузки с опциональным текстом
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Сообщение для отображения (по умолчанию: "Loading...")
 * @param {string} props.size - Размер индикатора ('sm', 'md', 'lg')
 * @param {string} props.color - Цвет индикатора ('primary', 'secondary', и т.д.)
 * @param {boolean} props.fullPage - Если true, занимает весь экран
 */
const Loading = ({ 
  message = 'Loading...', 
  size = 'md', 
  color = 'primary',
  fullPage = false
}) => {
  // Определяем класс для размера спиннера
  const spinnerSizeClass = size === 'sm' ? 'spinner-border-sm' : 
                          size === 'lg' ? 'spinner-border-lg' : '';
  
  // Основной контейнер
  const containerClasses = fullPage 
    ? 'd-flex justify-content-center align-items-center vh-100' 
    : 'text-center py-4';

  return (
    <div className={containerClasses}>
      <div>
        <div className={`spinner-border text-${color} ${spinnerSizeClass}`} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        {message && <p className="mt-2">{message}</p>}
      </div>
    </div>
  );
};

/**
 * Компонент для отображения пульсирующего индикатора загрузки
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Сообщение для отображения
 */
export const PulseLoading = ({ message }) => {
  return (
    <div className="text-center py-4">
      <div className="loading-pulse">
        <div className="spinner-grow text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
};

/**
 * Компонент для отображения индикатора загрузки данных на графике
 */
export const ChartLoading = () => {
  return (
    <div className="chart-loading-container d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading chart data...</span>
        </div>
        <p className="mt-2">Loading chart data...</p>
      </div>
    </div>
  );
};

/**
 * Компонент для отображения индикатора загрузки внутри кнопки
 * @param {Object} props - Свойства компонента
 * @param {string} props.text - Текст кнопки
 * @param {string} props.color - Цвет кнопки ('primary', 'secondary', и т.д.)
 * @param {boolean} props.disabled - Если true, кнопка неактивна
 * @param {function} props.onClick - Обработчик нажатия
 */
export const ButtonLoading = ({ 
  text, 
  color = 'primary', 
  disabled = false, 
  onClick 
}) => {
  return (
    <button 
      className={`btn btn-${color}`} 
      type="button" 
      disabled={disabled}
      onClick={onClick}
    >
      <span 
        className="spinner-border spinner-border-sm me-2" 
        role="status" 
        aria-hidden="true"
      ></span>
      {text}
    </button>
  );
};

export default Loading;