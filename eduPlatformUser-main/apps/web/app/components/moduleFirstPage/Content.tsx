import { TopBar } from "../layout";
import HeroSection from "./HeroSection";
import ModulesSection from "./ModulesSection";
import NavBar from "./NavBar";
import Overview from "./Overview";



export default function Content() {
    return (
        <div>
            <TopBar/>
            <NavBar/>
            <HeroSection/>
            <ModulesSection/>
            <Overview/>
        </div>
    );
}