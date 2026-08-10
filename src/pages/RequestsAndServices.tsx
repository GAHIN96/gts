import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpecialRequests from "./SpecialRequests";
import AdditionalServices from "./AdditionalServices";
import { MessageSquarePlus, CirclePlus } from "lucide-react";
import { ModulePageHeader } from "@/components/ui/module-page-header";

export default function RequestsAndServices() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get("tab") || "requests";
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (searchParams.get("tab")) {
      setActiveTab(searchParams.get("tab") as string);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    navigate(`/requests-and-services?tab=${val}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={activeTab === "requests" ? MessageSquarePlus : CirclePlus}
        title={activeTab === "requests" ? "Special Requests" : "Additional Services"}
        subtitle={activeTab === "requests" ? "Manage special requests for trips and packages" : "Manage additional travel services"}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="requests">Special Requests</TabsTrigger>
          <TabsTrigger value="services">Additional Services</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="requests" className="mt-0 outline-none">
            <SpecialRequests />
          </TabsContent>
          <TabsContent value="services" className="mt-0 outline-none">
            <AdditionalServices />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
