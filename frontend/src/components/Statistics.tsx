import { useCallback, useEffect, useState } from 'react';

import type { GlobalStatistics, UserStatistics } from '../api/statistics';
import { getGlobalStatistics, getMyStatistics } from '../api/statistics';
import { useLanguage } from '../context/LanguageContext';

import './Statistics.css';

const Statistics = () => {
  const { t } = useLanguage();
  const [myStats, setMyStats] = useState<UserStatistics | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal');

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [myStatsData, globalStatsData] = await Promise.all([
        getMyStatistics(),
        getGlobalStatistics(),
      ]);
      setMyStats(myStatsData);
      setGlobalStats(globalStatsData);
    } catch (error) {
      console.error('Error loading statistics:', error);
      alert(t('statistics.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="statistics">
      <main className="statistics-main">
        {activeTab === 'personal' && myStats && (
          <div className="stats-content">
            <div className="stats-section">
              <h2>{t('statistics.currentPeriod')}</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-number">{myStats.currentPeriod.visited}</div>
                  <div className="stat-text">{t('statistics.zonesPassed')}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{myStats.currentPeriod.available}</div>
                  <div className="stat-text">{t('statistics.zonesAvailable')}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">
                    {myStats.currentPeriod.completionRate.toFixed(1)}%
                  </div>
                  <div className="stat-text">{t('statistics.progress')}</div>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h2>{t('statistics.allTime')}</h2>
              <div className="stat-box-large">
                <div className="stat-number-large">{myStats.allTime.totalVisits}</div>
                <div className="stat-text">{t('statistics.totalVisits')}</div>
              </div>

              {myStats.allTime.mostVisited.length > 0 && (
                <div className="most-visited">
                  <h3>{t('statistics.mostVisited')}</h3>
                  <div className="visited-list">
                    {myStats.allTime.mostVisited
                      .filter(zone => zone.zoneId?.name)
                      .map(zone => (
                        <div
                          key={zone.zoneId?._id || zone.zoneId?.zoneId || Math.random()}
                          className="visited-item"
                        >
                          <span className="zone-name">{zone.zoneId?.name}</span>
                          <span className="visit-count">
                            {zone.totalVisits} {t('statistics.times')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'global' && globalStats && (
          <div className="stats-content">
            <div className="stats-section">
              <h2>{t('statistics.currentPeriod')}</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-number">{globalStats.currentPeriod.totalVisits}</div>
                  <div className="stat-text">{t('statistics.totalVisitsLabel')}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{globalStats.currentPeriod.activeUsers}</div>
                  <div className="stat-text">{t('statistics.activeUsers')}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">
                    {globalStats.currentPeriod.averageVisitsPerUser.toFixed(1)}
                  </div>
                  <div className="stat-text">{t('statistics.averageVisits')}</div>
                </div>
              </div>
            </div>

            {globalStats.currentPeriod.zonePopularity.length > 0 && (
              <div className="stats-section">
                <h2>{t('statistics.mostPopular')}</h2>
                <div className="popularity-list">
                  {globalStats.currentPeriod.zonePopularity.map((zone, index) => (
                    <div key={zone.zoneId || index} className="popularity-item">
                      <span className="rank">#{index + 1}</span>
                      <span className="zone-name">{zone.name}</span>
                      <span className="visit-count">
                        {zone.visits} {t('statistics.visits')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="tabs-container">
          <button
            type="button"
            className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
            aria-pressed={activeTab === 'personal'}
            aria-label={t('statistics.personal')}
          >
            {t('statistics.personal')}
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveTab('global')}
            aria-pressed={activeTab === 'global'}
            aria-label={t('statistics.global')}
          >
            {t('statistics.global')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Statistics;
