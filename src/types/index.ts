export interface StoryBook {
  id: string;
  title: string;
  status: BookStatus;
  pdfStatus: PdfStatus;
  lastStatus: string;
  createdAt: string;
}

export type BookStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type PdfStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';