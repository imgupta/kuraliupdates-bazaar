package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import com.kuraliupdates.bazaar.service.NegotiationChatService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NegotiationChatControllerAuthorizationTest {
    @Mock private NegotiationChatService negotiationChatService;
    @Mock private E2eRunTagging e2eRunTagging;
    @InjectMocks private NegotiationChatController controller;

    @Test
    void listUsesTheAuthenticatedPrincipalAndRequestedRole() {
        UserEntity buyer = user("buyer-1", "BUYER");
        List<Map<String, Object>> chats = List.of(Map.of("chatId", "CHAT-1"));
        when(negotiationChatService.list(buyer, "BUYER")).thenReturn(chats);

        var response = controller.list("BUYER", authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chats, response.getBody());
        verify(negotiationChatService).list(buyer, "BUYER");
    }

    @Test
    void notificationsUseTheAuthenticatedPrincipalAndRequestedRole() {
        UserEntity seller = user("seller-1", "SELLER");
        List<Map<String, Object>> notifications = List.of(Map.of("notificationId", "N-1"));
        when(negotiationChatService.notifications(seller, "SELLER")).thenReturn(notifications);

        var response = controller.notifications("SELLER", authentication(seller));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(notifications, response.getBody());
        verify(negotiationChatService).notifications(seller, "SELLER");
    }

    @Test
    void openPassesAuthenticatedBuyerAndValidatedRunTagToService() {
        UserEntity buyer = user("buyer-1", "BUYER");
        var request = new NegotiationChatController.OpenChatRequest(
                "PRODUCT-1", BigDecimal.valueOf(50), "Can you offer a better price?");
        Map<String, Object> opened = Map.of("chatId", "CHAT-1");
        when(e2eRunTagging.optionalRunId("E2E-SELLER-01", "flow-token")).thenReturn("E2E-SELLER-01");
        when(negotiationChatService.open(buyer, request, "E2E-SELLER-01")).thenReturn(opened);

        var response = controller.open(request, "E2E-SELLER-01", "flow-token", authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(opened, response.getBody());
        verify(e2eRunTagging).optionalRunId("E2E-SELLER-01", "flow-token");
        verify(negotiationChatService).open(buyer, request, "E2E-SELLER-01");
    }

    @Test
    void buyerSessionCanOpenBargainForAccountWhosePrimaryRoleIsAdmin() {
        UserEntity adminPrimary = user("admin-1", "ADMIN");
        var request = new NegotiationChatController.OpenChatRequest("PRODUCT-1", BigDecimal.valueOf(50), "Offer");
        Map<String, Object> opened = Map.of("chatId", "CHAT-ADMIN-BUYER");
        when(negotiationChatService.open(adminPrimary, request, null)).thenReturn(opened);

        var response = controller.open(request, null, null, authentication(adminPrimary, "BUYER"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(opened, response.getBody());
        verify(negotiationChatService).open(adminPrimary, request, null);
    }

    @Test
    void buyerPrimaryAccountCannotUseSellerRoleByChangingRequestHeader() {
        UserEntity buyer = user("buyer-1", "BUYER");
        ApiException error = assertThrows(ApiException.class,
                () -> controller.list("SELLER", authentication(buyer)));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(negotiationChatService);
    }

    @Test
    void notificationReadPassesAuthenticatedPrincipalAndActiveRole() {
        UserEntity buyer = user("buyer-1", "BUYER");

        var response = controller.markNotificationRead("NOTIFY-1", "BUYER", authentication(buyer));

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(negotiationChatService).markNotificationRead(buyer, "BUYER", "NOTIFY-1");
    }

    @Test
    void messageSendPassesAuthenticatedPrincipalAndActiveRole() {
        UserEntity seller = user("seller-1", "SELLER");
        var request = new NegotiationChatController.SendMessageRequest("The price is firm", null);
        Map<String, Object> message = Map.of("messageId", "MSG-1");
        when(negotiationChatService.send(seller, "SELLER", "CHAT-1", request)).thenReturn(message);

        var response = controller.send("CHAT-1", "SELLER", request, authentication(seller));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(message, response.getBody());
        verify(negotiationChatService).send(seller, "SELLER", "CHAT-1", request);
    }

    @Test
    void offerResponsePassesAuthenticatedPrincipalAndActiveRole() {
        UserEntity buyer = user("buyer-1", "BUYER");
        var request = new NegotiationChatController.RespondOfferRequest("COUNTER", BigDecimal.valueOf(45));
        Map<String, Object> result = Map.of("status", "COUNTERED");
        when(negotiationChatService.respond(buyer, "BUYER", "CHAT-1", "OFFER-1", request))
                .thenReturn(result);

        var response = controller.respond("CHAT-1", "OFFER-1", "BUYER", request, authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(result, response.getBody());
        verify(negotiationChatService).respond(buyer, "BUYER", "CHAT-1", "OFFER-1", request);
    }

    @Test
    void missingOrMalformedAuthenticationCannotReadOrMutateChats() {
        Authentication malformed = mock(Authentication.class);
        when(malformed.getPrincipal()).thenReturn("not-a-user-principal");

        assertUnauthorized(() -> controller.list("BUYER", null));
        assertUnauthorized(() -> controller.notifications("BUYER", malformed));
        assertUnauthorized(() -> controller.markNotificationRead("N-1", "BUYER", null));
        assertUnauthorized(() -> controller.send("CHAT-1", "BUYER",
                new NegotiationChatController.SendMessageRequest("hello", null), malformed));
        assertUnauthorized(() -> controller.respond("CHAT-1", "O-1", "BUYER",
                new NegotiationChatController.RespondOfferRequest("ACCEPT", null), null));
        assertUnauthorized(() -> controller.open(
                new NegotiationChatController.OpenChatRequest("PRODUCT-1", null, null),
                null, null, malformed));

        verifyNoInteractions(negotiationChatService);
    }

    private void assertUnauthorized(org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action);
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
    }

    private Authentication authentication(UserEntity user) {
        return authentication(user, user.getRole());
    }

    private Authentication authentication(UserEntity user, String activeRole) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(user);
        when(authentication.getAuthorities()).thenReturn(List.<GrantedAuthority>of(new SimpleGrantedAuthority("ROLE_" + activeRole)));
        return authentication;
    }

    private UserEntity user(String id, String role) {
        return UserEntity.builder().userId(id).email(id + "@example.test")
                .name(id).role(role).build();
    }
}
