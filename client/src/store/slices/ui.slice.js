import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, theme: 'light', notifications: [] },
  reducers: {
    toggleSidebar:     (s) => { s.sidebarOpen = !s.sidebarOpen; },
    addNotification:   (s, a) => { s.notifications.unshift({ ...a.payload, id: Date.now(), read: false }); },
    markAllRead:       (s) => { s.notifications = s.notifications.map(n => ({ ...n, read: true })); },
    clearNotification: (s, a) => { s.notifications = s.notifications.filter(n => n.id !== a.payload); },
  },
});

export const { toggleSidebar, addNotification, markAllRead, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
