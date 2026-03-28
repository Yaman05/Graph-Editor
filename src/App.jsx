import GraphEditor from "./components/GraphEditor/GraphEditor";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <GraphEditor />
    </ErrorBoundary>
  );
}

export default App;
