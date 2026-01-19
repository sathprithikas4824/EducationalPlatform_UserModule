import TopBar from "./components/layout/TopBar";
import MainNavbar from "./components/layout/MainNavBar";
import HeroSection from "./components/layout/HeroSection";
import ExploreTopics from "./components/layout/ExploreTopics";
import Content from "./components/moduleFirstPage/Content";

export default function Page() {
  return (
    <div
      className="relative min-h-screen w-full bg-white"
      style={{ overflow: 'visible' }}
    >
      {/* TOP BAR */}
      {/* <div className="relative z-20">
        <TopBar />
      </div> */}

      {/* MAIN NAVBAR*/}
      {/* <MainNavbar /> */}

      {/* HERO SECTION */}
      {/* <HeroSection /> */}

      {/* EXPLORE SECTION */}
      {/* <ExploreTopics/> */}

      <Content/>
    </div>
  );
}
