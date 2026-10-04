package com.kuraliupdates.bazaar.service;

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
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
    private final OtpService otpService;
    private final BuyerAddressService addressService;

    @Transactional
    public void sendOtp(String rawIdentifier, String requestedType, String mode) {
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
        if ("REGISTER".equals(normalizedMode) && existing.isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account already exists with this " +
                    ("EMAIL".equals(type) ? "email address" : "mobile number") + ". Please sign in instead.");
        }

        otpService.send(identifier, type);
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
    public OnboardingStatus onboardingStatus(String token) {
        UserEntity user = requireUser(token);
        String role = user.getRole() == null ? "BUYER" : user.getRole().toUpperCase();
        String status = "APPROVED";
        if ("SELLER".equals(role)) {
            status = sellerRepository.findByEmail(user.getEmail()).map(SellerEntity::getStatus).orElse("PENDING");
        } else if ("DELIVERY".equals(role)) {
            status = deliveryAgentRepository.findByEmail(user.getEmail()).map(DeliveryAgentEntity::getStatus).orElse("PENDING");
        }
        return new OnboardingStatus(role, status);
    }

    @Transactional
    public void logout(String token) {
        if (token != null && !token.isBlank()) sessionRepository.deleteBySessionToken(token);
    }

    public UserEntity requireUser(String token) {
        if (token == null || token.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "No active token");
        Optional<UserSessionEntity> session = sessionRepository.findBySessionToken(token);
        if (session.isEmpty() || session.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired or invalid");
        }
        return userRepository.findById(session.get().getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private AuthResult login(VerifyOtpRequest req) {
        String raw = req.identifier() == null ? "" : req.identifier().trim();
        if (raw.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Identifier and 6-digit OTP are required");

        String type = normalizeType(raw, req.type());
        String identifier = normalizeIdentifier(raw, type);
        UserEntity user = findUser(identifier, type)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No registered account was found. Please register first."));

        otpService.verify(identifier, type, req.otp());

        user.setLastLogin(LocalDateTime.now());
        if (isRootAdminEmail(user.getEmail())) {
            user.setRole("ADMIN");
            user.setIsAdmin(1);
        }
        userRepository.save(user);
        return new AuthResult(createSession(user), user, "Welcome, " + user.getName() + "!");
    }

    private AuthResult register(VerifyOtpRequest req) {
        String email = normalizeIdentifier(req.email(), "EMAIL");
        String phone = normalizeIdentifier(req.phone(), "PHONE");
        validateRegistration(req, email, phone);

        if (userRepository.findByEmail(email).isPresent() || userRepository.findByPhone(phone).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account already exists with this email or mobile number. Please sign in instead.");
        }

        otpService.verify(email, "EMAIL", req.emailOtp());

        String role = normalizeRole(req.role());
        String locality = req.locality() == null || req.locality().isBlank()
                ? "Main Bazaar & Clock Tower" : req.locality().trim();
        LocalDateTime now = LocalDateTime.now();

        UserEntity user = UserEntity.builder()
                .userId("user-" + UUID.randomUUID().toString().substring(0, 8))
                .email(email).phone(phone).name(req.name().trim()).role(role)
                .locality(locality)
                .address(defaultString(req.address())).addressLine1(defaultString(req.addressLine1()))
                .landmark(defaultString(req.landmark())).formattedAddress(defaultString(req.formattedAddress()))
                .placeId(defaultString(req.placeId()))
                .latitude(toDecimal(req.latitude())).longitude(toDecimal(req.longitude()))
                .isVerified(1).isAdmin(0)
                .avatarUrl("https://api.dicebear.com/7.x/initials/svg?seed=" + email)
                .createdAt(now).lastLogin(now).build();
        userRepository.save(user);

        provisionRole(user, req, locality, now);
        return new AuthResult(createSession(user), user, "Welcome, " + user.getName() + "!");
    }

    private void validateRegistration(VerifyOtpRequest req, String email, String phone) {
        if (req.name() == null || req.name().isBlank() || email.isBlank() || phone.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Full name, email and mobile number are required for registration");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }
        if (!phone.matches("\\d{10}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid 10-digit mobile number");
        }
    }

    private void provisionRole(UserEntity user, VerifyOtpRequest req, String locality, LocalDateTime now) {
        if ("SELLER".equals(user.getRole())) {
            sellerRepository.save(SellerEntity.builder()
                    .sellerId("seller-" + UUID.randomUUID().toString().substring(0, 8))
                    .storeName(defaultString(req.storeName()).isBlank() ? user.getName() + "'s Shop" : req.storeName().trim())
                    .ownerName(user.getName()).email(user.getEmail()).phone(user.getPhone())
                    .category(defaultString(req.category()).isBlank() ? "General" : req.category().trim())
                    .address(defaultString(req.address()).isBlank() ? locality + ", Kurali" : req.address().trim())
                    .locality(locality).distanceKm(BigDecimal.ONE).rating(BigDecimal.ZERO).reviewCount(0)
                    .status("PENDING").registeredAt(now)
                    .minOrderForFreeDelivery(BigDecimal.valueOf(499)).baseDeliveryFee(BigDecimal.valueOf(35))
                    .description("Merchant application awaiting Kurali admin approval.").build());
        } else if ("DELIVERY".equals(user.getRole())) {
            deliveryAgentRepository.save(DeliveryAgentEntity.builder()
                    .agentId("agent-" + UUID.randomUUID().toString().substring(0, 8))
                    .fullName(user.getName()).phone(user.getPhone()).email(user.getEmail())
                    .vehicleType(defaultString(req.vehicleType()).isBlank() ? "Bike" : req.vehicleType().trim())
                    .vehicleNumber(defaultString(req.vehicleNumber()).isBlank() ? "PENDING" : req.vehicleNumber().trim())
                    .licenseNumber(defaultString(req.licenseNumber()).isBlank() ? "PENDING" : req.licenseNumber().trim())
                    .status("PENDING").rating(BigDecimal.ZERO).totalTrips(0)
                    .todayEarnings(BigDecimal.ZERO).totalEarnings(BigDecimal.ZERO)
                    .currentLocality(locality).registeredAt(now).build());
        }
    }

    private String createSession(UserEntity user) {
        String token = "kurali_sess_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.now();
        sessionRepository.save(UserSessionEntity.builder()
                .sessionToken(token).userId(user.getUserId())
                .createdAt(now).expiresAt(now.plusDays(30)).build());
        return token;
    }

    private String getUserId(String token) {
        return requireUser(token).getUserId();
    }

    private Optional<UserEntity> findUser(String identifier, String type) {
        return "EMAIL".equals(type) ? userRepository.findByEmail(identifier) : userRepository.findByPhone(identifier);
    }

    private String normalizeType(String identifier, String requested) {
        String inferred = identifier.contains("@") ? "EMAIL" : "PHONE";
        if (requested == null || requested.isBlank()) return inferred;
        String normalized = requested.trim().toUpperCase();
        return Set.of("EMAIL", "PHONE").contains(normalized) ? normalized : inferred;
    }

    private String normalizeMode(String mode) {
        return "REGISTER".equalsIgnoreCase(mode) ? "REGISTER" : "LOGIN";
    }

    private String normalizeRole(String role) {
        String normalized = role == null ? "BUYER" : role.trim().toUpperCase();
        return Set.of("BUYER", "SELLER", "DELIVERY").contains(normalized) ? normalized : "BUYER";
    }

    private String normalizeIdentifier(String value, String type) {
        if (value == null) return "";
        return "EMAIL".equals(type) ? value.trim().toLowerCase() : value.trim().replaceAll("\\D", "");
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

    public record AuthResult(String token, UserEntity user, String message) {}
    public record OnboardingStatus(String role, String status) {}
}
