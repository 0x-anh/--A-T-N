import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { FolderPlus } from 'lucide-react';

interface ProjectModalProps {
  show: boolean;
  onClose: () => void;
  newProjectName: string;
  setNewProjectName: (val: string) => void;
  handleCreateProject: () => void;
}

const ProjectModal = ({
  show,
  onClose,
  newProjectName,
  setNewProjectName,
  handleCreateProject
}: ProjectModalProps) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg p-14 relative z-[510] bg-white border border-slate-200/60 shadow-5xl rounded-[3rem]"
      >
        <div className="flex flex-col text-center space-y-6 mb-12">
            <div className="w-20 h-20 bg-slate-950 text-white flex items-center justify-center rounded-[1.75rem] mx-auto shadow-2xl mb-4 group rotate-[-8deg] hover:rotate-0 transition-transform duration-700">
               <FolderPlus size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-950 tracking-tight uppercase leading-none">{t('modals.create_project_title')}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">{t('dashboard.project_management').toUpperCase()}</p>
          </div>
          <div className="space-y-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">{t('modals.project_name')}</label>
               <input autoFocus placeholder="..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-base text-center font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-100 font-mono uppercase" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 shadow-xl disabled:opacity-30 transition-all">{t('modals.create')}</button>
              <button onClick={onClose} className="px-8 text-[10px] font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-[0.3em] font-mono">{t('common.cancel')}</button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectModal;
