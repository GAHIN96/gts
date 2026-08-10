import { useParams, useNavigate } from "react-router-dom";
import { useTour } from "@/hooks/useTours";
import { 
  Compass, MapPin, Users, Calendar, CheckCircle, 
  XCircle, ChevronDown, ChevronUp, Share2, Heart,
  Star, Activity, Languages, User, Navigation, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { format } from "date-fns";

export default function TourDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tour, isLoading } = useTour(id!);

  // UI Mock Data based on the TourRadar design
  // Removed hardcoded fields to match back-office capabilities

  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [includesExpanded, setIncludesExpanded] = useState(true);
  const [excludesExpanded, setExcludesExpanded] = useState(false);

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getDayProgram = () => {
    if (!tour?.day_program) return [];
    if (Array.isArray(tour.day_program)) {
      return tour.day_program as any[];
    }
    return [];
  };

  const dayProgram = getDayProgram();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Compass className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Tour not found</h2>
        <p className="text-muted-foreground mb-6">The tour you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate("/tours")}>Back to Tours</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <Button variant="ghost" className="mb-4 pl-0" onClick={() => navigate("/tours")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tours
      </Button>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
            {tour.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">{tour.duration_hours ? `${Math.ceil(tour.duration_hours / 24)} days` : '1 day'}</span>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <span className="text-muted-foreground">From <span className="font-semibold text-foreground">{tour.cities?.name || "Multiple Destinations"}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-10 h-[300px] md:h-[450px]">
        <div className="md:col-span-2 h-full relative group">
          <img 
            src={tour.images?.[0] || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop'} 
            alt={tour.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="hidden md:grid grid-rows-2 gap-2 h-full">
          <div className="relative group overflow-hidden">
            <img 
              src={tour.images?.[1] || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop'} 
              alt="Gallery 1"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
          <div className="relative group overflow-hidden">
            <img 
              src={tour.images?.[2] || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop'} 
              alt="Gallery 2"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {tour.images && tour.images.length > 3 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                <span className="text-white font-bold text-lg">+{tour.images.length - 3} Photos</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8 relative">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Group Tour</span>
              </div>
              <p className="font-medium text-sm text-muted-foreground">Join a group and forge lifelong friendships</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Compass className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Fully Guided</span>
              </div>
              <p className="font-medium text-sm text-muted-foreground">An experienced guide will be with you</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Group Size</span>
              </div>
              <p className="font-medium text-sm">Up to {tour.max_participants} people</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
              </div>
              <p className="font-medium text-sm">{tour.duration_hours} Hours</p>
            </div>
          </div>

          {/* Overview */}
          {tour.description && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                {tour.description}
              </p>
            </section>
          )}

          {/* Itinerary */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Itinerary</h2>
              <span className="text-sm font-semibold text-primary hover:underline cursor-pointer">View Full Itinerary</span>
            </div>
            <div className="space-y-3">
              {dayProgram.length > 0 ? dayProgram.map((day, idx) => (
                <Collapsible 
                  key={idx}
                  open={expandedDays[idx] || false} 
                  onOpenChange={() => toggleDay(idx)}
                  className="border border-border rounded-xl overflow-hidden bg-card"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="rounded-md px-2 py-1 bg-muted font-bold">
                        Day {day.day}
                      </Badge>
                      <span className="font-bold text-left">{day.title}</span>
                    </div>
                    {expandedDays[idx] ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 pt-0 border-t border-border bg-card">
                    <div className="pt-4 space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{day.description}</p>
                      {day.activities && day.activities.length > 0 && (
                        <ul className="grid sm:grid-cols-2 gap-2 mt-4">
                          {day.activities.map((act: string, aIdx: number) => (
                            <li key={aIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )) : (
                <div className="p-8 text-center border border-border rounded-xl border-dashed">
                  <p className="text-muted-foreground font-medium">Itinerary details will be provided soon.</p>
                </div>
              )}
            </div>
            
            <Card className="bg-primary/5 border-primary/20 mt-6">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-foreground">Want to read it later?</h4>
                  <p className="text-sm text-muted-foreground">Download this tour's PDF brochure and start tour planning offline</p>
                </div>
                <Button variant="outline" className="bg-white hover:bg-muted font-bold whitespace-nowrap">
                  Download Brochure
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* What's Included */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">What's Included</h2>
              <span 
                className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                onClick={() => setIncludesExpanded(!includesExpanded)}
              >
                {includesExpanded ? "Collapse All" : "Expand All"}
              </span>
            </div>
            
            <Collapsible open={includesExpanded} onOpenChange={setIncludesExpanded} className="border border-border rounded-xl overflow-hidden bg-card">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="font-bold">Included</span>
                </div>
                {includesExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 border-t border-border">
                <ul className="pt-4 space-y-3">
                  {tour.includes && tour.includes.length > 0 ? tour.includes.map((inc, iIdx) => (
                    <li key={iIdx} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{inc}</span>
                    </li>
                  )) : (
                    <li className="text-sm text-muted-foreground">Detailed inclusions will be provided.</li>
                  )}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={excludesExpanded} onOpenChange={setExcludesExpanded} className="border border-border rounded-xl overflow-hidden bg-card mt-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-bold">What's Not Included</span>
                </div>
                {excludesExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 border-t border-border">
                <ul className="pt-4 space-y-3">
                  <li className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-muted-foreground">International Flights</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-muted-foreground">Travel Insurance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-muted-foreground">Optional Activities</span>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </section>

        </div>

        {/* Right Sidebar Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-border/60 shadow-xl overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From Price</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-foreground">${tour.price}</span>
                      <span className="text-sm text-muted-foreground font-medium pb-1">per person</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">Date</p>
                        <p className="text-sm font-bold">{format(new Date(), 'MMMM yyyy')}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">Guests</p>
                        <p className="text-sm font-bold">2 Adults</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <Button className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                    Check Availability
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground font-medium flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" /> Best price guarantee
                  </p>
                </div>
                
                <div className="bg-muted/30 p-6 border-t border-border">
                  <h4 className="font-bold text-sm mb-3">Plan your adventure</h4>
                  <div className="space-y-3">
                    <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download PDF Brochure
                    </button>
                    <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Contact Operator
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
