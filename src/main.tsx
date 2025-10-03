import "./index.css";

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App.tsx";
import ModalContainer from "./modals/ModalContainer.tsx";
import store from "./store/store.ts";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
    <ModalContainer />
  </Provider>,
);
