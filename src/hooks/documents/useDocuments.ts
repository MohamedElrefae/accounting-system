import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '../../services/documents';

export function useDocuments(params?: Parameters<typeof svc.getDocuments>[0]) {
  return useQuery({
    queryKey: ['documents', params ?? 'disabled'],
    queryFn: () => svc.getDocuments(params as any),
    enabled: !!params && !!(params as any).orgId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.uploadDocument,
    onSuccess: (_res) => {
      // Only refetch mounted queries; do not create inactive cache entries
      qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
    },
  });
}

export function useDocument(documentId?: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => svc.getDocumentById(documentId as string),
    enabled: !!documentId,
  });
}

export function useDocumentVersions(documentId?: string) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => svc.getDocumentVersions(documentId as string),
    enabled: !!documentId,
  });
}

export function useDocumentApproval() {
  const qc = useQueryClient();
  return {
    submit: useMutation({
      mutationFn: svc.submitForApproval,
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ['document', data.id] });
        // Only refetch mounted document lists
        qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
      },
    }),
    approve: useMutation({
      mutationFn: svc.approveDocument,
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ['document', data.id] });
        qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
      },
    }),
    reject: useMutation({
      mutationFn: svc.rejectDocument,
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ['document', data.id] });
        qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
      },
    }),
  };
}