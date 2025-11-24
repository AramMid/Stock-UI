'use client';

import React from 'react';
import styled from '@emotion/styled';

interface GridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
}

interface GridItemProps {
  children: React.ReactNode;
  span?: number;
  className?: string;
}

const StyledGrid = styled.div<{ 
  columns: number; 
  gap: string; 
}>`
  display: grid;
  grid-template-columns: repeat(${({ columns }) => columns}, 1fr);
  gap: var(--spacing-${({ gap }) => gap});
  width: 100%;
`;

const StyledGridItem = styled.div<{ span: number }>`
  grid-column: span ${({ span }) => span};
  background-color: var(--surface);
  padding: var(--spacing-md);
  border-radius: 8px;
  border: 1px solid var(--border);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .dark & {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: var(--breakpoint-md)) {
    grid-column: span 1;
  }
`;

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 12,
  gap = 'md',
  className,
}) => {
  return (
    <StyledGrid
      columns={columns}
      gap={gap}
      className={className}
    >
      {children}
    </StyledGrid>
  );
};

export const GridItem: React.FC<GridItemProps> = ({
  children,
  span = 1,
  className,
}) => {
  return (
    <StyledGridItem span={span} className={className}>
      {children}
    </StyledGridItem>
  );
};