import api from '../services/api/api';

export type BookRow = {
  _id: string;
  title: string;
  board: string;
  class: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  chunkCount?: number;
  processingStatus?: string;
  embeddingsCreated?: boolean;
  contentId?: string;
  extractedTextLength?: number;
  chapters?: Array<{ title?: string; topic?: string }>;
};

export type ImportableContentRow = {
  contentId: string;
  title: string;
  type: string;
  board: string;
  classNumber: string;
  subjectName: string;
  topic?: string;
  imported: boolean;
  bookId?: string | null;
  bookStatus?: string | null;
  bookChunkCount?: number;
};

export async function fetchBookKnowledgeBooks() {
  const res = await api.get<{ success: boolean; data?: BookRow[]; message?: string }>(
    '/api/book-knowledge/books',
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load books');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

export async function fetchImportableContent() {
  const res = await api.get<{ success: boolean; data?: ImportableContentRow[]; message?: string }>(
    '/api/book-knowledge/importable-content',
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load importable content');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

export async function importBookFromContent(contentId: string) {
  const res = await api.post<{ success: boolean; message?: string; data?: BookRow }>(
    '/api/book-knowledge/books/import-from-content',
    { contentId },
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Import failed');
  return res.data;
}

export async function importBooksFromContentBulk(contentIds: string[]) {
  const res = await api.post<{
    success: boolean;
    message?: string;
    summary?: { imported?: number; skipped?: number; failed?: number };
  }>('/api/book-knowledge/books/import-from-content/bulk', { contentIds });
  if (!res.data?.success) throw new Error(res.data?.message || 'Bulk import failed');
  return res.data;
}

export async function uploadBookKnowledgePdf(formData: FormData) {
  const res = await api.post<{ success: boolean; message?: string; data?: BookRow }>(
    '/api/book-knowledge/books/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Upload failed');
  return res.data;
}

export async function reindexBookKnowledgeBook(id: string) {
  const res = await api.post<{ success: boolean; message?: string }>(
    `/api/book-knowledge/books/${id}/reindex`,
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Reindex failed');
  return res.data;
}

export async function deleteBookKnowledgeBook(id: string) {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/book-knowledge/books/${id}`,
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
  return res.data;
}
