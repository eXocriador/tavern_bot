import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCharacters, createCharacter, updateCharacter, deleteCharacter, type Character } from '../api/characters';
import CharacterModal from './CharacterModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import './Profile.css';

const Profile = () => {
  const { t } = useLanguage();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

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
            <div className="characters-empty">
              <p>{t('characters.noCharacters')}</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-create-character-large"
              >
                {t('characters.create')}
              </button>
            </div>
          ) : (
            <div className="characters-list">
              {characters.map((character) => (
                <div key={character._id} className="character-card">
                  <div className="character-level-badge">
                    {t('characters.levelShort')} {character.level}
                  </div>
                  <div className="character-info">
                    <div className="character-name">{character.nickname}</div>
                    <div className="character-profession">{character.profession}</div>
                  </div>
                  <div className="character-actions">
                    <button
                      onClick={() => setEditingCharacter(character)}
                      className="btn-edit"
                      title={t('characters.edit')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    {isDeleteMode && (
                      <button
                        onClick={() => setDeletingCharacter(character)}
                        className="btn-delete"
                        title={t('characters.delete')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
