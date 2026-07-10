import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * authStore.js
 *
 * WHY recruiterId === userId:
 * ──────────────────────────
 * Backend LoginResponseDto returns:  { accessToken, tokenType, expiresIn, userId, role }
 * Backend JWT claims contain:        { sub: email, roles: [...], userId: UUID, companyName }
 *
 * Every downstream service (job-description-service, resume-management-service, etc.)
 * uses recruiterId as a foreign key — and that recruiterId IS the userId from auth-service.
 *
 * So: recruiterId = userId (always). We store both explicitly for readability.
 *
 * WRONG (old code):     recruiterId: res.data.recruiterId  → undefined → 400
 * CORRECT (this code):  recruiterId: res.data.userId       → valid UUID → 201
 */
export const useAuthStore = create(
    persist(
        (set) => ({
            token:           null,
            userId:          null,
            recruiterId:     null,
            email:           null,
            role:            null,
            isAuthenticated: false,

            /**
             * Call after successful login OR verify-otp.
             *
             * @param {string} accessToken  - JWT from backend
             * @param {string} userId       - UUID from LoginResponseDto
             * @param {string} role         - "RECRUITER" | "ADMIN"
             * @param {string} email        - from form (not in LoginResponseDto)
             * @param {string} recruiterId  - pass userId here (recruiterId === userId)
             */
            login: ({ accessToken, userId, role, email, recruiterId }) => {
                set({
                    token:           accessToken,
                    userId:          userId,
                    recruiterId:     recruiterId ?? userId,
                    email:           email,
                    role:            role,
                    isAuthenticated: true,
                })
            },

            logout: () => set({
                token:           null,
                userId:          null,
                recruiterId:     null,
                email:           null,
                role:            null,
                isAuthenticated: false,
            }),

            updateEmail: (email) => set({ email }),
        }),
        {
            name: 'tip-auth',
            partialize: (state) => ({
                token:           state.token,
                userId:          state.userId,
                recruiterId:     state.recruiterId,
                email:           state.email,
                role:            state.role,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)