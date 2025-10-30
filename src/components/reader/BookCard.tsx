import { useState, useEffect, useCallback } from 'react';
import { useNeonAuth } from '@/hooks/use-neon-auth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_image_url: string | null;
  pdf_url: string;
  price: number;
  category: string | null;
}

interface BookCardProps {
  book: Book;
  onReadClick: () => void;
}

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function BookCard({ book, onReadClick }: BookCardProps) {
  const { user } = useNeonAuth();
  const [isPurchased, setIsPurchased] = useState(false);

  const checkPurchaseStatus = useCallback(async () => {
    if (!user) return;

    try {
      // For now, we'll assume books are free or implement purchase checking later
      // This would need an API endpoint to check purchases
      setIsPurchased(false); // Placeholder
    } catch (error) {
      console.error('Failed to check purchase status:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkPurchaseStatus();
    }
  }, [book.id, user, checkPurchaseStatus]);

  const handleDownload = () => {
    toast.error('Purchase required to download this book');
  };

  return (
    <Card className="shadow-lg hover:shadow-premium transition-all duration-300 flex flex-col h-full">
      <CardHeader className="p-0">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="w-full h-64 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-primary rounded-t-lg flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-white" />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <h3 className="font-bold text-lg line-clamp-2 mb-1">{book.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
        {book.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{book.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {book.category && (
            <Badge variant="secondary" className="text-xs">{book.category}</Badge>
          )}
          {book.price === 0 ? (
            <Badge className="bg-accent text-accent-foreground">Free</Badge>
          ) : (
            <Badge className="bg-primary text-primary-foreground">${book.price.toFixed(2)}</Badge>
          )}
          {isPurchased && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Check className="w-3 h-3 mr-1" />
              Owned
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button onClick={onReadClick} className="flex-1" variant="default">
          <BookOpen className="w-4 h-4 mr-2" />
          Read
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
