import type { FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { DsrOutletContext } from "@/components/dsr/DsrLayout";
import { PageTitle } from "@/components/dsr/DsrPrimitives";

export default function WorkspaceSettings() {
  const { workspace, setWorkspace } = useOutletContext<DsrOutletContext>();
  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (typeof name === "string" && name.trim()) setWorkspace({ name: name.trim() });
  };

  return <div className="mx-auto max-w-[920px]"><PageTitle eyebrow="Workspace settings" title="Settings" description="Update the name shown across your workspace." /><form onSubmit={saveName} className="max-w-xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_3px_15px_rgba(20,40,70,0.03)]"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Workspace name</span><input name="name" defaultValue={workspace.name} required maxLength={100} className="form-input" /></label><div className="mt-5 flex justify-end"><button className="rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-bold text-white">Save changes</button></div></form></div>;
}
