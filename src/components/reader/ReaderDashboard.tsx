import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Library, Search, BookOpen } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BookCard from './BookCard';
import PDFViewer from './PDFViewer';

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

export default function ReaderDashboard() {
  const { signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    fetchBooks();
    
    // Handle payment status
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! You can now download the book.');
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled.');
    }
  }, [searchParams]);

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBooks(data);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.category && book.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (selectedBook) {
    return <PDFViewer book={selectedBook} onClose={() => setSelectedBook(null)} />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="gradient-primary shadow-premium sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Digital Library</h1>
                <p className="text-sm text-white/80">Explore & Read</p>
              </div>
            </div>
            <Button onClick={signOut} variant="secondary" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="gradient-hero py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Discover Your Next Read</h2>
            <p className="text-white/80 mb-6">Search from our extensive collection of e-books</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search books by title, author, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Books Grid */}
      <main className="container mx-auto px-4 py-8">
        {filteredBooks.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} onReadClick={() => setSelectedBook(book)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'The library is currently empty'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
