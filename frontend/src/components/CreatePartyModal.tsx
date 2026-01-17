import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getUsers, type UserWithCharacters } from '../api/users';
import { createParty, type CreatePartyData } from '../api/parties';
import type { InstanceZone } from '../api/instances';
import './CreatePartyModal.css';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  instance: InstanceZone;
}

const CreatePartyModal = ({ isOpen, onClose, onSuccess, instance }: CreatePartyModalProps) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithCharacters[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Map<string, string>>(new Map());
  const [readyTime, setReadyTime] = useState('');
  const [readyDate, setReadyDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      setReadyDate(dateStr);
      setReadyTime(timeStr);
      setSelectedUserIds(new Set());
      setSelectedCharacterIds(new Map());
      setError('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      setError(t('party.errors.loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
      const newMap = new Map(selectedCharacterIds);
      newMap.delete(userId);
      setSelectedCharacterIds(newMap);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleCharacterSelect = (userId: string, characterId: string) => {
    const newMap = new Map(selectedCharacterIds);
    newMap.set(userId, characterId);
    setSelectedCharacterIds(newMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedUserIds.size === 0) {
      setError(t('party.errors.noUsersSelected'));
      return;
    }

    if (selectedUserIds.size !== selectedCharacterIds.size) {
      setError(t('party.errors.selectCharacters'));
      return;
    }

    if (!readyDate || !readyTime) {
      setError(t('party.errors.timeRequired'));
      return;
    }

    try {
      setCreating(true);
      const readyDateTime = new Date(`${readyDate}T${readyTime}`);
      const characterIdsMap: { [userId: string]: string } = {};
      selectedCharacterIds.forEach((characterId, userId) => {
        characterIdsMap[userId] = characterId;
      });

      const data: CreatePartyData = {
        zoneId: instance.zoneId,
        readyTime: readyDateTime.toISOString(),
        invitedUserIds: Array.from(selectedUserIds),
        selectedCharacterIds: characterIdsMap,
      };

      await createParty(data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('party.errors.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-party-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('party.create')}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="party-instance-info">
            <h3>{instance.name}</h3>
          </div>

          {error && <div className="modal-error">{error}</div>}

          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : (
            <>
              <div className="party-users-section">
                <h4>{t('party.invitePlayers')}</h4>
                <div className="users-list">
                  {users.map((user) => (
                    <div key={user._id} className="user-item">
                      <label className="user-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user._id)}
                          onChange={() => handleUserToggle(user._id)}
                        />
                        <span className="user-name">
                          {user.username || `ID: ${user.telegramId}`}
                        </span>
                      </label>
                      {selectedUserIds.has(user._id) && user.characters.length > 0 && (
                        <div className="characters-select">
                          <select
                            value={selectedCharacterIds.get(user._id) || ''}
                            onChange={(e) => handleCharacterSelect(user._id, e.target.value)}
                            className="character-select"
                          >
                            <option value="">{t('party.selectCharacter')}</option>
                            {user.characters.map((char) => (
                              <option key={char._id} value={char._id}>
                                {char.nickname} ({char.profession}, Lvl {char.level})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="party-time-section">
                <h4>{t('party.readyTime')}</h4>
                <div className="time-inputs">
                  <input
                    type="date"
                    value={readyDate}
                    onChange={(e) => setReadyDate(e.target.value)}
                    className="form-input"
                    required
                  />
                  <input
                    type="time"
                    value={readyTime}
                    onChange={(e) => setReadyTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-save" disabled={creating || loading}>
              {creating ? t('common.creating') : t('party.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartyModal;
