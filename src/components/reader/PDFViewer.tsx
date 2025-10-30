import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Book {
  id: string;
  title: string;
  author: string;
  pdf_url: string;
}

interface PDFViewerProps {
  book: Book;
  onClose: () => void;
}

export default function PDFViewer({ book, onClose }: PDFViewerProps) {
  const [showPaymentMessage, setShowPaymentMessage] = useState(false);

  const handleDownloadClick = () => {
    setShowPaymentMessage(true);
    toast.error('Purchase required to download this book');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={onClose} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg line-clamp-1">{book.title}</h1>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </div>
            <Button onClick={handleDownloadClick} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg shadow-xl overflow-hidden h-[calc(100vh-180px)]">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(book.pdf_url)}&embedded=true&chrome=false&rm=minimal`}
            className="w-full h-full"
            title={book.title}
          />
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> You can read this book online. To download the PDF, you need to purchase it.
          </p>
          {showPaymentMessage && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive text-center">
                <strong>Payment Required:</strong> You must purchase this book to download the PDF file.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
