"use client";

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from "../common/icons";

interface Module {
  id: string;
  title: string;
  completionPercentage: number;
}

const ModulesSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleModuleClick = (moduleId: string) => {
    if (moduleId === '2') {
      router.push(`/modules/${moduleId}`);
    }
  };

  const modules: Module[] = [
    { id: '1', title: 'Overview of AI', completionPercentage: 78 },
    { id: '2', title: 'Python Programming for AI', completionPercentage: 50 },
    { id: '3', title: 'Deep Learning Basics', completionPercentage: 80 },
    { id: '4', title: 'Neural Networks', completionPercentage: 45 },
    { id: '5', title: 'Computer Vision', completionPercentage: 60 },
    { id: '6', title: 'Natural Language Processing', completionPercentage: 35 },
    { id: '7', title: 'Reinforcement Learning', completionPercentage: 70 },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const card = container.firstElementChild as HTMLElement;
      if (!card) return;
      
      const cardWidth = card.offsetWidth;
      const gap = 16; 

      let cardsToScroll = 1;
      if (window.innerWidth >= 1024) cardsToScroll = 3;
      else if (window.innerWidth >= 768) cardsToScroll = 2;

      const scrollDistance = (cardWidth + gap) * cardsToScroll; 

      container.scrollTo({
        left: direction === 'left' 
          ? container.scrollLeft - scrollDistance 
          : container.scrollLeft + scrollDistance,
        behavior: 'smooth'
      });
    }
  };

  return (
    // Reduced py-16 to py-8 for less space at the top/bottom
    <div className="w-full bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Reduced mb-16 to mb-6 for tighter gap between title and cards */}
        <h2 className="jakarta-font text-3xl md:text-5xl font-bold text-center mb-8 text-gray-900">
          Modules <span className="text-purple-600">Available</span>
        </h2>

        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button
            onClick={() => scroll('left')}
            className="z-10 flex-shrink-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-all border border-gray-200 active:scale-95"
            aria-label="Scroll left"
          >
            <ArrowLeft/>
          </button>

          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-hidden scroll-smooth p-1 snap-x snap-mandatory"
            style={{ 
              width: '100%',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {modules.map((module) => (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module.id)}
                className="flex-shrink-0 group flex items-center gap-3 snap-start rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-300 hover:!border-[#7612fa66] p-2
                           w-full md:w-[calc((50%)-8px)] lg:w-[calc((33.333%)-10.6px)]"
                style={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderColor: "rgba(140, 140, 170, 0.4)",
                    boxShadow: "0 2px 4px 0 rgba(124, 58, 237, 0.06)",
                }}
              >
                <div className="w-24 h-16 md:w-32 md:h-20 bg-[#A3A3A3] rounded-lg border border-gray-600 flex-shrink-0"></div>

                {/* h-full and py-0.5 for tighter internal vertical spacing */}
                <div className="flex-1 flex flex-col justify-between h-16 md:h-20 py-0.5">
                  <h3 className="jakarta-font text-[12px] md:text-[13px] font-bold text-gray-900 leading-tight">
                    {module.title}
                  </h3>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1">
                      <div className="relative w-3 h-3">
                        <svg className="w-3 h-3 transform -rotate-90">
                          <circle cx="6" cy="6" r="5" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#3B82F6"
                            strokeWidth="1.5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 5}`}
                            strokeDashoffset={`${2 * Math.PI * 5 * (1 - module.completionPercentage / 100)}`}
                          />
                        </svg>
                      </div>
                      <span className="text-[7px] font-bold text-gray-700 whitespace-nowrap">
                        {module.completionPercentage}% Completed
                      </span>
                    </div>

                    <button className="bg-black text-white text-[9px] font-bold px-3 py-1 rounded shadow-sm hover:bg-gray-800 transition-colors">
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="z-10 flex-shrink-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-all border border-gray-200 active:scale-95"
            aria-label="Scroll right"
          >
            <ArrowRight/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModulesSection;