import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Устанавливаем флаги будущих версий React Router, чтобы избежать предупреждений
window.__v7_startTransition = true;
window.__v7_relativeSplatPath = true;

// Находим DOM-элемент для рендеринга
const container = document.getElementById('root');

// Создаем корневой элемент React 18
const root = ReactDOM.createRoot(container);

// Рендерим приложение
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);