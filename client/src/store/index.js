import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './slices/auth.slice.js';
import productReducer from './slices/product.slice.js';
import orderReducer   from './slices/order.slice.js';
import chatReducer    from './slices/chat.slice.js';
import uiReducer      from './slices/ui.slice.js';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    products: productReducer,
    orders:  orderReducer,
    chat:    chatReducer,
    ui:      uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
