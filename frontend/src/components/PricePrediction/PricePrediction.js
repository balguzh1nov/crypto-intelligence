import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchPricePrediction } from '../../services/api';
import { prediction } from '../../services/notificationService';

const PredictionContainer = styled.div`
  background: linear-gradient(135deg, #6e8efb 0%, #a777e3 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  color: white;
`;

const PredictionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const PredictionTitle = styled.h3`
  font-size: 1.5rem;
  margin: 0;
`;

const PredictionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PredictionStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 200px;
  font-size: 1.1rem;
`;

const PredictionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const PredictionMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PredictionMetaValue = styled.span`
  font-weight: bold;
  font-size: 1.1rem;
`;

const PredictionMetaLabel = styled.span`
  font-size: 0.8rem;
  opacity: 0.7;
`;

const PredictionDisclaimer = styled.p`
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 15px;
  text-align: center;
  line-height: 1.4;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 0, 0, 0.1);
  padding: 10px 15px;
  border-radius: 8px;
  margin: 15px 0;
`;

// Компонент для отображения спиннера загрузки
const Spinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 3px solid #ffffff;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

/**
 * Компонент для отображения прогноза цены криптовалюты на основе машинного обучения
 * @param {Object} props - Свойства компонента
 * @param {string} props.cryptoId - ID криптовалюты
 * @param {string} props.cryptoName - Название криптовалюты
 * @param {number} props.currentPrice - Текущая цена
 */
const PricePrediction = ({ cryptoId, cryptoName, currentPrice }) => {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Функция для запроса прогноза
  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchPricePrediction(cryptoId, 7);
      setPredictionData(data);
      
      // Показываем уведомление с результатами прогноза
      if (data && data.predictions && data.predictions.length > 0) {
        const lastPrediction = data.predictions[data.predictions.length - 1];
        const predictedPrice = lastPrediction[1].toFixed(2);
        const change = ((lastPrediction[1] - currentPrice) / currentPrice * 100).toFixed(2);
        const isPositive = lastPrediction[1] > currentPrice;
        
        // Текст с прогнозом
        const message = `Цена ${cryptoName} через 7 дней: ${predictedPrice}$ (${isPositive ? '+' : ''}${change}%)`;
        
        // Качество модели
        const modelQuality = data.r2 >= 0.7 ? 'Высокая точность' : 
                             data.r2 >= 0.5 ? 'Средняя точность' : 'Низкая точность';
        
        // Отправляем уведомление
        prediction(
          message,
          10000,
          true,
          {
            title: `ML-прогноз для ${cryptoName}`,
            data: {
              cryptoId,
              cryptoName,
              predictedPrice,
              change,
              r2: data.r2
            },
            actions: [
              {
                label: 'Подробнее',
                onClick: () => {
                  // Прокрутка к блоку прогноза
                  const predictionElement = document.getElementById('ml-prediction');
                  if (predictionElement) {
                    predictionElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }
            ]
          }
        );
      }
    } catch (err) {
      console.error('Ошибка при получении прогноза:', err);
      setError(err.message || 'Не удалось получить прогноз');
    } finally {
      setLoading(false);
    }
  };
  
  // Форматирование данных для графика
  const prepareChartData = () => {
    if (!predictionData || !predictionData.predictions || predictionData.predictions.length === 0) {
      return null;
    }
    
    // Подготовка данных для основного прогноза
    const labels = predictionData.predictions.map(p => format(new Date(p[0]), 'd MMM', { locale: ru }));
    const predictionValues = predictionData.predictions.map(p => p[1]);
    
    // Данные для доверительного интервала (если есть)
    const lowerBound = predictionData.confidence_interval?.lower?.map(p => p[1]) || [];
    const upperBound = predictionData.confidence_interval?.upper?.map(p => p[1]) || [];
    
    // Определяем, положительный ли тренд
    const firstPrice = predictionValues[0];
    const lastPrice = predictionValues[predictionValues.length - 1];
    const isPositiveTrend = lastPrice > firstPrice;
    
    return {
      labels,
      datasets: [
        // Основной прогноз
        {
          label: `Прогноз цены ${cryptoName}`,
          data: predictionValues,
          borderColor: isPositiveTrend ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'white'
        },
        // Верхняя граница доверительного интервала
        upperBound.length > 0 ? {
          label: 'Верхняя граница',
          data: upperBound,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        } : null,
        // Нижняя граница доверительного интервала
        lowerBound.length > 0 ? {
          label: 'Нижняя граница',
          data: lowerBound,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        } : null
      ].filter(Boolean) // Убираем null значения
    };
  };
  
  // Опции для графика
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          callback: function(value) {
            if (value >= 1000) {
              return '$' + (value / 1000).toFixed(1) + 'K';
            } else if (value < 0.01) {
              return '$' + value.toFixed(6);
            } else if (value < 1) {
              return '$' + value.toFixed(4);
            }
            return '$' + value.toFixed(2);
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            
            const value = context.parsed.y;
            if (value >= 1000) {
              label += '$' + (value / 1000).toFixed(2) + 'K';
            } else if (value < 0.01) {
              label += '$' + value.toFixed(6);
            } else if (value < 1) {
              label += '$' + value.toFixed(4);
            } else {
              label += '$' + value.toFixed(2);
            }
            return label;
          }
        }
      }
    }
  };
  
  // Подготовка данных для графика
  const chartData = prepareChartData();
  
  // Функция для расчета предполагаемой доходности
  const calculateExpectedReturn = () => {
    if (!predictionData || !predictionData.predictions || predictionData.predictions.length === 0) {
      return { percentage: 0, value: 0 };
    }
    
    const firstPrice = predictionData.predictions[0][1];
    const lastPrice = predictionData.predictions[predictionData.predictions.length - 1][1];
    const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    const valueChange = lastPrice - firstPrice;
    
    return { 
      percentage: percentChange.toFixed(2), 
      value: valueChange.toFixed(2) 
    };
  };
  
  const expectedReturn = calculateExpectedReturn();
  
  return (
    <PredictionContainer id="ml-prediction">
      <PredictionHeader>
        <PredictionTitle>Прогноз цены на 7 дней</PredictionTitle>
        <PredictionButton onClick={fetchPrediction} disabled={loading}>
          {loading ? 'Обработка...' : 'Рассчитать прогноз'}
        </PredictionButton>
      </PredictionHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {loading && (
        <PredictionStatus>
          <Spinner />
          <div>Анализ данных с помощью алгоритмов машинного обучения...</div>
        </PredictionStatus>
      )}
      
      {!loading && !error && !predictionData && (
        <PredictionStatus>
          <div>Нажмите кнопку "Рассчитать прогноз" для анализа возможной динамики цены</div>
        </PredictionStatus>
      )}
      
      {!loading && !error && predictionData && (
        <>
          <div style={{ height: '250px' }}>
            {chartData && <Line data={chartData} options={chartOptions} />}
          </div>
          
          <PredictionMeta>
            <PredictionMetaItem>
              <PredictionMetaValue>7 дней</PredictionMetaValue>
              <PredictionMetaLabel>Горизонт прогноза</PredictionMetaLabel>
            </PredictionMetaItem>
            
            <PredictionMetaItem>
              <PredictionMetaValue style={{ color: parseFloat(expectedReturn.percentage) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {expectedReturn.percentage > 0 ? '+' : ''}{expectedReturn.percentage}%
              </PredictionMetaValue>
              <PredictionMetaLabel>Ожидаемая доходность</PredictionMetaLabel>
            </PredictionMetaItem>
            
            {predictionData.metrics && predictionData.metrics.r2Score && (
              <PredictionMetaItem>
                <PredictionMetaValue>
                  {(predictionData.metrics.r2Score * 100).toFixed(1)}%
                </PredictionMetaValue>
                <PredictionMetaLabel>Точность модели</PredictionMetaLabel>
              </PredictionMetaItem>
            )}
          </PredictionMeta>
          
          <PredictionDisclaimer>
            {predictionData.disclaimer || 'Прогноз основан на алгоритмах машинного обучения и не является финансовой рекомендацией.'}
          </PredictionDisclaimer>
        </>
      )}
    </PredictionContainer>
  );
};

export default PricePrediction;
