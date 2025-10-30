import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg shadow-xl overflow-hidden h-[calc(100vh-180px)]">
          <iframe
            src={`${book.pdf_url}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full"
            title={book.title}
          />
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> PDF downloads are restricted. You can read this book online or purchase it to download.
          </p>
        </div>
      </main>
    </div>
  );
}
