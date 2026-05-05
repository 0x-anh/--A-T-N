import React from 'react';
import { motion } from 'motion/react';
import { UserPlus } from 'lucide-react';

interface InviteModalProps {
  show: boolean;
  onClose: () => void;
  inviteUserEmail: string;
  setInviteUserEmail: (val: string) => void;
  handleInviteMember: () => void;
}

const InviteModal = ({
  show,
  onClose,
  inviteUserEmail,
  setInviteUserEmail,
  handleInviteMember
}: InviteModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg p-14 relative z-[610] bg-white border border-slate-200/60 shadow-5xl rounded-[3.5rem]"
      >
        <div className="space-y-6 mb-12 text-center">
           <div className="w-20 h-20 bg-slate-950 text-white flex items-center justify-center rounded-[2rem] mx-auto mb-8 shadow-2xl group rotate-6 hover:rotate-0 transition-transform duration-700">
              <UserPlus size={32} />
           </div>
           <h3 className="text-xl font-black text-slate-950 tracking-tight uppercase italic leading-none">Thêm_Nhân_Sự</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Mở rộng cơ sở dữ liệu nhân sự của hệ thống.</p>
        </div>
        <div className="space-y-10">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">Email_Định_Danh_Nhân_Sự</label>
              <input autoFocus placeholder="..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-base text-center font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-100 font-mono italic" value={inviteUserEmail} onChange={(e) => setInviteUserEmail(e.target.value)} />
           </div>
           <div className="flex gap-4">
              <button onClick={handleInviteMember} disabled={!inviteUserEmail.trim()} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 transition-all shadow-xl disabled:opacity-30">CẤP_QUYỀN_TRUY_CẬP</button>
              <button onClick={onClose} className="px-8 text-[10px] font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-[0.3em] font-mono italic">QUAY_LẠI</button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InviteModal;
