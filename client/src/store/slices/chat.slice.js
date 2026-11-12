import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: { chats: [], currentChat: null, messages: [], loading: false },
  reducers: {
    setChats: (s, a) => { s.chats = a.payload; },
    setCurrentChat: (s, a) => { s.currentChat = a.payload; },
    setMessages: (s, a) => { s.messages = a.payload; },
    addMessage: (s, a) => { s.messages.push(a.payload); },
  },
});

export const { setChats, setCurrentChat, setMessages, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
