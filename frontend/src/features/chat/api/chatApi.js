import { api } from '../../../shared/api/axios'
import { endpoints } from '../../../shared/api/endpoints'

export const chatApi = {
    sendMessage: (payload) => api.post(endpoints.chatMessage, payload),
    copilot: (payload, recruiterEmail) =>
        api.post(endpoints.copilotChat, payload, {
            headers: { 'X-User-Email': recruiterEmail },
        }),
}