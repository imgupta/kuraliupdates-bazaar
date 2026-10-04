package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.AuthOtpRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import com.kuraliupdates.bazaar.service.OtpDeliveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final UserRepository userRepository;
    private final AuthOtpRepository authOtpRepository;
    private final UserSessionRepository userSessionRepository;
    private final OtpDeliveryService otpDeliveryService;
    private final SellerRepository sellerRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;

    private static final List<String> ROOT_ADMIN_EMAILS = List.of(
            "shubham.gupta180296@gmail.com",
            "sg7508359237@gmail.com",
            "admin@kuraliupdates.com"
    );

    public record SendOtpRequest(String identifier, String type, String mode) {}
    public record VerifyOtpRequest(
            String identifier, String otp, String type, String mode,
            String name, String role, String locality, String address,
            String email, String phone, String emailOtp, String phoneOtp,
            String storeName, String category, String vehicleType, String vehicleNumber, String licenseNumber) {}

    @PostMapping("/send-otp")
    @Transactional
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody SendOtpRequest req) {
        String raw = req.identifier() == null ? "" : req.identifier().trim();
        if (raw.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Email address or mobile phone number is required");

        String type = normalizeType(raw, req.type());
        String identifier = normalizeIdentifier(raw, type);
        if (identifier.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Please enter a valid " + (type.equals("EMAIL") ? "email address" : "mobile number"));

        String mode = normalizeMode(req.mode());
        log.info("OTP request received: mode={}, type={}, identifier={}", mode, type, mask(identifier));
        Optional<UserEntity> existing = findUser(identifier, type);
        if ("LOGIN".equals(mode) && existing.isEmpty()) {
            return error(HttpStatus.NOT_FOUND, "No registered account was found. Please register first.");
        }
        if ("REGISTER".equals(mode) && existing.isPresent()) {
            return error(HttpStatus.CONFLICT, "An account already exists with this " + (type.equals("EMAIL") ? "email address" : "mobile number") + ". Please sign in instead.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (authOtpRepository.existsRecentOtp(identifier, type, now.minusSeconds(60))) {
            return error(HttpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another OTP");
        }

        String otp = String.format("%06d", 100000 + new SecureRandom().nextInt(900000));
        AuthOtpEntity entity = AuthOtpEntity.builder()
                .otpId("otp-" + UUID.randomUUID())
                .identifier(identifier)
                .otpCode(hashOtp(otp))
                .otpType(type)
                .isUsed(0)
                .attempts(0)
                .expiresAt(now.plusMinutes(10))
                .createdAt(now)
                .build();

        try {
            otpDeliveryService.sendOtp(identifier, type, otp, 10);
            authOtpRepository.save(entity);
            log.info("OTP delivered successfully: mode={}, type={}, identifier={}", mode, type, mask(identifier));
        } catch (Exception ex) {
            log.warn("OTP delivery failed for type={} identifier={}: {}", type, mask(identifier), ex.getMessage());
            return error(HttpStatus.BAD_GATEWAY, "Unable to deliver the verification code right now. Please try again later.");
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit verification code has been sent",
                "identifier", mask(identifier),
                "type", type,
                "expiresInSeconds", 600
        ));
    }

    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return "REGISTER".equals(normalizeMode(req.mode())) ? verifyRegistration(req) : verifyLogin(req);
    }

    private ResponseEntity<Map<String, Object>> verifyLogin(VerifyOtpRequest req) {
        String raw = req.identifier() == null ? "" : req.identifier().trim();
        if (raw.isEmpty() || req.otp() == null || req.otp().trim().isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Identifier and 6-digit OTP are required");
        }
        String type = normalizeType(raw, req.type());
        String identifier = normalizeIdentifier(raw, type);
        Optional<UserEntity> userOpt = findUser(identifier, type);
        if (userOpt.isEmpty()) return error(HttpStatus.NOT_FOUND, "No registered account was found. Please register first.");

        Optional<AuthOtpEntity> otpOpt = authOtpRepository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(identifier, type, 0, 5, LocalDateTime.now());
        if (otpOpt.isEmpty() || !matchesOtp(req.otp().trim(), otpOpt.get().getOtpCode())) {
            registerFailedAttempt(otpOpt.orElse(null));
            return error(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP. Please request a new code.");
        }

        markUsed(otpOpt.get());
        UserEntity user = userOpt.get();
        user.setLastLogin(LocalDateTime.now());
        if (isRootAdminEmail(user.getEmail())) {
            user.setRole("ADMIN");
            user.setIsAdmin(1);
        }
        userRepository.save(user);
        log.info("Registration completed successfully: userId={}, email={}, role={}", user.getUserId(), mask(user.getEmail()), user.getRole());
        return createSessionResponse(user);
    }

    private ResponseEntity<Map<String, Object>> verifyRegistration(VerifyOtpRequest req) {
        String email = normalizeIdentifier(req.email(), "EMAIL");
        log.info("Registration verification request received: email={}, phone={}", mask(email), mask(normalizeIdentifier(req.phone(), "PHONE")));
        String phone = normalizeIdentifier(req.phone(), "PHONE");
        String emailOtp = req.emailOtp() == null ? "" : req.emailOtp().trim();
        String phoneOtp = req.phoneOtp() == null ? "" : req.phoneOtp().trim();

        if (req.name() == null || req.name().trim().isEmpty() || email.isEmpty() || phone.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Full name, email and mobile number are required for registration");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return error(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }
        if (!phone.matches("\\d{10}")) {
            return error(HttpStatus.BAD_REQUEST, "Please enter a valid 10-digit mobile number");
        }
        if (!emailOtp.matches("\\d{6}")) {
            return error(HttpStatus.BAD_REQUEST, "Email OTP must be 6 digits");
        }
        if (userRepository.findByEmail(email).isPresent() || userRepository.findByPhone(phone).isPresent()) {
            return error(HttpStatus.CONFLICT, "An account already exists with this email or mobile number. Please sign in instead.");
        }

        Optional<AuthOtpEntity> emailRecord = authOtpRepository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(email, "EMAIL", 0, 5, LocalDateTime.now());
        if (emailRecord.isEmpty() || !matchesOtp(emailOtp, emailRecord.get().getOtpCode())) {
            registerFailedAttempt(emailRecord.orElse(null));
            return error(HttpStatus.UNAUTHORIZED, "Email OTP is invalid or expired");
        }
        markUsed(emailRecord.get());

        String requestedRole = req.role() == null ? "BUYER" : req.role().trim().toUpperCase();
        if (!Set.of("BUYER", "SELLER", "DELIVERY").contains(requestedRole)) requestedRole = "BUYER";
        String registrationLocality = req.locality() == null || req.locality().isBlank() ? "Main Bazaar & Clock Tower" : req.locality().trim();

        UserEntity user = UserEntity.builder()
                .userId("user-" + UUID.randomUUID().toString().substring(0, 8))
                .email(email)
                .phone(phone)
                .name(req.name().trim())
                .role(requestedRole)
                .locality(req.locality() == null || req.locality().isBlank() ? "Main Bazaar & Clock Tower" : req.locality().trim())
                .address(req.address() == null ? "" : req.address().trim())
                .isVerified(1)
                .isAdmin(0)
                .avatarUrl("https://api.dicebear.com/7.x/initials/svg?seed=" + email)
                .createdAt(LocalDateTime.now())
                .lastLogin(LocalDateTime.now())
                .build();
        userRepository.save(user);

        if ("SELLER".equals(requestedRole)) {
            SellerEntity seller = SellerEntity.builder()
                    .sellerId("seller-" + UUID.randomUUID().toString().substring(0, 8))
                    .storeName(req.storeName() == null || req.storeName().isBlank() ? req.name().trim() + "'s Shop" : req.storeName().trim())
                    .ownerName(req.name().trim())
                    .email(email)
                    .phone(phone)
                    .category(req.category() == null || req.category().isBlank() ? "General" : req.category().trim())
                    .address(req.address() == null || req.address().isBlank() ? registrationLocality + ", Kurali" : req.address().trim())
                    .locality(registrationLocality)
                    .distanceKm(java.math.BigDecimal.ONE)
                    .rating(java.math.BigDecimal.ZERO)
                    .reviewCount(0)
                    .status("PENDING")
                    .registeredAt(LocalDateTime.now())
                    .minOrderForFreeDelivery(java.math.BigDecimal.valueOf(499))
                    .baseDeliveryFee(java.math.BigDecimal.valueOf(35))
                    .description("Merchant application awaiting Kurali admin approval.")
                    .build();
            sellerRepository.save(seller);
        } else if ("DELIVERY".equals(requestedRole)) {
            DeliveryAgentEntity agent = DeliveryAgentEntity.builder()
                    .agentId("agent-" + UUID.randomUUID().toString().substring(0, 8))
                    .fullName(req.name().trim())
                    .phone(phone)
                    .email(email)
                    .vehicleType(req.vehicleType() == null || req.vehicleType().isBlank() ? "Bike" : req.vehicleType().trim())
                    .vehicleNumber(req.vehicleNumber() == null || req.vehicleNumber().isBlank() ? "PENDING" : req.vehicleNumber().trim())
                    .licenseNumber(req.licenseNumber() == null || req.licenseNumber().isBlank() ? "PENDING" : req.licenseNumber().trim())
                    .status("PENDING")
                    .rating(java.math.BigDecimal.ZERO)
                    .totalTrips(0)
                    .todayEarnings(java.math.BigDecimal.ZERO)
                    .totalEarnings(java.math.BigDecimal.ZERO)
                    .currentLocality(registrationLocality)
                    .registeredAt(LocalDateTime.now())
                    .build();
            deliveryAgentRepository.save(agent);
        }

        return createSessionResponse(user);
    }

    private ResponseEntity<Map<String, Object>> createSessionResponse(UserEntity user) {
        String token = "kurali_sess_" + UUID.randomUUID().toString().replace("-", "");
        userSessionRepository.save(UserSessionEntity.builder()
                .sessionToken(token).userId(user.getUserId())
                .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(30)).build());
        return ResponseEntity.ok(Map.of("success", true, "token", token, "user", user, "message", "Welcome, " + user.getName() + "!"));
    }

    @GetMapping("/onboarding-status")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getOnboardingStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token", required = false) String tokenParam) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7).trim() : tokenParam;
        if (token == null || token.isBlank()) return error(HttpStatus.UNAUTHORIZED, "No active token");
        Optional<UserSessionEntity> session = userSessionRepository.findBySessionToken(token);
        if (session.isEmpty() || session.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            return error(HttpStatus.UNAUTHORIZED, "Session expired or invalid");
        }
        Optional<UserEntity> userOpt = userRepository.findById(session.get().getUserId());
        if (userOpt.isEmpty()) return error(HttpStatus.UNAUTHORIZED, "User not found");
        UserEntity user = userOpt.get();
        String role = user.getRole() == null ? "BUYER" : user.getRole().toUpperCase();
        String status = "APPROVED";
        if ("SELLER".equals(role)) {
            status = sellerRepository.findByEmail(user.getEmail()).map(SellerEntity::getStatus).orElse("PENDING");
        } else if ("DELIVERY".equals(role)) {
            status = deliveryAgentRepository.findByEmail(user.getEmail()).map(DeliveryAgentEntity::getStatus).orElse("PENDING");
        }
        return ResponseEntity.ok(Map.of("success", true, "role", role, "status", status));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token", required = false) String tokenParam) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7).trim() : tokenParam;
        if (token == null || token.isBlank()) return error(HttpStatus.UNAUTHORIZED, "No active token");
        Optional<UserSessionEntity> session = userSessionRepository.findBySessionToken(token);
        if (session.isEmpty() || session.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            return error(HttpStatus.UNAUTHORIZED, "Session expired or invalid");
        }
        Optional<UserEntity> user = userRepository.findById(session.get().getUserId());
        if (user.isEmpty()) return error(HttpStatus.UNAUTHORIZED, "User not found");
        return ResponseEntity.ok(Map.of("authenticated", true, "user", user.get()));
    }

    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, String> body) {
        String token = authHeader != null && authHeader.startsWith("Bearer ")
                ? authHeader.substring(7).trim() : (body == null ? null : body.get("token"));
        if (token != null && !token.isBlank()) userSessionRepository.deleteBySessionToken(token);
        return ResponseEntity.ok(Map.of("success", true, "message", "Successfully logged out"));
    }

    private Optional<UserEntity> findUser(String identifier, String type) {
        return "EMAIL".equals(type) ? userRepository.findByEmail(identifier) : userRepository.findByPhone(identifier);
    }
    private String normalizeType(String identifier, String requested) {
        String inferred = identifier.contains("@") ? "EMAIL" : "PHONE";
        String type = requested == null || requested.isBlank() ? inferred : requested.trim().toUpperCase();
        return type.equals("EMAIL") || type.equals("PHONE") ? type : inferred;
    }
    private String normalizeMode(String mode) { return "REGISTER".equalsIgnoreCase(mode) ? "REGISTER" : "LOGIN"; }
    private String normalizeIdentifier(String value, String type) {
        if (value == null) return "";
        return "EMAIL".equals(type) ? value.trim().toLowerCase() : value.trim().replaceAll("\\D", "");
    }
    private boolean isRootAdminEmail(String email) { return email != null && ROOT_ADMIN_EMAILS.contains(email.toLowerCase()); }
    private boolean matchesOtp(String entered, String hash) {
        return MessageDigest.isEqual(hashOtp(entered).getBytes(StandardCharsets.UTF_8), hash.getBytes(StandardCharsets.UTF_8));
    }
    private String hashOtp(String otp) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("Unable to hash OTP", e); }
    }
    private void markUsed(AuthOtpEntity e) { e.setIsUsed(1); authOtpRepository.save(e); }
    private void registerFailedAttempt(AuthOtpEntity e) {
        if (e == null) return;
        e.setAttempts(e.getAttempts() + 1);
        if (e.getAttempts() >= 5) e.setIsUsed(1);
        authOtpRepository.save(e);
    }
    private ResponseEntity<Map<String, Object>> error(HttpStatus s, String m) {
        return ResponseEntity.status(s).body(Map.of("success", false, "message", m));
    }
    private String mask(String value) {
        if (value.contains("@")) { int at = value.indexOf('@'); return value.charAt(0) + "***" + value.substring(Math.max(at - 1, 1)); }
        return value.length() <= 4 ? "****" : "******" + value.substring(value.length() - 4);
    }
}
