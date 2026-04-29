import { useState } from "react";
import { Download, Eye, FileText, Image, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PassengerDocument {
  firstName: string;
  lastName: string;
  passportNumber: string;
  documentUrl?: string;
}

interface PassengerDocumentsViewerProps {
  passengers: PassengerDocument[];
  bookingNumber: string;
}

export function PassengerDocumentsViewer({ 
  passengers, 
  bookingNumber 
}: PassengerDocumentsViewerProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('passenger-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      console.error("Error getting signed URL:", error);
      toast.error("Failed to access document");
      return null;
    }
  };

  const handleView = async (documentUrl: string, index: number) => {
    setLoadingIndex(index);
    
    const signedUrl = await getSignedUrl(documentUrl);
    
    if (signedUrl) {
      const isPdf = documentUrl.toLowerCase().endsWith('.pdf');
      setPreviewType(isPdf ? "pdf" : "image");
      setPreviewUrl(signedUrl);
      setPreviewOpen(true);
    }
    
    setLoadingIndex(null);
  };

  const handleDownload = async (documentUrl: string, passengerName: string, index: number) => {
    setDownloadingIndex(index);
    
    try {
      const signedUrl = await getSignedUrl(documentUrl);
      
      if (signedUrl) {
        const fileExt = documentUrl.split('.').pop() || 'pdf';
        const fileName = `${bookingNumber}-${passengerName.replace(/\s+/g, '-')}.${fileExt}`;
        
        // Fetch and download
        const response = await fetch(signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success("Document downloaded");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const getFileIcon = (documentUrl: string) => {
    const isPdf = documentUrl?.toLowerCase().endsWith('.pdf');
    return isPdf ? FileText : Image;
  };

  const passengersWithDocs = passengers.filter(p => p.documentUrl);
  const passengersWithoutDocs = passengers.filter(p => !p.documentUrl);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Passenger Documents
        </h4>
        <Badge variant="outline" className="text-xs">
          {passengersWithDocs.length} / {passengers.length} uploaded
        </Badge>
      </div>

      {passengersWithDocs.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {passengers.map((passenger, index) => {
            const FileIcon = getFileIcon(passenger.documentUrl || '');
            const hasDoc = !!passenger.documentUrl;
            
            return (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  hasDoc ? 'bg-card' : 'bg-muted/30 border-dashed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasDoc ? 'bg-success/10' : 'bg-muted'
                  }`}>
                    <FileIcon className={`h-5 w-5 ${hasDoc ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {passenger.firstName} {passenger.lastName}
                      {index === 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">Lead</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Passport: {passenger.passportNumber}
                    </p>
                  </div>
                </div>
                
                {hasDoc ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(passenger.documentUrl!, index)}
                      disabled={loadingIndex === index}
                    >
                      {loadingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(
                        passenger.documentUrl!, 
                        `${passenger.firstName}-${passenger.lastName}`,
                        index
                      )}
                      disabled={downloadingIndex === index}
                    >
                      {downloadingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    No document
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Document Preview
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in New Tab
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted/30 rounded-lg overflow-hidden">
            {previewUrl && (
              previewType === "pdf" ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
