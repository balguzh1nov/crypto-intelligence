import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { CryptoContext } from '../../context/CryptoContext';

// Стилизованные компоненты
const HeaderContainer = styled.nav`
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.8rem 0;
`;

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: 992px) {
    padding: 0 1rem;
  }
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    color: #4cc9f0;
    transform: scale(1.02);
  }
  
  &::before {
    content: "📊";
    margin-right: 8px;
    font-size: 1.8rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    flex-direction: column;
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background: #16213e;
    padding: 1rem;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const NavLink = styled(Link)`
  color: #f8f9fa;
  text-decoration: none;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    color: #4cc9f0;
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    background: rgba(76, 201, 240, 0.1);
    color: #4cc9f0;
  }
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #f8f9fa;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ConnectionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 20px;
  background: ${props => props.$isConnected ? '#10b981' : '#ef4444'};
  color: white;
  
  &::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-radius: 50%;
    background: white;
    animation: ${props => props.$isConnected ? 'pulse 1.5s infinite' : 'none'};
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }
`;

const LastUpdated = styled.div`
  font-size: 0.85rem;
  opacity: 0.8;
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Header = () => {
  const { isConnected, lastUpdated } = useContext(CryptoContext);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Форматируем дату и время на русском языке
  const formatLastUpdated = (date) => {
    if (!date) return '';
    
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    return date.toLocaleTimeString('ru-RU', options);
  };

  return (
    <HeaderContainer>
      <Container>
        <Logo to="/">КриптоИнтеллект</Logo>
        
        <MobileMenuButton onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </MobileMenuButton>
        
        <NavLinks $isOpen={isMenuOpen}>
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/alerts">Оповещения</NavLink>
          <NavLink to="/comparison">Сравнение</NavLink>
        </NavLinks>
        
        <StatusContainer>
          <ConnectionBadge $isConnected={isConnected}>
            {isConnected ? 'Подключено' : 'Офлайн'}
          </ConnectionBadge>
          
          {lastUpdated && (
            <LastUpdated>
              Обновлено: {formatLastUpdated(lastUpdated)}
            </LastUpdated>
          )}
        </StatusContainer>
      </Container>
    </HeaderContainer>
  );
};

export default Header;