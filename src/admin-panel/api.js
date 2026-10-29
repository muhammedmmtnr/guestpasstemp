import { ApiError, setApiAccessTokenProvider as configureApiAccessTokenProvider } from '../lib/api.js'
import { authService } from '../services/auth.js'
import { profileService } from '../services/profile.js'
import {
  adaptUserListResponse,
  adminDashboardService,
  adminUsersService,
  getUserRecordId,
  isSensitiveField,
} from '../services/adminUsers.js'

export { ApiError, adaptUserListResponse, getUserRecordId, isSensitiveField }

export const authApi = authService
export const adminUsersApi = adminUsersService
export const adminDashboardApi = adminDashboardService

export const usersApi = {
  updateMyProfile: (payload, config) => profileService.updateMyProfile(payload, {
    ...config,
    authMode: config?.authMode || 'admin',
  }),
  updateMyProfileImage: (formData, config) => {
    if (!(formData instanceof FormData)) {
      throw new TypeError('Profile image uploads require a FormData body.')
    }
    return profileService.updateMyProfileImage(formData, {
      ...config,
      authMode: config?.authMode || 'admin',
    })
  },
}

export function setApiAccessTokenProvider(provider) {
  return configureApiAccessTokenProvider(provider, 'user')
}

export function setAdminApiAccessTokenProvider(provider) {
  return configureApiAccessTokenProvider(provider, 'admin')
}
