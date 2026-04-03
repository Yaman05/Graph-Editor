import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BackgroundPaths } from "@/components/ui/background-paths";

export default function Home() {
  const navigate = useNavigate();

  // Ensure page can scroll on homepage
  useEffect(() => {
    document.body.classList.remove("editor-mode");
    return () => {
      document.body.classList.add("editor-mode");
    };
  }, []);

  return (
    <div className="dark">
      <BackgroundPaths title="Graph Editor" onLaunch={() => navigate("/editor")} />
    </div>
  );
}
