import { apiClient } from '../lib/api.js'

export const profileService = {
  getMyProfile(config = {}) {
    return apiClient.post('users/me/profile', {}, config).then(({ data }) => data)
  },
  updateMyProfile(payload, config = {}) {
    return apiClient.post('users/me/profile', payload, config).then(({ data }) => data)
  },
  updateMyProfileImage(file, config = {}) {
    const formData = file instanceof FormData ? file : new FormData()
    if (!(file instanceof FormData)) formData.append('image', file)
    else if (!formData.has('image')) throw new TypeError('Profile image uploads require the "image" form field.')
    return apiClient.post('users/me/profile-image', formData, config).then(({ data }) => data)
  },
}
