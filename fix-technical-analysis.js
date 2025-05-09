// Имя файла: fix-technical-analysis.js
const fs = require('fs');
const path = require('path');

// Путь к файлу технического анализа
const technicalAnalysisPath = path.join(__dirname, 'backend', 'services', 'technicalAnalysis.js');

// Читаем содержимое файла
fs.readFile(technicalAnalysisPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Ошибка при чтении файла: ${err}`);
    return;
  }

  // Находим метод saveIndicators и добавляем проверки на null
  let updatedCode = data;

  // Находим и обновляем метод saveIndicators
  const saveIndicatorsStart = updatedCode.indexOf('async saveIndicators(results)');
  if (saveIndicatorsStart !== -1) {
    // Находим все места в методе, где происходит вставка в таблицу
    const insertStart = updatedCode.indexOf('queries.push({', saveIndicatorsStart);
    
    // Обновляем код, добавляя проверки на null
    updatedCode = updatedCode.replace(
      /queries\.push\(\{\s*sql:.+?VALUES \(\?, \?, \?, \?, \?\)",.+?\]\s*\}\);/gs,
      (match) => {
        return match.replace(
          /params: \[([\s\S]*?)\]/g,
          (paramsMatch, paramsContent) => {
            // Добавляем проверку, что value не равно null
            if (paramsContent.includes('.current') || paramsContent.includes('.MACD') || 
                paramsContent.includes('.signal') || paramsContent.includes('.histogram')) {
              return `params: [${paramsContent}].filter(p => p !== null && p !== undefined)`;
            }
            return paramsMatch;
          }
        );
      }
    );

    // Добавляем проверку перед добавлением в queries
    updatedCode = updatedCode.replace(
      /(for \(const \[key, sma\] of Object\.entries\(results\.indicators\.sma\)\) \{[\s\S]*?if \(sma\.current !== null\) \{)/g,
      '$1\n        // Дополнительная проверка на null\n        if (sma.current === null || sma.current === undefined) continue;\n'
    );

    updatedCode = updatedCode.replace(
      /(if \(results\.indicators\.rsi\.current !== null\) \{)/g,
      '$1\n        // Дополнительная проверка на null\n        if (results.indicators.rsi.current === null || results.indicators.rsi.current === undefined) continue;\n'
    );

    updatedCode = updatedCode.replace(
      /(if \(results\.indicators\.macd\.current\) \{)/g,
      '$1\n        // Дополнительная проверка на null\n        if (!results.indicators.macd.current || results.indicators.macd.current.MACD === null || results.indicators.macd.current.MACD === undefined) continue;\n'
    );
  }

  // Записываем обновленный код обратно в файл
  fs.writeFile(technicalAnalysisPath, updatedCode, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error(`Ошибка при записи файла: ${writeErr}`);
      return;
    }
    console.log('Файл технического анализа успешно обновлен!');
  });
});