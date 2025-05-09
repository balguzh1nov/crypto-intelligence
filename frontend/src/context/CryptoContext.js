import React, { createContext, useState, useEffect, useCallback } from 'react';
import { initializeWebSocket } from '../services/websocket';
import { fetchMarketData } from '../services/api';

export const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
  const [marketData, setMarketData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Загрузка начальных данных через REST API (резервный вариант)
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketData();
      setMarketData(data || []);
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Не удалось загрузить данные о рынке');
      setIsLoading(false);
    }
  }, []);

  // Инициализация WebSocket соединения
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        const onMarketUpdate = (data) => {
          setMarketData(data);
          setLastUpdated(new Date());
        };

        const onNewAlerts = (data) => {
          if (data && data.length > 0) {
            setAlerts(prevAlerts => {
              const combinedAlerts = [...data, ...prevAlerts];
              const uniqueAlerts = Array.from(new Map(combinedAlerts.map(alert => 
                [alert.id, alert]
              )).values());
              
              return uniqueAlerts
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 50);
            });
          }
        };

        const onInitialData = (data) => {
          if (data.marketData) {
            setMarketData(data.marketData);
          }
          if (data.lastUpdated) {
            setLastUpdated(new Date(data.lastUpdated));
          }
          setIsLoading(false);
        };

        const onLatestAlerts = (data) => {
          setAlerts(data || []);
        };

        await initializeWebSocket({
          onMarketUpdate,
          onNewAlerts,
          onInitialData,
          onLatestAlerts,
          onConnect: () => setIsConnected(true),
          onDisconnect: () => setIsConnected(false),
          onError: (err) => setError(err)
        });
      } catch (err) {
        console.error('WebSocket initialization error:', err);
        setError('Не удалось установить соединение с сервером');
        // Резервное получение данных через REST API
        loadInitialData();
      }
    };
    
    setupWebSocket();
  }, [loadInitialData]); // Добавляем loadInitialData в зависимости

  return (
    <CryptoContext.Provider value={{ 
      marketData, 
      alerts, 
      isLoading, 
      error, 
      lastUpdated,
      isConnected
    }}>
      {children}
    </CryptoContext.Provider>
  );
};