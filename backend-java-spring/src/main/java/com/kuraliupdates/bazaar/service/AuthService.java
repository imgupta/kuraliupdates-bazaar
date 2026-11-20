package com.kuraliupdates.bazaar.service;

import static com.kuraliupdates.bazaar.service.AuthRequestNormalizer.*;

import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.dto.auth.ProfileUpdateRequest;
import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.dto.auth.VerifyOtpRequest;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final Set<String> ROOT_ADMIN_EMAILS = Set.of(
            "shubham.gupta180296@gmail.com",
            "sg7508359237@gmail.com",
            "admin@kuraliupdates.com"
    );

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final SellerRepository sellerRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DailyHelpProfessionalRepository dailyHelpProfessionalRepository;
    private final OtpService otpService;
    private final BuyerAddressService addressService;
    private final SellerServiceAreaService sellerServiceAreaService;
    private final SellerOnboardingLeadService sellerOnboardingLeadService;
    private final SellerRegistrationOtpConfigService registrationOtpConfig;

    @Transactional
    public OtpSendResult sendOtp(String rawIdentifier, String requestedType, String mode) {
        String raw = rawIdentifier == null ? "" : rawIdentifier.trim();
        if (raw.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Email address or mobile phone number is required");

        String type = normalizeType(raw, requestedType);
        String identifier = normalizeIdentifier(raw, type);
        if (identifier.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid " + ("EMAIL".equals(type) ? "email address" : "mobile number"));
        }

        String normalizedMode = normalizeMode(mode);
        Optional<UserEntity> existing = findUser(identifier, type);
        if ("LOGIN".equals(normalizedMode) && existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No registered account was found. Please register first.");
        }
        // Registration OTP is also allowed for an existing account so the same
        // identity can add another marketplace role (seller, rider or Daily Help).
        // The requested role is validated during OTP verification.
        otpService.send(identifier, type);
        return new OtpSendResult(mask(identifier), type, 600, otpService.getResendCooldownSeconds());
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> registrationCheck(String rawEmail, String rawPhone, String requestedRole) {
        String email = normalizeIdentifier(rawEmail, "EMAIL");
        String phone = normalizeIdentifier(rawPhone, "PHONE");
        validateRegistrationIdentifiers(email, phone);
        Optional<UserEntity> byEmail = userRepository.findByEmail(email);
        Optional<UserEntity> byPhone = userRepository.findByPhone(phone);
        if (byEmail.isPresent() && byPhone.isPresent()
                && !byEmail.get().getUserId().equals(byPhone.get().getUserId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This email and mobile number belong to different accounts. Use the matching email and mobile, or sign in to the existing account.");
        }
        String role = normalizeRole(requestedRole);
        UserEntity existing = byEmail.orElse(byPhone.orElse(null));
        if (existing != null && hasRole(existing, role)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This account is already registered for " + roleLabel(role) + ". Please sign in instead.");
        }
        return java.util.Map.of("success", true, "available", true,
                "existingAccount", existing != null,
                "message", existing == null ? "Email and mobile number are available" : "Identity matches an existing account; requested profile can be added");
    }

    private void validateRegistrationIdentifiers(String email, String phone) {
        if (email.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }
        if (!phone.matches("\\d{10}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid 10-digit mobile number");
        }
    }

    @Transactional
    public AuthResult verifyOtp(VerifyOtpRequest request) {
        String mode = normalizeMode(request.mode());
        return "REGISTER".equals(mode) ? register(request) : login(request);
    }

    @Transactional
    public UserResponse currentUser(String token) {
        return UserResponse.from(requireUser(token), addressService.findByUserId(getUserId(token)));
    }

    @Transactional
    public UserResponse updateCurrentUser(String token, ProfileUpdateRequest request) {
        UserEntity user = requireUser(token);

        if (request.name() != null && !request.name().isBlank()) user.setName(request.name().trim());

        if (request.phone() != null && !request.phone().isBlank()) {
            String phone = normalizeIdentifier(request.phone(), "PHONE");
            Optional<UserEntity> duplicate = userRepository.findByPhone(phone);
            if (duplicate.isPresent() && !duplicate.get().getUserId().equals(user.getUserId())) {
                throw new ApiException(HttpStatus.CONFLICT, "This mobile number is already registered to another account");
            }
            user.setPhone(phone);
        }

        if (request.locality() != null) user.setLocality(request.locality().trim());
        if (request.address() != null) user.setAddress(request.address().trim());
        if (request.addressLine1() != null) user.setAddressLine1(request.addressLine1().trim());
        if (request.landmark() != null) user.setLandmark(request.landmark().trim());
        if (request.formattedAddress() != null) user.setFormattedAddress(request.formattedAddress().trim());
        if (request.placeId() != null) user.setPlaceId(request.placeId().trim());
        if (request.latitude() != null) user.setLatitude(toDecimal(request.latitude()));
        if (request.longitude() != null) user.setLongitude(toDecimal(request.longitude()));

        userRepository.save(user);
        return UserResponse.from(user, addressService.findByUserId(user.getUserId()));
    }

    @Transactional(readOnly = true)
    public List<String> registeredRoles(String token) {
        UserEntity user = requireUser(token);
        return registeredRoles(user);
    }

    private List<String> registeredRoles(UserEntity user) {
        java.util.LinkedHashSet<String> roles = new java.util.LinkedHashSet<>();
        roles.add("BUYER");
        if (AuthProfileResolver.sellerProfileExists(user, sellerRepository)) roles.add("SELLER");
        if (AuthProfileResolver.deliveryProfileExists(user, deliveryAgentRepository)) roles.add("DELIVERY");
        if (AuthProfileResolver.professionalProfileExists(user, dailyHelpProfessionalRepository)) roles.add("PROFESSIONAL");
        if (isRootAdminEmail(user.getEmail())) roles.add("ADMIN");
        return List.copyOf(roles);
    }

    /**
     * Creates a new session scoped to a registered target portal. The new
     * session cannot outlive the authenticated source session used to create
     * the one-time portal handoff.
     */
    @Transactional
    public String createPortalSession(String sourceToken, String requestedRole) {
        return createPortalSessionFromHash(hashSessionToken(sourceToken), requestedRole);
    }

    @Transactional
    public String createPortalSessionFromHash(String sourceSessionHash, String requestedRole) {
        UserSessionEntity source = sessionRepository.findBySessionToken(sourceSessionHash)
                .filter(session -> session.getExpiresAt() != null && session.getExpiresAt().isAfter(LocalDateTime.now())
                        && (session.getAbsoluteExpiresAt() == null || session.getAbsoluteExpiresAt().isAfter(LocalDateTime.now())))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid"));
        UserEntity user = userRepository.findById(source.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        String accountStatus = user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().trim().toUpperCase();
        if (!"ACTIVE".equals(accountStatus)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is " + accountStatus.toLowerCase() + ". Contact KuraliUpdates support.");
        }
        String role = requestedRole == null ? "" : requestedRole.trim().toUpperCase(java.util.Locale.ROOT);
        if (!registeredRoles(user).contains(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is not authorized for that profile");
        }
        return createSession(user, role, source.getAbsoluteExpiresAt() == null ? source.getExpiresAt() : source.getAbsoluteExpiresAt(), source.getE2eRunId());
    }

    @Transactional(readOnly = true)
    public OnboardingStatus onboardingStatus(String token, String requestedRole) {
        UserEntity user = requireUser(token);
        String primaryRole = user.getRole() == null ? "BUYER" : user.getRole().toUpperCase();
        String role = requestedRole == null || requestedRole.isBlank()
                ? primaryRole
                : requestedRole.trim().toUpperCase();
        String status = "APPROVED";

        // A single account can own multiple profiles. Resolve approval from the
        // profile requested by the UI instead of the account's primary role.
        if ("SELLER".equals(role)) {
            status = AuthProfileResolver.findSellerProfile(user, sellerRepository)
                    .map(SellerEntity::getStatus).orElse("PENDING");
        } else if ("DELIVERY".equals(role)) {
            status = AuthProfileResolver.findDeliveryProfile(user, deliveryAgentRepository)
                    .map(DeliveryAgentEntity::getStatus).orElse("PENDING");
        } else if ("PROFESSIONAL".equals(role)) {
            status = AuthProfileResolver.findProfessionalProfile(user, dailyHelpProfessionalRepository)
                    .map(p -> Integer.valueOf(1).equals(p.getVerified()) ? "APPROVED" : "PENDING").orElse("PENDING");
        }

        return new OnboardingStatus(role, status);
    }

    @Transactional
    public void logout(String token) {
        if (token != null && !token.isBlank()) sessionRepository.deleteBySessionToken(hashSessionToken(token));
    }

    /**
     * Rotates the opaque session credential atomically. A concurrent refresh
     * using the previous token loses the compare-and-update and is rejected.
     */
    @Transactional
    public String refreshSession(String token) {
        if (token == null || token.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "No active session");
        String oldHash = hashSessionToken(token);
        LocalDateTime now = LocalDateTime.now();
        UserSessionEntity session = sessionRepository.findBySessionToken(oldHash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid"));
        LocalDateTime absoluteExpiry = session.getAbsoluteExpiresAt() == null
                ? session.getExpiresAt() : session.getAbsoluteExpiresAt();
        if (session.getExpiresAt() == null || !session.getExpiresAt().isAfter(now)
                || absoluteExpiry == null || !absoluteExpiry.isAfter(now)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid");
        }

        String nextToken = "kurali_sess_" + UUID.randomUUID().toString().replace("-", "");
        int rotated = sessionRepository.rotateSessionToken(oldHash, hashSessionToken(nextToken),
                now, now.plusMinutes(30));
        if (rotated != 1) throw new ApiException(HttpStatus.UNAUTHORIZED, "Session was already refreshed or expired");
        return nextToken;
    }

    @Transactional
    public UserEntity requireUser(String token) {
        if (token == null || token.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "No active token");
        String sessionHash = hashSessionToken(token);
        LocalDateTime now = LocalDateTime.now();
        Optional<UserSessionEntity> session = sessionRepository.findBySessionToken(sessionHash);
        if (session.isEmpty() || session.get().getExpiresAt() == null || !session.get().getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid");
        }
        LocalDateTime absoluteExpiry = session.get().getAbsoluteExpiresAt() == null
                ? session.get().getExpiresAt() : session.get().getAbsoluteExpiresAt();
        if (!absoluteExpiry.isAfter(now)) throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid");

        // Touch at most once every five minutes. The immutable absolute expiry
        // is never extended, and Oracle performs the update conditionally.
        sessionRepository.touchSession(sessionHash, now, now.plusMinutes(30), now.plusMinutes(25));

        UserEntity user = userRepository.findById(session.get().getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        String status = user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().trim().toUpperCase();
        if (!"ACTIVE".equals(status)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is " + status.toLowerCase() + ". Contact KuraliUpdates support.");
        }
        return user;
    }

    /** Returns the role bound to this session, not the user's mutable primary role. */
    public String requireSessionRole(String token) {
        if (token == null || token.isBlank()) return null;
        return sessionRepository.findBySessionToken(hashSessionToken(token))
                .map(UserSessionEntity::getActiveRole)
                .filter(role -> role != null && !role.isBlank())
                .orElseGet(() -> {
                    UserEntity user = requireUser(token);
                    return user.getRole();
                });
    }

    private AuthResult login(VerifyOtpRequest req) {
        String raw = req.identifier() == null ? "" : req.identifier().trim();
        if (raw.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Identifier and 6-digit OTP are required");

        String type = normalizeType(raw, req.type());
        String identifier = normalizeIdentifier(raw, type);
        UserEntity user = findUser(identifier, type)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No registered account was found. Please register first."));

        String accountStatus = user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().trim().toUpperCase();
        if (!"ACTIVE".equals(accountStatus)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is " + accountStatus.toLowerCase() + ". Contact KuraliUpdates support.");
        }
        otpService.verify(identifier, type, req.otp());

        user.setLastLogin(LocalDateTime.now());
        if (isRootAdminEmail(user.getEmail())) {
            user.setRole("ADMIN");
            user.setIsAdmin(1);
        }
        userRepository.save(user);
        String activeRole = req.role() == null || req.role().isBlank()
                ? user.getRole() : req.role().trim().toUpperCase(java.util.Locale.ROOT);
        if (!registeredRoles(user).contains(activeRole)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is not authorized for that profile");
        }
        return new AuthResult(createSession(user, activeRole), UserResponse.from(user, addressService.findByUserId(user.getUserId())), "Welcome, " + user.getName() + "!");
    }

    private AuthResult register(VerifyOtpRequest req) {
        String email = normalizeIdentifier(req.email(), "EMAIL");
        String phone = normalizeIdentifier(req.phone(), "PHONE");
        validateRegistration(req, email, phone);

        Optional<UserEntity> existingByEmail = userRepository.findByEmail(email);
        Optional<UserEntity> existingByPhone = userRepository.findByPhone(phone);
        UserEntity existingUser = existingByEmail.orElse(existingByPhone.orElse(null));

        if (existingByEmail.isPresent() && existingByPhone.isPresent()
                && !existingByEmail.get().getUserId().equals(existingByPhone.get().getUserId())) {
            throw new ApiException(HttpStatus.CONFLICT, "This email and mobile number belong to different accounts.");
        }

        String role = normalizeRole(req.role());
        if ("BUYER".equals(role)) {
            java.util.Map<String, Object> otpSettings = registrationOtpConfig.get();
            if (Boolean.TRUE.equals(otpSettings.get("emailOtpEnabled"))) otpService.verify(email, "EMAIL", req.emailOtp());
            if (Boolean.TRUE.equals(otpSettings.get("mobileOtpEnabled"))) otpService.verify(phone, "PHONE", req.phoneOtp());
        } else if (!"SELLER".equals(role)) {
            otpService.verify(email, "EMAIL", req.emailOtp());
        }

        if (existingUser != null) {
            if (hasRole(existingUser, role)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "This account is already registered for " + roleLabel(role) + ".");
            }

            String locality = req.locality() == null || req.locality().isBlank()
                    ? existingUser.getLocality() : req.locality().trim();
            LocalDateTime now = LocalDateTime.now();

            // Keep one USERS record per identity and attach the requested role profile.
            if (existingUser.getName() == null || existingUser.getName().isBlank()) {
                existingUser.setName(req.name().trim());
            }
            if (existingUser.getLocality() == null || existingUser.getLocality().isBlank()) {
                existingUser.setLocality(locality);
            }
            if (existingUser.getAddress() == null || existingUser.getAddress().isBlank()) {
                existingUser.setAddress(defaultString(req.address()));
            }
            userRepository.save(existingUser);
            provisionRole(existingUser, role, req, locality, now);
            if ("SELLER".equals(role)) {
                sellerOnboardingLeadService.markApplicationSubmitted(req.leadId(), email, phone, existingUser.getUserId());
            }

            return new AuthResult(createSession(existingUser, role),
                    UserResponse.from(existingUser, addressService.findByUserId(existingUser.getUserId())),
                    "Your " + roleLabel(role) + " profile has been added to your existing account.");
        }
        String locality = req.locality() == null || req.locality().isBlank()
                ? "Main Bazaar & Clock Tower" : req.locality().trim();
        LocalDateTime now = LocalDateTime.now();

        // USERS.ROLE is the primary marketplace role; Daily Help is a separate
        // profile and must not violate the existing USERS role constraint.
        String primaryRole = "PROFESSIONAL".equals(role) ? "BUYER" : role;
        UserEntity user = UserEntity.builder()
                .userId("user-" + UUID.randomUUID().toString().substring(0, 8))
                .email(email).phone(phone).name(req.name().trim()).role(primaryRole)
                .locality(locality)
                .address(defaultString(req.address())).addressLine1(defaultString(req.addressLine1()))
                .landmark(defaultString(req.landmark())).formattedAddress(defaultString(req.formattedAddress()))
                .placeId(defaultString(req.placeId()))
                .latitude(toDecimal(req.latitude())).longitude(toDecimal(req.longitude()))
                .isVerified(1).isAdmin(0)
                .avatarUrl("https://api.dicebear.com/7.x/initials/svg?seed=" + email)
                .createdAt(now).lastLogin(now).build();
        userRepository.save(user);

        provisionRole(user, role, req, locality, now);
        if ("SELLER".equals(role)) {
            sellerOnboardingLeadService.markApplicationSubmitted(req.leadId(), email, phone, user.getUserId());
        }
        return new AuthResult(createSession(user, role), UserResponse.from(user, addressService.findByUserId(user.getUserId())), "Welcome, " + user.getName() + "!");
    }

    private void validateRegistration(VerifyOtpRequest req, String email, String phone) {
        if (req.name() == null || req.name().isBlank() || email.isBlank() || phone.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Full name, email and mobile number are required for registration");
        }
        String requestedRole = normalizeRole(req.role());
        if (("DELIVERY".equals(requestedRole) || "PROFESSIONAL".equals(requestedRole))
                && (req.wardNumber() == null || req.wardNumber().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ward number is required for partner registration");
        }
        if ("SELLER".equals(requestedRole)) {
            Map<String, String> compliance = registrationOtpConfig.complianceConfig();
            String category = req.category() == null ? "" : req.category().trim();
            boolean gstCategoryRequired = csvContains(compliance.get("SELLER_GST_REQUIRED_CATEGORIES"), category);
            boolean fssaiCategoryRequired = csvContains(compliance.get("SELLER_FSSAI_REQUIRED_CATEGORIES"), category);
            boolean gstRequired = Boolean.parseBoolean(compliance.getOrDefault("SELLER_GST_REQUIRED", "false")) || gstCategoryRequired;
            if (gstRequired && (req.gstNumber() == null || req.gstNumber().isBlank())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "GSTIN is required for this seller category under the current admin compliance policy");
            }
            if (fssaiCategoryRequired && (req.fssaiNumber() == null || req.fssaiNumber().isBlank())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "FSSAI registration/licence details are required for this seller category");
            }
            requireSellerValue(req.businessType(), "Business type is required");
            if (!Set.of("INDIVIDUAL", "PROPRIETORSHIP", "PARTNERSHIP", "COMPANY").contains(req.businessType().trim().toUpperCase())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Select a valid business type");
            }
            requireSellerValue(req.storeName(), "Shop name is required");
            if (!"INDIVIDUAL".equalsIgnoreCase(req.businessType().trim())
                    && (req.registeredBusinessName() == null || req.registeredBusinessName().isBlank())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Registered business name is required for this business constitution");
            }
            requireSellerValue(req.category(), "Business category is required");
            requireSellerValue(req.streetLocality(), "Street or locality is required");
            if (req.pinCode() == null || !req.pinCode().matches("\\d{6}")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid 6-digit shop PIN code");
            }
            if (req.latitude() == null || req.longitude() == null
                    || req.latitude() < -90 || req.latitude() > 90
                    || req.longitude() < -180 || req.longitude() > 180) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A valid shop map location is required");
            }
            sellerServiceAreaService.validateSellerLocation(req.latitude(), req.longitude());
            if (!Boolean.TRUE.equals(req.agreementAccepted()) || req.agreementVersion() == null || req.agreementVersion().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You must accept the current seller agreement to continue");
            }
            if (req.gstNumber() != null && !req.gstNumber().isBlank()
                    && !req.gstNumber().trim().toUpperCase().matches("\\d{2}[A-Z]{5}\\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid GSTIN format");
            }
            if (req.fssaiNumber() != null && !req.fssaiNumber().isBlank()
                    && !req.fssaiNumber().trim().matches("\\d{14}")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid 14-digit FSSAI number");
            }
        }
    }

    private boolean csvContains(String csv, String value) {
        if (csv == null || csv.isBlank() || value == null || value.isBlank()) return false;
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim).filter(s -> !s.isBlank())
                .anyMatch(s -> s.equalsIgnoreCase(value.trim()));
    }

    private void requireSellerValue(String value, String message) {
        if (value == null || value.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    private boolean hasRole(UserEntity user, String role) {
        if ("ADMIN".equalsIgnoreCase(user.getRole()) && "ADMIN".equals(role)) return true;
        if ("BUYER".equals(role) && "BUYER".equalsIgnoreCase(user.getRole())) return true;
        if ("SELLER".equals(role)) return AuthProfileResolver.sellerProfileExists(user, sellerRepository);
        if ("DELIVERY".equals(role)) return AuthProfileResolver.deliveryProfileExists(user, deliveryAgentRepository);
        if ("PROFESSIONAL".equals(role)) return AuthProfileResolver.professionalProfileExists(user, dailyHelpProfessionalRepository);
        return false;
    }

    /**
     * Staging E2E role eligibility follows the same multi-profile model exposed
     * by registeredRoles(): every existing account can act as a buyer, while
     * privileged/provider roles require their corresponding registered profile.
     * Keep this separate from hasRole(), which validates duplicate registrations.
     */
    private boolean hasStagingE2eRole(UserEntity user, String role) {
        return switch (role) {
            case "BUYER" -> true;
            case "SELLER" -> AuthProfileResolver.sellerProfileExists(user, sellerRepository);
            case "DELIVERY" -> AuthProfileResolver.deliveryProfileExists(user, deliveryAgentRepository);
            case "PROFESSIONAL" -> AuthProfileResolver.professionalProfileExists(user, dailyHelpProfessionalRepository);
            case "ADMIN" -> isRootAdminEmail(user.getEmail());
            default -> false;
        };
    }

    private String roleLabel(String role) {
        return switch (role) {
            case "SELLER" -> "Seller";
            case "DELIVERY" -> "Rider";
            case "PROFESSIONAL" -> "Daily Help";
            case "BUYER" -> "Buyer";
            default -> role;
        };
    }

    private void provisionRole(UserEntity user, String requestedRole, VerifyOtpRequest req, String locality, LocalDateTime now) {
        if ("SELLER".equals(requestedRole)) {
            sellerRepository.save(SellerEntity.builder()
                    .sellerId("seller-" + UUID.randomUUID().toString().substring(0, 8))
                    .userId(user.getUserId())
                    .storeName(defaultString(req.storeName()).isBlank() ? user.getName() + "'s Shop" : req.storeName().trim())
                    .ownerName(user.getName()).email(user.getEmail()).phone(user.getPhone())
                    .category(req.category().trim())
                    .address(String.join(", ", List.of(defaultString(req.shopNumber()), defaultString(req.wardNumber()), defaultString(req.streetLocality()), defaultString(req.pinCode()))))
                    .locality(req.streetLocality().trim()).latitude(toDecimal(req.latitude())).longitude(toDecimal(req.longitude()))
                    .businessType(req.businessType().trim().toUpperCase())
                    .registeredBusinessName(defaultString(req.registeredBusinessName()).isBlank() ? user.getName() : req.registeredBusinessName().trim())
                    .shopNumber(defaultString(req.shopNumber())).wardNumber(defaultString(req.wardNumber()))
                    .streetLocality(req.streetLocality().trim()).pinCode(req.pinCode().trim())
                    .landmark(defaultString(req.landmark()))
                    .gstNumber(defaultString(req.gstNumber()).trim().toUpperCase())
                    .fssaiNumber(defaultString(req.fssaiNumber()).trim())
                    .fssaiLicenseType(defaultString(req.fssaiLicenseType()))
                    .fssaiExpiryDate(req.fssaiExpiryDate() == null || req.fssaiExpiryDate().isBlank() ? null : java.time.LocalDate.parse(req.fssaiExpiryDate()))
                    .gstVerificationStatus(req.gstNumber() == null || req.gstNumber().isBlank() ? "NOT_SUBMITTED" : "PENDING")
                    .fssaiVerificationStatus(req.fssaiNumber() == null || req.fssaiNumber().isBlank() ? "NOT_SUBMITTED" : "PENDING")
                    .openingTime(defaultString(req.openingTime())).closingTime(defaultString(req.closingTime()))
                    .weeklyClosedDay(defaultString(req.weeklyClosedDay())).preparationMinutes(req.preparationMinutes())
                    .agreementVersion(req.agreementVersion()).agreementAcceptedAt(now)
                    .distanceKm(BigDecimal.ONE).rating(BigDecimal.ZERO).reviewCount(0)
                    .status("PENDING").registeredAt(now)
                    .minOrderForFreeDelivery(BigDecimal.valueOf(499)).baseDeliveryFee(BigDecimal.valueOf(35))
                    .description("Merchant application awaiting Kurali admin approval.").build());
        } else if ("DELIVERY".equals(requestedRole)) {
            deliveryAgentRepository.save(DeliveryAgentEntity.builder()
                    .agentId("agent-" + UUID.randomUUID().toString().substring(0, 8))
                    .userId(user.getUserId())
                    .fullName(user.getName()).phone(user.getPhone()).email(user.getEmail())
                    .vehicleType(defaultString(req.vehicleType()).isBlank() ? "Bike" : req.vehicleType().trim())
                    .vehicleNumber(defaultString(req.vehicleNumber()).isBlank() ? "PENDING" : req.vehicleNumber().trim())
                    .licenseNumber(defaultString(req.licenseNumber()).isBlank() ? "PENDING" : req.licenseNumber().trim())
                    .status("PENDING").rating(BigDecimal.ZERO).totalTrips(0)
                    .todayEarnings(BigDecimal.ZERO).totalEarnings(BigDecimal.ZERO)
                    .currentLocality(locality).wardNumber(defaultString(req.wardNumber()).trim())
                    .registeredAt(now).build());
        } else if ("PROFESSIONAL".equals(requestedRole)) {
            dailyHelpProfessionalRepository.save(DailyHelpProfessionalEntity.builder()
                    .professionalId("DHP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .userId(user.getUserId())
                    .fullName(user.getName()).phone(user.getPhone())
                    .rating(BigDecimal.ZERO).reviewCount(0)
                    .currentLocality(locality).wardNumber(defaultString(req.wardNumber()).trim())
                    .status("OFFLINE").verified(1)
                    .registeredAt(now).updatedAt(now).build());
        }
    }

    /**
     * Issues a normal server-side session for explicitly authorized staging E2E
     * authentication. The controller protects this method with a staging-only
     * high-entropy shared secret; OTP verification is deliberately not changed.
     */
    @Transactional
    public AuthResult createStagingE2eSession(String rawIdentifier, String requestedRole) {
        return createStagingE2eSession(rawIdentifier, requestedRole, null);
    }

    @Transactional
    public AuthResult createStagingE2eSession(String rawIdentifier, String requestedRole, String e2eRunId) {
        String raw = rawIdentifier == null ? "" : rawIdentifier.trim();
        if (raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A configured E2E test identity is required");
        }
        String type = normalizeType(raw, null);
        String identifier = normalizeIdentifier(raw, type);
        UserEntity user = findUser(identifier, type)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "The configured E2E test account does not exist"));

        String accountStatus = user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().trim().toUpperCase();
        if (!"ACTIVE".equals(accountStatus)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is " + accountStatus.toLowerCase() + ". Contact KuraliUpdates support.");
        }
        String role = requestedRole == null ? "" : requestedRole.trim().toUpperCase();
        if ("PROVIDER".equals(role)) role = "PROFESSIONAL";
        if (!Set.of("BUYER", "SELLER", "DELIVERY", "PROFESSIONAL", "ADMIN").contains(role)
                || !hasStagingE2eRole(user, role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The E2E identity is not registered for the requested role");
        }
        // hasStagingE2eRole has already verified root-admin eligibility.
        // Keep the account's primary role and admin flag unchanged: the role is
        // scoped to this individual E2E session in USER_SESSIONS.ACTIVE_ROLE.
        // Issuing an ADMIN test token must never promote or mutate the account.
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        return new AuthResult(createStagingE2eSessionToken(user, e2eRunId, role),
                UserResponse.from(user, addressService.findByUserId(user.getUserId())),
                "Staging E2E session issued");
    }

    private String createStagingE2eSessionToken(UserEntity user, String e2eRunId, String activeRole) {
        LocalDateTime now = LocalDateTime.now();
        return createSession(user, activeRole, now.plusHours(2), e2eRunId);
    }

    private String createSession(UserEntity user, String activeRole) {
        return createSession(user, activeRole, LocalDateTime.now().plusHours(12), null);
    }

    private String createSession(UserEntity user, String activeRole, LocalDateTime absoluteExpiresAt, String e2eRunId) {
        String token = "kurali_sess_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime idleExpiresAt = now.plusMinutes(30).isBefore(absoluteExpiresAt)
                ? now.plusMinutes(30) : absoluteExpiresAt;
        sessionRepository.save(UserSessionEntity.builder()
                .sessionToken(hashSessionToken(token)).userId(user.getUserId()).activeRole(activeRole)
                .e2eRunId(e2eRunId).createdAt(now).expiresAt(idleExpiresAt)
                .absoluteExpiresAt(absoluteExpiresAt).build());
        return token;
    }

    /** SHA-256 digest used as the database lookup key; raw bearer values are never persisted. */
    public static String hashSessionToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return "";
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private String getUserId(String token) {
        return requireUser(token).getUserId();
    }

    private Optional<UserEntity> findUser(String identifier, String type) {
        return "EMAIL".equals(type) ? userRepository.findByEmail(identifier) : userRepository.findByPhone(identifier);
    }

    private boolean isRootAdminEmail(String email) {
        return email != null && ROOT_ADMIN_EMAILS.contains(email.toLowerCase());
    }

    private BigDecimal toDecimal(Double value) {
        return value == null ? null : BigDecimal.valueOf(value);
    }

    private String defaultString(String value) {
        return value == null ? "" : value.trim();
    }

    public record OtpSendResult(String identifier, String type, int expiresInSeconds, int resendAfterSeconds) {}

    public record AuthResult(String token, UserResponse user, String message) {}
    public record OnboardingStatus(String role, String status) {}
}
