import { type FormEvent } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { ArrowLeft, BarChart3, Settings, ShieldAlert, TriangleAlert } from "lucide-react";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { PageTitle } from "@/components/dsr/DsrPrimitives";

const copy: Record<string, { title: string; eyebrow: string; description: string; icon: typeof BarChart3 }> = {
  "/reports": { title: "Reports", eyebrow: "Reporting center", description: "Saved report views and export workflows will live here. The project DSR data is already available from the dashboard and detail pages.", icon: BarChart3 },
  "/blockers": { title: "Blockers", eyebrow: "Delivery attention", description: "A cross-project blockers view is ready for the next reporting iteration. For now, use each project DSR to manage blocker status and notes.", icon: ShieldAlert },
  "/risks": { title: "Risks", eyebrow: "Portfolio risk", description: "A consolidated project risk register can be added here next. Risk editing is available inside each project DSR today.", icon: TriangleAlert },
  "/settings": { title: "Settings", eyebrow: "Workspace settings", description: "Update the name shown across your workspace.", icon: Settings },
};

export default function WorkspacePlaceholder() {
  const location = useLocation();
  if (location.pathname === "/settings") return <WorkspaceSettings />;
  const item = copy[location.pathname] ?? copy["/reports"];
  const Icon = item.icon;
  return <div className="mx-auto max-w-[920px]"><PageTitle eyebrow={item.eyebrow} title={item.title} description={item.description} /><div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf8f5] text-[#269b8c]"><Icon size={24} /></div><h2 className="mt-5 text-lg font-bold text-slate-800">This workspace is ready for the next step</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">The current workspace stores project blockers and risks in each project DSR. Cross-project views can be added here later.</p><Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white"><ArrowLeft size={14} />Back to dashboard</Link></div></div>;
}

function WorkspaceSettings() {
  const { workspace, setWorkspace } = useOutletContext<DsrOutletContext>();
  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (typeof name === "string" && name.trim()) setWorkspace({ name: name.trim() });
  };

  return <div className="mx-auto max-w-[920px]"><PageTitle eyebrow="Workspace settings" title="Settings" description="Update the name shown across your workspace." /><form onSubmit={saveName} className="max-w-xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Workspace name</span><input name="name" defaultValue={workspace.name} required maxLength={100} className="form-input" /></label><div className="mt-5 flex justify-end"><button className="rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white">Save changes</button></div></form></div>;
}
