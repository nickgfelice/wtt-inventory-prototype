import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles.css";

import { seedIfEmpty, getItems } from "./lib/storage";

seedIfEmpty();
console.log("Seed ran. Items now:", getItems());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
