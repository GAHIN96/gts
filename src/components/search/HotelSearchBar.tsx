import { useState } from "react";
import {
  MapPin,
  Calendar,
  Users,
  Search,
  Home,
  Baby,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { HotelRoomConfigurator, RoomConfig } from "@/components/booking/HotelRoomConfigurator";
import { format, differenceInDays } from "date-fns";

interface HotelSearchBarProps {
  onSearch: (params: {
    destination: string;
    checkIn: Date | undefined;
    checkOut: Date | undefined;
    guests: number;
    rooms: number;
    adults: number;
    children: number;
    infants: number;
    roomType: string;
  }) => void;
}

export function HotelSearchBar({ onSearch }: HotelSearchBarProps) {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([{ adults: 2, children6to12: 0, children2to6: 0, infants: 0 }]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const totalAdults = roomConfigs.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = roomConfigs.reduce((sum, r) => sum + r.children6to12 + r.children2to6, 0);
  const totalInfants = roomConfigs.reduce((sum, r) => sum + r.infants, 0);
  const totalGuests = totalAdults + totalChildren + totalInfants;
  const roomCount = roomConfigs.length;
  const nights = checkIn && checkOut ? Math.max(0, differenceInDays(checkOut, checkIn)) : 0;

  const handleSearch = () => {
    onSearch({
      destination,
      checkIn,
      checkOut,
      guests: totalGuests,
      rooms: roomCount,
      adults: totalAdults,
      children: totalChildren,
      infants: 0,
      roomType: "any"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="overflow-hidden bg-card/80 backdrop-blur-xl border-border/40 ring-1 ring-border/40 shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.35)] rounded-2xl">
        {/* Gradient header strip */}
        <div className="relative bg-gradient-to-r from-primary/[0.08] via-blue-500/[0.05] to-transparent px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center ring-2 ring-primary/20 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
            >
              <Search className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-1">
                <span className="text-amber-500 text-[10px]">✦</span>
                <span className="text-[10px] font-bold tracking-[0.15em] text-amber-600 dark:text-amber-400">HOTEL SEARCH</span>
              </div>
              <h3 className="font-semibold text-foreground leading-tight">Search Hotels</h3>
              <p className="text-sm text-muted-foreground">Find the perfect accommodation for your clients</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-end">
            {/* Destination */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="City or hotel name"
                  className="pl-10 h-12 bg-card/60 backdrop-blur border-border/40 rounded-xl focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Check In */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check-in</label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-card hover:border-primary transition-colors px-3"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    {checkIn ? (
                      <span className="flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-foreground text-sm truncate">{format(checkIn, "dd MMM yyyy")}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{format(checkIn, "EEEE")}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={(d) => {
                      setCheckIn(d);
                      setCheckInOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check Out */}
            <div className="md:col-span-2 space-y-2 relative">
              {/* Nights chip */}
              {nights > 0 && (
                <div className="hidden md:flex absolute -left-3 top-9 z-10 -translate-x-1/2 -translate-y-0 items-center justify-center px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-[10px] font-bold shadow-lg ring-2 ring-background">
                  {nights}n
                </div>
              )}
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check-out</label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-card hover:border-primary transition-colors px-3"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    {checkOut ? (
                      <span className="flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-foreground text-sm truncate">{format(checkOut, "dd MMM yyyy")}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{format(checkOut, "EEEE")}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={(d) => {
                      setCheckOut(d);
                      setCheckOutOpen(false);
                    }}
                    disabled={(date) => checkIn ? date < checkIn : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guests & Rooms */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rooms & Guests</label>
              <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-card hover:border-primary transition-colors gap-2 px-3"
                  >
                    <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-foreground">{roomCount}</span>
                    <span className="text-border mx-0.5">|</span>
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-foreground">{totalAdults}</span>
                    {totalChildren > 0 && (
                      <>
                        <span className="text-border mx-0.5">·</span>
                        <Baby className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">{totalChildren}</span>
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0 bg-card border border-border shadow-lg z-50" align="start">
                  <HotelRoomConfigurator
                    rooms={roomConfigs}
                    onRoomsChange={setRoomConfigs}
                    onApply={() => setGuestsOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2 flex items-end">
              <Button
                onClick={handleSearch}
                className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary hover:to-blue-600 text-primary-foreground font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] transition-all overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Search className="h-5 w-5 relative z-10" />
                <span className="hidden md:inline relative z-10 ml-2 tracking-wide">SEARCH</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
