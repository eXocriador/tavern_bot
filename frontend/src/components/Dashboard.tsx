import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInstances, InstanceZone } from '../api/instances';
import { getMyVisits, markVisit, removeVisit, Visit } from '../api/visits';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<InstanceZone[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [instancesData, visitsData] = await Promise.all([
        getInstances(),
        getMyVisits(),
      ]);
      setInstances(instancesData);
      setVisits(visitsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisit = async (zoneId: string) => {
    const isVisited = visits.some((v) => v.zoneId.zoneId === zoneId);

    try {
      setUpdating(zoneId);
      if (isVisited) {
        await removeVisit(zoneId);
        setVisits(visits.filter((v) => v.zoneId.zoneId !== zoneId));
      } else {
        const newVisit = await markVisit(zoneId);
        setVisits([...visits, newVisit]);
      }
    } catch (error) {
      console.error('Error toggling visit:', error);
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Помилка оновлення';
      alert(message || 'Помилка оновлення');
    } finally {
      setUpdating(null);
    }
  };

  const visitedZoneIds = new Set(visits.map((v) => v.zoneId.zoneId));

  if (loading) {
    return <div className="loading">Завантаження...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Tavern Bot</h1>
          <div className="header-actions">
            <Link to="/profile" className="btn-secondary">
              Профіль
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

      <main className="dashboard-main">
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value">{visits.length}</div>
            <div className="stat-label">Пройдено</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{instances.length - visits.length}</div>
            <div className="stat-label">Доступно</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {instances.length > 0
                ? Math.round((visits.length / instances.length) * 100)
                : 0}
              %
            </div>
            <div className="stat-label">Прогрес</div>
          </div>
        </div>

        <div className="instances-list">
          <h2>Інстанс-зони</h2>
          {instances.map((instance) => {
            const isVisited = visitedZoneIds.has(instance.zoneId);
            const isUpdating = updating === instance.zoneId;

            return (
              <div
                key={instance.zoneId}
                className={`instance-card ${isVisited ? 'visited' : ''}`}
              >
                <div className="instance-info">
                  <h3>{instance.name}</h3>
                  {instance.bossName && (
                    <p className="boss-name">Бос: {instance.bossName}</p>
                  )}
                  {instance.level && (
                    <p className="level">Рівень: {instance.level}+</p>
                  )}
                  {instance.description && (
                    <p className="description">{instance.description}</p>
                  )}
                </div>
                <button
                  className={`btn-visit ${isVisited ? 'visited' : ''}`}
                  onClick={() => handleToggleVisit(instance.zoneId)}
                  disabled={isUpdating}
                >
                  {isUpdating
                    ? '...'
                    : isVisited
                    ? '✓ Пройдено'
                    : 'Відмітити'}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

