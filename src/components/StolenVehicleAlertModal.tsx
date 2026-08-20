import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertOctagon,
  ShieldAlert,
  MapPin,
  Camera,
  Clock,
  User,
  FileText,
  CheckCircle,
  ExternalLink,
  X,
  Volume2
} from 'lucide-react';
import { StolenVehicleAlert } from '../types/stolenVehicle';
import { stolenAlertAudio } from '../utils/stolenSoundAlert';

interface StolenVehicleAlertModalProps {
  alert: StolenVehicleAlert | null;
  onClose: () => void;
  onViewInAlertCenter: () => void;
  onQuickInvestigate?: (alertId: string) => void;
}

export const StolenVehicleAlertModal: React.FC<StolenVehicleAlertModalProps> = ({
  alert,
  onClose,
  onViewInAlertCenter,
  onQuickInvestigate
}) => {
  if (!alert) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-slate-900 border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden shadow-red-900/40 text-slate-100"
        >
          {/* Flashing Top Alarm Banner */}
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                <AlertOctagon className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded text-red-200">
                  Critical Police Intercept Alert
                </span>
                <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  STOLEN VEHICLE DETECTED
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stolenAlertAudio.playAlarmSound()}
                title="Test Siren Sound"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Modal Body */}
          <div className="p-6 space-y-5">
            {/* Primary Vehicle Plate Card */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target License Plate
                </span>
                <div className="text-3xl font-mono font-black tracking-wider text-emerald-400 bg-slate-900/90 px-4 py-1.5 rounded-lg border border-emerald-500/30 mt-1 shadow-inner inline-block">
                  {alert.vehicle_number}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> High Priority
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Confidence: {Math.round((alert.confidence || 0.95) * 100)}%
                </span>
              </div>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Owner / Registrant
                </div>
                <div className="font-semibold text-slate-200">
                  {alert.owner_name || 'Registered Owner on File'}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> FIR / Police Case
                </div>
                <div className="font-semibold text-amber-300 font-mono">
                  {alert.fir_number || 'FIR-PENDING-POLICE-HQ'}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" /> Detection Camera
                </div>
                <div className="font-semibold text-slate-200">
                  {alert.camera_name || 'City Surveillance ANPR'}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Intercept Location
                </div>
                <div className="font-semibold text-slate-200 truncate">
                  {alert.camera_location || 'National Highway 48'}
                </div>
              </div>
            </div>

            {/* Evidence Image / Plate Crop Previews */}
            {(alert.vehicle_snapshot_url || alert.plate_crop_url) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {alert.vehicle_snapshot_url && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-medium">Vehicle Snapshot</span>
                    <div className="h-32 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
                      <img
                        src={alert.vehicle_snapshot_url}
                        alt="Vehicle Snapshot"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
                {alert.plate_crop_url && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-medium">ANPR Number Plate Crop</span>
                    <div className="h-32 bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center p-2">
                      <img
                        src={alert.plate_crop_url}
                        alt="Plate Crop"
                        className="max-h-full object-contain rounded border border-emerald-500/40"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Detected at: {new Date(alert.timestamp).toLocaleString()} • Live GPS: ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
              </span>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
            >
              Acknowledge & Close
            </button>

            <div className="flex items-center gap-2">
              {onQuickInvestigate && (
                <button
                  type="button"
                  onClick={() => onQuickInvestigate(alert.id)}
                  className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Investigating
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewInAlertCenter();
                }}
                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-lg shadow-red-900/30 transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> Open in Alert Center
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
