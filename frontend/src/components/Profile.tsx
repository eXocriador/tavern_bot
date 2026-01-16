import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, Profile as ProfileType } from '../api/profile';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
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
      alert('Помилка завантаження профілю');
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
      alert('Профіль оновлено!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Помилка оновлення профілю');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Завантаження...</div>;
  }

  return (
    <div className="profile">
      <header className="profile-header">
        <div className="header-content">
          <h1>Профіль</h1>
          <div className="header-actions">
            <Link to="/" className="btn-secondary">
              Головна
            </Link>
            <Link to="/statistics" className="btn-secondary">
              Статистика
            </Link>
            <button onClick={logout} className="btn-logout">
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-card">
          <h2>Інформація про користувача</h2>
          <div className="profile-info">
            <div className="info-row">
              <label>Telegram ID:</label>
              <span>{profile?.telegramId}</span>
            </div>
            <div className="info-row">
              <label>Ім'я користувача:</label>
              <span>{profile?.username || 'Не вказано'}</span>
            </div>
            <div className="info-row">
              <label>Ім'я:</label>
              <span>
                {profile?.firstName || ''} {profile?.lastName || ''}
              </span>
            </div>
            <div className="info-row">
              <label>Дата реєстрації:</label>
              <span>
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('uk-UA')
                  : 'Не вказано'}
              </span>
            </div>
          </div>

          <div className="profile-form">
            <h3>Ім'я персонажа в грі</h3>
            <div className="form-group">
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Введіть ім'я персонажа"
                className="form-input"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-save"
              >
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

