package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.NegotiationChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/negotiations")
@RequiredArgsConstructor
public class NegotiationChatController {
    private final NegotiationChatService negotiationChatService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication authentication) {
        return ResponseEntity.ok(negotiationChatService.list(requireUser(authentication)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> open(@RequestBody OpenChatRequest request, Authentication authentication) {
        return ResponseEntity.ok(negotiationChatService.open(requireUser(authentication), request));
    }

    @PostMapping("/{chatId}/messages")
    public ResponseEntity<Map<String, Object>> send(@PathVariable String chatId, @RequestBody SendMessageRequest request, Authentication authentication) {
        return ResponseEntity.ok(negotiationChatService.send(requireUser(authentication), chatId, request));
    }

    @PostMapping("/{chatId}/offers/{offerId}/respond")
    public ResponseEntity<Map<String, Object>> respond(@PathVariable String chatId, @PathVariable String offerId, @RequestBody RespondOfferRequest request, Authentication authentication) {
        return ResponseEntity.ok(negotiationChatService.respond(requireUser(authentication), chatId, offerId, request));
    }

    private UserEntity requireUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "An authenticated session is required to use bargaining chat");
        }
        return user;
    }

    public record OpenChatRequest(String productId, BigDecimal startingOfferPrice, String openingMessage) {}
    public record SendMessageRequest(String text, BigDecimal offerPrice) {}
    public record RespondOfferRequest(String action, BigDecimal counterPrice) {}
}
