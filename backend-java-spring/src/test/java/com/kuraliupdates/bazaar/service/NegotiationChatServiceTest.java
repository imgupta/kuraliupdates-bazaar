package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.controller.NegotiationChatController.OpenChatRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.RespondOfferRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.SendMessageRequest;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class NegotiationChatServiceTest {
    @Mock private JdbcTemplate jdbc;
    @Mock private SellerRepository sellerRepository;

    private NegotiationChatService service;
    private UserEntity buyer;

    @BeforeEach
    void setUp() {
        service = new NegotiationChatService(jdbc, sellerRepository);
        buyer = UserEntity.builder()
                .userId("buyer-1")
                .email("buyer@example.test")
                .name("Test Buyer")
                .role("BUYER")
                .build();
    }

    @Test
    void openingChatRequiresProductBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.open(buyer, new OpenChatRequest(" ", null, null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void openingChatRejectsNonBuyerAccountsBeforeDatabaseAccess() {
        UserEntity seller = UserEntity.builder()
                .userId("seller-user-1")
                .email("seller@example.test")
                .name("Test Seller")
                .role("SELLER")
                .build();

        ApiException error = assertThrows(ApiException.class,
                () -> service.open(seller, new OpenChatRequest("product-1", null, null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void openingChatRejectsOversizedOpeningMessageBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.open(buyer, new OpenChatRequest("product-1", null, "x".repeat(1001))));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void sendingChatMessageRequiresTextOrOfferBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.send(buyer, "BUYER", "chat-1", new SendMessageRequest("  ", null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void sendingChatMessageRejectsOversizedTextBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.send(buyer, "BUYER", "chat-1", new SendMessageRequest("x".repeat(2001), null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void offerResponseRejectsUnsupportedActionBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.respond(buyer, "BUYER", "chat-1", "offer-1", new RespondOfferRequest("approve", null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }

    @Test
    void chatRejectsRolesOtherThanBuyerAndSellerBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.list(buyer, "ADMIN"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }
}
