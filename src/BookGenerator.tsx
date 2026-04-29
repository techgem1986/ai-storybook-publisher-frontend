import { useState, useEffect, useCallback, useMemo } from 'react';
import { LinearProgress, Box, Typography } from '@mui/material';

export default function BookGenerator() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedBook, setGeneratedBook] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState<{[key: string]: string}>({});

  const calculateProgress = (status: string, bookStatus?: string, pdfStatus?: string) => {
    if (!status) {
      if (pdfStatus === 'IN_PROGRESS') return 92;
      if (bookStatus === 'COMPLETED') return 90;
      if (bookStatus === 'GENERATING') return 15;
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
    if (s.includes('adding page 5') && s.includes('to pdf')) return 98;
    if (s.includes('adding page 4') && s.includes('to pdf')) return 97;
    if (s.includes('adding page 3') && s.includes('to pdf')) return 96;
    if (s.includes('adding page 2') && s.includes('to pdf')) return 95;
    if (s.includes('adding page 1') && s.includes('to pdf')) return 94;
    if (s.includes('pdf creation') || s.includes('starting pdf') || s.includes('into a pdf') || s.includes('wrapping up')) return 92;
    if (s.includes('story content ready')) return 90;
    
    // Illustrations
    if (s.includes('illustration for page 5')) return 85;
    if (s.includes('illustration for page 4')) return 70;
    if (s.includes('illustration for page 3')) return 55;
    if (s.includes('illustration for page 2')) return 40;
    if (s.includes('illustration for page 1')) return 25;
    if (s.includes('creating magical illustrations')) return 20;
    
    // Initial stages
    if (s.includes('story text generated')) return 15;
    if (s.includes('generating story content')) return 8;
    if (s.includes('started')) return 5;
    
    // Fallbacks
    if (s.includes('connected to status updates')) {
      if (pdfStatus === 'IN_PROGRESS') return 92;
      if (bookStatus === 'COMPLETED') return 90;
      if (bookStatus === 'GENERATING') return 15;
      return 2;
    }
    
    if (s.includes('connecting') || s.includes('updating')) return 2;
    
    return 5; // Default low progress if status is unknown but truthy
  };

  const generateBook = async () => {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation GenerateStoryBook($title: String!) {
              generateStoryBook(title: $title) {
                id
                title
                status
                pdfStatus
                lastStatus
                createdAt
              }
            }
          `,
          variables: { title: title.trim() }
        })
      });

      const result = await response.json();
      if (result.data) {
        const newBook = result.data.generateStoryBook;
        setGeneratedBook(newBook);
        // Pre-emptively add to live statuses
        setLiveStatuses(prev => ({
          ...prev,
          [String(newBook.id)]: newBook.lastStatus || 'Connecting...'
        }));
        fetchBooks(); 
      }
    } catch (error) {
      console.error('Error generating book:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return '#166534';
      case 'GENERATING': return '#92400e';
      case 'FAILED': return '#991b1b';
      default: return '#4b5563';
    }
  };

  const getStatusBackground = (status: string) => {
    switch(status) {
      case 'COMPLETED': return '#dcfce7';
      case 'GENERATING': return '#fef3c7';
      case 'FAILED': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ color: '#6366f1', textAlign: 'center', marginBottom: '30px' }}>
        📚 AI Kid Story Book Generator
      </h1>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
          Enter Story Title
        </label>
        
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Little Magic Dragon"
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            fontSize: '16px',
            marginBottom: '20px',
            boxSizing: 'border-box'
          }}
          onKeyPress={(e) => e.key === 'Enter' && generateBook()}
        />

        <button
          onClick={generateBook}
          disabled={loading || !title.trim()}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: loading ? '#9ca3af' : '#6366f1',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {loading ? (
            <span>✨ Generating Your Book...</span>
          ) : (
            <span>🚀 Generate Story Book</span>
          )}
        </button>

        {generatedBook && 
          generatedBook.status !== 'FAILED' && 
          generatedBook.pdfStatus !== 'FAILED' && 
          (generatedBook.pdfStatus !== 'COMPLETED') && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#166534' }}>
              ✅ Book Generation Started!
            </p>
            <p style={{ margin: '0 0 4px 0', color: '#166534' }}>
              Book ID: #{generatedBook.id}
            </p>
            <p style={{ margin: '0', color: '#166534' }}>
              Status: <b>{generatedBook.status}</b>
            </p>
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#065f46' }}>
                {liveStatuses[String(generatedBook.id)] || generatedBook.lastStatus || 'Connecting to live updates...'}
              </p>
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculateProgress(liveStatuses[String(generatedBook.id)] || generatedBook.lastStatus, generatedBook.status, generatedBook.pdfStatus)} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: '#d1fae5',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: '#10b981',
                      }
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" sx={{ color: "#065f46", fontWeight: "bold" }}>
                    {`${Math.round(calculateProgress(liveStatuses[String(generatedBook.id)] || generatedBook.lastStatus, generatedBook.status, generatedBook.pdfStatus))}%`}
                  </Typography>
                </Box>
              </Box>
            </div>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px', fontSize: '14px' }}>
        Generates 5 illustrated pages for children 5-8 years old
      </p>

      {/* Generated Books List Section */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#374151', marginBottom: '20px', textAlign: 'center' }}>
          📚 Story Book Library
        </h2>

        {booksLoading && books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading your library...
          </div>
        ) : (
          <>
            {/* Active Generations Section */}
            {books.some(b => (b.status === 'GENERATING' || b.status === 'PENDING' || b.pdfStatus === 'IN_PROGRESS' || (b.status === 'COMPLETED' && b.pdfStatus === 'NOT_STARTED')) && b.status !== 'FAILED' && b.pdfStatus !== 'FAILED' && b.pdfStatus !== 'COMPLETED') && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '16px', color: '#6366f1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="animate-spin">⚙️</span> Active Generations
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {books
                    .filter(b => (b.status === 'GENERATING' || b.status === 'PENDING' || b.pdfStatus === 'IN_PROGRESS' || (b.status === 'COMPLETED' && b.pdfStatus === 'NOT_STARTED')) && b.status !== 'FAILED' && b.pdfStatus !== 'FAILED' && b.pdfStatus !== 'COMPLETED')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((book) => renderBookItem(book))}
                </div>
              </div>
            )}

            {/* Completed Books Section */}
            <div>
              <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '12px' }}>
                ✅ Completed Books
              </h3>
              {books.filter(b => b.pdfStatus === 'COMPLETED').length === 0 ? (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '30px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  border: '1px dashed #e5e7eb'
                }}>
                  No completed books yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {books
                    .filter(b => b.pdfStatus === 'COMPLETED')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((book) => renderBookItem(book))}
                </div>
              )}
            </div>

            {/* Failed Books Section */}
            {books.some(b => b.status === 'FAILED' || b.pdfStatus === 'FAILED') && (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '16px', color: '#dc2626', marginBottom: '12px' }}>
                  ❌ Failed Attempts
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {books
                    .filter(b => b.status === 'FAILED' || b.pdfStatus === 'FAILED')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((book) => renderBookItem(book))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function renderBookItem(book: any) {
    const isFailed = book.status === 'FAILED' || book.pdfStatus === 'FAILED' || (book.lastStatus && book.lastStatus.toLowerCase().includes('error'));
    const isCompleted = book.status === 'COMPLETED' && book.pdfStatus === 'COMPLETED';
    const showProgress = !isFailed && !isCompleted;

    return (
      <div key={book.id} style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        borderLeft: isCompleted ? '4px solid #10b981' : (isFailed ? '4px solid #ef4444' : '4px solid #6366f1')
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>{book.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: getStatusBackground(book.status),
              color: getStatusColor(book.status)
            }}>
              {book.status}
            </span>
            {book.status === 'COMPLETED' && book.pdfStatus === 'NOT_STARTED' && (
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                PDF Queued...
              </span>
            )}
            {book.pdfStatus === 'IN_PROGRESS' && (
              <span style={{ fontSize: '12px', color: '#d97706' }}>
                Generating PDF...
              </span>
            )}
            {book.pdfStatus === 'FAILED' && (
              <span style={{ fontSize: '12px', color: '#dc2626' }}>
                PDF Failed
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              ID: #{book.id}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {new Date(book.createdAt).toLocaleString()}
            </span>
          </div>
          {/* Only show progress if the book is actually in an active/processing state */}
          {showProgress && (
            <div style={{ marginTop: '12px', width: '100%' }}>
              <div style={{ 
                marginBottom: '8px', 
                fontSize: '13px', 
                color: '#6366f1', 
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="animate-pulse">✨</span> {liveStatuses[String(book.id)] || book.lastStatus || 'Connecting to live status...'}
              </div>
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculateProgress(liveStatuses[String(book.id)] || book.lastStatus, book.status, book.pdfStatus)} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: '#6366f1',
                      }
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${Math.round(calculateProgress(liveStatuses[String(book.id)] || book.lastStatus, book.status, book.pdfStatus))}%`}
                  </Typography>
                </Box>
              </Box>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => downloadBook(book.id)}
            disabled={book.pdfStatus !== 'COMPLETED'}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: book.pdfStatus === 'COMPLETED' ? '#059669' : '#e5e7eb',
              color: book.pdfStatus === 'COMPLETED' ? 'white' : '#9ca3af',
              cursor: book.pdfStatus === 'COMPLETED' ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            ⬇️ Download
          </button>
          <button
            onClick={() => deleteBook(book.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  }
}