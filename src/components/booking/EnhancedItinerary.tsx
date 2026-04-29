import { useState, useRef } from "react";
import { 
  Plane, 
  Camera, 
  Utensils, 
  Building, 
  MapPin, 
  Clock, 
  Sunset, 
  Coffee, 
  ShoppingBag, 
  Ship,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Mountain,
  Waves,
  Car,
  Ticket,
  PartyPopper,
  Palmtree,
  Landmark,
  Download,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePDFFromElement, getVoucherFilename } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import Barcode from "react-barcode";

interface DayProgram {
  day: number;
  title: string;
  description?: string;
  activities: string[];
  image?: string;
}

interface EnhancedItineraryProps {
  dayProgram: DayProgram[];
  nights: number;
  packageImages?: string[];
  packageName?: string;
  barcodeValue?: string | null;
  showDownloadButton?: boolean;
}

const activityIcons: Record<string, typeof Plane> = {
  arrival: Plane,
  airport: Plane,
  flight: Plane,
  transfer: Car,
  sightseeing: Camera,
  tour: Camera,
  visit: MapPin,
  temple: Landmark,
  palace: Landmark,
  mosque: Landmark,
  museum: Landmark,
  pyramid: Mountain,
  meal: Utensils,
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  bbq: Utensils,
  hotel: Building,
  checkin: Building,
  checkout: Building,
  sunset: Sunset,
  shopping: ShoppingBag,
  bazaar: ShoppingBag,
  souk: ShoppingBag,
  cruise: Ship,
  boat: Ship,
  abra: Ship,
  nile: Ship,
  beach: Waves,
  pool: Waves,
  water: Waves,
  desert: Mountain,
  dune: Mountain,
  camel: Palmtree,
  safari: Palmtree,
  entertainment: PartyPopper,
  show: PartyPopper,
  fountain: PartyPopper,
  welcome: Ticket,
  farewell: Ticket,
  default: Clock,
};

function getIconForActivity(activity: string): typeof Plane {
  const lowerActivity = activity.toLowerCase();
  for (const [keyword, icon] of Object.entries(activityIcons)) {
    if (lowerActivity.includes(keyword)) {
      return icon;
    }
  }
  return activityIcons.default;
}

function DayImage({ image, dayTitle }: { image: string; dayTitle: string }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden group mb-5">
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
      )}
      <img
        src={image}
        alt={dayTitle}
        className={cn(
          "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-white font-semibold text-lg drop-shadow-lg">{dayTitle}</p>
      </div>
    </div>
  );
}

