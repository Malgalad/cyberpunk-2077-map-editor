import "./index.css";

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App.tsx";
import initProject from "./initProject.ts";
import ModalContainer from "./modals/@ModalContainer.tsx";
import store from "./store/store.ts";

void initProject();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
    <ModalContainer />
  </Provider>,
);
