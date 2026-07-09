import { PageHeader } from "@/components/common/PageHeader";
import MacroGlobalTable from "@/components/macro/MacroGlobalTable";
import EconomicMapWidget from "@/components/macro/EconomicMapWidget";

// Country-level macro views live in the Brasil/EUA pages (Macro tab),
// rendered by CountryMacroPanel. This page is the global comparison only.
export default function MacroDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Global"
        subtitle="Monitor macroeconômico comparativo — principais economias"
      />
      <MacroGlobalTable />
      <EconomicMapWidget />
    </div>
  );
}
