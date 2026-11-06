package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.controller.NegotiationChatController.OpenChatRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.RespondOfferRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.SendMessageRequest;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.springframework.jdbc.core.RowMapper;
import org.mockito.ArgumentMatchers;

import java.util.List;
import java.util.Map;
import java.util.Optional;
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
import static org.mockito.Mockito.when;

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
    void buyerCannotSendMessageToAnotherBuyersConversation() {
        Map<String, Object> chat = Map.of(
                "id", "chat-1",
                "buyerEmail", "owner@example.test",
                "sellerId", "seller-1",
                "sellerStatus", "APPROVED");
        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat));

        ApiException error = assertThrows(ApiException.class,
                () -> service.send(buyer, "BUYER", "chat-1", new SendMessageRequest("hello", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(sellerRepository);
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .queryForMap(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .update(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
    }

    @Test
    void sellerCannotSendMessageToAnotherStoresConversation() {
        UserEntity seller = UserEntity.builder()
                .userId("seller-user-1")
                .email("seller@example.test")
                .name("Test Seller")
                .role("SELLER")
                .build();
        when(sellerRepository.findByEmailIgnoreCase("seller@example.test"))
                .thenReturn(Optional.of(SellerEntity.builder()
                        .sellerId("seller-2")
                        .email("seller@example.test")
                        .status("APPROVED")
                        .build()));
        Map<String, Object> chat = Map.of(
                "id", "chat-2",
                "buyerEmail", "buyer@example.test",
                "sellerId", "seller-1",
                "sellerStatus", "APPROVED");
        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat));

        ApiException error = assertThrows(ApiException.class,
                () -> service.send(seller, "SELLER", "chat-2", new SendMessageRequest("hello", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .queryForMap(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .update(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
    }

    @Test
    void buyerCannotRespondToAnOfferInAnotherBuyersConversation() {
        Map<String, Object> chat = Map.of(
                "id", "chat-foreign",
                "buyerEmail", "owner@example.test",
                "sellerId", "seller-1",
                "sellerStatus", "APPROVED");
        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat));

        ApiException error = assertThrows(ApiException.class,
                () -> service.respond(buyer, "BUYER", "chat-foreign", "offer-foreign",
                        new RespondOfferRequest("ACCEPT", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .queryForMap(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .update(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
    }

    @Test
    void sellerCannotRespondToAnOfferInAnotherStoresConversation() {
        UserEntity seller = UserEntity.builder()
                .userId("seller-user-1").email("seller@example.test")
                .name("Test Seller").role("SELLER").build();
        when(sellerRepository.findByEmailIgnoreCase("seller@example.test"))
                .thenReturn(Optional.of(SellerEntity.builder().sellerId("seller-2")
                        .email("seller@example.test").status("APPROVED").build()));
        Map<String, Object> chat = Map.of(
                "id", "chat-other-store",
                "buyerEmail", "buyer@example.test",
                "sellerId", "seller-1",
                "sellerStatus", "APPROVED");
        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat));

        ApiException error = assertThrows(ApiException.class,
                () -> service.respond(seller, "SELLER", "chat-other-store", "offer-foreign",
                        new RespondOfferRequest("ACCEPT", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .queryForMap(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .update(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
    }

    @Test
    void buyerNotificationReadIsScopedToTheAuthenticatedRecipientAndRole() {
        service.markNotificationRead(buyer, "BUYER", "notification-1");

        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("WHERE NOTIFICATION_ID=? AND LOWER(RECIPIENT_EMAIL)=? AND RECIPIENT_ROLE=?"),
                ArgumentMatchers.eq("notification-1"),
                ArgumentMatchers.eq("buyer@example.test"),
                ArgumentMatchers.eq("BUYER"));
    }

    @Test
    void acceptingPendingOfferStoresAgreedPriceRejectsOtherPendingOffersAndNotifiesParticipant() {
        Map<String, Object> chat = new java.util.HashMap<>();
        chat.put("id", "chat-accept");
        chat.put("buyerEmail", "buyer@example.test");
        chat.put("sellerId", "seller-1");
        chat.put("sellerStatus", "APPROVED");
        chat.put("originalPrice", new java.math.BigDecimal("100.00"));

        Map<String, Object> offer = new java.util.HashMap<>();
        offer.put("id", "offer-accept");
        offer.put("senderRole", "SELLER");
        offer.put("price", new java.math.BigDecimal("80.00"));
        offer.put("status", "PENDING");

        Map<String, Object> acceptedChat = new java.util.HashMap<>(chat);
        acceptedChat.put("bargainStatus", "ACCEPTED");
        acceptedChat.put("currentAgreedPrice", new java.math.BigDecimal("80.00"));

        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat), List.of(offer), List.of(acceptedChat), List.of());
        when(jdbc.queryForMap(
                ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any()))
                .thenReturn(Map.of(
                        "BARGAIN_STATUS", "PENDING_SELLER",
                        "EXPIRES_AT", java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().plusHours(1))));
        when(sellerRepository.findById("seller-1"))
                .thenReturn(Optional.of(SellerEntity.builder()
                        .sellerId("seller-1").email("seller@example.test").status("APPROVED").build()));

        Map<String, Object> result = service.respond(buyer, "BUYER", "chat-accept", "offer-accept",
                new RespondOfferRequest("ACCEPT", null));

        assertEquals("ACCEPTED", result.get("bargainStatus"));
        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("UPDATE CHAT_MESSAGES SET OFFER_STATUS='ACCEPTED'"),
                ArgumentMatchers.eq("offer-accept"), ArgumentMatchers.eq("chat-accept"));
        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("UPDATE CHAT_MESSAGES SET OFFER_STATUS='REJECTED'"),
                ArgumentMatchers.eq("chat-accept"), ArgumentMatchers.eq("offer-accept"));
        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("UPDATE NEGOTIATION_CHATS SET CURRENT_AGREED_PRICE=?"),
                ArgumentMatchers.eq(new java.math.BigDecimal("80.00")),
                ArgumentMatchers.any(java.sql.Timestamp.class),
                ArgumentMatchers.any(java.sql.Timestamp.class),
                ArgumentMatchers.eq("chat-accept"));
        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("INSERT INTO CHAT_MESSAGES"),
                ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(jdbc).update(
                ArgumentMatchers.contains("INSERT INTO BARGAIN_NOTIFICATIONS"),
                ArgumentMatchers.<Object[]>any());
        org.mockito.Mockito.verify(sellerRepository).findById("seller-1");
    }

    @Test
    void acceptedOfferCannotBeAcceptedAgain() {
        Map<String, Object> chat = new java.util.HashMap<>();
        chat.put("id", "chat-accepted");
        chat.put("buyerEmail", "buyer@example.test");
        chat.put("sellerId", "seller-1");
        chat.put("sellerStatus", "APPROVED");

        Map<String, Object> offer = new java.util.HashMap<>();
        offer.put("id", "offer-accepted");
        offer.put("senderRole", "SELLER");
        offer.put("price", new java.math.BigDecimal("80.00"));
        offer.put("status", "ACCEPTED");

        Map<String, Object> lifecycle = new java.util.HashMap<>();
        lifecycle.put("BARGAIN_STATUS", "ACCEPTED");
        lifecycle.put("EXPIRES_AT", null);

        when(jdbc.query(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                ArgumentMatchers.<Object[]>any()))
                .thenReturn(List.of(chat), List.of(offer));
        when(jdbc.queryForMap(
                ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any()))
                .thenReturn(lifecycle);

        ApiException error = assertThrows(ApiException.class,
                () -> service.respond(buyer, "BUYER", "chat-accepted", "offer-accepted",
                        new RespondOfferRequest("ACCEPT", null)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        org.mockito.Mockito.verify(jdbc, org.mockito.Mockito.never())
                .update(ArgumentMatchers.anyString(), ArgumentMatchers.<Object[]>any());
        verifyNoInteractions(sellerRepository);
    }

    @Test
    void chatRejectsRolesOtherThanBuyerAndSellerBeforeDatabaseAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.list(buyer, "ADMIN"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(jdbc, sellerRepository);
    }
}
