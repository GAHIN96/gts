import { useState } from "react";
import { 
  PlaneTakeoff, 
  PlaneLanding,
  Calendar,
  Users,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FlightSearchBarProps {
  onSearch: (params: {
    from: string;
    to: string;
    date: Date | undefined;
    passengers: number;
  }) => void;
}

export function FlightSearchBar({ onSearch }: FlightSearchBarProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<Date>();
  const [passengers, setPassengers] = useState(1);
  const [dateOpen, setDateOpen] = useState(false);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = () => {
    onSearch({ from, to, date, passengers });
  };

  return (
    <Card className="p-6 shadow-lg bg-card/80 backdrop-blur-sm border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* From */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
          <div className="relative">
            <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Departure city"
              className="pl-10 h-12 bg-secondary/50 border-0 rounded-xl"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="h-10 w-10 rounded-full border-dashed hover:bg-primary/10"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* To */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
          <div className="relative">
            <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Arrival city"
              className="pl-10 h-12 bg-secondary/50 border-0 rounded-xl"
            />
          </div>
        </div>

        {/* Date */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 justify-start text-left font-normal bg-secondary/50 border-0 rounded-xl hover:bg-secondary"
              >
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                {date ? format(date, "dd/MM/yyyy") : <span className="text-muted-foreground">Select date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Passengers */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passengers</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              max={9}
              value={passengers}
              onChange={(e) => setPassengers(Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
              className="pl-10 h-12 bg-secondary/50 border-0 rounded-xl"
            />
          </div>
        </div>

        {/* Search Button */}
        <div className="md:col-span-1">
          <Button
            onClick={handleSearch}
            className="w-full h-12 rounded-xl bg-gradient-navy hover:opacity-90"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
