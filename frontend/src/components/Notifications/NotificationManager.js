import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import NotificationToast from './NotificationToast';
import { subscribeToNotifications } from '../../services/notificationService';

const NotificationsContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  
  /* Контейнер не должен блокировать взаимодействие, 
     но сами уведомления должны быть интерактивными */
  & > * {
    pointer-events: auto;
  }
`;

/**
 * Компонент для управления всеми уведомлениями в приложении
 * Подписывается на сервис уведомлений и отображает их
 */
const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  
  // Максимальное количество отображаемых уведомлений
  const maxNotifications = 5;
  
  useEffect(() => {
    // Подписка на уведомления
    const unsubscribe = subscribeToNotifications((notification) => {
      setNotifications(prevNotifications => {
        // Ограничиваем количество одновременных уведомлений
        const updatedNotifications = [
          notification,
          ...prevNotifications.filter(n => n.id !== notification.id)
        ].slice(0, maxNotifications);
        
        return updatedNotifications;
      });
    });
    
    // Отписка при размонтировании
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Удаление уведомления
  const handleClose = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };
  
  return (
    <NotificationsContainer>
      {notifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={handleClose}
          actions={notification.actions}
          // Небольшая задержка между появлением нескольких уведомлений для лучшего эффекта
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </NotificationsContainer>
  );
};

export default NotificationManager;
