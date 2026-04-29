import { BookStatus, StoryBook } from '../types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { calculateProgress, getStatusVariant } from '../utils/status';

interface StoryBookCardProps {
  book: StoryBook;
  liveStatus: string | undefined;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export const StoryBookCard = ({ book, liveStatus, onDownload, onDelete }: StoryBookCardProps) => {
  const isFailed = book.status === 'FAILED' || book.pdfStatus === 'FAILED' || (liveStatus && liveStatus.toLowerCase().includes('error'));
  const isCompleted = book.status === 'COMPLETED' && book.pdfStatus === 'COMPLETED';
  const showProgress = !isFailed && !isCompleted;
  const progressValue = calculateProgress(liveStatus || book.lastStatus, book.status, book.pdfStatus);

  return (
    <Card className={`border-l-4 ${isCompleted ? 'border-l-green-500' : isFailed ? 'border-l-red-500' : 'border-l-blue-500'}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{book.title}</h3>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Badge variant={getStatusVariant(book.status)}>
                {book.status}
              </Badge>
              
              {book.status === 'COMPLETED' && book.pdfStatus === 'NOT_STARTED' && (
                <span className="text-sm text-gray-500">PDF Queued...</span>
              )}
              
              {book.pdfStatus === 'IN_PROGRESS' && (
                <span className="text-sm text-amber-600">Generating PDF...</span>
              )}
              
              {book.pdfStatus === 'FAILED' && (
                <span className="text-sm text-red-600">PDF Failed</span>
              )}
              
              <span className="text-sm text-gray-500">ID: #{book.id}</span>
              <span className="text-sm text-gray-500">{new Date(book.createdAt).toLocaleString()}</span>
            </div>

            {showProgress && (
              <div className="mt-3">
                <div className="mb-2 text-sm text-blue-600 italic flex items-center gap-2">
                  <span className="animate-pulse">✨</span> {liveStatus || book.lastStatus || 'Connecting to live status...'}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={progressValue} className="h-2" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 min-w-[40px]">{Math.round(progressValue)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onDownload(book.id)}
              disabled={book.pdfStatus !== 'COMPLETED'}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              ⬇️ Download
            </Button>
            <Button
              onClick={() => onDelete(book.id)}
              variant="destructive"
              size="sm"
            >
              🗑️ Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};