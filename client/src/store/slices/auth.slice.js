import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios.js';
import toast from 'react-hot-toast';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const refreshAccessToken = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/refresh-token');
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.accessToken;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isAuthenticated: false, loading: false, error: null, pendingUserId: null },
  reducers: {
    setUser: (state, action) => { 
      console.log("SET USER PAYLOAD:", action.payload);
      state.user = action.payload; state.isAuthenticated = !!action.payload; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.isAuthenticated = true; toast.success('Welcome back!'); })
      .addCase(loginUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload); })
      .addCase(registerUser.pending,   (s) => { s.loading = true; })
      .addCase(registerUser.fulfilled, (s, a) => { s.loading = false; s.pendingUserId = a.payload.userId; })
      .addCase(registerUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; toast.error(a.payload); })
      .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.isAuthenticated = false; toast.success('Logged out.'); })
      .addCase(refreshAccessToken.fulfilled, (s) => { s.isAuthenticated = true; });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
