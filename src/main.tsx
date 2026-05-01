import "./index.css";

import { enableArrayMethods } from "immer";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App.tsx";
import initProject from "./initProject.ts";
import ModalContainer from "./modals/@ModalContainer.tsx";
import store from "./store/store.ts";

enableArrayMethods();
void initProject();

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
    <ModalContainer />
  </Provider>,
);
