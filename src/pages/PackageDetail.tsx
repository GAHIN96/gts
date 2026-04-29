import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePackage, usePackageHotels } from "@/hooks/usePackages";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin,
  Calendar,
  Plane,
  Building,
  Car,
  Map,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Edit,
  CalendarPlus,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupPackageForm } from "@/components/admin/GroupPackageForm";
import { PackageDeparturesManager } from "@/components/admin/PackageDeparturesManager";
import { PackageImageUploader } from "@/components/admin/PackageImageUploader";

import packageTurkey from "@/assets/package-turkey.jpg";
import destinationDubai from "@/assets/destination-dubai.jpg";
import destinationMalaysia from "@/assets/destination-malaysia.jpg";
import destinationThailand from "@/assets/destination-thailand.jpg";
import destinationEgypt from "@/assets/destination-egypt.jpg";

const cityImages: Record<string, string> = {
  Istanbul: packageTurkey,
  Dubai: destinationDubai,
  "Kuala Lumpur": destinationMalaysia,
  Bangkok: destinationThailand,
  Cairo: destinationEgypt,
};

interface DayProgram {
  day: number;
  title: string;
  activities: string[];
}

const PackageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: pkg, isLoading, error } = usePackage(id || "");
  const { data: hotels } = usePackageHotels(pkg?.city_id || null);
  
  const isAdmin = role === "admin";

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Admin state
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [departuresOpen, setDeparturesOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold text-foreground mb-2">Package not found</h2>
        <p className="text-muted-foreground mb-4">The package you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/packages")}>Back to Packages</Button>
      </div>
    );
  }

  const images = pkg.images?.length
    ? pkg.images
    : [cityImages[pkg.cities?.name || "Istanbul"] || packageTurkey];

  const dayProgram = (pkg.day_program as unknown as DayProgram[]) || [];

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Admin Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/packages")} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Packages
        </Button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImagesOpen(true)}>
              <ImagePlus className="h-4 w-4 mr-2" />
              Images
            </Button>
            <Button variant="outline" onClick={() => setDeparturesOpen(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Departures
            </Button>
            <Button variant="navy" onClick={() => setEditFormOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Package
            </Button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative h-[400px] rounded-xl overflow-hidden">
        <img
          src={images[currentImageIndex]}
          alt={pkg.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        
        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
              onClick={() => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
              onClick={() => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Package Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Badge className="mb-2 bg-success text-success-foreground">Active Package</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">{pkg.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-primary-foreground/90">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{pkg.cities?.name}, {pkg.cities?.country}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{pkg.nights} Nights</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-gold fill-gold" />
              <span>4.8 (124 reviews)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Icons */}
      <div className="flex flex-wrap gap-3">
        {pkg.includes_flight && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Plane className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Flights Included</span>
          </div>
        )}
        {pkg.includes_hotel && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Building className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Hotel Included</span>
          </div>
        )}
        {pkg.includes_transfer && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Car className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Transfer Included</span>
          </div>
        )}
        {pkg.includes_tours && (
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Map className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Tours Included</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>About This Package</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{pkg.description}</p>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="program" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="program">Day Program</TabsTrigger>
              <TabsTrigger value="hotels">Hotels</TabsTrigger>
              <TabsTrigger value="included">What's Included</TabsTrigger>
            </TabsList>

            {/* Day Program Tab */}
            <TabsContent value="program" className="mt-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Day-by-Day Itinerary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dayProgram.length > 0 ? dayProgram.map((day) => (
                    <div key={day.day} className="flex gap-4 p-4 bg-secondary/50 rounded-lg">
                      <div className="flex-shrink-0 w-16 h-16 bg-primary rounded-lg flex flex-col items-center justify-center text-primary-foreground">
                        <span className="text-xs">Day</span>
                        <span className="text-2xl font-bold">{day.day}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-2">{day.title}</h4>
                        <ul className="space-y-1">
                          {day.activities.map((activity, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">
                      No day program available for this package.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hotels Tab */}
            <TabsContent value="hotels" className="mt-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Available Hotels</CardTitle>
                  <CardDescription>Hotels included in this package</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hotels && hotels.length > 0 ? hotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      className="p-4 border rounded-lg border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{hotel.name}</h4>
                            <div className="flex">
                              {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 text-gold fill-gold" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{hotel.address}</p>
                        </div>
                      </div>

                      {hotel.hotel_rooms && hotel.hotel_rooms.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Available Room Types:</p>
                          {hotel.hotel_rooms.filter(r => r.is_active).map((room) => (
                            <div
                              key={room.id}
                              className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium text-sm">{room.room_type}</p>
                                <p className="text-xs text-muted-foreground">
                                  Capacity: {room.capacity} • {room.amenities?.join(", ")}
                                </p>
                              </div>
                              <span className="font-semibold text-primary">${room.price_per_night}/night</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hotels available for this destination.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Included Tab */}
            <TabsContent value="included" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <Check className="h-5 w-5" />
                      Included
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pkg.included_items && pkg.included_items.length > 0 ? pkg.included_items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" />
                          {item}
                        </li>
                      )) : (
                        <li className="text-muted-foreground">No items specified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <X className="h-5 w-5" />
                      Not Included
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pkg.not_included_items && pkg.not_included_items.length > 0 ? pkg.not_included_items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <X className="h-4 w-4 text-destructive" />
                          {item}
                        </li>
                      )) : (
                        <li className="text-muted-foreground">No items specified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-card sticky top-6">
            <CardHeader>
              <CardTitle>Book This Package</CardTitle>
              <CardDescription>Starting from</CardDescription>
              <p className="text-3xl font-bold text-primary">${pkg.starting_price}</p>
              <p className="text-sm text-muted-foreground">per person</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Departures Summary */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Available Departures</p>
                <p className="text-sm text-muted-foreground">
                  {pkg.package_departures?.filter(d => d.is_active).length || 0} departure dates available
                </p>
              </div>

              {/* Package Highlights */}
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium text-foreground">Package Highlights</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {pkg.nights} nights accommodation
                  </li>
                  {pkg.includes_flight && (
                    <li className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-primary" />
                      Return flights included
                    </li>
                  )}
                  {pkg.includes_transfer && (
                    <li className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      Airport transfers
                    </li>
                  )}
                </ul>
              </div>

              {/* Book Button */}
              <Button
                className="w-full"
                variant="navy"
                size="lg"
                onClick={() => navigate(`/packages/${id}/book`)}
              >
                Start Booking
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Free cancellation up to 7 days before departure
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Modals */}
      {isAdmin && pkg && (
        <>
          <GroupPackageForm
            open={editFormOpen}
            onOpenChange={setEditFormOpen}
            pkg={pkg}
          />
          <PackageDeparturesManager
            packageId={pkg.id}
            open={departuresOpen}
            onOpenChange={setDeparturesOpen}
            destinationCity={pkg.cities?.name}
          />
          <PackageImageUploader
            packageId={pkg.id}
            currentImages={pkg.images || []}
            open={imagesOpen}
            onOpenChange={setImagesOpen}
          />
        </>
      )}
    </div>
  );
};

export default PackageDetail;
