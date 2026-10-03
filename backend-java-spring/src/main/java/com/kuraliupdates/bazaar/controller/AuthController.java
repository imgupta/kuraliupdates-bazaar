package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.repository.AuthOtpRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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

    private static final List<String> ROOT_ADMIN_EMAILS = List.of(
            "shubham.gupta180296@gmail.com",
            "sg7508359237@gmail.com",
            "admin@kuraliupdates.com"
    );

    public record SendOtpRequest(String identifier, String type, String role) {}

    public record VerifyOtpRequest(
            String identifier, // Email OR Mobile number (either is valid)
            String otp,        // 6-digit code
            String type,       // EMAIL or PHONE (optional)
            String name,       // Full Name for registration
            String role,       // BUYER, SELLER, DELIVERY, ADMIN
            String locality,
            String address,
            String email,      // Backward compatibility
            String phone,      // Backward compatibility
            String emailOtp,   // Backward compatibility
            String phoneOtp    // Backward compatibility
    ) {}

    /**
     * Dispatch 6-digit live OTP for either Email OR Mobile Phone
     */
    @PostMapping("/send-otp")
    @Transactional
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody SendOtpRequest req) {
        if (req.identifier() == null || req.identifier().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please enter either your Email address or Mobile phone number"
            ));
        }

        String raw = req.identifier().trim();
        boolean isEmail = raw.contains("@");
        String identifier = isEmail ? raw.toLowerCase() : raw.replaceAll("[^0-9+]", "");
        String type = (req.type() != null) ? req.type().toUpperCase() : (isEmail ? "EMAIL" : "PHONE");

        // Generate cryptographic 6-digit OTP
        SecureRandom random = new SecureRandom();
        int codeInt = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(codeInt);

        AuthOtpEntity otpEntity = AuthOtpEntity.builder()
                .otpId("otp-" + UUID.randomUUID())
                .identifier(identifier)
                .otpCode(otpCode)
                .otpType(type)
                .isUsed(0)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .build();

        authOtpRepository.save(otpEntity);
        log.info("[Live Auth] Generated {} OTP {} for {}", type, otpCode, identifier);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "6-digit OTP code sent successfully to " + identifier);
        resp.put("identifier", identifier);
        resp.put("type", type);
        resp.put("otpPreview", otpCode); // Available for live preview / testing
        resp.put("expiresInSeconds", 600);

        return ResponseEntity.ok(resp);
    }

    /**
     * Verify single OTP (from either Email OR Mobile Phone) and establish authenticated session
     */
    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        // Resolve target identifier (email or phone)
        String rawIdentifier = req.identifier();
        if (rawIdentifier == null || rawIdentifier.trim().isEmpty()) {
            if (req.email() != null && !req.email().trim().isEmpty()) {
                rawIdentifier = req.email().trim();
            } else if (req.phone() != null && !req.phone().trim().isEmpty()) {
                rawIdentifier = req.phone().trim();
            }
        }

        if (rawIdentifier == null || rawIdentifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please provide either an Email address or Mobile phone number"
            ));
        }

        boolean isEmail = rawIdentifier.contains("@");
        String identifier = isEmail ? rawIdentifier.trim().toLowerCase() : rawIdentifier.trim().replaceAll("[^0-9+]", "");
        String type = (req.type() != null) ? req.type().toUpperCase() : (isEmail ? "EMAIL" : "PHONE");

        // Resolve submitted OTP
        String enteredOtp = req.otp();
        if (enteredOtp == null || enteredOtp.trim().isEmpty()) {
            enteredOtp = isEmail ? req.emailOtp() : req.phoneOtp();
        }
        if (enteredOtp == null || enteredOtp.trim().isEmpty()) {
            enteredOtp = req.emailOtp() != null ? req.emailOtp() : req.phoneOtp();
        }

        if (enteredOtp == null || enteredOtp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Please enter the 6-digit OTP code"
            ));
        }
        enteredOtp = enteredOtp.trim();

        // Verify against database or development passcodes
        boolean isOtpValid = false;
        Optional<AuthOtpEntity> validOtp = authOtpRepository.findValidOtp(identifier, type, LocalDateTime.now());
        if (validOtp.isPresent() && validOtp.get().getOtpCode().equals(enteredOtp)) {
            isOtpValid = true;
            validOtp.get().setIsUsed(1);
            authOtpRepository.save(validOtp.get());
        } else if (enteredOtp.equals("123456") || enteredOtp.equals("583192")) {
            isOtpValid = true;
        }

        if (!isOtpValid) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Invalid or expired OTP code. Please check your " + (isEmail ? "Email" : "Phone") + " or request a new code."
            ));
        }

        // Authorisation: Check if user is Root Administrator
        boolean isRootAdmin = isEmail && ROOT_ADMIN_EMAILS.contains(identifier);

        // Find existing user by email or phone
        Optional<UserEntity> existingUser = isEmail
                ? userRepository.findByEmail(identifier)
                : userRepository.findByPhone(identifier);

        UserEntity user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setLastLogin(LocalDateTime.now());
            if (isRootAdmin) {
                user.setRole("ADMIN");
                user.setIsAdmin(1);
            }
            if (req.name() != null && !req.name().trim().isEmpty()) {
                user.setName(req.name().trim());
            }
            userRepository.save(user);
        } else {
            // Register new verified user
            String designatedRole = isRootAdmin ? "ADMIN" : (req.role() != null ? req.role().toUpperCase() : "BUYER");
            String displayName = req.name() != null && !req.name().trim().isEmpty()
                    ? req.name().trim()
                    : (isRootAdmin ? "Administrator" : (isEmail ? identifier.split("@")[0] : "Kurali User"));

            user = UserEntity.builder()
                    .userId("user-" + UUID.randomUUID().toString().substring(0, 8))
                    .email(isEmail ? identifier : (req.email() != null ? req.email().trim().toLowerCase() : null))
                    .phone(!isEmail ? identifier : (req.phone() != null ? req.phone().trim() : null))
                    .name(displayName)
                    .role(designatedRole)
                    .locality(req.locality() != null ? req.locality() : "Main Bazaar & Clock Tower")
                    .address(req.address() != null ? req.address() : "Kurali, Punjab")
                    .isVerified(1)
                    .isAdmin(isRootAdmin ? 1 : 0)
                    .avatarUrl("https://api.dicebear.com/7.x/initials/svg?seed=" + identifier)
                    .createdAt(LocalDateTime.now())
                    .lastLogin(LocalDateTime.now())
                    .build();

            userRepository.save(user);
        }

        // Create persistent session token
        String sessionToken = "kurali_sess_" + UUID.randomUUID().toString().replace("-", "");
        UserSessionEntity session = UserSessionEntity.builder()
                .sessionToken(sessionToken)
                .userId(user.getUserId())
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build();
        userSessionRepository.save(session);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("token", sessionToken);
        resp.put("user", user);
        resp.put("message", "Welcome, " + user.getName() + "!");

        return ResponseEntity.ok(resp);
    }

    /**
     * Session validation & user profile retrieval
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token", required = false) String tokenParam
    ) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (tokenParam != null && !tokenParam.trim().isEmpty()) {
            token = tokenParam.trim();
        }

        if (token == null) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false, "message", "No active token"));
        }

        Optional<UserSessionEntity> sessionOpt = userSessionRepository.findBySessionToken(token);
        if (sessionOpt.isEmpty() || sessionOpt.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false, "message", "Session expired or invalid"));
        }

        Optional<UserEntity> userOpt = userRepository.findById(sessionOpt.get().getUserId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false, "message", "User not found"));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", userOpt.get()
        ));
    }

    /**
     * Invalidate session token on Logout
     */
    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (body != null && body.containsKey("token")) {
            token = body.get("token");
        }

        if (token != null) {
            userSessionRepository.deleteBySessionToken(token);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully logged out from KuraliUpdates Bazaar"
        ));
    }
}
