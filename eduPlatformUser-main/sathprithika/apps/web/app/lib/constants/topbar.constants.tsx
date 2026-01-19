import { TopBarMessage } from '../types/topbar.types';

export const TOPBAR_MESSAGES: TopBarMessage[] = [
  {
    content: "Buy More, Save More – Enjoy Free Shipping on Orders Over ₹999!",
    font: "jakarta-font",
  },
  {
    font: "jakarta-font",
    content: (
      <>
        <span className="font-semibold">Flat 30%</span>{" "}
        <span className="font-medium">off on</span>{" "}
        <span className="font-normal">winter collection</span>
      </>
    ),
  },
];

export const TOPBAR_TRANSITION_DURATION = 180;

export const TOPBAR_COLORS = {
  background: "#7a12fa",
  text: "#ffffff",
} as const;
