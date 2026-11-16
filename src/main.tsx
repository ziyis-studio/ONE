import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";
import "./styles.css";
import "./workspace.css";
import "./workspace-polish.css";
import "@fontsource-variable/dm-sans/wght.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
);
