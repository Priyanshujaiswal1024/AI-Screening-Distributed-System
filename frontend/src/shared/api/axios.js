import axios from 'axios'
import { useAuthStore } from '../store/authStore'
// export { endpoints } from './endpoints'
export const api = axios.create({
    baseURL: 'http://localhost:8090', // API Gateway URL
    timeout: 180000
})

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            useAuthStore.getState().logout()
            window.location.href = '/auth'
        }
        return Promise.reject(err)
    }
)

export { endpoints } from './endpoints'