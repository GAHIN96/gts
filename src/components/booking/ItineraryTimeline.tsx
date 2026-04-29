import { Plane, Camera, Utensils, Building, MapPin, Clock, Sunset, Coffee, ShoppingBag, Ship } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayProgram {
  day: number;
  title: string;
  activities: string[];
}

interface ItineraryTimelineProps {
  dayProgram: DayProgram[];
  nights: number;
}

const activityIcons: Record<string, typeof Plane> = {
  arrival: Plane,
  flight: Plane,
  sightseeing: Camera,
  tour: Camera,
  visit: MapPin,
  meal: Utensils,
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  hotel: Building,
  checkin: Building,
  checkout: Building,
  sunset: Sunset,
  shopping: ShoppingBag,
  cruise: Ship,
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

export function ItineraryTimeline({ dayProgram, nights }: ItineraryTimelineProps) {
  // Generate default program if none exists
  const program = dayProgram.length > 0 ? dayProgram : Array.from({ length: nights + 1 }, (_, i) => ({
    day: i + 1,
    title: i === 0 ? "Arrival Day" : i === nights ? "Departure Day" : `Day ${i + 1}`,
    activities: i === 0 
      ? ["Arrival at the airport", "Transfer to hotel", "Check-in and rest", "Welcome dinner"]
      : i === nights 
        ? ["Breakfast at hotel", "Check-out", "Transfer to airport", "Departure flight"]
        : ["Breakfast at hotel", "City sightseeing tour", "Lunch at local restaurant", "Afternoon free time", "Dinner and evening activities"]
  }));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-[hsl(231,70%,15%)] mb-6">Day-by-Day Itinerary</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[hsl(231,70%,30%)] via-[hsl(231,50%,45%)] to-[hsl(231,70%,30%)]" />
        
        <div className="space-y-6">
          {program.map((day, index) => {
            const isFirst = index === 0;
            const isLast = index === program.length - 1;
            const DayIcon = isFirst ? Plane : isLast ? Plane : Camera;
            
            return (
              <div key={day.day} className="relative flex gap-6">
                {/* Day indicator */}
                <div className={cn(
                  "relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center",
                  "bg-gradient-to-br shadow-lg",
                  isFirst ? "from-[hsl(231,70%,30%)] to-[hsl(231,50%,45%)]" :
                  isLast ? "from-[hsl(6,100%,69%)] to-[hsl(6,80%,55%)]" :
                  "from-white to-[hsl(240,5%,96%)] border border-[hsl(240,6%,90%)]"
                )}>
                  <DayIcon className={cn(
                    "h-5 w-5 mb-0.5",
                    (isFirst || isLast) ? "text-white" : "text-[hsl(231,70%,30%)]"
                  )} />
                  <span className={cn(
                    "text-xs font-bold",
                    (isFirst || isLast) ? "text-white" : "text-[hsl(231,70%,15%)]"
                  )}>
                    Day {day.day}
                  </span>
                </div>

                {/* Day content */}
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-lg text-[hsl(231,70%,15%)] mb-3">{day.title}</h4>
                  <div className="space-y-2.5">
                    {day.activities.map((activity, actIdx) => {
                      const Icon = getIconForActivity(activity);
                      return (
                        <div 
                          key={actIdx} 
                          className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(240,5%,96%)] hover:bg-[hsl(231,70%,30%)]/5 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <Icon className="h-4 w-4 text-[hsl(231,70%,30%)]" />
                          </div>
                          <span className="text-sm text-[hsl(231,70%,15%)]">{activity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
