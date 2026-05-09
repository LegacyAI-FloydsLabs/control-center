import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

// StrictMode removed: its double-invoke pattern (mount → unmount → remount)
// closes WebSocket connections before they establish, crashing the Vite WS proxy.
// WebSocket lifecycle is inherently side-effectful and cannot survive instant
// create-close-recreate cycles. React StrictMode is a dev debugging tool,
// not a production requirement.
createRoot(document.getElementById("aterm-root")!).render(<App />);
