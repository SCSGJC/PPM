import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, User, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileService, UserProfile } from '../services/profileService';
import { useToast } from '../context/ToastContext';

interface UserProfileSettingsProps {
  onClose: () => void;
}

export function UserProfileSettings({ onClose }: UserProfileSettingsProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data, error } = await profileService.getCurrentUserProfile();
    if (!error && data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setCompany(data.company || '');
      const signatureUrl = data.signature_url ? `${data.signature_url}?t=${Date.now()}` : null;
      console.log('Loading signature URL:', signatureUrl);
      setSignaturePreview(signatureUrl);
    } else if (error) {
      console.error('Error loading profile:', error);
    }
    setLoading(false);
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('Signature file must be less than 2MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const { data, error } = await profileService.uploadSignature(user.id, file);
      if (error) throw error;

      if (data?.url) {
        const signatureUrl = `${data.url}?t=${Date.now()}`;
        setSignaturePreview(signatureUrl);
        addToast('Signature uploaded successfully', 'success');
        await loadProfile();
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      addToast('Failed to upload signature', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete your signature?')) return;

    setUploading(true);
    try {
      const { error } = await profileService.deleteSignature(user.id);
      if (error) throw error;

      setSignaturePreview(null);
      addToast('Signature deleted successfully', 'success');
      await loadProfile();
    } catch (error) {
      console.error('Error deleting signature:', error);
      addToast('Failed to delete signature', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await profileService.updateUserProfile(user.id, {
        full_name: fullName || null,
        company: company || null,
      });

      if (error) throw error;

      addToast('Profile updated successfully', 'success');
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-gray-600">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Signature</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your signature to automatically include it in the author section of proposal reports.
            </p>

            {signaturePreview ? (
              <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img
                    src={signaturePreview}
                    alt="Signature preview"
                    className="max-h-32 mx-auto"
                    onError={(e) => {
                      console.error('Failed to load signature image:', signaturePreview);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => console.log('Signature loaded successfully:', signaturePreview)}
                  />
                </div>
                <div className="flex gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-center font-medium disabled:opacity-50">
                      {uploading ? 'Uploading...' : 'Replace Signature'}
                    </div>
                  </label>
                  <button
                    onClick={handleDeleteSignature}
                    disabled={uploading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {uploading ? 'Uploading...' : 'Click to upload signature'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
