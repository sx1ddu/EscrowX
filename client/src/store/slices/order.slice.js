import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios.js';
import toast from 'react-hot-toast';

export const fetchMyOrders = createAsyncThunk('orders/fetchMy', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/orders/my', { params });
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const placeOrder = createAsyncThunk('orders/place', async (orderData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders', orderData);
    return data.data.order;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: { orders: [], currentOrder: null, loading: false, total: 0, totalPages: 0 },
  reducers: {
    setCurrentOrder: (s, a) => { s.currentOrder = a.payload; },
    updateOrderStatus: (s, a) => {
      const idx = s.orders.findIndex(o => o._id === a.payload.orderId);
      if (idx !== -1) s.orders[idx].escrowStatus = a.payload.status;
      if (s.currentOrder?._id === a.payload.orderId) s.currentOrder.escrowStatus = a.payload.status;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMyOrders.pending,   (s) => { s.loading = true; })
     .addCase(fetchMyOrders.fulfilled, (s, a) => { s.loading = false; s.orders = a.payload.orders; s.total = a.payload.total; s.totalPages = a.payload.totalPages; })
     .addCase(fetchMyOrders.rejected,  (s) => { s.loading = false; })
     .addCase(placeOrder.fulfilled, (s, a) => { s.currentOrder = a.payload; toast.success('Order placed! Proceed to payment.'); });
  },
});

export const { setCurrentOrder, updateOrderStatus } = orderSlice.actions;
export default orderSlice.reducer;
