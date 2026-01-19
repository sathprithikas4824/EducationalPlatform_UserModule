import TopBar from "./components/layout/TopBar";
import MainNavbar from "./components/layout/MainNavBar";
import HeroSection from "./components/layout/HeroSection";

export default function Page() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-white"
    >
      {/* TOP BAR */}
      <div className="relative z-20">
        <TopBar />
      </div>

      {/* MAIN NAVBAR*/}
      <MainNavbar />

      {/*HERO SECTION*/}
      <HeroSection/>


    </div>
  );
}