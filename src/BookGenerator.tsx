import { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import StoryWizard from './StoryWizard';
import { StoryBook } from './types';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Progress } from './components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { motion } from 'framer-motion';
import { Download, Trash2, Edit, Loader2, Rocket, Search, Library, Plus, BookOpen, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';

export default function BookGenerator() {
  const [showWizard, setShowWizard] = useState(false);
  const [generatedBook, setGeneratedBook] = useState<StoryBook | null>(null);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [books, setBooks] = useState<StoryBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState<{ [key: string]: string }>({});
  const [regeneratingPages, setRegeneratingPages] = useState<Record<number, boolean>>({});

  const calculateProgress = (status: string, bookStatus?: string, pdfStatus?: string) => {
    if (!status) {
      if (pdfStatus === 'IN_PROGRESS') return 92;
      if (bookStatus === 'COMPLETED') return 90;
      if (bookStatus === 'GENERATING') return 25;
      if (bookStatus === 'DRAFTING') return 10;
      if (bookStatus === 'PENDING') return 5;
      return 0;
    }
    const s = status.toLowerCase();

    // Final stages
    if (s.includes('success')) return 100;
    if (s.includes('ready for download')) return 100;

    // Errors
    if (s.includes('error') || s.includes('failed')) return 0;

    // PDF stage
    const pdfMatch = s.match(/adding page (\d+) of (\d+) to pdf/);
    if (pdfMatch) {
      const current = parseInt(pdfMatch[1]);
      const total = parseInt(pdfMatch[2]);
      return 92 + (current / total) * 8;
    }
    if (s.includes('pdf creation') || s.includes('starting pdf') || s.includes('into a pdf') || s.includes('wrapping up')) return 92;
    if (s.includes('story content ready')) return 90;

    // Illustrations
    const illusMatch = s.match(/illustration for page (\d+) of (\d+)/);
    if (illusMatch) {
      const current = parseInt(illusMatch[1]);
      const total = parseInt(illusMatch[2]);
      return 25 + (current / total) * 65;
    }
    if (s.includes('creating magical illustrations') || s.includes('starting magical illustrations')) return 25;

    // Initial stages
    if (s.includes('story draft ready')) return 20;
    if (s.includes('story text generated')) return 15;
    if (s.includes('generating story text') || s.includes('generating story content')) return 8;
    if (s.includes('started')) return 5;

    // Fallbacks
    if (s.includes('connected to status updates')) {
      if (pdfStatus === 'IN_PROGRESS') return 92;
      if (bookStatus === 'COMPLETED') return 90;
      if (bookStatus === 'GENERATING') return 25;
      if (bookStatus === 'DRAFTING') return 10;
      return 2;
    }

    if (s.includes('connecting') || s.includes('updating')) return 2;

    return 5; // Default low progress if status is unknown but truthy
  };

  const generateBook = async (bookData: any) => {
    setGeneratedBook(bookData);
    // Pre-emptively add to live statuses
    setLiveStatuses(prev => ({
      ...prev,
      [String(bookData.id)]: bookData.lastStatus || 'Connecting...'
    }));
    fetchBooks();
  };

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      console.log('Fetching books from backend...');
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetAllStoryBooks {
              getAllStoryBooks {
                id
                title
                status
                pdfStatus
                lastStatus
                illustrationStyle
                createdAt
              }
            }
          `
        })
      });
      const result = await response.json();
      if (result.data) {
        console.log(`Fetched ${result.data.getAllStoryBooks.length} books`);
        setBooks(result.data.getAllStoryBooks);
      } else if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const downloadBook = async (id: string) => {
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation DownloadStoryBookPDF($id: ID!) {
              downloadStoryBookPDF(id: $id)
            }
          `,
          variables: { id }
        })
      });
      const result = await response.json();
      if (result.data) {
        const pdfUrl = result.data.downloadStoryBookPDF;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `storybook-${id}.pdf`;
        link.target = '_self';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading book:', error);
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation DeleteStoryBook($id: ID!) {
              deleteStoryBook(id: $id)
            }
          `,
          variables: { id }
        })
      });
      const result = await response.json();
      if (result.data && result.data.deleteStoryBook) {
        await fetchBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const startReview = async (id: string) => {
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetStoryBook($id: ID!) {
              getStoryBook(id: $id) {
                id
                title
                illustrationStyle
                fontColor
                fontSize
                fontStyle
                textBackground
                lastStatus
                pages {
                  pageNumber
                  text
                  imageUrl
                }
              }
            }
          `,
          variables: { id }
        })
      });
      const result = await response.json();
      if (result.data) {
        const book = result.data.getStoryBook;
        // Sort pages by pageNumber ascending
        const sortedPages = [...(book.pages || [])].sort((a: any, b: any) => a.pageNumber - b.pageNumber);
        
        setEditingBook({
          ...book,
          pages: sortedPages,
          illustrationStyle: book.illustrationStyle || 'storybook watercolor',
          fontColor: book.fontColor || '#000000',
          fontSize: book.fontSize || 18,
          fontStyle: book.fontStyle || 'HELVETICA',
          textBackground: book.textBackground || 'TRANSPARENT',
          lastStatus: book.lastStatus || ''
        });
      }
    } catch (error) {
      console.error('Error fetching book for review:', error);
    }
  };

  const regeneratePageImage = async (pageNumber: number) => {
    if (!editingBook) return;
    setRegeneratingPages(prev => ({ ...prev, [pageNumber]: true }));
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation RegeneratePageImage($id: ID!, $pageNumber: Int!) {
              regeneratePageImage(id: $id, pageNumber: $pageNumber) {
                pageNumber
                imageUrl
                text
              }
            }
          `,
          variables: { id: editingBook.id, pageNumber }
        })
      });
      const result = await response.json();
      if (result.data) {
        const updatedPage = result.data.regeneratePageImage;
        setEditingBook((current: any) => {
          if (!current) return current;
          const pages = current.pages.map((page: any) =>
            page.pageNumber === updatedPage.pageNumber ? { ...page, imageUrl: updatedPage.imageUrl, text: updatedPage.text } : page
          );
          return { ...current, pages };
        });
      }
    } catch (error) {
      console.error('Error regenerating page image:', error);
    } finally {
      setRegeneratingPages(prev => ({ ...prev, [pageNumber]: false }));
    }
  };

  const finalizeBook = async () => {
    if (!editingBook) return;

    try {
      // 1. Update content
      await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation UpdateStoryContent($id: ID!, $pages: [StoryPageInput!]!, $fontColor: String, $fontSize: Int, $fontStyle: String, $textBackground: String, $illustrationStyle: String) {
              updateStoryContent(id: $id, pages: $pages, fontColor: $fontColor, fontSize: $fontSize, fontStyle: $fontStyle, textBackground: $textBackground, illustrationStyle: $illustrationStyle) {
                id
                lastStatus
              }
            }
          `,
          variables: {
            id: editingBook.id,
            pages: editingBook.pages.map((p: any) => ({ pageNumber: p.pageNumber, text: p.text })),
            fontColor: editingBook.fontColor,
            fontSize: editingBook.fontSize,
            fontStyle: editingBook.fontStyle,
            textBackground: editingBook.textBackground,
            illustrationStyle: editingBook.illustrationStyle
          }
        })
      });

      // 2. Finalize
      await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation FinalizeAndGenerateImages($id: ID!) {
              finalizeAndGenerateImages(id: $id) {
                id
                status
              }
            }
          `,
          variables: { id: editingBook.id }
        })
      });

      setEditingBook(null);
      fetchBooks();
    } catch (error) {
      console.error('Error finalizing book:', error);
    }
  };


  useEffect(() => {
    fetchBooks();
    const interval = setInterval(fetchBooks, 10000); // Polling as a fallback
    return () => clearInterval(interval);
  }, [fetchBooks]);

  const activeBookIdsString = useMemo(() => {
    const ids = books
      .filter(b => b.pdfStatus !== 'COMPLETED' && b.status !== 'FAILED')
      .map(b => String(b.id));

    if (generatedBook && !ids.includes(String(generatedBook.id)) && generatedBook.pdfStatus !== 'COMPLETED') {
      ids.push(String(generatedBook.id));
    }

    return ids.join(',');
  }, [books, generatedBook]);

  useEffect(() => {
    const activeBookIds = activeBookIdsString ? activeBookIdsString.split(',') : [];
    if (activeBookIds.length === 0) {
      return;
    }

    const sources: EventSource[] = [];
    activeBookIds.forEach(bookId => {
      // Use a standard local variable to track sources instead of window object
      // to avoid persistence across component unmounts if that was happening
      console.log(`Connecting to status updates for book ${bookId}...`);
      const source = new EventSource(`http://localhost:8080/api/status/${bookId}`);

      source.onopen = () => {
        console.log(`SSE connection opened for book ${bookId}`);
      };

      source.addEventListener('status', (event) => {
        console.log(`Status update for ${bookId}:`, event.data);
        setLiveStatuses(prev => ({
          ...prev,
          [bookId]: event.data
        }));

        if (event.data.includes('Success') || event.data.includes('Error')) {
          source.close();
          fetchBooks();
        }
      });

      source.onerror = (err) => {
        console.error(`SSE Error for book ${bookId}:`, err);
        source.close();
      };

      sources.push(source);
    });

    return () => {
      console.log("Cleaning up EventSources...");
      sources.forEach(s => s.close());
    };
  }, [activeBookIdsString, fetchBooks]);

  if (showWizard) {
    return (
      <StoryWizard
        onComplete={(bookData) => {
          generateBook(bookData);
          setShowWizard(false);
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  if (editingBook) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-cyan-vibrant font-display tracking-tight">
          Review & Edit Story
        </h1>

        <Card className="bg-slate-900/80 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-display">{editingBook.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-slate-800/50 rounded-lg">
              <div>
                <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Font Color</label>
                <Input
                  type="color"
                  value={editingBook.fontColor}
                  onChange={(e) => setEditingBook({ ...editingBook, fontColor: e.target.value })}
                  className="w-full h-10 p-1 bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Font Size</label>
                <Input
                  type="number"
                  value={editingBook.fontSize}
                  onChange={(e) => setEditingBook({ ...editingBook, fontSize: parseInt(e.target.value) || 18 })}
                  className="w-full bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Font Style</label>
                <Select
                  value={editingBook.fontStyle}
                  onValueChange={(value: string) => setEditingBook({ ...editingBook, fontStyle: value })}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="HELVETICA">Helvetica</SelectItem>
                    <SelectItem value="HELVETICA_BOLD">Helvetica Bold</SelectItem>
                    <SelectItem value="TIMES_ROMAN">Times Roman</SelectItem>
                    <SelectItem value="COURIER">Courier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Text Background</label>
                <Select
                  value={editingBook.textBackground}
                  onValueChange={(value: string) => setEditingBook({ ...editingBook, textBackground: value })}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="TRANSPARENT">Transparent</SelectItem>
                    <SelectItem value="WHITE">White Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Illustration Style</label>
                <Select
                  value={editingBook.illustrationStyle}
                  onValueChange={(value: string) => setEditingBook({ ...editingBook, illustrationStyle: value })}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="storybook watercolor">Storybook Watercolor</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="digital flat">Digital Flat</SelectItem>
                    <SelectItem value="paper-cut">Paper-Cut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-6 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">Review status</p>
              <p>{editingBook.lastStatus || 'Your draft has been loaded. Edit text, regenerate page images, then finalize.'}</p>
            </div>

            <div className="grid gap-6">
              {editingBook.pages.map((page: any, index: number) => (
                <div key={index} className="border border-slate-700 p-4 rounded-lg">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="block font-bold text-cyan-vibrant">Page {page.pageNumber}</label>
                    <Button
                      variant="outline"
                      onClick={() => regeneratePageImage(page.pageNumber)}
                      disabled={regeneratingPages[page.pageNumber]}
                      className="text-xs px-3 py-2"
                    >
                      {regeneratingPages[page.pageNumber] ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Regenerating</span>
                      ) : (
                        'Regenerate Image'
                      )}
                    </Button>
                  </div>
                  {page.imageUrl ? (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      <img
                        src={page.imageUrl}
                        alt={`Page ${page.pageNumber} illustration`}
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 text-slate-500">
                      No illustration yet. Generate or regenerate this page.
                    </div>
                  )}
                  <Textarea
                    value={page.text}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                      const newPages = [...editingBook.pages];
                      newPages[index] = { ...page, text: e.target.value };
                      setEditingBook({ ...editingBook, pages: newPages });
                    }}
                    className="w-full min-h-[100px] bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={() => setEditingBook(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={finalizeBook}
                className="flex-2 bg-cyan-vibrant text-slate-950 hover:bg-cyan-vibrant/90"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Generate Pages & Illustrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-cyan-vibrant uppercase tracking-widest font-display">
            AI Storybook Publisher
          </span>
        </div>
        <div className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-vibrant" />
          <input
            type="text"
            placeholder="Search stories..."
            className="bg-transparent border-none focus:ring-0 text-sm w-48"
          />
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="font-display text-2xl font-bold flex items-center gap-3">
                <Plus className="w-6 h-6 text-cyan-vibrant" />
                Create New Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-cyan-vibrant/20 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-cyan-vibrant" />
                </div>
                <p className="text-slate-300">
                  Perfect for bedtime stories, gifts, and preschool learning.
                  Create professionally formatted, illustrated kids storybooks with AI.
                </p>
                <Button
                  onClick={() => setShowWizard(true)}
                  className="w-full bg-cyan-vibrant text-slate-950 hover:bg-cyan-vibrant/90 text-lg py-6 font-bold"
                >
                  <Rocket className="mr-2 h-6 w-6" />
                  Start Creating
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="font-display text-2xl font-bold flex items-center gap-3">
                <Library className="w-6 h-6 text-cyan-vibrant" />
                Story Book Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booksLoading && books.length === 0 ? (
                <p>Loading your library...</p>
              ) : (
                <div className="space-y-6">
                  {/* Active Generations Section */}
                  <div>
                    <h3 className="text-lg font-bold text-cyan-vibrant mb-4 flex items-center gap-2">
                      {books.some(b => (b.status === 'GENERATING' || b.status === 'PENDING' || b.status === 'DRAFTING' || b.status === 'REVIEW_PENDING' || b.pdfStatus === 'IN_PROGRESS' || (b.status === 'COMPLETED' && b.pdfStatus === 'NOT_STARTED')) && b.status !== 'FAILED' && b.pdfStatus !== 'FAILED' && b.pdfStatus !== 'COMPLETED') ? (
                        <><Loader2 className="animate-spin" /> Active Generations</>
                      ) : (
                        "No Active Generation"
                      )}
                    </h3>
                    <div className="space-y-4">
                      {books
                        .filter(b => (b.status === 'GENERATING' || b.status === 'PENDING' || b.status === 'DRAFTING' || b.status === 'REVIEW_PENDING' || b.pdfStatus === 'IN_PROGRESS' || (b.status === 'COMPLETED' && b.pdfStatus === 'NOT_STARTED')) && b.status !== 'FAILED' && b.pdfStatus !== 'FAILED' && b.pdfStatus !== 'COMPLETED')
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((book) => renderBookItem(book))}
                    </div>
                  </div>

                  {/* Completed Books Section */}
                  <div>
                    <h3 className="text-lg font-bold mb-4">✅ Completed Books</h3>
                    {books.filter(b => b.pdfStatus === 'COMPLETED').length === 0 ? (
                      <p className="text-slate-500">No completed books yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {books
                          .filter(b => b.pdfStatus === 'COMPLETED')
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((book) => renderBookItem(book))}
                      </div>
                    )}
                  </div>

                  {/* Failed Books Section */}
                  {books.some(b => b.status === 'FAILED' || b.pdfStatus === 'FAILED') && (
                    <div>
                      <h3 className="text-lg font-bold text-red-500 mb-4">❌ Failed Attempts</h3>
                      <div className="space-y-4">
                        {books
                          .filter(b => b.status === 'FAILED' || b.pdfStatus === 'FAILED')
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((book) => renderBookItem(book))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'GENERATING': return 'secondary';
      case 'REVIEW_PENDING': return 'secondary';
      case 'DRAFTING': return 'secondary';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  }

  function renderBookItem(book: any) {
    const isFailed = book.status === 'FAILED' || book.pdfStatus === 'FAILED' || (book.lastStatus && book.lastStatus.toLowerCase().includes('error'));
    const isCompleted = book.status === 'COMPLETED' && book.pdfStatus === 'COMPLETED';
    const isReviewPending = book.status === 'REVIEW_PENDING';
    const showProgress = !isFailed && !isCompleted && !isReviewPending;
    const progress = calculateProgress(liveStatuses[String(book.id)] || book.lastStatus, book.status, book.pdfStatus);

    return (
      <motion.div
        key={book.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-slate-800/50 rounded-lg p-6 border-l-4",
          isCompleted && "border-green-500",
          isFailed && "border-red-500",
          isReviewPending && "border-cyan-vibrant",
          !isCompleted && !isFailed && !isReviewPending && "border-cyan-vibrant"
        )}
      >
        <div className="flex gap-6">
          {/* Cover Preview */}
          <div className="w-20 h-28 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
            {isCompleted ? (
              <BookOpen className="w-8 h-8 text-green-400" />
            ) : isFailed ? (
              <div className="text-red-400 text-xs text-center">Failed</div>
            ) : (
              <div className="text-cyan-vibrant text-xs text-center">
                {isReviewPending ? 'Review' : 'In Progress'}
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-2 truncate">{book.title}</h3>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant={getStatusVariant(book.status)}>{book.status}</Badge>
              {book.pdfStatus && book.pdfStatus !== 'NOT_STARTED' && (
                <Badge variant={book.pdfStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                  PDF: {book.pdfStatus}
                </Badge>
              )}
              {book.illustrationStyle && (
                <Badge variant="outline">{book.illustrationStyle}</Badge>
              )}
            </div>

            {showProgress && (
              <div className="mb-4">
                <p className="text-xs text-cyan-vibrant mb-2 animate-pulse">
                  {liveStatuses[String(book.id)] || book.lastStatus || 'Connecting...'}
                </p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs font-mono text-right mt-1">{Math.round(progress)}%</p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Created {new Date(book.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {isReviewPending && (
              <Button size="sm" onClick={() => startReview(book.id)} className="bg-cyan-vibrant text-slate-950">
                <Edit className="w-4 h-4 mr-2" /> Review Draft
              </Button>
            )}
            {isCompleted && (
              <Button size="sm" onClick={() => downloadBook(book.id)} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            )}
            {!isCompleted && !isReviewPending && !isFailed && (
              <Button size="sm" variant="outline" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteBook(book.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
}
