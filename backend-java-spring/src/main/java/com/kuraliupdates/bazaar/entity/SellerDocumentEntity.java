package com.kuraliupdates.bazaar.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="SELLER_DOCUMENTS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerDocumentEntity {
 @Id @Column(name="DOCUMENT_ID",length=64) private String documentId;
 @Column(name="SELLER_ID",nullable=false,length=64) private String sellerId;
 @Column(name="DOCUMENT_TYPE",nullable=false,length=40) private String documentType;
 @Column(name="FILE_NAME",nullable=false,length=255) private String fileName;
 @Column(name="CONTENT_TYPE",nullable=false,length=100) private String contentType;
 @Column(name="FILE_SIZE",nullable=false) private Long fileSize;
 @Lob @Basic(fetch=FetchType.LAZY) @Column(name="DOCUMENT_DATA",nullable=false) private byte[] documentData;
 @Column(name="VERIFICATION_STATUS",nullable=false,length=20) @Builder.Default private String verificationStatus="PENDING";
 @Column(name="VERIFIED_BY",length=64) private String verifiedBy;
 @Column(name="VERIFIED_AT") private LocalDateTime verifiedAt;
 @Column(name="REJECTION_REASON",length=1000) private String rejectionReason;
 @Column(name="UPLOADED_AT",nullable=false) private LocalDateTime uploadedAt;
}
