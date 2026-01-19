"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ChevronDown = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ml-1 inline-block"
  >
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRight = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ml-auto transition-transform group-hover:translate-x-0.5"
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BackArrow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Menu data structure with content for each sidebar option
const menuData = {
  topic: {
    sidebar: [
      { id: "capabilities", name: "Capabilities", icon: "⚡", href: "/capabilities" },
      { id: "features", name: "All features", icon: "▦", href: "/features" },
      { id: "integrations", name: "Integrations", icon: "⚙️", href: "/integrations" }
    ],
    content: {
      capabilities: {
        sections: [
          {
            title: "Project Management",
            items: [
              { name: "Tasks", icon: "✓", href: "/tasks" },
              { name: "Portfolios", icon: "📁", href: "/portfolios" },
              { name: "Board views", icon: "▦", href: "/board-views" },
              { name: "Gantt charts", icon: "📊", href: "/gantt-charts" }
            ]
          },
          {
            title: "Product Development",
            items: [
              { name: "Sprints", icon: "↻", href: "/sprints" },
              { name: "Sprint Reports", icon: "⏱️", href: "/sprint-reports" },
              { name: "Kanban", icon: "📋", href: "/kanban" },
              { name: "Roadmap & Backlog", icon: "🗺️", href: "/roadmap" }
            ]
          },
          {
            title: "Knowledge Management",
            items: [
              { name: "Docs", icon: "📄", href: "/docs" },
              { name: "Wikis", icon: "✏️", href: "/wikis" },
              { name: "Ask AI", icon: "✨", href: "/ask-ai" },
              { name: "Connected search", icon: "🔍", href: "/search" }
            ]
          },
          {
            title: "Resource Management",
            items: [
              { name: "Time tracking", icon: "⏱️", href: "/time-tracking" },
              { name: "Workload views", icon: "👥", href: "/workload" },
              { name: "Goals", icon: "🎯", href: "/goals" },
              { name: "Dashboards", icon: "📊", href: "/dashboards" }
            ]
          },
          {
            title: "Collaboration",
            items: [
              { name: "Docs", icon: "📄", href: "/docs-collab" },
              { name: "Whiteboards", icon: "✏️", href: "/whiteboards" },
              { name: "Chat", icon: "💬", href: "/chat" },
              { name: "Inbox", icon: "📧", href: "/inbox" }
            ]
          },
          {
            title: "Workflows",
            items: [
              { name: "Automations", icon: "⚡", href: "/automations" },
              { name: "Forms", icon: "📋", href: "/forms" },
              { name: "Custom fields", icon: "⚙️", href: "/custom-fields" },
              { name: "Custom statuses", icon: "💬", href: "/custom-statuses" }
            ]
          }
        ],
        featured: {
          title: "Powered by",
          brand: "ClickUp Brain",
          subtitle: "AI-powered features",
          items: [
            "ClickUp Brain (AI Assistant)",
            "Enterprise Search",
            "AI Notetaker",
            "AI Project Manager",
            "AI Agents & Automations",
            "AI Fields & Properties",
            "AI Writing",
            "AI Scheduling & Time Blocking"
          ]
        },
        bottomLinks: [
          { name: "Contact Sales", icon: "💬", href: "/contact-sales" },
          { name: "Watch demo", icon: "▶", href: "/demo" },
          { name: "Download apps", icon: "📱", href: "/download" }
        ]
      },
      features: {
        sections: [
          {
            title: "Core Features",
            items: [
              { name: "Task Management", icon: "✓", href: "/task-management" },
              { name: "Custom Views", icon: "👁️", href: "/custom-views" },
              { name: "Time Tracking", icon: "⏱️", href: "/time-tracking" },
              { name: "Goals & OKRs", icon: "🎯", href: "/goals-okrs" }
            ]
          },
          {
            title: "Advanced Features",
            items: [
              { name: "Dependencies", icon: "🔗", href: "/dependencies" },
              { name: "Recurring Tasks", icon: "🔄", href: "/recurring" },
              { name: "Custom Statuses", icon: "💬", href: "/statuses" },
              { name: "Priorities", icon: "⚠️", href: "/priorities" }
            ]
          },
          {
            title: "Reporting",
            items: [
              { name: "Dashboards", icon: "📊", href: "/dashboards" },
              { name: "Reports", icon: "📈", href: "/reports" },
              { name: "Analytics", icon: "📉", href: "/analytics" },
              { name: "Insights", icon: "💡", href: "/insights" }
            ]
          },
          {
            title: "Customization",
            items: [
              { name: "Custom Fields", icon: "⚙️", href: "/custom-fields" },
              { name: "Templates", icon: "📋", href: "/templates" },
              { name: "Automations", icon: "⚡", href: "/automations" },
              { name: "Integrations", icon: "🔌", href: "/integrations" }
            ]
          },
          {
            title: "Team Features",
            items: [
              { name: "Permissions", icon: "🔒", href: "/permissions" },
              { name: "Team Chat", icon: "💬", href: "/team-chat" },
              { name: "Comments", icon: "💭", href: "/comments" },
              { name: "Mentions", icon: "@", href: "/mentions" }
            ]
          },
          {
            title: "Mobile & Desktop",
            items: [
              { name: "Mobile Apps", icon: "📱", href: "/mobile" },
              { name: "Desktop Apps", icon: "💻", href: "/desktop" },
              { name: "Browser Extension", icon: "🌐", href: "/extension" },
              { name: "Offline Mode", icon: "📡", href: "/offline" }
            ]
          }
        ],
        featured: {
          title: "Feature Spotlight",
          brand: "All Features",
          subtitle: "Everything you need",
          items: [
            "Unlimited Tasks",
            "Unlimited Members",
            "Unlimited Integrations",
            "24/7 Support",
            "Advanced Permissions",
            "Custom Branding",
            "API Access",
            "Enterprise Security"
          ]
        },
        bottomLinks: [
          { name: "View all features", icon: "📋", href: "/all-features" },
          { name: "Compare plans", icon: "⚖️", href: "/compare" },
          { name: "Request demo", icon: "▶", href: "/demo" }
        ]
      },
      integrations: {
        sections: [
          {
            title: "Communication",
            items: [
              { name: "Slack", icon: "💬", href: "/slack" },
              { name: "Microsoft Teams", icon: "👥", href: "/teams" },
              { name: "Discord", icon: "🎮", href: "/discord" },
              { name: "Zoom", icon: "📹", href: "/zoom" }
            ]
          },
          {
            title: "Development",
            items: [
              { name: "GitHub", icon: "🐙", href: "/github" },
              { name: "GitLab", icon: "🦊", href: "/gitlab" },
              { name: "Bitbucket", icon: "🪣", href: "/bitbucket" },
              { name: "Jira", icon: "🔷", href: "/jira" }
            ]
          },
          {
            title: "Design",
            items: [
              { name: "Figma", icon: "🎨", href: "/figma" },
              { name: "Adobe Creative Cloud", icon: "🖌️", href: "/adobe" },
              { name: "Sketch", icon: "💎", href: "/sketch" },
              { name: "InVision", icon: "👁️", href: "/invision" }
            ]
          },
          {
            title: "Cloud Storage",
            items: [
              { name: "Google Drive", icon: "📁", href: "/drive" },
              { name: "Dropbox", icon: "📦", href: "/dropbox" },
              { name: "OneDrive", icon: "☁️", href: "/onedrive" },
              { name: "Box", icon: "📤", href: "/box" }
            ]
          },
          {
            title: "Calendar & Email",
            items: [
              { name: "Google Calendar", icon: "📅", href: "/gcal" },
              { name: "Outlook", icon: "📧", href: "/outlook" },
              { name: "Gmail", icon: "✉️", href: "/gmail" },
              { name: "Apple Calendar", icon: "🍎", href: "/apple-cal" }
            ]
          },
          {
            title: "Marketing & Sales",
            items: [
              { name: "HubSpot", icon: "🎯", href: "/hubspot" },
              { name: "Salesforce", icon: "☁️", href: "/salesforce" },
              { name: "Mailchimp", icon: "🐵", href: "/mailchimp" },
              { name: "Intercom", icon: "💬", href: "/intercom" }
            ]
          }
        ],
        featured: {
          title: "Integration Hub",
          brand: "1000+ Apps",
          subtitle: "Connect everything",
          items: [
            "Pre-built Integrations",
            "Zapier Integration",
            "API & Webhooks",
            "Custom Integrations",
            "Two-way Sync",
            "Real-time Updates",
            "Data Import/Export",
            "SSO & SAML"
          ]
        },
        bottomLinks: [
          { name: "Browse all integrations", icon: "🔌", href: "/integrations-all" },
          { name: "API documentation", icon: "📚", href: "/api-docs" },
          { name: "Request integration", icon: "➕", href: "/request" }
        ]
      }
    }
  },
  pathways: {
    sidebar: [
      { id: "teams", name: "By Team", icon: "👥", href: "/teams" },
      { id: "usecases", name: "By Use Case", icon: "🎯", href: "/use-cases" }
    ],
    content: {
      teams: {
        cards: [
          { 
            name: "Project management", 
            icon: "📋", 
            description: "Empower teams to achieve goals with efficient, clear project planning.",
            href: "/project-management" 
          },
          { 
            name: "Product development", 
            icon: "📱", 
            description: "Accelerate innovation for faster, effective team-led product launches.",
            href: "/product-development" 
          },
          { 
            name: "Operations", 
            icon: "⚙️", 
            description: "Optimize workflows for increased team productivity and efficiency.",
            href: "/operations" 
          },
          { 
            name: "IT", 
            icon: "💻", 
            description: "Improve IT operations with solutions fostering teamwork and efficiency.",
            href: "/it" 
          },
          { 
            name: "Marketing", 
            icon: "📢", 
            description: "Drive marketing outcomes through collaborative strategy and teamwork.",
            href: "/marketing" 
          },
          { 
            name: "Human resources", 
            icon: "👥", 
            description: "Enhance team engagement and efficiency with streamlined processes.",
            href: "/human-resources" 
          },
          { 
            name: "Sales", 
            icon: "💼", 
            description: "Maximize sales with tools enhancing team efficiency and insight.",
            href: "/sales" 
          }
        ],
        bottomLinks: [
          { name: "Contact Sales", icon: "💬", href: "/contact-sales" },
          { name: "Watch demo", icon: "▶", href: "/demo" },
          { name: "Download apps", icon: "📱", href: "/download" }
        ]
      },
      usecases: {
        cards: [
          { 
            name: "Agile project management", 
            icon: "🔄", 
            description: "Build flexible workflows that adapt to changing requirements and priorities.",
            href: "/agile" 
          },
          { 
            name: "Sprint planning", 
            icon: "⚡", 
            description: "Plan and execute sprints with clarity, keeping teams aligned and productive.",
            href: "/sprint-planning" 
          },
          { 
            name: "Product roadmapping", 
            icon: "🗺️", 
            description: "Visualize product strategy and align teams around shared goals and milestones.",
            href: "/roadmapping" 
          },
          { 
            name: "Resource management", 
            icon: "👔", 
            description: "Optimize team capacity and allocate resources efficiently across projects.",
            href: "/resource-management" 
          },
          { 
            name: "Campaign management", 
            icon: "📊", 
            description: "Coordinate marketing campaigns from planning to execution and analysis.",
            href: "/campaign-management" 
          },
          { 
            name: "Bug tracking", 
            icon: "🐛", 
            description: "Track, prioritize, and resolve issues efficiently with streamlined workflows.",
            href: "/bug-tracking" 
          },
          { 
            name: "Client management", 
            icon: "🤝", 
            description: "Deliver exceptional client experiences with organized project tracking.",
            href: "/client-management" 
          }
        ],
        bottomLinks: [
          { name: "View all use cases", icon: "📋", href: "/use-cases-all" },
          { name: "Get started", icon: "🚀", href: "/get-started" },
          { name: "Talk to sales", icon: "💬", href: "/sales" }
        ]
      }
    }
  },
  resources: {
    sidebar: [
      { id: "learn", name: "Learn", icon: "📚", href: "/learn" }
    ],
    content: {
      learn: {
        sections: [
          {
            title: "Learn",
            badge: "Free",
            items: [
              { name: "University", icon: "🎓", href: "/university" },
              { name: "Demos", icon: "💬", href: "/demos" },
              { name: "Video tutorials", icon: "▶", href: "/video-tutorials" },
              { name: "Webinars", icon: "👥", href: "/webinars" }
            ]
          },
          {
            title: "Discover",
            items: [
              { name: "Blog", icon: "📝", href: "/blog" },
              { name: "Customer stories", icon: "😊", href: "/customer-stories" },
              { name: "Virtual Summits", icon: "👥", href: "/virtual-summits" },
              { name: "Productivity quiz", icon: "✓", href: "/productivity-quiz" }
            ]
          },
          {
            title: "Services",
            items: [
              { name: "Professional services", icon: "⭐", href: "/professional-services" },
              { name: "Support services", icon: "🎧", href: "/support-services" },
              { name: "Partner services", icon: "🤝", href: "/partner-services" }
            ]
          }
        ],
        featured: {
          title: "Customer Stories",
          testimonial: {
            avatar: "👤",
            company: "CN",
            companyLogo: "CARTOON NETWORK",
            quote: "ClickUp is our one source of truth for all the details we need - It helps us work faster"
          },
          cta: "See more"
        },
        bottomLinks: [
          { name: "Contact Sales", icon: "💬", href: "/contact-sales" },
          { name: "Watch demo", icon: "▶", href: "/demo" },
          { name: "Download apps", icon: "📱", href: "/download" }
        ]
      }
    }
  }
};

