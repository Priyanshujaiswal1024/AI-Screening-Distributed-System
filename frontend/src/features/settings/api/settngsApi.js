import { api, endpoints } from '../../../shared/api/axios'

export const settingsApi = {
    getProfile:    (id)       => api.get(endpoints.userById(id)),
    updateProfile: (id, data) => api.put(endpoints.updateUser(id), data),
}