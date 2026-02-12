import { TopBar } from "../layout";
import NavBar from "../moduleFirstPage/NavBar";
import Contents from "./Contents";

interface MainProps {
  submoduleId: number;
}

export default function Main({ submoduleId }: MainProps) {
    return (
        <div>
            <TopBar/>
            <NavBar/>
            <Contents submoduleId={submoduleId} />
        </div>
    );
}
