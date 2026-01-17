import { useCallback, useEffect, useState } from 'react';
import type { GlobalStatistics, UserStatistics } from '../api/statistics';
import { getGlobalStatistics, getMyStatistics } from '../api/statistics';
import { useLanguage } from '../context/LanguageContext';
import { PopularityItem, VisitedZoneItem } from '../components/features';
import { StatBox, Tabs } from '../components/ui';
import './Statistics.css';

const Statistics = () => {
  const { t } = useLanguage();
  const [myStats, setMyStats] = useState<UserStatistics | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal');

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [myStatsResult, globalStatsResult] = await Promise.allSettled([
        getMyStatistics(),
        getGlobalStatistics(),
      ]);

      if (myStatsResult.status === 'fulfilled') {
        setMyStats(myStatsResult.value);
      } else {
        console.error('Error loading personal statistics:', myStatsResult.reason);
        setMyStats(null);
      }

      if (globalStatsResult.status === 'fulfilled') {
        setGlobalStats(globalStatsResult.value);
      } else {
        console.error('Error loading global statistics:', globalStatsResult.reason);
        setGlobalStats(null);
      }

      if (myStatsResult.status === 'rejected' || globalStatsResult.status === 'rejected') {
        setError(t('statistics.error'));
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      setError(t('statistics.error'));
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
      <div className="statistics-tabs">
        <Tabs
          tabs={[
            { id: 'personal', label: t('statistics.personal') },
            { id: 'global', label: t('statistics.global') },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'personal' | 'global')}
        />
      </div>
      <main className="statistics-main">
        {error && <div className="stats-error">{error}</div>}

        {activeTab === 'personal' && myStats && (
          <div className="stats-content">
            <div className="stats-section">
              <h2>{t('statistics.currentPeriod')}</h2>
              <div className="stats-grid">
                <StatBox value={myStats.currentPeriod.visited} label={t('statistics.zonesPassed')} />
                <StatBox value={myStats.currentPeriod.available} label={t('statistics.zonesAvailable')} />
                <StatBox value={`${myStats.currentPeriod.completionRate.toFixed(1)}%`} label={t('statistics.progress')} />
              </div>
            </div>

            <div className="stats-section">
              <h2>{t('statistics.allTime')}</h2>
              <StatBox value={myStats.allTime.totalVisits} label={t('statistics.totalVisits')} large />

              {myStats.allTime.mostVisited.length > 0 && (
                <div className="most-visited">
                  <h3>{t('statistics.mostVisited')}</h3>
                  <div className="visited-list">
                    {myStats.allTime.mostVisited
                      .filter(zone => zone.zoneId?.name)
                      .map(zone => (
                        <VisitedZoneItem
                          key={zone.zoneId?._id || zone.zoneId?.zoneId || Math.random()}
                          zoneName={zone.zoneId?.name || ''}
                          visitCount={zone.totalVisits}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'personal' && !myStats && (
          <div className="stats-empty">{t('statistics.error')}</div>
        )}

        {activeTab === 'global' && globalStats && (
          <div className="stats-content">
            <div className="stats-section">
              <h2>{t('statistics.currentPeriod')}</h2>
              <div className="stats-grid">
                <StatBox value={globalStats.currentPeriod.totalVisits} label={t('statistics.totalVisitsLabel')} />
                <StatBox value={globalStats.currentPeriod.activeUsers} label={t('statistics.activeUsers')} />
                <StatBox value={globalStats.currentPeriod.averageVisitsPerUser.toFixed(1)} label={t('statistics.averageVisits')} />
              </div>
            </div>

            {globalStats.currentPeriod.zonePopularity.length > 0 && (
              <div className="stats-section">
                <h2>{t('statistics.mostPopular')}</h2>
                <div className="popularity-list">
                  {globalStats.currentPeriod.zonePopularity.map((zone, index) => (
                    <PopularityItem
                      key={zone.zoneId || index}
                      rank={index + 1}
                      zoneName={zone.name}
                      visits={zone.visits}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'global' && !globalStats && (
          <div className="stats-empty">{t('statistics.error')}</div>
        )}
      </main>
    </div>
  );
};

export default Statistics;
