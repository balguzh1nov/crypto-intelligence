/**
 * Модуль для работы с базой данных SQLite
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Класс для работы с базой данных
class Database {
  constructor() {
    this.db = null;
    this.dbPath = config.database.path;
  }

  // Инициализация базы данных
  async init() {
    return new Promise((resolve, reject) => {
      // Проверяем существование директории
      const directory = path.dirname(this.dbPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Создаем соединение с базой данных
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка при подключении к базе данных:', err.message);
          reject(err);
          return;
        }

        console.log('Подключение к базе данных SQLite успешно установлено');
        
        // Включаем внешние ключи
        this.db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
          if (pragmaErr) {
            console.error('Ошибка при включении внешних ключей:', pragmaErr.message);
          }
        });

        // Создаем таблицы, если они еще не существуют
        this.createTables()
          .then(() => resolve(true))
          .catch((tableErr) => reject(tableErr));
      });
    });
  }

  // Создание необходимых таблиц
  async createTables() {
    const queries = [
      // Таблица для хранения информации о криптовалютах
      `CREATE TABLE IF NOT EXISTS cryptocurrencies (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        image TEXT,
        current_price REAL,
        market_cap REAL,
        market_cap_rank INTEGER,
        total_volume REAL,
        high_24h REAL,
        low_24h REAL,
        price_change_24h REAL,
        price_change_percentage_24h REAL,
        circulating_supply REAL,
        total_supply REAL,
        max_supply REAL,
        last_updated TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        old_value REAL,
        new_value REAL,
        percentage_change REAL,
        message TEXT,
        severity TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies (id)
        )`,

      // Таблица для хранения исторических данных о ценах
      `CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id TEXT NOT NULL,
        price REAL NOT NULL,
        market_cap REAL,
        total_volume REAL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies (id)
      )`,

      // Таблица для хранения технических индикаторов
      `CREATE TABLE IF NOT EXISTS technical_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id TEXT NOT NULL,
        indicator_type TEXT NOT NULL,
        value REAL NOT NULL,
        parameters TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies (id)
      )`,

      // Таблица для хранения аномалий
      `CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id TEXT NOT NULL,
        anomaly_type TEXT NOT NULL,
        old_value REAL,
        new_value REAL,
        percentage_change REAL,
        description TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies (id)
      )`,

      // Таблица для хранения корреляций
      `CREATE TABLE IF NOT EXISTS correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id_1 TEXT NOT NULL,
        crypto_id_2 TEXT NOT NULL,
        correlation_value REAL NOT NULL,
        time_frame TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (crypto_id_1) REFERENCES cryptocurrencies (id),
        FOREIGN KEY (crypto_id_2) REFERENCES cryptocurrencies (id)
      )`
    ];

    // Создание индексов для ускорения запросов
    const indices = [
      `CREATE INDEX IF NOT EXISTS idx_price_history_crypto_id ON price_history (crypto_id)`,
      `CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history (timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_technical_indicators_crypto_id ON technical_indicators (crypto_id)`,
      `CREATE INDEX IF NOT EXISTS idx_anomalies_crypto_id ON anomalies (crypto_id)`,
      `CREATE INDEX IF NOT EXISTS idx_correlations_crypto_id_1 ON correlations (crypto_id_1)`,
      `CREATE INDEX IF NOT EXISTS idx_correlations_crypto_id_2 ON correlations (crypto_id_2)`
    ];

    // Выполняем запросы последовательно
    for (const query of [...queries, ...indices]) {
      await this.run(query);
    }

    console.log('Структура базы данных успешно создана');
  }

  // Закрытие соединения с базой данных
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Ошибка при закрытии базы данных:', err.message);
            reject(err);
            return;
          }
          console.log('Соединение с базой данных закрыто');
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Выполнение SQL-запроса без возврата данных
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Ошибка выполнения запроса:', sql, err.message);
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // Выполнение SQL-запроса с возвратом одной строки
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Ошибка выполнения запроса:', sql, err.message);
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  // Выполнение SQL-запроса с возвратом всех строк
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Ошибка выполнения запроса:', sql, err.message);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  // Выполнение нескольких запросов в рамках одной транзакции
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        let results = [];
        
        try {
          for (const q of queries) {
            const { sql, params = [] } = q;
            
            const result = this.db.run(sql, params, function(err) {
              if (err) throw err;
              return { lastID: this.lastID, changes: this.changes };
            });
            
            results.push(result);
          }
          
          this.db.run('COMMIT', (err) => {
            if (err) {
              console.error('Ошибка при завершении транзакции:', err.message);
              throw err;
            }
            resolve(results);
          });
        } catch (err) {
          this.db.run('ROLLBACK', (rollbackErr) => {
            if (rollbackErr) {
              console.error('Ошибка при откате транзакции:', rollbackErr.message);
            }
            reject(err);
          });
        }
      });
    });
  }

  // Создание резервной копии базы данных
  async backup() {
    return new Promise((resolve, reject) => {
      const backupDir = config.database.backupPath;
      
      // Проверяем существование директории для резервных копий
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupFile = path.join(
        backupDir, 
        `backup_${new Date().toISOString().replace(/:/g, '-')}.db`
      );
      
      const source = fs.createReadStream(this.dbPath);
      const destination = fs.createWriteStream(backupFile);
      
      source.pipe(destination);
      
      destination.on('finish', () => {
        console.log(`Резервная копия создана: ${backupFile}`);
        resolve(backupFile);
      });
      
      destination.on('error', (err) => {
        console.error('Ошибка при создании резервной копии:', err.message);
        reject(err);
      });
    });
  }
}

// Создаем и экспортируем экземпляр базы данных
const db = new Database();
module.exports = db;