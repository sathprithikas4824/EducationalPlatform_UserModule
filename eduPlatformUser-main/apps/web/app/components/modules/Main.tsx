import { TopBar } from "../layout";
import NavBar from "../moduleFirstPage/NavBar";
import Contents from "./Contents";

interface MainProps {
  submoduleId: number;
}

export default function Main({ submoduleId }: MainProps) {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0d0d1a] transition-colors duration-300">
            <TopBar/>
            <NavBar/>
            <Contents submoduleId={submoduleId} />
        </div>
    );
}
