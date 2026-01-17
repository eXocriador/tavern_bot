import { useCallback, useEffect, useState } from 'react';
import { getInstances, type InstanceZone } from '../api/instances';
import { getMyVisits, markVisit, type Visit } from '../api/visits';
import { useLanguage } from '../context/LanguageContext';
import CloseInstanceModal from './CloseInstanceModal';
import CreatePartyModal from './CreatePartyModal';
import './Dashboard.css';

const Dashboard = () => {
  const { t } = useLanguage();
  const [instances, setInstances] = useState<InstanceZone[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [closingInstance, setClosingInstance] = useState<InstanceZone | null>(null);
  const [creatingPartyFor, setCreatingPartyFor] = useState<InstanceZone | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [instancesData, visitsData] = await Promise.all([getInstances(), getMyVisits()]);
      console.log('Loaded instances:', instancesData);
      console.log('Loaded visits:', visitsData);
      setInstances(instancesData || []);
      setVisits(visitsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert(t('dashboard.error'));
      setInstances([]);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseInstance = async () => {
    if (!closingInstance) return;
    try {
      setUpdating(closingInstance.zoneId);
      await markVisit(closingInstance.zoneId);
      const newVisit = await getMyVisits();
      setVisits(newVisit);
      setClosingInstance(null);
    } catch (error) {
      console.error('Error closing instance:', error);
      alert(t('dashboard.errors.closeFailed'));
    } finally {
      setUpdating(null);
    }
  };

  const handleCreatePartySuccess = () => {
    // Party created successfully, could show notification
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  const visitedZoneIds = new Set(visits.filter(v => v.zoneId?.zoneId).map(v => v.zoneId.zoneId));

  // Sort instances: available (not visited) first, then closed (visited)
  const availableInstances = instances.filter(instance => !visitedZoneIds.has(instance.zoneId));
  const closedInstances = instances.filter(instance => visitedZoneIds.has(instance.zoneId));

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        <div className="instances-list">
          <h2>{t('dashboard.instanceZones')}</h2>
          {instances.length === 0 ? (
            <div className="no-instances">{t('dashboard.noInstances')}</div>
          ) : (
            <>
              {availableInstances.length > 0 && (
                <>
                  <h3 className="instances-section-title">{t('dashboard.available')}</h3>
                  {availableInstances.map(instance => {
                    const isUpdating = updating === instance.zoneId;

                    return (
                      <div key={instance.zoneId} className="instance-card">
                        <div className="instance-info">
                          <h3>{instance.name}</h3>
                        </div>
                        <div className="instance-actions">
                          <button
                            type="button"
                            className="btn-visit-toggle"
                            onClick={e => {
                              e.stopPropagation();
                              setClosingInstance(instance);
                            }}
                            disabled={isUpdating}
                            title={t('dashboard.markAsPassed')}
                          >
                            {isUpdating && updating === instance.zoneId ? (
                              <span className="loading-spinner">...</span>
                            ) : (
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-label={t('dashboard.markAsPassed')}
                              >
                                <title>{t('dashboard.markAsPassed')}</title>
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-create-party"
                            onClick={e => {
                              e.stopPropagation();
                              setCreatingPartyFor(instance);
                            }}
                            title={t('party.create')}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-label={t('party.create')}
                            >
                              <title>{t('party.create')}</title>
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {closedInstances.length > 0 && (
                <>
                  <h3 className="instances-section-title">{t('dashboard.passed')}</h3>
                  {closedInstances.map(instance => {
                    const isUpdating = updating === instance.zoneId;

                    return (
                      <div key={instance.zoneId} className="instance-card visited">
                        <div className="instance-info">
                          <h3>{instance.name}</h3>
                        </div>
                        <div className="instance-actions">
                          <button
                            type="button"
                            className="btn-visit-toggle visited"
                            onClick={e => {
                              e.stopPropagation();
                              setClosingInstance(instance);
                            }}
                            disabled={isUpdating}
                            title={t('dashboard.markAsNotPassed')}
                          >
                            {isUpdating && updating === instance.zoneId ? (
                              <span className="loading-spinner">...</span>
                            ) : (
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-label={t('dashboard.markAsNotPassed')}
                              >
                                <title>{t('dashboard.markAsNotPassed')}</title>
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-create-party"
                            onClick={e => {
                              e.stopPropagation();
                              setCreatingPartyFor(instance);
                            }}
                            title={t('party.create')}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-label={t('party.create')}
                            >
                              <title>{t('party.create')}</title>
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div className="dashboard-stats-compact">
          <div className="stat-compact">
            <span className="stat-compact-label">{t('dashboard.passed')}:</span>
            <span className="stat-compact-value">{visits.length}</span>
          </div>
          <div className="stat-compact">
            <span className="stat-compact-label">{t('dashboard.available')}:</span>
            <span className="stat-compact-value">{instances.length - visits.length}</span>
          </div>
          <div className="stat-compact">
            <span className="stat-compact-label">{t('dashboard.progress')}:</span>
            <span className="stat-compact-value">
              {instances.length > 0 ? Math.round((visits.length / instances.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </main>

      {closingInstance && (
        <CloseInstanceModal
          isOpen={!!closingInstance}
          onClose={() => setClosingInstance(null)}
          onConfirm={handleCloseInstance}
          instanceName={closingInstance.name}
        />
      )}

      {creatingPartyFor && (
        <CreatePartyModal
          isOpen={!!creatingPartyFor}
          onClose={() => setCreatingPartyFor(null)}
          onSuccess={handleCreatePartySuccess}
          instance={creatingPartyFor}
        />
      )}
    </div>
  );
};

export default Dashboard;
