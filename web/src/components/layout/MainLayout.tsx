'use client';

import React from 'react';
import styled from '@emotion/styled';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DrawingProvider } from '@/contexts/DrawingContext';

interface MainLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 250px 1fr;
  background-color: var(--background);
  color: var(--text-primary);
  transition: all 0.3s ease;

  @media (max-width: var(--breakpoint-md)) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "footer";
  }
`;

const Header = styled.header`
  grid-area: header;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Sidebar = styled.aside`
  grid-area: sidebar;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  padding: var(--spacing-lg);
  min-height: calc(100vh - 120px);

  @media (max-width: var(--breakpoint-md)) {
    display: none;
  }
`;

const Main = styled.main`
  grid-area: main;
  padding: var(--spacing-lg);
  background-color: var(--background);
  overflow-x: auto;
`;

const Footer = styled.footer`
  grid-area: footer;
  background-color: var(--surface);
  border-top: 1px solid var(--border);
  padding: var(--spacing-lg);
  text-align: center;
`;

const Logo = styled.h1`
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: bold;
`;

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  header,
  sidebar,
  footer,
}) => {
  const defaultHeader = (
    <>
      <Logo>My App</Logo>
      {/* ThemeToggle removed as per requirement to only use dark mode */}
    </>
  );

  const defaultSidebar = (
    <nav>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--background)' }}>
          🏠 Home
        </li>
        <li style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--background)' }}>
          📊 Dashboard
        </li>
        <li style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--background)' }}>
          ⚙️ Settings
        </li>
      </ul>
    </nav>
  );

  const defaultFooter = (
    <div>
      <p>&copy; 2024 My App. All rights reserved.</p>
    </div>
  );

  return (
    <DrawingProvider>
      <LayoutContainer>
        <Header>
          {header || defaultHeader}
        </Header>
        {sidebar && <Sidebar>{sidebar || defaultSidebar}</Sidebar>}
        <Main>{children}</Main>
        <Footer>
          {footer || defaultFooter}
        </Footer>
      </LayoutContainer>
    </DrawingProvider>
  );
};