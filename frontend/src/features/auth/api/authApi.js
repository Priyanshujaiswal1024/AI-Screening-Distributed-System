import { api, endpoints } from '../../../shared/api/axios'

export const authApi = {
    sendSignupOtp:  (data)  => api.post(endpoints.signupOtp, data),
    verifyOtp:      (data)  => api.post(endpoints.verifyOtp, data),
    resendOtp:      (email) => api.post(endpoints.resendOtp, { email }),
    login:          (data)  => api.post(endpoints.login, data),
    forgotPassword: (email) => api.post(endpoints.forgotPassword, { email }),
    resetPassword:  (data)  => api.post(endpoints.resetPassword, data),
    changePassword: (data)  => api.post(endpoints.changePassword, data),
}