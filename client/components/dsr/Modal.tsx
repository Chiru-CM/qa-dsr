import { X } from "lucide-react";

export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl`} role="dialog" aria-modal="true" aria-label={title}><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-800">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>}</div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog"><X size={17} /></button></div>{children}</div></div>;
}
