import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { z } from 'zod';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

const bookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  author: z.string().trim().min(1, 'Author is required').max(100, 'Author must be less than 100 characters'),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional(),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().trim().max(50, 'Category must be less than 50 characters').optional(),
});

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_image_url: string | null;
  pdf_url: string;
  price: number;
  category: string | null;
  published_date: string | null;
}

export default function BookManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      setBooksLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/books`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      } else {
        throw new Error('Failed to fetch books');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load books');
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      author: formData.get('author') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
    };

    try {
      bookSchema.parse(data);

      let coverUrl = editingBook?.cover_image_url || null;
      let pdfUrl = editingBook?.pdf_url || '';

      // Upload cover image if provided
      if (coverFile) {
        try {
          const formData = new FormData();
          formData.append('file', coverFile);

          const response = await fetch(`${API_BASE_URL}/api/upload/cover`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload cover image');
          }

          const result = await response.json();
          coverUrl = result.url;
        } catch (error) {
          throw new Error('Failed to upload cover image');
        }
      }

      // Upload PDF if provided
      if (pdfFile) {
        try {
          const formData = new FormData();
          formData.append('file', pdfFile);

          const response = await fetch(`${API_BASE_URL}/api/upload/pdf`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload PDF');
          }

          const result = await response.json();
          pdfUrl = result.url;
        } catch (error) {
          throw new Error('Failed to upload PDF');
        }
      }

      if (!pdfUrl && !editingBook) {
        toast.error('PDF file is required');
        setIsLoading(false);
        return;
      }

      const bookData = {
        ...data,
        cover_image_url: coverUrl,
        pdf_url: pdfUrl,
      };

      if (editingBook) {
        const response = await fetch(`${API_BASE_URL}/api/books/${editingBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: data.title,
            author: data.author,
            description: data.description,
            price: data.price,
            category: data.category,
            coverImageUrl: coverUrl,
            pdfUrl: pdfUrl,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update book');
        }

        toast.success('Book updated successfully');
      } else {
        const response = await fetch(`${API_BASE_URL}/api/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: data.title,
            author: data.author,
            description: data.description,
            price: data.price,
            category: data.category,
            coverImageUrl: coverUrl,
            pdfUrl: pdfUrl,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create book');
        }

        toast.success('Book added successfully');
      }

      setIsDialogOpen(false);
      setEditingBook(null);
      setCoverFile(null);
      setPdfFile(null);
      fetchBooks(); // Refresh the book list
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to save book');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      toast.success('Book deleted successfully');
      fetchBooks(); // Refresh the book list
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Books Library</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBooks} disabled={booksLoading}>
            <Upload className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBook(null); setCoverFile(null); setPdfFile(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingBook?.title}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  name="author"
                  defaultValue={editingBook?.author}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingBook?.description || ''}
                  rows={4}
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingBook?.price ? Number(editingBook.price) : 0}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editingBook?.category || ''}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Cover Image</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdf">PDF File {!editingBook && <span className="text-destructive">*</span>}</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  disabled={isLoading}
                  required={!editingBook}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingBook ? 'Update' : 'Add Book'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {booksLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(books || []).map((book) => (
          <Card key={book.id} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              {book.cover_image_url && (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <CardTitle className="line-clamp-2">{book.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{book.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-accent">${Number(book.price).toFixed(2)}</span>
                {book.category && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">{book.category}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setEditingBook(book); setIsDialogOpen(true); }}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(book.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(books || []).length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books yet</h3>
            <p className="text-muted-foreground">Start by adding your first book to the library</p>
          </div>
        </Card>
      )}
    </div>
  );
}
