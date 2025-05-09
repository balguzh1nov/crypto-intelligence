import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { NOTIFICATION_TYPES } from '../../services/notificationService';

// Анимация появления уведомления сверху
const slideDown = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Анимация исчезновения уведомления вверх
const slideUp = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-120%);
    opacity: 0;
  }
`;

// Получение цвета фона в зависимости от типа уведомления
const getBackgroundColor = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'linear-gradient(135deg, #4CAF50 0%, #43A047 100%)';
    case NOTIFICATION_TYPES.WARNING:
      return 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)';
    case NOTIFICATION_TYPES.ERROR:
      return 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)';
    case NOTIFICATION_TYPES.PREDICTION:
      return 'linear-gradient(135deg, #6e8efb 0%, #a777e3 100%)';
    case NOTIFICATION_TYPES.ALERT:
      return 'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)';
    case NOTIFICATION_TYPES.INFO:
    default:
      return 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
  }
};

// Получение иконки в зависимости от типа уведомления
const getIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return '✓';
    case NOTIFICATION_TYPES.WARNING:
      return '⚠';
    case NOTIFICATION_TYPES.ERROR:
      return '✗';
    case NOTIFICATION_TYPES.PREDICTION:
      return '📈';
    case NOTIFICATION_TYPES.ALERT:
      return '🔔';
    case NOTIFICATION_TYPES.INFO:
    default:
      return 'ℹ';
  }
};

// Контейнер для уведомления
const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  min-width: 300px;
  background: ${props => getBackgroundColor(props.type)};
  color: white;
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  padding: 15px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${props => props.isExiting 
    ? css`${slideUp} 0.5s ease forwards` 
    : css`${slideDown} 0.5s ease forwards`};
  
  @media (max-width: 480px) {
    right: 10px;
    left: 10px;
    max-width: calc(100% - 20px);
  }
`;

// Хедер уведомления
const ToastHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

// Заголовок уведомления
const ToastTitle = styled.h4`
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
`;

// Иконка уведомления
const ToastIcon = styled.span`
  margin-right: 10px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.3);
  width: 28px;
  height: 28px;
  border-radius: 50%;
`;

// Кнопка закрытия
const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

// Содержимое уведомления
const ToastBody = styled.div`
  margin-bottom: 10px;
  word-break: break-word;
`;

// Индикатор прогресса автоматического закрытия
const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.5);
  width: ${props => props.progress}%;
  transition: width 0.3s linear;
`;

// Действия уведомления
const ActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 5px 10px;
  margin-left: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

/**
 * Компонент для отображения всплывающего уведомления в стиле мобильных оповещений
 */
const NotificationToast = ({ 
  id, 
  title, 
  message, 
  type = NOTIFICATION_TYPES.INFO, 
  duration = 5000, 
  onClose,
  actions = []
}) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  
  // Управление автоматическим закрытием
  useEffect(() => {
    if (duration === 0) return; // Не закрывать автоматически, если duration = 0
    
    let timer;
    let startTime;
    let remaining = timeLeft;
    
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      if (elapsed < remaining) {
        // Обновляем прогресс
        const newProgress = 100 - (elapsed / duration * 100);
        setProgress(newProgress);
        setTimeLeft(remaining - elapsed);
        
        // Продолжаем анимацию
        timer = requestAnimationFrame(step);
      } else {
        // Время вышло, закрываем уведомление
        handleClose();
      }
    };
    
    if (!isPaused) {
      timer = requestAnimationFrame(step);
    }
    
    return () => {
      cancelAnimationFrame(timer);
    };
  }, [duration, isPaused, timeLeft]);
  
  // Функция закрытия с анимацией
  const handleClose = () => {
    setIsExiting(true);
    
    // Даем время на анимацию
    setTimeout(() => {
      if (onClose) onClose(id);
    }, 500);
  };
  
  // Обработчики наведения мыши для паузы
  const handleMouseEnter = () => {
    setIsPaused(true);
  };
  
  const handleMouseLeave = () => {
    setIsPaused(false);
  };
  
  return (
    <ToastContainer 
      type={type} 
      isExiting={isExiting}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ToastHeader>
        <ToastTitle>
          <ToastIcon>{getIcon(type)}</ToastIcon>
          {title}
        </ToastTitle>
        <CloseButton onClick={handleClose}>×</CloseButton>
      </ToastHeader>
      
      <ToastBody>{message}</ToastBody>
      
      {actions.length > 0 && (
        <ActionsContainer>
          {actions.map((action, index) => (
            <ActionButton 
              key={index} 
              onClick={() => {
                if (action.onClick) action.onClick();
                if (action.closeOnClick !== false) handleClose();
              }}
            >
              {action.label}
            </ActionButton>
          ))}
        </ActionsContainer>
      )}
      
      {duration > 0 && (
        <ProgressBar progress={progress} />
      )}
    </ToastContainer>
  );
};

export default NotificationToast;
