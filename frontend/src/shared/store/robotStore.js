import { create } from 'zustand'

export const useRobotStore = create((set, get) => ({
    isOpen: false,
    mood: 'idle', // idle | thinking | happy | sad | notification
    currentJobId: null,
    currentResumeId: null,
    conversationId: null,
    unreadCount: 0,
    messages: [
        {
            role: 'ai',
            text: "Hi! I'm your Talent Intelligence Assistant. Ask me anything about your candidates, jobs, or rankings.",
            timestamp: new Date().toISOString(),
        },
    ],

    open: () => set({ isOpen: true, unreadCount: 0 }),
    close: () => set({ isOpen: false }),
    toggle: () => {
        const { isOpen } = get()
        set({ isOpen: !isOpen, unreadCount: isOpen ? get().unreadCount : 0 })
    },

    setMood: (mood) => set({ mood }),
    setContext: ({ jobId, resumeId }) =>
        set({ currentJobId: jobId, currentResumeId: resumeId }),

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, { ...message, timestamp: new Date().toISOString() }],
            unreadCount: state.isOpen ? 0 : state.unreadCount + (message.role === 'ai' ? 1 : 0),
        })),

    setConversationId: (id) => set({ conversationId: id }),

    clearMessages: () =>
        set({
            messages: [
                {
                    role: 'ai',
                    text: "Hi! I'm your Talent Intelligence Assistant. Ask me anything about your candidates, jobs, or rankings.",
                    timestamp: new Date().toISOString(),
                },
            ],
            conversationId: null,
        }),
}))