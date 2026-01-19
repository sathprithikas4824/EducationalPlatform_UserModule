import { ReactNode } from 'react';

export interface TopBarMessage {
  content: string | ReactNode;
  font: string;
}

export type CarouselDirection = 'next' | 'prev';
