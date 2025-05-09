/**
 * API-сервис с моковыми данными, когда fetch не работает
 */

// Мок-данные для разработки
const mockMarketData = [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      current_price: 55000,
      market_cap: 1050000000000,
      market_cap_rank: 1,
      total_volume: 32000000000,
      price_change_percentage_24h: 2.5,
      circulating_supply: 19000000
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      current_price: 3500,
      market_cap: 420000000000,
      market_cap_rank: 2,
      total_volume: 18000000000,
      price_change_percentage_24h: 1.8,
      circulating_supply: 120000000
    },
    {
      id: "binancecoin",
      symbol: "bnb",
      name: "Binance Coin",
      image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
      current_price: 450,
      market_cap: 70000000000,
      market_cap_rank: 3,
      total_volume: 2500000000,
      price_change_percentage_24h: -0.7,
      circulating_supply: 155000000
    },
    {
      id: "cardano",
      symbol: "ada",
      name: "Cardano",
      image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
      current_price: 1.15,
      market_cap: 37000000000,
      market_cap_rank: 6,
      total_volume: 1800000000,
      price_change_percentage_24h: -1.2,
      circulating_supply: 33000000000
    },
    {
      id: "solana",
      symbol: "sol",
      name: "Solana",
      image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      current_price: 180,
      market_cap: 65000000000,
      market_cap_rank: 5,
      total_volume: 5200000000,
      price_change_percentage_24h: 5.3,
      circulating_supply: 360000000
    }
  ];
  
  const mockCryptoDetails = {
    "bitcoin": {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      current_price: 55000,
      market_cap: 1050000000000,
      market_cap_rank: 1,
      total_volume: 32000000000,
      price_change_percentage_24h: 2.5,
      circulating_supply: 19000000,
      total_supply: 21000000,
      max_supply: 21000000,
      ath: 69000,
      ath_change_percentage: -19.5,
      ath_date: "2021-11-10T16:30:00.000Z",
      atl: 67.81,
      atl_change_percentage: 80000,
      atl_date: "2013-07-05T00:00:00.000Z",
      description: "Bitcoin is the first successful internet money based on peer-to-peer technology; whereby no central bank or authority is involved in the transaction and production of the Bitcoin currency. It was created by an anonymous individual/group under the name, Satoshi Nakamoto. The source code is available publicly as an open source project, anybody can look at it and be part of the developmental process."
    },
    "ethereum": {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      current_price: 3500,
      market_cap: 420000000000,
      market_cap_rank: 2,
      total_volume: 18000000000,
      price_change_percentage_24h: 1.8,
      circulating_supply: 120000000,
      total_supply: null,
      max_supply: null,
      ath: 4880,
      ath_change_percentage: -28.5,
      ath_date: "2021-11-10T14:24:19.604Z",
      atl: 0.43,
      atl_change_percentage: 806000,
      atl_date: "2015-10-20T00:00:00.000Z",
      description: "Ethereum is a smart contract platform that enables developers to build tokens and decentralized applications (dapps). ETH is the native currency for the Ethereum platform and also works as the transaction fees to miners on the Ethereum network. Ethereum is the pioneer for blockchain based smart contracts."
    }
  };
  
  const mockHistoricalData = {
    prices: Array(30).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      return [date.getTime(), 50000 + Math.random() * 10000];
    })
  };
  
  const mockCryptoList = [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin" },
    { id: "ethereum", symbol: "eth", name: "Ethereum" },
    { id: "binancecoin", symbol: "bnb", name: "BNB" },
    { id: "ripple", symbol: "xrp", name: "XRP" },
    { id: "cardano", symbol: "ada", name: "Cardano" },
    { id: "solana", symbol: "sol", name: "Solana" },
    { id: "polkadot", symbol: "dot", name: "Polkadot" },
    { id: "dogecoin", symbol: "doge", name: "Dogecoin" },
    { id: "avalanche-2", symbol: "avax", name: "Avalanche" },
    { id: "chainlink", symbol: "link", name: "Chainlink" }
  ];
  
  /**
   * Получение данных о рынке криптовалют
   * @param {number} limit - Максимальное количество криптовалют
   * @returns {Promise<Array>} - Массив с данными о криптовалютах
   */
  export const fetchMarketData = async (limit = 50) => {
    // Используем моковые данные вместо реального запроса
    console.log('Использование моковых данных рынка');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockMarketData.slice(0, limit));
      }, 500);
    });
  };
  
  /**
   * Получение детальной информации о криптовалюте
   * @param {string} id - Идентификатор криптовалюты
   * @returns {Promise<Object>} - Объект с детальной информацией
   */
  export const fetchCryptoDetail = async (id) => {
    // Используем моковые данные вместо реального запроса
    console.log(`Использование моковых данных для ${id}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockCryptoDetails[id]) {
          resolve(mockCryptoDetails[id]);
        } else {
          // Если нет данных для конкретной монеты, используем данные Bitcoin с измененным id
          const fallbackData = { ...mockCryptoDetails.bitcoin, id, name: id, symbol: id.substring(0, 3) };
          resolve(fallbackData);
        }
      }, 600);
    });
  };
  
  /**
   * Получение исторических данных о цене криптовалюты
   * @param {string} id - Идентификатор криптовалюты
   * @param {number|string} days - Количество дней для истории или 'max'
   * @returns {Promise<Object>} - Объект с историческими данными
   */
  export const fetchHistoricalData = async (id, days = 7) => {
    // Используем моковые данные вместо реального запроса
    console.log(`Использование моковых исторических данных для ${id} за ${days} дней`);
    return new Promise(resolve => {
      // Различаем количество данных в зависимости от запрошенного периода
      let numDataPoints;
      if (days === 'max') {
        numDataPoints = 365;
      } else {
        numDataPoints = Math.min(365, Number(days) * 24);
      }
      
      const prices = Array(numDataPoints).fill(0).map((_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - (numDataPoints - i));
        return [date.getTime(), 50000 + Math.sin(i / 10) * 5000 + Math.random() * 2000];
      });
      
      setTimeout(() => {
        resolve({ prices });
      }, 700);
    });
  };
  
  /**
   * Мок функция для получения технических индикаторов
   * @param {string} cryptoId - Идентификатор криптовалюты
   * @param {string} timeframe - Временной интервал для индикаторов
   * @returns {Promise<Object>} - Объект с техническими индикаторами
   */
  export const fetchTechnicalIndicators = async (cryptoId, timeframe = '24h') => {
    // Случайное значение RSI между 20 и 80
    const rsiValue = 30 + Math.random() * 40;
    
    // Определяем MACD на основе RSI (просто для примера)
    const macdValue = rsiValue > 50 ? 0.5 + Math.random() * 2 : -2 + Math.random() * 2;
    const signalValue = macdValue * 0.8;
    
    // Определяем сигналы на основе индикаторов
    const rsiSignal = rsiValue > 70 ? 'sell' : rsiValue < 30 ? 'buy' : 'neutral';
    const macdSignal = macdValue > signalValue ? 'buy' : macdValue < signalValue ? 'sell' : 'neutral';
    const smaSignal = Math.random() > 0.5 ? 'bullish' : 'bearish';
    
    // Общий сигнал
    const signals = [rsiSignal, macdSignal, smaSignal].filter(s => s !== 'neutral');
    const buySignals = signals.filter(s => s === 'buy' || s === 'bullish').length;
    const sellSignals = signals.filter(s => s === 'sell' || s === 'bearish').length;
    
    let overallSignal = 'neutral';
    if (buySignals > sellSignals) {
      overallSignal = 'buy';
    } else if (sellSignals > buySignals) {
      overallSignal = 'sell';
    }
    
    const result = {
      crypto_id: cryptoId,
      timeframe: timeframe,
      timestamp: new Date().toISOString(),
      indicators: {
        rsi: {
          period: 14,
          value: rsiValue
        },
        macd: {
          fast_period: 12,
          slow_period: 26,
          signal_period: 9,
          macd: macdValue,
          signal: signalValue,
          histogram: macdValue - signalValue
        },
        stochastic: {
          k_period: 14,
          d_period: 3,
          slowing: 3,
          k: 50 + Math.random() * 30,
          d: 50 + Math.random() * 20
        }
      },
      interpretation: {
        rsi: {
          signal: rsiSignal
        },
        macd: {
          signal: macdSignal === 'neutral' ? 
            (Math.random() > 0.5 ? 'buy' : 'sell') : 
            macdSignal
        },
        sma: {
          periods: [20, 50],
          crossover: smaSignal
        },
        ema: {
          periods: [12, 26],
          crossover: Math.random() > 0.5 ? 'bullish' : 'bearish'
        },
        overall: {
          signal: overallSignal,
          confidence: Math.floor(50 + Math.random() * 50)
        }
      }
    };
    
    console.log(`Моковые технические индикаторы для ${cryptoId}, временной интервал ${timeframe}`);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(result);
      }, 400);
    });
  };
  
  /**
   * Функция для получения списка доступных криптовалют
   * @returns {Promise<Array>} - Массив с доступными криптовалютами
   */
  export const fetchCryptoList = async () => {
    console.log('Использование моковых данных списка криптовалют');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockCryptoList);
      }, 300);
    });
  };