export function EnhancedItinerary({ 
  dayProgram, 
  nights, 
  packageImages = [],
  packageName = "Package",
  barcodeValue,
  showDownloadButton = true,
}: EnhancedItineraryProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [expandAll, setExpandAll] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const itineraryRef = useRef<HTMLDivElement>(null);

  // Generate default program if none exists
  const program = dayProgram.length > 0 ? dayProgram : Array.from({ length: nights + 1 }, (_, i) => ({
    day: i + 1,
    title: i === 0 ? "Arrival Day" : i === nights ? "Departure Day" : `Day ${i + 1} - Exploration`,
    description: i === 0 
      ? "Welcome to your adventure! Begin your journey with seamless arrival and transfer."
      : i === nights 
        ? "Farewell for now! We hope you had an unforgettable experience."
        : "Immerse yourself in local culture, sights, and experiences.",
    activities: i === 0 
      ? ["Arrival at the airport", "Private transfer to hotel", "Check-in and rest", "Welcome dinner"]
      : i === nights 
        ? ["Breakfast at hotel", "Check-out", "Transfer to airport", "Departure flight"]
        : ["Breakfast at hotel", "City sightseeing tour", "Lunch at local restaurant", "Afternoon free time", "Dinner and evening activities"],
    image: packageImages[i] || undefined
  }));

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedDays(new Set([1]));
    } else {
      setExpandedDays(new Set(program.map(d => d.day)));
    }
    setExpandAll(!expandAll);
  };

  const handleDownloadPDF = async () => {
    if (!itineraryRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Expand all days for PDF generation
      const originalExpanded = new Set(expandedDays);
      setExpandedDays(new Set(program.map(d => d.day)));
      
      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await generatePDFFromElement(
        itineraryRef.current,
        getVoucherFilename(packageName.replace(/\s+/g, '-'), 'itinerary')
      );
      
      toast.success("Itinerary PDF downloaded successfully!");
      
      // Restore original expanded state
      setExpandedDays(originalExpanded);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div ref={itineraryRef} className="bg-card rounded-3xl shadow-xl overflow-hidden border border-border">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary-foreground">Day-by-Day Itinerary</h3>
              <p className="text-primary-foreground/80">{nights + 1} days of unforgettable experiences</p>
            </div>
          </div>
          
          {/* Barcode section */}
          {barcodeValue && (
            <div className="bg-white rounded-xl p-2 flex items-center justify-center">
              <Barcode 
                value={barcodeValue} 
                width={1.2}
                height={40}
                fontSize={10}
                margin={4}
                displayValue={true}
              />
            </div>
          )}
          
          <div className="hidden sm:flex items-center gap-2">
            {showDownloadButton && (
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
            )}
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={toggleExpandAll}
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6 md:p-8">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-7 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-primary rounded-full" />
          
          <div className="space-y-5">
            {program.map((day, index) => {
              const isFirst = index === 0;
              const isLast = index === program.length - 1;
              const isExpanded = expandedDays.has(day.day);
              
              return (
                <div key={day.day} className="relative">
                  {/* Day Header - Always visible */}
                  <div 
                    className={cn(
                      "flex gap-5 p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                      isExpanded 
                        ? "bg-primary/5 border-primary/20 shadow-lg" 
                        : "border-transparent hover:bg-muted hover:border-border"
                    )}
                    onClick={() => toggleDay(day.day)}
                  >
                    {/* Day indicator */}
                    <div className={cn(
                      "relative z-10 flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all duration-300",
                      isFirst ? "bg-gradient-to-br from-primary to-primary/80" :
                      isLast ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                      isExpanded ? "bg-gradient-to-br from-primary to-primary/80" :
                      "bg-card border-3 border-primary"
                    )}>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        (isFirst || isLast || isExpanded) ? "text-primary-foreground/80" : "text-primary"
                      )}>
                        Day
                      </span>
                      <span className={cn(
                        "text-xl font-bold leading-none",
                        (isFirst || isLast || isExpanded) ? "text-primary-foreground" : "text-primary"
                      )}>
                        {day.day}
                      </span>
                    </div>

                    {/* Day title and description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-xl text-foreground mb-1">{day.title}</h4>
                          {day.description && !isExpanded && (
                            <p className="text-muted-foreground line-clamp-1">
                              {day.description}
                            </p>
                          )}
                          {!isExpanded && (
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="secondary" className="rounded-lg">
                                {day.activities.length} activities
                              </Badge>
                              <span className="text-primary text-sm font-medium">Click to expand →</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-10 w-10 rounded-xl transition-all",
                            isExpanded ? "bg-primary/10" : ""
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDay(day.day);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-primary" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-primary" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="ml-[4.5rem] mr-2 mt-3 space-y-5 animate-in slide-in-from-top-2 duration-300">
                      {/* Day image */}
                      {day.image && (
                        <DayImage 
                          image={day.image} 
                          dayTitle={day.title} 
                        />
                      )}
                      
                      {day.description && (
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-5 rounded-2xl border border-primary/10">
                          <p className="text-foreground leading-relaxed">
                            {day.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {day.activities.map((activity, actIdx) => {
                          const Icon = getIconForActivity(activity);
                          return (
                            <div 
                              key={actIdx} 
                              className="flex items-center gap-4 p-4 rounded-2xl bg-muted hover:bg-primary/5 transition-all duration-300 group border border-transparent hover:border-primary/20"
                            >
                              <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-110">
                                <Icon className="h-6 w-6 text-primary" />
                              </div>
                              <span className="text-foreground font-medium">{activity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
