import React from 'react';
import styled from 'styled-components';
import CryptoComparison from './CryptoComparison';

const PageContainer = styled.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  color: #1a1a2e;
  margin-bottom: 1.5rem;
  font-weight: 600;
`;

const Description = styled.p`
  color: #4b5563;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const ComparisonPage = () => {
  return (
    <PageContainer>
      <PageTitle>Сравнительный анализ</PageTitle>
      <Description>
        Инструмент позволяет сравнивать динамику цен, волатильность и ключевые метрики нескольких 
        криптовалют на одном графике. Вы можете выбрать до 5 криптовалют для детального анализа, 
        изменять временной период и переключаться между абсолютными значениями и процентными изменениями.
      </Description>
      
      <CryptoComparison />
    </PageContainer>
  );
};

export default ComparisonPage;
