import { useState } from 'react';
import { useNeonAuth } from '@/hooks/use-neon-auth';
import { Button } from '@/components/ui/button';
import { LogOut, BookPlus, Library } from 'lucide-react';
import BookManagement from './BookManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  const { signOut, user } = useNeonAuth();

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
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-sm text-white/80">Library Management System</p>
              </div>
            </div>
            <Button onClick={signOut} variant="secondary" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="books" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-1 mb-8">
            <TabsTrigger value="books">
              <BookPlus className="w-4 h-4 mr-2" />
              Book Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            <BookManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
