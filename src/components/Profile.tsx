import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, User } from 'lucide-react';

interface ProfileProps {
  userId: string;
}

function Profile({ userId }: ProfileProps) {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.profile_picture_url) {
        setProfilePictureUrl(data.profile_picture_url);
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

      if (profilePictureUrl) {
        const oldPath = profilePictureUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ profile_picture_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([{ user_id: userId, profile_picture_url: publicUrl }]);

        if (insertError) throw insertError;
      }

      setProfilePictureUrl(publicUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Profile</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-md"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-blue-200 shadow-md flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Picture'}
          </div>
        </label>

        <p className="text-xs text-gray-500 text-center">
          Click to upload or change your profile picture
        </p>
      </div>
    </div>
  );
}

export default Profile;
