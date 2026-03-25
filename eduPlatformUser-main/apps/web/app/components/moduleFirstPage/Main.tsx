import { TopBar } from "../layout";
import HeroSection from "./HeroSection";
import ModulesSection from "./ModulesSection";
import NavBar from "./NavBar";
import Overview from "./Overview";



export default function Main() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0d0d1a] transition-colors duration-300">
            <TopBar/>
            <NavBar/>
            <HeroSection/>
            <ModulesSection/>
            <Overview/>
        </div>
    );
}