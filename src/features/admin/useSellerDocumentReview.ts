import { useState } from 'react';
import { adminApi } from '../../services/domains/adminApi';

type Toast = (message: string, type: 'success' | 'error') => void;

/**
 * Owns the seller-document review lifecycle, including loading, scanning,
 * review decisions, correction reasons and safe browser opening of downloads.
 */
export const useSellerDocumentReview = (showToast: Toast) => {
  const [documentSellerId, setDocumentSellerId] = useState('');
  const [sellerDocuments, setSellerDocuments] = useState<any[]>([]);
  const [sellerDocumentsLoading, setSellerDocumentsLoading] = useState(false);
  const [sellerDocumentAction, setSellerDocumentAction] = useState<string | null>(null);
  const [sellerDocumentError, setSellerDocumentError] = useState<string | null>(null);
  const [documentRejectionReasons, setDocumentRejectionReasons] = useState<Record<string, string>>({});

  const loadSellerDocuments = async (sellerId: string) => {
    setDocumentSellerId(sellerId);
    setSellerDocumentsLoading(true);
    setSellerDocumentError(null);
    try {
      setSellerDocuments(await adminApi.getSellerDocuments(sellerId));
    } catch (error: any) {
      setSellerDocumentError(error?.message || 'Unable to load seller documents.');
    } finally {
      setSellerDocumentsLoading(false);
    }
  };

  const openSellerDocument = async (documentId: string) => {
    if (!documentSellerId) return;
    setSellerDocumentAction(documentId);
    setSellerDocumentError(null);
    try {
      const blob = await adminApi.getSellerDocument(documentSellerId, documentId);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'seller-document';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      setSellerDocumentError(error?.message || 'Unable to open document.');
    } finally {
      setSellerDocumentAction(null);
    }
  };

  const scanSellerDocument = async (documentId: string) => {
    if (!documentSellerId) return;
    setSellerDocumentAction(documentId);
    setSellerDocumentError(null);
    try {
      const result = await adminApi.scanSellerDocument(documentSellerId, documentId);
      await loadSellerDocuments(documentSellerId);
      showToast(
        result.scanStatus === 'CLEAN' ? 'Document passed malware scanning.' : 'Document remains quarantined.',
        result.scanStatus === 'CLEAN' ? 'success' : 'error',
      );
    } catch (error: any) {
      setSellerDocumentError(error?.message || 'Unable to scan document.');
    } finally {
      setSellerDocumentAction(null);
    }
  };

  const reviewSellerDocument = async (documentId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (!documentSellerId) return;
    const reason = (documentRejectionReasons[documentId] || '').trim();
    if (status === 'REJECTED' && !reason) {
      setSellerDocumentError('Enter a correction reason before rejecting a document.');
      return;
    }
    setSellerDocumentAction(documentId);
    setSellerDocumentError(null);
    try {
      await adminApi.verifySellerDocument(documentSellerId, documentId, status, reason || undefined);
      await loadSellerDocuments(documentSellerId);
      showToast(
        status === 'VERIFIED' ? 'Document marked verified.' : 'Document rejected with correction reason.',
        'success',
      );
    } catch (error: any) {
      setSellerDocumentError(error?.message || 'Unable to update document review.');
    } finally {
      setSellerDocumentAction(null);
    }
  };

  return {
    documentSellerId,
    sellerDocuments,
    sellerDocumentsLoading,
    sellerDocumentAction,
    sellerDocumentError,
    documentRejectionReasons,
    setDocumentRejectionReasons,
    loadSellerDocuments,
    openSellerDocument,
    scanSellerDocument,
    reviewSellerDocument,
  };
};
