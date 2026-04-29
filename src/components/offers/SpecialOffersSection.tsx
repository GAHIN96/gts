import { Sparkles, Clock, TrendingDown, Star, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Offer {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  image: string;
  expiresIn?: string;
  featured?: boolean;
}

interface SpecialOffersSectionProps {
  title: string;
  offers: Offer[];
  onViewOffer?: (offer: Offer) => void;
}

export function SpecialOffersSection({ title, offers, onViewOffer }: SpecialOffersSectionProps) {
  if (offers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <Badge className="bg-coral/10 text-coral border-coral/30 ml-2">
          {offers.length} Deals
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {offers.map((offer, index) => (
          <Card 
            key={offer.id}
            className="group overflow-hidden shadow-card hover:shadow-card-hover transition-all cursor-pointer animate-fade-in relative"
            style={{ animationDelay: `${index * 75}ms` }}
            onClick={() => onViewOffer?.(offer)}
          >
            {/* Discount Badge */}
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-coral text-white shadow-lg font-bold">
                <TrendingDown className="h-3 w-3 mr-1" />
                {offer.discountPercent}% OFF
              </Badge>
            </div>

            {/* Featured Badge */}
            {offer.featured && (
              <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-gold text-white shadow-lg">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Image */}
            <div className="relative h-36 overflow-hidden">
              <img
                src={offer.image}
                alt={offer.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              
              {/* Expires Badge */}
              {offer.expiresIn && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white bg-foreground/50 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  {offer.expiresIn}
                </div>
              )}
            </div>

            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {offer.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {offer.description}
              </p>
              
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    ${offer.originalPrice}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    ${offer.discountedPrice}
                  </span>
                </div>
                <Button size="sm" variant="navy" className="h-8">
                  View
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
