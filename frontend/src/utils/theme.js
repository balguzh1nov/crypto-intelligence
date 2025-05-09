// Модуль для управления темой оформления приложения

/**
 * Доступные темы
 */
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  };
  
  /**
   * Ключ для хранения темы в localStorage
   */
  const THEME_STORAGE_KEY = 'crypto-dashboard-theme';
  
  /**
   * Получает текущую тему из localStorage
   * @returns {string} Текущая тема или значение по умолчанию
   */
  export const getCurrentTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
      return savedTheme;
    }
    
    return THEMES.SYSTEM;
  };
  
  /**
   * Сохраняет тему в localStorage
   * @param {string} theme - Тема для сохранения
   */
  export const saveTheme = (theme) => {
    if (Object.values(THEMES).includes(theme)) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  };
  
  /**
   * Применяет тему к документу
   * @param {string} theme - Тема для применения
   */
  export const applyTheme = (theme) => {
    let effectiveTheme = theme;
    
    // Если тема 'system', определяем её на основе системных настроек
    if (theme === THEMES.SYSTEM) {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEMES.DARK
        : THEMES.LIGHT;
    }
    
    // Удаляем существующие классы тем
    document.documentElement.classList.remove(THEMES.LIGHT, THEMES.DARK);
    
    // Добавляем класс для активной темы
    document.documentElement.classList.add(effectiveTheme);
    
    // Обновляем мета-тег theme-color
    const metaThemeColor = document.querySelector('meta[name=theme-color]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        effectiveTheme === THEMES.DARK ? '#121212' : '#ffffff'
      );
    }
  };
  
  /**
   * Переключает тему между светлой и тёмной
   */
  export const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    let newTheme;
    
    if (currentTheme === THEMES.DARK) {
      newTheme = THEMES.LIGHT;
    } else if (currentTheme === THEMES.LIGHT) {
      newTheme = THEMES.DARK;
    } else {
      // Если текущая тема 'system', переключаемся на явную тему
      newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEMES.LIGHT
        : THEMES.DARK;
    }
    
    saveTheme(newTheme);
    applyTheme(newTheme);
    
    return newTheme;
  };
  
  /**
   * Инициализирует обработчик для отслеживания изменений системной темы
   */
  export const initThemeListener = () => {
    const currentTheme = getCurrentTheme();
    
    // Применяем начальную тему
    applyTheme(currentTheme);
    
    // Добавляем слушатель для изменений системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (getCurrentTheme() === THEMES.SYSTEM) {
        applyTheme(THEMES.SYSTEM);
      }
    });
  };
  
  /**
   * Предоставляет объект с CSS-переменными для темы
   * @param {string} theme - Тема, для которой нужны переменные
   * @returns {Object} Объект с CSS-переменными
   */
  export const getThemeVariables = (theme) => {
    // Базовые переменные для светлой темы
    const lightTheme = {
      '--background-color': '#f8f9fa',
      '--card-background': '#ffffff',
      '--text-color': '#212529',
      '--text-secondary': '#6c757d',
      '--border-color': '#dee2e6',
      '--primary-color': '#0d6efd',
      '--secondary-color': '#6c757d',
      '--success-color': '#198754',
      '--info-color': '#0dcaf0',
      '--warning-color': '#ffc107',
      '--danger-color': '#dc3545',
      '--light-color': '#f8f9fa',
      '--dark-color': '#212529',
      '--shadow': '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
    };
    
    // Переменные для тёмной темы
    const darkTheme = {
      '--background-color': '#121212',
      '--card-background': '#1e1e1e',
      '--text-color': '#e0e0e0',
      '--text-secondary': '#adb5bd',
      '--border-color': '#343a40',
      '--primary-color': '#0d6efd',
      '--secondary-color': '#6c757d',
      '--success-color': '#198754',
      '--info-color': '#0dcaf0',
      '--warning-color': '#ffc107',
      '--danger-color': '#dc3545',
      '--light-color': '#f8f9fa',
      '--dark-color': '#212529',
      '--shadow': '0 0.5rem 1rem rgba(0, 0, 0, 0.5)'
    };
    
    if (theme === THEMES.DARK) {
      return darkTheme;
    }
    
    return lightTheme;
  };
  
  /**
   * Применяет CSS-переменные темы к элементу
   * @param {HTMLElement} element - Элемент, к которому применяются переменные
   * @param {string} theme - Тема для применения
   */
  export const applyThemeVariables = (element, theme) => {
    const variables = getThemeVariables(theme);
    
    Object.entries(variables).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
  };