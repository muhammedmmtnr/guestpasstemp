import { useEffect, useState } from 'react';
import {
  adaptProfileResponse,
  buildAdminProfilePayload,
  validateProfileImage,
} from './adminAuth';
import { profileService } from '../services/profile';

function readProfileForm(profile) {
  return {
    fullName: String(profile?.fullName ?? profile?.full_name ?? ''),
    phone: String(profile?.phone ?? ''),
    receiveWhatsAppUpdates: Boolean(
      profile?.receiveWhatsAppUpdates ?? profile?.receive_whatsapp_updates,
    ),
  };
}

function getProfileImage(profile) {
  return profile?.profileImageUrl
    ?? profile?.profile_image_url
    ?? profile?.avatarUrl
    ?? profile?.avatar_url
    ?? '';
}

function AdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', receiveWhatsAppUpdates: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');

    profileService.getMyProfile({ signal: controller.signal, authMode: 'admin' })
      .then((payload) => {
        const nextProfile = adaptProfileResponse(payload);
        if (!nextProfile) {
          throw new Error('The API response did not include a profile.');
        }
        setProfile(nextProfile);
        setForm(readProfileForm(nextProfile));
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load your profile.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    if (!previewUrl.startsWith('blob:')) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleSave(event) {
    event.preventDefault();
    if (isSaving || !profile) return;

    const changedFields = buildAdminProfilePayload(form, profile);
    if (Object.keys(changedFields).length === 0) {
      setSuccess('There are no profile changes to save.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = await profileService.updateMyProfile(changedFields, { authMode: 'admin' });
      const updatedProfile = adaptProfileResponse(payload);
      setProfile((current) => ({ ...current, ...changedFields, ...(updatedProfile ?? {}) }));
      setSuccess('Profile updated.');
    } catch (requestError) {
      setError(requestError.message || 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    setImageError('');
    setSuccess('');
    if (!nextFile) return;

    const validation = validateProfileImage(nextFile);
    if (!validation.valid) {
      setImageError(validation.error);
      return;
    }

    setImageFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleImageUpload() {
    if (!imageFile || isUploading) return;

    setIsUploading(true);
    setProgress(0);
    setImageError('');
    setSuccess('');
    try {
      await profileService.updateMyProfileImage(imageFile, {
        authMode: 'admin',
        onUploadProgress: ({ loaded, total }) => {
          setProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
        },
      });
      setImageFile(null);
      setPreviewUrl('');
      setSuccess('Profile image updated.');
      setRetryKey((current) => current + 1);
    } catch (requestError) {
      setImageError(requestError.message || 'Could not upload the profile image.');
    } finally {
      setIsUploading(false);
    }
  }

  const image = previewUrl || getProfileImage(profile);
  const changedFields = profile ? buildAdminProfilePayload(form, profile) : {};

  return (
    <main className="user-management-page">
      <a className="user-details-back" href="/admin">← Back to dashboard</a>
      <section className="user-details-card" aria-labelledby="admin-profile-title">
        <div className="user-details-heading">
          <div className="user-details-avatar" aria-hidden="true">A</div>
          <div>
            <p className="user-details-eyebrow">Admin / Profile</p>
            <h1 id="admin-profile-title">My profile</h1>
            <p className="user-details-id">Update your account details and profile image.</p>
          </div>
        </div>

        {error && (
          <div className="user-details-error" role="alert">
            <strong>Unable to complete profile request</strong>
            <p>{error}</p>
            {!profile && (
              <button type="button" className="user-management-retry" onClick={() => setRetryKey((current) => current + 1)}>
                Retry
              </button>
            )}
          </div>
        )}
        {success && <p className="user-management-success" role="status">{success}</p>}

        {isLoading ? (
          <p className="user-details-message" role="status">Loading profile…</p>
        ) : profile ? (
          <>
            <form className="sign-in-form" onSubmit={handleSave}>
              <label>
                <span>Full name</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  autoComplete="name"
                  maxLength={120}
                  required
                  disabled={isSaving}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  autoComplete="tel"
                  disabled={isSaving}
                />
              </label>
              <label className="admin-profile-checkbox">
                <input
                  type="checkbox"
                  checked={form.receiveWhatsAppUpdates}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    receiveWhatsAppUpdates: event.target.checked,
                  }))}
                  disabled={isSaving}
                />
                <span>Receive WhatsApp updates</span>
              </label>
              <button
                type="submit"
                className="user-management-apply"
                disabled={isSaving || Object.keys(changedFields).length === 0}
              >
                {isSaving ? 'Saving…' : 'Save profile'}
              </button>
            </form>

            <section className="admin-profile-image" aria-labelledby="profile-image-title">
              <h2 id="profile-image-title">Profile image</h2>
              {image ? (
                <img className="admin-profile-image-preview" src={image} alt="Profile preview" />
              ) : (
                <p className="user-details-message">No profile image is set.</p>
              )}
              <label>
                <span>Choose an image (JPEG, PNG, or WebP; maximum 5 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isUploading}
                />
              </label>
              {imageError && <p className="user-details-error" role="alert">{imageError}</p>}
              {isUploading && (
                <div className="admin-profile-progress">
                  <progress value={progress} max="100" aria-label="Image upload progress" />
                  <span>{progress}%</span>
                </div>
              )}
              <button
                type="button"
                className="user-management-apply"
                onClick={handleImageUpload}
                disabled={!imageFile || isUploading}
              >
                {isUploading ? 'Uploading…' : 'Upload image'}
              </button>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default AdminProfilePage;
