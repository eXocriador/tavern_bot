import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCharacters, createCharacter, updateCharacter, deleteCharacter, type Character } from '../api/characters';
import { CharacterCard } from '../components/features';
import { EmptyState } from '../components/ui';
import CharacterModal from '../components/modals/CharacterModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const { t } = useLanguage();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const data = await getCharacters();
      setCharacters(data);
    } catch (error) {
      console.error('Error loading characters:', error);
      alert(t('characters.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (nickname: string, profession: string, level: number) => {
    await createCharacter(nickname, profession, level);
    await loadCharacters();
  };

  const handleUpdate = async (nickname: string, profession: string, level: number) => {
    if (!editingCharacter) return;
    await updateCharacter(editingCharacter._id, nickname, profession, level);
    await loadCharacters();
    setEditingCharacter(null);
  };

  const handleDelete = async () => {
    if (!deletingCharacter) return;
    await deleteCharacter(deletingCharacter._id);
    await loadCharacters();
    setDeletingCharacter(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов');
      return;
    }

    setPasswordLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      await axios.post(`${API_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });

      setPasswordSuccess('Пароль успешно изменен');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="profile">
      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-header">
            <h2>{t('profile.title')}</h2>
            <div className="profile-header-actions">
              {characters.length > 0 && (
                <>
                  <button
                    onClick={() => setIsDeleteMode(!isDeleteMode)}
                    className={`btn-delete-mode ${isDeleteMode ? 'active' : ''}`}
                    title={isDeleteMode ? t('characters.exitDeleteMode') : t('characters.deleteMode')}
                  >
                    {isDeleteMode ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-create-character"
                  >
                    {t('characters.createNew')}
                  </button>
                </>
              )}
            </div>
          </div>

          {characters.length === 0 ? (
            <EmptyState
              message={t('characters.noCharacters')}
              actionLabel={t('characters.create')}
              onAction={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <div className="characters-list">
              {characters.map((character) => (
                <CharacterCard
                  key={character._id}
                  character={character}
                  isDeleteMode={isDeleteMode}
                  onEdit={setEditingCharacter}
                  onDelete={setDeletingCharacter}
                />
              ))}
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-header">
            <h2>Безопасность</h2>
          </div>
          <div className="password-change-section">
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="btn-change-password"
              >
                Изменить пароль
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="password-change-form">
                <div className="password-input-group">
                  <label htmlFor="oldPassword">Старый пароль</label>
                  <input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Введите старый пароль"
                    required
                  />
                </div>
                <div className="password-input-group">
                  <label htmlFor="newPassword">Новый пароль</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    required
                    minLength={6}
                  />
                </div>
                <div className="password-input-group">
                  <label htmlFor="confirmPassword">Подтвердите пароль</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    required
                    minLength={6}
                  />
                </div>
                {passwordError && <div className="password-error">{passwordError}</div>}
                {passwordSuccess && <div className="password-success">{passwordSuccess}</div>}
                <div className="password-actions">
                  <button type="submit" className="btn-save-password" disabled={passwordLoading}>
                    {passwordLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="btn-cancel-password"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <CharacterModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        mode="create"
      />

      {editingCharacter && (
        <CharacterModal
          isOpen={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onSave={handleUpdate}
          character={editingCharacter}
          mode="edit"
        />
      )}

      {deletingCharacter && (
        <DeleteConfirmModal
          isOpen={!!deletingCharacter}
          onClose={() => setDeletingCharacter(null)}
          onConfirm={handleDelete}
          characterName={deletingCharacter.nickname}
        />
      )}
    </div>
  );
};

export default Profile;
