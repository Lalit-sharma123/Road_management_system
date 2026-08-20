import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  AlertOctagon,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  User,
  FileText,
  Eye,
  RefreshCw,
  Zap,
  Check,
  X,
  Volume2,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { StolenVehicleAlert, StolenVehicleStats } from '../types/stolenVehicle';
import { stolenVehicleService } from '../services/stolenVehicleService';
import { stolenAlertAudio } from '../utils/stolenSoundAlert';

interface StolenVehicleAlertsViewProps {
  onOpenRegistry?: () => void;
}

export const StolenVehicleAlertsView: React.FC<StolenVehicleAlertsViewProps> = ({ onOpenRegistry }) => {
  const [alerts, setAlerts] = useState<StolenVehicleAlert[]>([]);
  const [stats, setStats] = useState<StolenVehicleStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [simulating, setSimulating] = useState<boolean>(false);

  // Detail / Resolve Modal
  const [selectedAlert, setSelectedAlert] = useState<StolenVehicleAlert | null>(null);
  const [resolveStatus, setResolveStatus] = useState<string>('INTERCEPTED');
  const [officerName, setOfficerName] = useState<string>('Patrol Officer 08');
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('');
  const [submittingResolve, setSubmittingResolve] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAlertsAndStats = async () => {
    try {
      setLoading(true);
      const [alertsData, statsData] = await Promise.all([
        stolenVehicleService.getStolenAlerts({
          search: searchTerm || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        }),
        stolenVehicleService.getStats()
      ]);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load stolen alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndStats();
  }, [statusFilter]);

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      const res = await stolenVehicleService.simulateDetection('HR26DQ5519');
      stolenAlertAudio.playAlarmSound();
      showToast(res.message || 'Simulated Stolen Vehicle Detection Alert triggered!');
      fetchAlertsAndStats();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  const handleOpenResolveModal = (alert: StolenVehicleAlert) => {
    setSelectedAlert(alert);
    setResolveStatus(alert.status === 'ACTIVE' ? 'INVESTIGATING' : 'RESOLVED');
    setResolutionRemarks('');
  };

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    try {
      setSubmittingResolve(true);
      await stolenVehicleService.resolveAlert({
        alert_id: selectedAlert.id,
        status: resolveStatus,
        resolved_by: officerName,
        remarks: resolutionRemarks
      });
      showToast(`Alert for ${selectedAlert.vehicle_number} updated to ${resolveStatus}.`);
      setSelectedAlert(null);
      fetchAlertsAndStats();
    } catch (err: any) {
      showToast('Failed to update alert resolution.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            ACTIVE INTERCEPT
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-amber-400" /> INVESTIGATING
          </span>
        );
      case 'INTERCEPTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3 text-blue-400" /> INTERCEPTED
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <Check className="w-3 h-3 text-emerald-400" /> RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600 w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border bg-slate-900/95 text-slate-100 border-red-500/50 backdrop-blur-md flex items-center gap-3 text-sm font-semibold"
          >
            <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
              Real-Time Security Command
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 mt-1 flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-red-500" />
            Stolen Vehicle Live Alerts & History
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Instantaneous ANPR matching notifications, suspect vehicle tracking, and rapid law enforcement dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => stolenAlertAudio.playAlarmSound()}
            title="Test Siren Sound"
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 flex items-center gap-1.5 transition"
          >
            <Zap className={`w-4 h-4 ${simulating ? 'animate-bounce' : ''}`} />
            {simulating ? 'Simulating...' : 'Simulate ANPR Intercept'}
          </button>

          <a
            href={stolenVehicleService.getExportCsvUrl(statusFilter !== 'ALL' ? statusFilter : undefined)}
            download
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>

          {onOpenRegistry && (
            <button
              type="button"
              onClick={onOpenRegistry}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
            >
              <ShieldAlert className="w-4 h-4" /> Manage Stolen Registry
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Alerts</span>
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg animate-pulse">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-400 mt-2">
            {stats?.active_alerts ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Requires immediate response</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alerts Today</span>
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-300 mt-2">
            {stats?.alerts_today ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Detections past 24h</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered</span>
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-300 mt-2">
            {stats?.total_stolen_vehicles ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">In active lookup cache</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicles Recovered</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2">
            {stats?.recovered_vehicles ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Successfully intercepted</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchAlertsAndStats();
          }}
          className="md:col-span-6 relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plate, FIR, camera name, location..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </form>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" /> Status:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Alerts</option>
            <option value="ACTIVE">Active</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="INTERCEPTED">Intercepted</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          <button
            type="button"
            onClick={fetchAlertsAndStats}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts Grid / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm">Retrieving alert intelligence records...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No Stolen Vehicle Alerts Detected</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The real-time ANPR engine is actively monitoring live video and camera feeds against the database.
            </p>
            <button
              type="button"
              onClick={handleSimulate}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow inline-flex items-center gap-1.5 transition mt-2"
            >
              <Zap className="w-4 h-4" /> Trigger Test Alert
            </button>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border transition-all ${
                alert.status === 'ACTIVE'
                  ? 'bg-slate-900/90 border-red-500/50 shadow-xl shadow-red-950/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Plate & Primary Identifiers */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Target Plate
                    </span>
                    <div className="text-2xl font-mono font-black tracking-wider text-emerald-400 bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800 mt-1 inline-block">
                      {alert.vehicle_number}
                    </div>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-sm flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {alert.owner_name || 'Owner on File'}
                      </span>
                      <span className="text-xs font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {alert.fir_number || 'FIR Recorded'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        {alert.camera_name || 'ANPR Camera'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {alert.camera_location || 'City Corridor'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(alert.timestamp).toLocaleTimeString()} ({new Date(alert.timestamp).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Snapshot thumbnail, Status & Action */}
                <div className="flex items-center gap-4 self-end lg:self-center">
                  {alert.plate_crop_url && (
                    <div className="h-12 w-28 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-1 hidden sm:flex">
                      <img
                        src={alert.plate_crop_url}
                        alt="Plate Crop"
                        className="max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>{getStatusBadge(alert.status)}</div>

                  <button
                    type="button"
                    onClick={() => handleOpenResolveModal(alert)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Investigate & Resolve
                  </button>
                </div>
              </div>

              {alert.remarks && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg font-mono">
                  {alert.remarks}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve / Investigate Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            >
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-bold">Investigate & Resolve Alert</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitResolve} className="p-6 space-y-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-sm">
                  <div>Plate: <strong className="text-emerald-400 font-mono text-base">{selectedAlert.vehicle_number}</strong></div>
                  <div>FIR: <span className="text-amber-300 font-mono">{selectedAlert.fir_number || 'N/A'}</span></div>
                  <div>Camera: <span className="text-slate-300">{selectedAlert.camera_name} ({selectedAlert.camera_location})</span></div>
                  <div>Detected at: <span className="text-slate-400">{new Date(selectedAlert.timestamp).toLocaleString()}</span></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Update Alert Status
                  </label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="INVESTIGATING">INVESTIGATING (Patrol unit dispatched)</option>
                    <option value="INTERCEPTED">INTERCEPTED (Vehicle stopped by police)</option>
                    <option value="RESOLVED">RESOLVED (Case closed & recovered)</option>
                    <option value="FALSE_POSITIVE">FALSE POSITIVE (OCR mismatch / verified safe)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Officer / Operator Name
                  </label>
                  <input
                    type="text"
                    required
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Investigation Remarks & Intercept Details
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionRemarks}
                    onChange={(e) => setResolutionRemarks(e.target.value)}
                    placeholder="e.g. Unit 12 intercepted vehicle at Toll Gate #3. Suspect detained."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(null)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResolve}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-semibold text-sm rounded-xl shadow-lg transition"
                  >
                    {submittingResolve ? 'Saving...' : 'Update Status'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
