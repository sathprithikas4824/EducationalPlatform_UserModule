// "use client";

// import { useState } from "react";
// import { ArrowLeft, ArrowRight } from "../common/icons";
// import {
//   TOPBAR_MESSAGES,
//   TOPBAR_TRANSITION_DURATION,
//   TOPBAR_COLORS,
// } from "../../lib/constants/topbar.constants";
// import { CarouselDirection } from "../../lib/types/topbar.types";

// export default function TopBar() {
//   const [index, setIndex] = useState(0);
//   const [fade, setFade] = useState(false);

//   const change = (type: CarouselDirection) => {
//     setFade(true);
//     setTimeout(() => {
//       setIndex((prev) =>
//         type === "next"
//           ? (prev + 1) % TOPBAR_MESSAGES.length
//           : (prev - 1 + TOPBAR_MESSAGES.length) % TOPBAR_MESSAGES.length
//       );
//       setFade(false);
//     }, TOPBAR_TRANSITION_DURATION);
//   };

//   return (
//     <div
//       className="hidden sm:block relative w-full sm:h-[40px] md:h-[42px] overflow-hidden"
//       style={{
//         backgroundImage: 'linear-gradient(45deg, #7a12fa 0%, #9513f4 25%, #b614ef 50%, #9513f4 75%, #7a12fa 100%)',
//         color: TOPBAR_COLORS.text,
//       }}
//     >
//       {/* GRAIN */}
//       <div
//         className="absolute inset-0 pointer-events-none"
//         style={{
//           backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
//           opacity: 0.3,
//         }}
//       />

//       <div className="relative z-10 flex items-center h-full max-w-screen-2xl mx-auto">
//         {/* LEFT */}
//         <button
//           onClick={() => change("prev")}
//           className="absolute left-3 flex items-center justify-center hover:opacity-70 transition-opacity w-7 h-7"
//           aria-label="Previous message"
//         >
//           <ArrowLeft />
//         </button>

//         {/* TEXT */}
//         <div className="flex w-full h-full items-center justify-center px-12 md:px-14 overflow-hidden">
//           <span
//             className={`
//     transition-opacity duration-200
//     text-[13px] md:text-[15px]
//     leading-[17px] md:leading-[28px]
//     tracking-tight
//     text-center
//     whitespace-nowrap
//     inline-block
//     font-medium
//     ${fade ? "opacity-0" : "opacity-100"}
//     ${TOPBAR_MESSAGES[index]?.font || ""}
//   `}
//           >
//             {TOPBAR_MESSAGES[index]?.content}
//           </span>
//         </div>

//         {/* RIGHT */}
//         <button
//           onClick={() => change("next")}
//           className="absolute right-3 flex items-center justify-center hover:opacity-70 transition-opacity w-7 h-7"
//           aria-label="Next message"
//         >
//           <ArrowRight />
//         </button>
//       </div>
//     </div>
//   );
// }




"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "../common/icons";
import {
  TOPBAR_MESSAGES,
  TOPBAR_TRANSITION_DURATION,
  TOPBAR_COLORS,
} from "../../lib/constants/topbar.constants";
import { CarouselDirection } from "../../lib/types/topbar.types";

export default function TopBar() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(false);

  const change = (type: CarouselDirection) => {
    setFade(true);
    setTimeout(() => {
      setIndex((prev) =>
        type === "next"
          ? (prev + 1) % TOPBAR_MESSAGES.length
          : (prev - 1 + TOPBAR_MESSAGES.length) % TOPBAR_MESSAGES.length
      );
      setFade(false);
    }, TOPBAR_TRANSITION_DURATION);
  };

  return (
    <div
      className="hidden sm:block relative w-full sm:h-[40px] md:h-[42px] overflow-hidden"
      style={{
        backgroundColor: TOPBAR_COLORS.background,
        color: TOPBAR_COLORS.text,
      }}
    >
      {/* GRAIN */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
          opacity: 0.3,
        }}
      />

      <div className="relative z-10 flex items-center h-full max-w-screen-2xl mx-auto">
        {/* LEFT */}
        <button
          onClick={() => change("prev")}
          className="absolute left-3 flex items-center justify-center hover:opacity-70 transition-opacity w-7 h-7"
          aria-label="Previous message"
        >
          <ArrowLeft />
        </button>

        {/* TEXT */}
        <div className="flex w-full h-full items-center justify-center px-12 md:px-14 overflow-hidden">
          <span
            className={`
    transition-opacity duration-200
    text-[13px] md:text-[15px]
    leading-[17px] md:leading-[28px]
    tracking-tight
    text-center
    whitespace-nowrap
    inline-block
    font-medium
    ${fade ? "opacity-0" : "opacity-100"}
    ${TOPBAR_MESSAGES[index]?.font || ""}
  `}
          >
            {TOPBAR_MESSAGES[index]?.content}
          </span>
        </div>

        {/* RIGHT */}
        <button
          onClick={() => change("next")}
          className="absolute right-3 flex items-center justify-center hover:opacity-70 transition-opacity w-7 h-7"
          aria-label="Next message"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}