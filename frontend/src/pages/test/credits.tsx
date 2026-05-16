import { useNavigate } from "react-router-dom";
import { EndingCredits } from "../../widgets/EndingCredits";

export default function TestCreditsPage() {
    const navigate = useNavigate();
    return <EndingCredits onComplete={() => navigate("/")} />;
}
