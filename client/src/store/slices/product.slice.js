import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios.js';

export const fetchProducts = createAsyncThunk('products/fetch', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/products', { params });
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const productSlice = createSlice({
  name: 'products',
  initialState: { products: [], total: 0, totalPages: 0, loading: false, filters: {} },
  reducers: {
    setFilters: (s, a) => { s.filters = { ...s.filters, ...a.payload }; },
    clearFilters: (s) => { s.filters = {}; },
  },
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending,   (s) => { s.loading = true; })
     .addCase(fetchProducts.fulfilled, (s, a) => { s.loading = false; s.products = a.payload.products; s.total = a.payload.total; s.totalPages = a.payload.totalPages; })
     .addCase(fetchProducts.rejected,  (s) => { s.loading = false; });
  },
});

export const { setFilters, clearFilters } = productSlice.actions;
export default productSlice.reducer;
