package com.kuraliupdates.bazaar.controller;
import com.kuraliupdates.bazaar.entity.*;
import com.kuraliupdates.bazaar.repository.*;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
@RestController @RequiredArgsConstructor
public class SellerDocumentController {
 private static final long MAX_BYTES=5L*1024*1024;
 private static final Set<String> TYPES=Set.of("GST_CERTIFICATE","FSSAI_CERTIFICATE","SHOP_FRONT_PHOTO","SHOP_INTERIOR_PHOTO","TRADE_LICENSE","UDYAM_CERTIFICATE");
 private static final Set<String> MIMES=Set.of("application/pdf","image/jpeg","image/png");
 private final AuthService authService; private final SellerRepository sellerRepository; private final SellerDocumentRepository docs;
 @PostMapping(value="/sellers/me/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public ResponseEntity<Map<String,Object>> upload(@RequestHeader(value="Authorization",required=false) String auth,@RequestParam String documentType,@RequestParam MultipartFile file)throws IOException{
  UserEntity user=authService.requireUser(bearer(auth));
  SellerEntity seller=sellerRepository.findByUserId(user.getUserId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Seller profile required"));
  String type=documentType.trim().toUpperCase(Locale.ROOT),mime=Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
  if(!TYPES.contains(type))throw new ApiException(HttpStatus.BAD_REQUEST,"Unsupported document type");
  if(file.isEmpty()||file.getSize()>MAX_BYTES)throw new ApiException(HttpStatus.BAD_REQUEST,"File must be between 1 byte and 5 MB");
  if(!MIMES.contains(mime))throw new ApiException(HttpStatus.BAD_REQUEST,"Only PDF, JPEG and PNG files are accepted");
  byte[] b=file.getBytes(); if(!signature(mime,b))throw new ApiException(HttpStatus.BAD_REQUEST,"File signature does not match its content type");
  String name=Optional.ofNullable(file.getOriginalFilename()).orElse("document").replaceAll("[^A-Za-z0-9._-]","_");
  SellerDocumentEntity d=docs.save(SellerDocumentEntity.builder().documentId("sdoc-"+UUID.randomUUID()).sellerId(seller.getSellerId()).documentType(type).fileName(name).contentType(mime).fileSize((long)b.length).documentData(b).verificationStatus("PENDING").uploadedAt(LocalDateTime.now()).build());
  return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success",true,"documentId",d.getDocumentId(),"verificationStatus","PENDING"));
 }
 @GetMapping("/sellers/me/documents")
 public List<Map<String,Object>> mine(@RequestHeader(value="Authorization",required=false)String auth){UserEntity u=authService.requireUser(bearer(auth));SellerEntity s=sellerRepository.findByUserId(u.getUserId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Seller profile required"));return metadata(s.getSellerId());}
 @GetMapping("/admin/sellers/{sellerId}/documents") public List<Map<String,Object>> adminList(@PathVariable String sellerId,Authentication a){admin(a);return metadata(sellerId);}
 @GetMapping("/admin/sellers/{sellerId}/documents/{documentId}") public ResponseEntity<byte[]> download(@PathVariable String sellerId,@PathVariable String documentId,Authentication a){admin(a);SellerDocumentEntity d=docs.findByDocumentIdAndSellerId(documentId,sellerId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Document not found"));return ResponseEntity.ok().contentType(MediaType.parseMediaType(d.getContentType())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(d.getFileName()).build().toString()).header(HttpHeaders.CACHE_CONTROL,"no-store, private").body(d.getDocumentData());}
 @PostMapping("/admin/sellers/{sellerId}/documents/{documentId}/verification") public Map<String,Object> verify(@PathVariable String sellerId,@PathVariable String documentId,@RequestParam String status,@RequestParam(required=false)String reason,Authentication a){admin(a);String st=status.toUpperCase(Locale.ROOT);if(!Set.of("VERIFIED","REJECTED").contains(st))throw new ApiException(HttpStatus.BAD_REQUEST,"Status must be VERIFIED or REJECTED");SellerDocumentEntity d=docs.findByDocumentIdAndSellerId(documentId,sellerId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Document not found"));d.setVerificationStatus(st);d.setVerifiedBy(a.getName());d.setVerifiedAt(LocalDateTime.now());d.setRejectionReason("REJECTED".equals(st)?Optional.ofNullable(reason).orElse("Not specified"):null);docs.save(d);return Map.of("success",true,"verificationStatus",st);}
 private List<Map<String,Object>> metadata(String seller){return docs.findBySellerIdOrderByUploadedAtDesc(seller).stream().map(d->{Map<String,Object>m=new LinkedHashMap<>();m.put("documentId",d.getDocumentId());m.put("documentType",d.getDocumentType());m.put("fileName",d.getFileName());m.put("contentType",d.getContentType());m.put("fileSize",d.getFileSize());m.put("verificationStatus",d.getVerificationStatus());m.put("uploadedAt",d.getUploadedAt());m.put("verifiedAt",d.getVerifiedAt());m.put("rejectionReason",d.getRejectionReason());return m;}).toList();}
 private void admin(Authentication a){if(a==null||a.getAuthorities().stream().noneMatch(x->"ROLE_ADMIN".equals(x.getAuthority())))throw new ApiException(HttpStatus.FORBIDDEN,"Administrator access required");}
 private String bearer(String h){return h!=null&&h.startsWith("Bearer ")?h.substring(7).trim():null;}
 private boolean signature(String m,byte[]b){if(b.length<4)return false;if("application/pdf".equals(m))return b[0]=='%'&&b[1]=='P'&&b[2]=='D'&&b[3]=='F';if("image/png".equals(m))return b.length>=8&&(b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71;return (b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255;}
}
