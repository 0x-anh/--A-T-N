import { useTranslation } from 'react-i18next';
import { Project } from '../../types';
import { motion } from 'motion/react';
import { Settings, X, Lock } from 'lucide-react';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  user: any;
  handleUpdateProject: () => void;
  handleDeleteProject: () => void;
}

const SettingsModal = ({
  show,
  onClose,
  selectedProject,
  setSelectedProject,
  user,
  handleUpdateProject,
  handleDeleteProject
}: SettingsModalProps) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl relative z-[610] bg-white border border-slate-200/60 shadow-6xl rounded-[3rem] overflow-hidden"
      >
        <div className="px-12 py-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 tracking-[-0.05em] uppercase leading-none">{t('modals.settings_title')}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Operational_Parameters_Config</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full hover:bg-white hover:shadow-lg transition-all flex items-center justify-center text-slate-300 hover:text-slate-950">
            <X size={24} />
          </button>
        </div>
        <div className="p-12 space-y-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">{t('modals.workspace_identity')}</label>
              <input 
                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-lg font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono"
                value={selectedProject?.name || ''} 
                onChange={(e) => setSelectedProject(selectedProject ? {...selectedProject, name: e.target.value} : null)} 
                disabled={user?.uid !== selectedProject?.ownerId}
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="p-8 space-y-3 bg-slate-50 border border-slate-100 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono opacity-50">Encryption_Standard</span>
                  <div className="text-sm font-black text-slate-950 font-mono uppercase">AES-256-GCM</div>
              </div>
              <div className="p-8 space-y-3 bg-slate-50 border border-slate-100 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono opacity-50">Security_Level</span>
                  <div className="text-sm font-black text-emerald-600 font-mono flex items-center gap-2">
                    <Lock size={18} /> AUTH_LEVEL_4
                  </div>
              </div>
            </div>

            <div className="pt-10 flex items-center justify-between gap-6">
              {user?.uid === selectedProject?.ownerId && (
                <button 
                  onClick={handleDeleteProject}
                  className="text-[10px] font-black text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-[0.4em] font-mono"
                >
                  {t('modals.terminate_workspace')}
                </button>
              )}
              <div className="flex-1" />
              <button 
                onClick={handleUpdateProject}
                className="w-full h-16 bg-slate-950 text-white rounded-[1.5rem] mt-12 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-950/20 flex items-center justify-center gap-3 active:scale-95"
              >
                  {t('modals.commit_changes')}
              </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
