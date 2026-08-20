import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  Car,
  Bike,
  Truck,
  Bus,
  AlertTriangle,
  FileText,
  Building,
  Calendar,
  User,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { StolenVehicle, StolenVehicleCreateInput } from '../types/stolenVehicle';
import { stolenVehicleService } from '../services/stolenVehicleService';

export const StolenVehicleRegistryView: React.FC = () => {
  const [vehicles, setVehicles] = useState<StolenVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<StolenVehicle | null>(null);
  const [recoveringVehicle, setRecoveringVehicle] = useState<StolenVehicle | null>(null);
  const [recoveryNotes, setRecoveryNotes] = useState<string>('');
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form inputs
  const [formData, setFormData] = useState<StolenVehicleCreateInput>({
    vehicle_number: '',
    owner_name: '',
    vehicle_type: 'CAR',
    fir_number: '',
    police_station: '',
    date_reported: new Date().toISOString().split('T')[0],
    reason: 'Vehicle Theft',
    priority: 'HIGH',
    status: 'ACTIVE',
    notes: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await stolenVehicleService.getStolenVehicles({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        vehicle_type: vehicleTypeFilter !== 'ALL' ? vehicleTypeFilter : undefined
      });
      setVehicles(data);
    } catch (err: any) {
      console.error('Failed to fetch stolen vehicles:', err);
      showToast(err?.response?.data?.detail || 'Failed to load stolen vehicle registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, priorityFilter, vehicleTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleOpenAddModal = () => {
    setFormData({
      vehicle_number: '',
      owner_name: '',
      vehicle_type: 'CAR',
      fir_number: `FIR-${new Date().getFullYear()}-DL-${Math.floor(10000 + Math.random() * 90000)}`,
      police_station: 'Central Police Station',
      date_reported: new Date().toISOString().split('T')[0],
      reason: 'Vehicle Theft',
      priority: 'HIGH',
      status: 'ACTIVE',
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: StolenVehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      owner_name: vehicle.owner_name || '',
      vehicle_type: vehicle.vehicle_type,
      fir_number: vehicle.fir_number,
      police_station: vehicle.police_station,
      date_reported: vehicle.date_reported ? vehicle.date_reported.split('T')[0] : '',
      reason: vehicle.reason,
      priority: vehicle.priority,
      status: vehicle.status,
      notes: vehicle.notes || ''
    });
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_number.trim() || !formData.fir_number.trim() || !formData.police_station.trim()) {
      showToast('Please fill all required fields (Plate Number, FIR Number, Police Station).', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingVehicle) {
        await stolenVehicleService.updateStolenVehicle(editingVehicle.id, formData);
        showToast(`Vehicle ${formData.vehicle_number.toUpperCase()} successfully updated.`);
        setEditingVehicle(null);
      } else {
        await stolenVehicleService.createStolenVehicle(formData);
        showToast(`Vehicle ${formData.vehicle_number.toUpperCase()} successfully added to Stolen Registry.`);
        setIsAddModalOpen(false);
      }
      fetchVehicles();
    } catch (err: any) {
      console.error('Save vehicle error:', err);
      showToast(err?.response?.data?.detail || 'Failed to save vehicle details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRecover = async () => {
    if (!recoveringVehicle) return;
    try {
      setSubmitting(true);
      await stolenVehicleService.markAsRecovered(recoveringVehicle.id, recoveryNotes);
      showToast(`Vehicle ${recoveringVehicle.vehicle_number} marked as RECOVERED.`);
      setRecoveringVehicle(null);
      setRecoveryNotes('');
      fetchVehicles();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to update vehicle status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      setSubmitting(true);
      await stolenVehicleService.deleteStolenVehicle(id);
      showToast('Vehicle removed from registry.');
      setDeletingVehicleId(null);
      fetchVehicles();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to delete vehicle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'MOTORCYCLE':
      case 'SCOOTER':
      case 'BIKE':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      case 'TRUCK':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'BUS':
        return <Bus className="w-4 h-4 text-purple-400" />;
      default:
        return <Car className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 w-fit">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30 w-fit">
            LOW
          </span>
        );
    }
  };

  const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const recoveredCount = vehicles.filter((v) => v.status === 'RECOVERED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-sm font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 backdrop-blur-md'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/40 backdrop-blur-md'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
              Surveillance Registry
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 mt-1 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Stolen Vehicle Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time state and national database of stolen and wanted motor vehicles for instantaneous $O(1)$ ANPR optical matching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{vehicles.length}</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400">Active:</span>
            <span className="font-bold text-red-400">{activeCount}</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">Recovered:</span>
            <span className="font-bold text-emerald-400">{recoveredCount}</span>
          </div>

          <button
            type="button"
            onClick={fetchVehicles}
            title="Refresh List"
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-900/30 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add Stolen Vehicle
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search license plate, FIR, owner, police station..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </form>

        <div className="md:col-span-7 flex flex-wrap items-center gap-2 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Stolen</option>
            <option value="RECOVERED">Recovered</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Types</option>
            <option value="CAR">Car / SUV</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="SCOOTER">Scooter</option>
            <option value="TRUCK">Truck</option>
            <option value="BUS">Bus</option>
          </select>

          <button
            type="button"
            onClick={fetchVehicles}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm">Synchronizing Stolen Vehicle Registry...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No stolen vehicles found matching current criteria.</p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add Vehicle Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Plate Number</th>
                  <th className="py-3.5 px-4 font-bold">Vehicle Type</th>
                  <th className="py-3.5 px-4 font-bold">Owner / FIR Details</th>
                  <th className="py-3.5 px-4 font-bold">Police Station</th>
                  <th className="py-3.5 px-4 font-bold">Date Reported</th>
                  <th className="py-3.5 px-4 font-bold">Priority</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-base text-emerald-400 tracking-wider bg-slate-950/90 px-3 py-1 rounded-lg border border-slate-800 w-fit">
                        {v.vehicle_number}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(v.vehicle_type)}
                        <span className="font-semibold text-slate-200">{v.vehicle_type}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {v.owner_name || 'Not Disclosed'}
                        </div>
                        <div className="text-xs text-amber-400 font-mono flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {v.fir_number}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={v.police_station}>
                        <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{v.police_station}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {v.date_reported ? new Date(v.date_reported).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getPriorityBadge(v.priority)}
                    </td>

                    <td className="py-3.5 px-4">
                      {v.status === 'ACTIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" /> RECOVERED
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => setRecoveringVehicle(v)}
                            title="Mark as Recovered"
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-lg transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          title="Edit Details"
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVehicleId(v.id)}
                          title="Delete from Registry"
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      <AnimatePresence>
        {(isAddModalOpen || editingVehicle) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            >
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">
                    {editingVehicle ? 'Edit Stolen Vehicle Record' : 'Register Stolen / Wanted Vehicle'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVehicle(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Vehicle License Plate *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. DL01AB1234"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-emerald-400 focus:outline-none focus:border-red-500"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Auto-normalized (spaces/hyphens removed)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="CAR">Car / Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                      <option value="SCOOTER">Scooter</option>
                      <option value="TRUCK">Truck</option>
                      <option value="BUS">Bus</option>
                      <option value="VAN">Van / Commercial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Registered Owner Name
                    </label>
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      placeholder="Owner Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      FIR Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fir_number}
                      onChange={(e) => setFormData({ ...formData, fir_number: e.target.value })}
                      placeholder="e.g. FIR-2026-DEL-1092"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono text-amber-300 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Police Station *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.police_station}
                      onChange={(e) => setFormData({ ...formData, police_station: e.target.value })}
                      placeholder="e.g. Connaught Place Police Station"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Date Reported
                    </label>
                    <input
                      type="date"
                      value={formData.date_reported}
                      onChange={(e) => setFormData({ ...formData, date_reported: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Reason / Offense
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Vehicle Theft / Robbery / Hit & Run"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="CRITICAL">Critical (Immediate Intercept)</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Investigation Notes & Suspect Details
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Vehicle description, distinguishing marks, last seen location, suspect details..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingVehicle(null);
                    }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm rounded-xl shadow-lg transition"
                  >
                    {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recover Vehicle Confirmation Modal */}
      <AnimatePresence>
        {recoveringVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Confirm Vehicle Recovery</h3>
                  <p className="text-xs text-slate-400">Remove from active surveillance matching</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-sm space-y-1">
                <div>Plate: <strong className="text-emerald-400 font-mono">{recoveringVehicle.vehicle_number}</strong></div>
                <div>FIR: <span className="text-amber-300 font-mono">{recoveringVehicle.fir_number}</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Recovery Remarks / Patrol Unit
                </label>
                <textarea
                  rows={2}
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  placeholder="e.g. Intercepted by Highway Patrol Unit 4 at NH-48 toll plaza."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveringVehicle(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmRecover}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg transition"
                >
                  {submitting ? 'Updating...' : 'Mark Recovered'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingVehicleId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 bg-rose-500/20 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Delete Stolen Vehicle?</h3>
                  <p className="text-xs text-slate-400">This will delete the record from the registry.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingVehicleId(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDeleteVehicle(deletingVehicleId)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-xl shadow-lg transition"
                >
                  {submitting ? 'Deleting...' : 'Delete Vehicle'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
