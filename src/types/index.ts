export interface StoryPage {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

export interface StoryBook {
  id: string;
  title: string;
  status: BookStatus;
  pdfStatus: PdfStatus;
  lastStatus: string;
  createdAt: string;
  illustrationStyle?: string;
}

export type BookStatus = 'PENDING' | 'GENERATING' | 'DRAFTING' | 'REVIEW_PENDING' | 'COMPLETED' | 'FAILED';
export type PdfStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';