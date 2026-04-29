import { BookStatus, PdfStatus } from '../types';

export const calculateProgress = (status: string, bookStatus?: BookStatus, pdfStatus?: PdfStatus): number => {
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

export const getStatusVariant = (status: BookStatus) => {
  switch(status) {
    case 'COMPLETED': return 'success';
    case 'GENERATING': return 'warning';
    case 'FAILED': return 'destructive';
    default: return 'secondary';
  }
};