const MegaMenu = ({ type, isOpen }) => {
  const data = menuData[type];
  const [selectedTab, setSelectedTab] = useState(null);
  
  useEffect(() => {
    if (isOpen && data?.sidebar?.[0]?.id) {
      setSelectedTab(data.sidebar[0].id);
    }
  }, [type, isOpen, data]);
  
  if (!data || !isOpen) return null;

  const activeTab = selectedTab || data.sidebar[0]?.id;
  const activeContent = data.content?.[activeTab];

  return (
    <div className="fixed left-0 right-0 top-[80px] z-40">
      <div className="max-w-[1250px] mx-auto">
        <div 
          className="bg-white rounded-xl border shadow-2xl overflow-hidden animate-fadeIn jakarta-font" 
          style={{ borderColor: 'rgba(140, 140, 170, 0.3)' }}
        >
          <div className="flex">
            {data.sidebar && (
              <div className="w-36 bg-white border-r border-gray-200 py-3">
                <div className="px-2 space-y-0.5">
                  {data.sidebar.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTab(item.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all duration-200 group ${
                        activeTab === item.id
                          ? 'text-gray-700 hover:bg-gray-50 hover:bg-gray-50'
                          : 'text-gray-700 hover:bg-gray-50 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 p-5">
              {activeContent?.cards ? (
                <div className="grid grid-cols-3 gap-4">
                  {activeContent.cards.map((card, idx) => (
                    <Link
                      key={idx}
                      href={card.href}
                      className="group p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{card.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:bg-gray-50 transition-colors">
                            {card.name}
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-x-8 gap-y-5">
                  {activeContent?.sections?.map((section, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <h3 className="text-xs font-bold text-gray-900">
                          {section.title}
                        </h3>
                        {section.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-green-500 rounded">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            <Link
                              href={item.href}
                              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:bg-gray-50 rounded-md transition-colors group"
                            >
                              <span className="text-sm opacity-60 group-hover:opacity-100">{item.icon}</span>
                              <span>{item.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {activeContent?.bottomLinks && (
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    {activeContent.bottomLinks.map((link, idx) => (
                      <Link
                        key={idx}
                        href={link.href}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm">{link.icon}</span>
                        <span>{link.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeContent?.featured && (
              <div className="w-56 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 border-l border-purple-100 p-4">
                {activeContent.featured.testimonial ? (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-600 mb-3">
                      {activeContent.featured.title}
                    </p>
                    
                    <div className="mb-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                        {activeContent.featured.testimonial.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-gray-900">
                          {activeContent.featured.testimonial.companyLogo}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-700 italic mb-4 leading-relaxed">
                      "{activeContent.featured.testimonial.quote}"
                    </p>
                    
                    <Link
                      href="/customer-stories"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      {activeContent.featured.cta} →
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-gray-600 mb-1">
                        {activeContent.featured.title}
                      </p>
                      <h3 className="text-base font-bold">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          {activeContent.featured.brand}
                        </span>
                      </h3>
                      {activeContent.featured.subtitle && (
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {activeContent.featured.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <ul className="space-y-1.5 mb-4">
                      {activeContent.featured.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="text-purple-600 mt-0.5 text-[10px]">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md">
                      Learn More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileMenu = ({ isOpen, onClose }) => {
  const [selectedMenu, setSelectedMenu] = useState(null);

  if (!isOpen) return null;

  const handleMenuClick = (menuKey) => {
    setSelectedMenu(menuKey);
  };

  const handleBack = () => {
    setSelectedMenu(null);
  };

  const getMenuContent = () => {
    if (!selectedMenu) return null;
    
    switch(selectedMenu) {
      case 'product':
        return menuData.topic;
      case 'solutions':
        return menuData.pathways;
      case 'resources':
        return menuData.resources;
      default:
        return null;
    }
  };

  const activeMenuData = getMenuContent();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] sm:hidden"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto sm:hidden shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
            <span className="text-lg font-bold text-gray-900">Logo</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {!selectedMenu ? (
          <div className="py-4">
            <button
              onClick={() => handleMenuClick('product')}
              className="w-full flex items-center justify-between px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            >
              <span className="text-base font-medium">Topic</span>
              <ChevronRight />
            </button>
            <button
              onClick={() => handleMenuClick('solutions')}
              className="w-full flex items-center justify-between px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            >
              <span className="text-base font-medium">Pathways</span>
              <ChevronRight />
            </button>
            <button
              onClick={() => handleMenuClick('resources')}
              className="w-full flex items-center justify-between px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            >
              <span className="text-base font-medium">Resources</span>
              <ChevronRight />
            </button>
            <Link
              href="/pricing"
              className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
              onClick={onClose}
            >
              <span className="text-base font-medium">Pricing</span>
            </Link>
            <Link
              href="/enterprise"
              className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
              onClick={onClose}
            >
              <span className="text-base font-medium">Enterprise</span>
            </Link>
          </div>
        ) : (
          <div className="py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 border-b border-gray-100 w-full"
            >
              <BackArrow />
              <span className="text-sm font-medium">Back</span>
            </button>

            {activeMenuData?.sidebar && (
              <div className="mt-2">
                {activeMenuData.sidebar.map((section, idx) => {
                  const sectionContent = activeMenuData.content[section.id];
                  
                  return (
                    <div key={idx} className="border-b border-gray-100">
                      <div className="px-6 py-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{section.icon}</span>
                          <h3 className="text-sm font-bold text-gray-900">{section.name}</h3>
                        </div>
                      </div>
                      
                      <div className="px-6 py-2">
                        {sectionContent?.sections?.map((subsection, subIdx) => (
                          <div key={subIdx} className="py-3">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">
                              {subsection.title}
                            </h4>
                            <ul className="space-y-1">
                              {subsection.items.map((item, itemIdx) => (
                                <li key={itemIdx}>
                                  <Link
                                    href={item.href}
                                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-indigo-600"
                                    onClick={onClose}
                                  >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="text-sm">{item.name}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        {sectionContent?.cards?.map((card, cardIdx) => (
                          <Link
                            key={cardIdx}
                            href={card.href}
                            className="block py-3 border-b border-gray-100"
                            onClick={onClose}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{card.icon}</span>
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">
                                  {card.name}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {card.description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default function MainNavbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const closeMenu = () => {
    setOpenMenu(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
      
      <header className="w-full sticky top-0 z-50 backdrop-blur-sm bg-transparent py-3">
        {openMenu && (
          <div 
            onClick={closeMenu}
            className="fixed inset-0 z-30"
          />
        )}
        
        <MegaMenu type={openMenu} isOpen={!!openMenu} />
        
        <nav className="max-w-7xl mx-auto px-4 relative z-50">
          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link href="/" className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <div className="w-5 h-5">
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>

            <div 
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-visible backdrop-blur-md" 
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            >
              <button 
                onClick={() => toggleMenu('topic')}
                className="flex items-center px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Topic
                <ChevronDown />
              </button>
              
              <button 
                onClick={() => toggleMenu('pathways')}
                className="flex items-center px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pathways
                <ChevronDown />
              </button>
              
              <button 
                onClick={() => toggleMenu('resources')}
                className="flex items-center px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Resources
                <ChevronDown />
              </button>
              
              <Link
                href="/pricing"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pricing
              </Link>
              <Link
                href="/enterprise"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Enterprise
              </Link>
            </div>

            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 -my-1 text-sm font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #7c3aed, #a855f7)', borderColor: '#8b5cf6' }}
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Tablet Layout */}
          <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
            {/* Logo Section */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link href="/" className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <div className="w-5 h-5">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full" />
                </div>
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>

            {/* Navigation Menu - Compact */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <button
                onClick={() => toggleMenu('topic')}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Topic
                <ChevronDown />
              </button>
              <button
                onClick={() => toggleMenu('pathways')}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pathways
                <ChevronDown />
              </button>
              <button
                onClick={() => toggleMenu('resources')}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Resources
                <ChevronDown />
              </button>
              <Link
                href="/pricing"
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pricing
              </Link>
            </div>

            {/* Auth Section */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #7c3aed, #a855f7)', borderColor: '#8b5cf6' }}
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Hamburger Menu Pill */}
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <button
                  onClick={toggleMobileMenu}
                  className="px-2 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <HamburgerIcon />
                </button>
              </div>

              {/* Logo Pill */}
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <Link href="/" className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
                  <span className="text-gray-900">Logo</span>
                </Link>
              </div>
            </div>

            {/* Login/Signup Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link
                href="/login"
                className="px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                style={{ backgroundImage: 'linear-gradient(90deg, #a855f7, #7c3aed, #a855f7)', borderColor: '#8b5cf6' }}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>

        <style jsx global>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
        `}</style>
      </header>
    </>
  );
}