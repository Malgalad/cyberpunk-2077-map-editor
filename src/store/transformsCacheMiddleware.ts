import { isAction, type Middleware } from "redux";
import { ActionTypes } from "redux-undo";

import { clearCachedTransforms } from "../utilities/getTransformsFromSubtree.ts";

export const transformsCacheMiddleware: Middleware =
  () => (next) => (action) => {
    if (
      isAction(action) &&
      (action.type === ActionTypes.UNDO || action.type === ActionTypes.REDO)
    ) {
      clearCachedTransforms();
    }
    return next(action);
  };
