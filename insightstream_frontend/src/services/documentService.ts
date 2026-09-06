import { supabase } from '@/lib/supabaseClient';
import type { KnowledgeDocument, DocumentStatus } from '@/lib/types';
import { api } from '@/services/api';

export async function fetchDocuments(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
 console.log('Fetched documents:', data); // Debugging log
  if (error) throw error;

  // Map database columns to standard properties your components expect
  return (data ?? []).map((doc) => ({
    ...doc,
    title: doc.title || doc.filename,           // Fallback to filename if title is missing
    file_size: doc.file_size || doc.file_size_bytes, // Map byte size field
    status: doc.status === 'completed' ? 'processed' : doc.status, // Normalize status
  }));
}

export async function insertDocument(
  doc: Omit<KnowledgeDocument, 'id' | 'user_id' | 'created_at'>
): Promise<KnowledgeDocument> {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();

  if (error) throw error;
  return data as KnowledgeDocument;
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  patch?: Partial<KnowledgeDocument>
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ status, ...patch })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

async function getPresignedUploadUrl(fileName: string, contentType: string, fileSize: number) {
  try {
    const response = await api.post<{ url: string; document_id: string; file_path: string }>(
      '/get-upload-url',
      { 
        fileName, 
        contentType, 
        fileSize 
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get presigned URL: ${error}`);
  }
}

// 2. Upload file to S3 and notify processing worker
export async function uploadAndProcessFile(
  file: File,
  userId: string,
  onStageChange: (stage: 'uploading' | 'processing' | 'done') => void
) {
  // Step A: Get presigned URL & document ID
  onStageChange('uploading');
  const { url, document_id, file_path } = await getPresignedUploadUrl(
    file.name,
    file.type,
    file.size
  );

  // Step B: Upload binary directly to S3 via PUT
  const uploadResponse = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
  const errorText = await uploadResponse.text();

  console.error('S3 upload failed:', {
    status: uploadResponse.status,
    statusText: uploadResponse.statusText,
    response: errorText,
  });

  throw new Error(
    `S3 upload failed: ${uploadResponse.status} ${errorText}`
  ); 
  }

  // Step C: Trigger post-processing parser
  onStageChange('processing');
  // const processResponse = await api.post('/done-upload', {
  //   document_id: document_id,
  //   file_path: file_path,
  // });

  // if (processResponse.status !== 200) {
  //   throw new Error('Document processing pipeline failed');
  // }

  // onStageChange('done');
  return { id: document_id, file_path };
}