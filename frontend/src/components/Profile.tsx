import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { getProfile, updateProfile, Profile as ProfileType } from '../api/profile';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await getProfile();
      setProfile(profileData);
      setCharacterName(profileData.characterName || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      alert(t('profile.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await updateProfile(characterName);
      setProfile(updatedProfile);
      updateUser({
        ...user!,
        characterName: updatedProfile.characterName,
      });
      alert(t('profile.updated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="profile">
      <header className="profile-header">
        <div className="header-content">
          <h1>{t('profile.title')}</h1>
          <div className="header-actions">
            <LanguageSwitcher />
            <Link to="/" className="btn-secondary">
              {t('profile.home')}
            </Link>
            <Link to="/statistics" className="btn-secondary">
              {t('profile.statistics')}
            </Link>
            <button onClick={logout} className="btn-logout">
              {t('profile.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-card">
          <h2>{t('profile.userInfo')}</h2>
          <div className="profile-info">
            <div className="info-row">
              <label>{t('profile.telegramId')}</label>
              <span>{profile?.telegramId}</span>
            </div>
            <div className="info-row">
              <label>{t('profile.username')}</label>
              <span>{profile?.username || t('profile.notSpecified')}</span>
            </div>
            <div className="info-row">
              <label>{t('profile.name')}</label>
              <span>
                {profile?.firstName || ''} {profile?.lastName || ''}
              </span>
            </div>
            <div className="info-row">
              <label>{t('profile.registrationDate')}</label>
              <span>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : t('profile.notSpecified')}
              </span>
            </div>
          </div>

          <div className="profile-form">
            <h3>{t('profile.characterName')}</h3>
            <div className="form-group">
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder={t('profile.characterNamePlaceholder')}
                className="form-input"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-save"
              >
                {saving ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

