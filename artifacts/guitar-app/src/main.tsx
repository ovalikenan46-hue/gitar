import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "./lib/auth";

setAuthTokenGetter(async () => {
  return getToken();
});

createRoot(document.getElementById("root")!).render(<App />);
