import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  Calendar,
  Clock,
  Store,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ChevronLeft,
  X,
  MapPin,
  Send,
  Sparkles,
  Info
} from 'lucide-react';

const PERIOD_PRESETS = [
  { id: 'today', label: 'Today', description: 'Visits and tasks recorded today' },
  { id: 'last_7_days', label: 'Last 7 Days', description: 'Weekly activity summary (recommended)' },
  { id: 'last_30_days', label: 'Last 30 Days', description: 'Full monthly performance report' },
  { id: 'custom', label: 'Custom Date Range', description: 'Specify custom start and end dates' }
];

interface GenerateReportModalProps {
  onClose: () => void;
  onReportSubmitted: (report: any) => void;
  allVisits?: any[];
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  onClose,
  onReportSubmitted,
  allVisits = []
}) => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Fetch real tasks from database strictly within agent territory
  useEffect(() => {
    let isMounted = true;
    api.get('/tasks')
      .then(res => {
        if (res && res.data && isMounted) {
          const taskList = Array.isArray(res.data) ? res.data : (res.data.tasks || res.data.data || []);
          setAllTasks(taskList);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Wizard Steps: 'select_period' | 'preview'
  const [step, setStep] = useState<'select_period' | 'preview'>('select_period');
  const [selectedPreset, setSelectedPreset] = useState('last_7_days');

  // Custom Date Range
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Confirm Submit Dialog State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 1. Calculate Date Range Bounds
  const { startDate, endDate, dateRangeLabel, periodTitle } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let title = 'Last 7 Days';

    if (selectedPreset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      title = 'Today';
    } else if (selectedPreset === 'last_7_days') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      title = 'Last 7 Days';
    } else if (selectedPreset === 'last_30_days') {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      title = 'Last 30 Days';
    } else if (selectedPreset === 'custom') {
      start = new Date(customFrom + 'T00:00:00');
      end = new Date(customTo + 'T23:59:59');
      title = 'Custom Range';
    }

    const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const rangeStr = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

    return {
      startDate: start,
      endDate: end,
      dateRangeLabel: rangeStr,
      periodTitle: title
    };
  }, [selectedPreset, customFrom, customTo]);

  // 2. Filter Live Shop Visits for the Period
  const periodVisits = useMemo(() => {
    return allVisits.filter(v => {
      if (!v || !v.createdAt) return true;
      const vDate = new Date(v.createdAt);
      return vDate >= startDate && vDate <= endDate;
    });
  }, [allVisits, startDate, endDate]);

  // 3. Filter Live Database Tasks for the Period
  const periodTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (!t || (!t.dueDate && !t.createdAt)) return true;
      const tDate = new Date(t.dueDate || t.createdAt);
      return tDate >= startDate && tDate <= endDate;
    });
  }, [allTasks, startDate, endDate]);

  // 4. Compute Dynamic Summary Statistics
  const summary = useMemo(() => {
    const totalVisits = periodVisits.length;
    const interested = periodVisits.filter(v => v.interestedStatus === 'YES' || v.interestStatus === 'YES').length;
    const notInterested = periodVisits.filter(v => v.interestedStatus === 'NO' || v.interestStatus === 'NO').length;
    const newTieups = periodVisits.filter(v => v.vendorId).length;

    const tasksAssigned = periodTasks.length;
    const tasksCompleted = periodTasks.filter(t => t.status === 'Completed' || t.status === 'completed').length;
    const tasksPending = periodTasks.filter(t => t.status !== 'Completed' && t.status !== 'completed').length;

    return {
      totalVisits,
      interested,
      notInterested,
      newTieups,
      tasksAssigned,
      tasksCompleted,
      tasksPending
    };
  }, [periodVisits, periodTasks]);

  // 5. Submit Handler
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        periodLabel: `${periodTitle} (${dateRangeLabel})`,
        dateRange: dateRangeLabel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        summary,
        shopVisits: periodVisits,
        tasks: periodTasks
      };

      const res = await api.post('/reports/submit', payload);
      if (res && (res.data?.success || res.status === 200 || res.status === 201)) {
        if (onReportSubmitted) {
          onReportSubmitted(res.data?.data || res.data?.report || res.data);
        }
        onClose();
      } else {
        setSubmitError(res.data?.message || 'Failed to submit report. Please try again.');
        setShowConfirmDialog(false);
      }
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Submission error');
      setShowConfirmDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  const userTerritory = user?.assignedTerritory || user?.territory || {};
  const userTerritoryText = userTerritory.pincode
    ? `PIN: ${userTerritory.pincode}${userTerritory.division ? ` (${userTerritory.division})` : ''}`
    : (userTerritory.district || userTerritory.state || 'Assigned Territory');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)'
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      {/* Modal Window */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: step === 'preview' ? '880px' : '560px',
        maxHeight: 'min(92vh, 860px)',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        zIndex: 1,
        transition: 'max-width 0.25s ease'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {step === 'select_period' ? 'Generate Field Performance Report' : 'Report Preview & Verification'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                {step === 'select_period'
                  ? 'Select report period to automatically ingest shop visits and task records'
                  : `Reviewing aggregated data for ${dateRangeLabel}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {submitError && (
            <div style={{
              padding: '10px 14px',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: 10,
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{submitError}</span>
            </div>
          )}

          {step === 'select_period' ? (
            /* STEP 1: SELECT PERIOD */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569' }}>
                Choose Report Timeframe:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PERIOD_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: 12,
                        border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: isSelected ? '5px solid #0284c7' : '2px solid #cbd5e1',
                          background: '#ffffff',
                          flexShrink: 0
                        }} />
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                            {preset.label}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                            {preset.description}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 size={18} style={{ color: '#0284c7' }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom Date Range Inputs */}
              {selectedPreset === 'custom' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Ingestion Info Banner */}
              <div style={{
                padding: '12px 16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.82rem',
                color: '#166534'
              }}>
                <Sparkles size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>
                  Connect App will automatically ingest shop visits and task execution records within your authorized territory ({userTerritoryText}) for the selected timeframe.
                </span>
              </div>
            </div>
          ) : (
            /* STEP 2: PREVIEW & VERIFICATION */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Scope & Date Range Card */}
              <div style={{
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Reporting Period
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Calendar size={15} style={{ color: '#0284c7' }} />
                    <span>{periodTitle} ({dateRangeLabel})</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Authorizing Agent & Territory
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <MapPin size={14} style={{ color: '#16a34a' }} />
                    <span>{user?.name || 'Agent'} • {userTerritoryText}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Summary Cards */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                  Calculated Performance Summary:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: 10
                }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Total Visits</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{summary.totalVisits}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>Interested</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{summary.interested}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>Not Interested</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{summary.notInterested}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#e0f2fe', borderRadius: 10, border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>New Tie-ups</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>{summary.newTieups}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>Tasks Done</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{summary.tasksCompleted}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>Tasks Pending</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{summary.tasksPending}</div>
                  </div>
                </div>
              </div>

              {/* Ingested Shop Visits Preview */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Store size={15} style={{ color: '#d97706' }} />
                  <span>Ingested Shop Visits ({periodVisits.length})</span>
                </div>
                {periodVisits.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: '0.82rem' }}>
                    No field shop visits recorded in this period.
                  </div>
                ) : (
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {periodVisits.map((v, idx) => (
                      <div
                        key={v._id || v.id || idx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {v.shopPhoto ? (
                            <img src={v.shopPhoto} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={16} style={{ color: '#94a3b8' }} />
                            </div>
                          )}
                          <div>
                            <strong>{v.shopName}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{v.category || 'Products'} • {v.pincode || v.pincodeCode || ''}</div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: (v.interestedStatus === 'YES' || v.interestStatus === 'YES') ? '#d1fae5' : '#fee2e2',
                          color: (v.interestedStatus === 'YES' || v.interestStatus === 'YES') ? '#047857' : '#b91c1c'
                        }}>
                          {(v.interestedStatus === 'YES' || v.interestStatus === 'YES') ? 'Interested' : 'Not Interested'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingested Tasks Preview */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckSquare size={15} style={{ color: '#0284c7' }} />
                  <span>Tasks Executed in Period ({periodTasks.length})</span>
                </div>
                {periodTasks.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: '0.82rem' }}>
                    No assigned tasks recorded in this period.
                  </div>
                ) : (
                  <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {periodTasks.map((t, idx) => (
                      <div
                        key={t._id || t.id || idx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div>
                          <strong>{t.title || t.description || `Task #${idx + 1}`}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: t.status === 'Completed' || t.status === 'completed' ? '#d1fae5' : '#fef3c7',
                          color: t.status === 'Completed' || t.status === 'completed' ? '#047857' : '#b45309'
                        }}>
                          {t.status || 'Assigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          flexShrink: 0
        }}>
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('select_period')}
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={16} /> Back to Period Selection
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {step === 'select_period' ? (
              <button
                type="button"
                onClick={() => setStep('preview')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                }}
              >
                <span>Continue to Preview</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.35)'
                }}
              >
                <Send size={15} />
                <span>Confirm & Submit Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}>
                <FileSpreadsheet size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Submit Official Report?
              </h4>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: '1.5', margin: '0 0 18px' }}>
              Are you sure you want to submit this <strong>{periodTitle}</strong> performance report covering <strong>{summary.totalVisits} shop visits</strong> and <strong>{summary.tasksCompleted} completed tasks</strong>?
              It will be registered under your name and recorded in the audit logs.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateReportModal;
