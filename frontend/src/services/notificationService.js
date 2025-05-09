/**
 * Сервис для управления всплывающими уведомлениями
 */

// Аудио для воспроизведения уведомлений
const notificationSound = new Audio('/sounds/notification.mp3');

// Событие для обмена данными уведомлений между компонентами
const notificationEvent = new EventTarget();

// Типы уведомлений с соответствующими стилями
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  PREDICTION: 'prediction',
  ALERT: 'alert'
};

/**
 * Показывает всплывающее уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления из NOTIFICATION_TYPES
 * @param {number} duration - Длительность показа в мс
 * @param {boolean} playSound - Воспроизводить звук
 * @param {Object} options - Дополнительные опции (заголовок, действия и др.)
 */
const showNotification = (
  message,
  type = NOTIFICATION_TYPES.INFO,
  duration = 5000,
  playSound = true,
  options = {}
) => {
  // Создаем событие с данными уведомления
  const event = new CustomEvent('notification', {
    detail: {
      id: Date.now(),
      message,
      type,
      duration,
      title: options.title || getDefaultTitle(type),
      actions: options.actions || [],
      timestamp: new Date().toISOString(),
      data: options.data || null
    }
  });

  // Воспроизводим звук, если нужно
  if (playSound) {
    try {
      // Останавливаем и перезапускаем звук, если он уже воспроизводится
      notificationSound.pause();
      notificationSound.currentTime = 0;
      notificationSound.play().catch(error => {
        console.warn('Не удалось воспроизвести звук уведомления:', error.message);
      });
    } catch (error) {
      console.warn('Ошибка при воспроизведении звука:', error);
    }
  }

  // Отправляем событие
  notificationEvent.dispatchEvent(event);
};

/**
 * Подписка на получение уведомлений
 * @param {Function} callback - Функция обратного вызова
 * @returns {Function} - Функция для отписки
 */
const subscribeToNotifications = (callback) => {
  const handler = (event) => {
    callback(event.detail);
  };

  notificationEvent.addEventListener('notification', handler);

  // Возвращаем функцию для отписки
  return () => {
    notificationEvent.removeEventListener('notification', handler);
  };
};

/**
 * Получение заголовка по умолчанию для типа уведомления
 * @param {string} type - Тип уведомления
 * @returns {string} - Заголовок по умолчанию
 */
const getDefaultTitle = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'Успешно';
    case NOTIFICATION_TYPES.WARNING:
      return 'Внимание';
    case NOTIFICATION_TYPES.ERROR:
      return 'Ошибка';
    case NOTIFICATION_TYPES.PREDICTION:
      return 'Прогноз';
    case NOTIFICATION_TYPES.ALERT:
      return 'Оповещение';
    case NOTIFICATION_TYPES.INFO:
    default:
      return 'Информация';
  }
};

/**
 * Шорткаты для разных типов уведомлений
 */
const success = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.SUCCESS, duration, playSound, options);

const warning = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.WARNING, duration, playSound, options);

const error = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.ERROR, duration, playSound, options);

const info = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.INFO, duration, playSound, options);

const prediction = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.PREDICTION, duration, playSound, options);

const alert = (message, duration, playSound, options) => 
  showNotification(message, NOTIFICATION_TYPES.ALERT, duration, playSound, options);

// Экспортируем API сервиса
export {
  showNotification,
  subscribeToNotifications,
  NOTIFICATION_TYPES,
  success,
  warning,
  error,
  info,
  prediction,
  alert
};
