import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFlights } from '@/hooks/useFlights';
import { FlightDeal, FlightDealInsert } from '@/hooks/useFlightDeals';

interface FlightDealFormProps {
  deal?: FlightDeal | null;
  onSubmit: (data: FlightDealInsert) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const FlightDealForm = ({ deal, onSubmit, onCancel, isLoading }: FlightDealFormProps) => {
  const { data: flights } = useFlights();
  const [formData, setFormData] = useState<FlightDealInsert>({
    flight_id: deal?.flight_id || null,
    title: deal?.title || '',
    description: deal?.description || '',
    original_price: deal?.original_price || 0,
    discounted_price: deal?.discounted_price || 0,
    discount_percent: deal?.discount_percent || 0,
    image_url: deal?.image_url || '',
    expires_at: deal?.expires_at ? new Date(deal.expires_at).toISOString().slice(0, 16) : '',
    is_featured: deal?.is_featured || false,
    is_active: deal?.is_active ?? true,
  });

  useEffect(() => {
    if (formData.original_price > 0 && formData.discounted_price > 0) {
      const discount = Math.round(((formData.original_price - formData.discounted_price) / formData.original_price) * 100);
      setFormData(prev => ({ ...prev, discount_percent: discount }));
    }
  }, [formData.original_price, formData.discounted_price]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Deal Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Summer Sale - Baghdad to Istanbul"
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="flight_id">Link to Flight (Optional)</Label>
          <Select
            value={formData.flight_id || 'none'}
            onValueChange={(value) => setFormData({ ...formData, flight_id: value === 'none' ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a flight" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked flight</SelectItem>
              {flights?.map((flight) => (
                <SelectItem key={flight.id} value={flight.id}>
                  {flight.airline} - {flight.departure_city} → {flight.arrival_city} ({flight.departure_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the deal..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="original_price">Original Price ($)</Label>
          <Input
            id="original_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.original_price}
            onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Label htmlFor="discounted_price">Discounted Price ($)</Label>
          <Input
            id="discounted_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.discounted_price}
            onChange={(e) => setFormData({ ...formData, discounted_price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Label htmlFor="discount_percent">Discount % (Auto-calculated)</Label>
          <Input
            id="discount_percent"
            type="number"
            value={formData.discount_percent}
            readOnly
            className="bg-muted"
          />
        </div>

        <div>
          <Label htmlFor="expires_at">Expires At</Label>
          <Input
            id="expires_at"
            type="datetime-local"
            value={formData.expires_at || ''}
            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={formData.image_url || ''}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_featured"
            checked={formData.is_featured || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
          />
          <Label htmlFor="is_featured">Featured Deal</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
};
