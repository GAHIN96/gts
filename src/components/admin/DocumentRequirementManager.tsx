import { useState } from "react";
import { Plus, Trash2, FileText, CreditCard, Heart, Image, FileCheck, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  icon: string;
  required: boolean;
}

interface DocumentRequirementManagerProps {
  documents: DocumentRequirement[];
  onChange: (docs: DocumentRequirement[]) => void;
}

const ICON_OPTIONS = [
  { value: "passport", label: "Passport", icon: FileCheck },
  { value: "file", label: "Document", icon: FileText },
  { value: "id-card", label: "ID Card", icon: CreditCard },
  { value: "medical", label: "Medical", icon: Heart },
  { value: "photo", label: "Photo", icon: Image },
];

const PRESET_DOCUMENTS: DocumentRequirement[] = [
  { id: "passport", name: "Passport", description: "Valid passport with 6+ months validity", icon: "passport", required: true },
  { id: "visa", name: "Visa", description: "Approved visa document", icon: "file", required: true },
  { id: "national-id", name: "National ID", description: "Government-issued national ID card", icon: "id-card", required: true },
  { id: "vaccination", name: "Vaccination Card", description: "COVID-19 vaccination certificate", icon: "medical", required: false },
  { id: "photo", name: "Photo", description: "Recent passport-size photo", icon: "photo", required: false },
];

const getIconComponent = (iconValue: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconValue);
  return iconOption?.icon || FileText;
};

export function DocumentRequirementManager({ documents, onChange }: DocumentRequirementManagerProps) {
  const [editingDoc, setEditingDoc] = useState<string | null>(null);

  const generateId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addDocument = (preset?: DocumentRequirement) => {
    const newDoc: DocumentRequirement = preset 
      ? { ...preset, id: preset.id === "passport" || preset.id === "visa" ? preset.id : generateId() }
      : {
          id: generateId(),
          name: "",
          description: "",
          icon: "file",
          required: true,
        };
    
    // Check if document with same ID already exists
    if (documents.some(d => d.id === newDoc.id)) {
      return; // Don't add duplicate
    }
    
    onChange([...documents, newDoc]);
    if (!preset) {
      setEditingDoc(newDoc.id);
    }
  };

  const updateDocument = (id: string, updates: Partial<DocumentRequirement>) => {
    onChange(documents.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ));
  };

  const removeDocument = (id: string) => {
    onChange(documents.filter(doc => doc.id !== id));
  };

  const toggleRequired = (id: string) => {
    onChange(documents.map(doc => 
      doc.id === id ? { ...doc, required: !doc.required } : doc
    ));
  };

  // Get available presets (not already added)
  const availablePresets = PRESET_DOCUMENTS.filter(
    preset => !documents.some(d => d.id === preset.id || d.name.toLowerCase() === preset.name.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Required Documents</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addDocument()}
          className="h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Custom
        </Button>
      </div>

      {/* Quick Add Presets */}
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Quick add:</span>
          {availablePresets.slice(0, 4).map(preset => {
            const IconComponent = getIconComponent(preset.icon);
            return (
              <Button
                key={preset.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs bg-muted/50 hover:bg-muted"
                onClick={() => addDocument(preset)}
              >
                <IconComponent className="h-3 w-3 mr-1" />
                {preset.name}
              </Button>
            );
          })}
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No document requirements yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add documents that travelers must provide</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const IconComponent = getIconComponent(doc.icon);
            const isEditing = editingDoc === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>

                {isEditing ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Document name"
                      value={doc.name}
                      onChange={(e) => updateDocument(doc.id, { name: e.target.value })}
                      className="h-8"
                      autoFocus
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={doc.description || ""}
                      onChange={(e) => updateDocument(doc.id, { description: e.target.value })}
                      className="h-8"
                    />
                    <Select
                      value={doc.icon}
                      onValueChange={(value) => updateDocument(doc.id, { icon: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <opt.icon className="h-3.5 w-3.5" />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => setEditingDoc(null)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => setEditingDoc(doc.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{doc.name || "Untitled Document"}</span>
                        {doc.required && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            Required
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={doc.required}
                        onCheckedChange={() => toggleRequired(doc.id)}
                        className="scale-75"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {documents.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {documents.filter(d => d.required).length} required, {documents.filter(d => !d.required).length} optional
        </p>
      )}
    </div>
  );
}
