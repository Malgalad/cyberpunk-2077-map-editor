import "./index.css";

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App.tsx";
import initProject from "./initProject.ts";
import ModalContainer from "./modals/@ModalContainer.tsx";
import store from "./store/store.ts";

void initProject();
void navigator.serviceWorker.register("/sw.js", { scope: "/" });

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
    <ModalContainer />
  </Provider>,
);
