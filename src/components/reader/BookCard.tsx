import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';

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

export default function BookCard({ book, onReadClick }: BookCardProps) {
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkPurchaseStatus();
  }, [book.id]);

  const checkPurchaseStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book.id)
      .maybeSingle();

    setIsPurchased(!!data);
  };

  const handleDownload = async () => {
    if (book.price === 0) {
      // Free book - direct download
      window.open(book.pdf_url, '_blank');
      return;
    }

    if (!isPurchased) {
      toast.error('Please purchase this book first');
      return;
    }

    // Purchased book - allow download
    window.open(book.pdf_url, '_blank');
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase');
        return;
      }

      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          bookId: book.id,
          bookTitle: book.title,
          price: book.price,
          userId: user.id,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout page
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase');
    } finally {
      setIsLoading(false);
    }
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
        {book.price === 0 || isPurchased ? (
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        ) : (
          <Button onClick={handlePurchase} variant="default" className="flex-1" disabled={isLoading}>
            {isLoading ? 'Processing...' : `Buy $${book.price.toFixed(2)}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
