package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.SecurityConfig;
import com.kuraliupdates.bazaar.config.SessionAuthenticationFilter;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerRegistrationDraftService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = SellerRegistrationDraftController.class)
@Import({SecurityConfig.class, SessionAuthenticationFilter.class})
class SellerRegistrationDraftControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private SellerRegistrationDraftService drafts;

    @Test
    void anonymousCannotReadWriteOrDeleteDraft() throws Exception {
        mockMvc.perform(get("/sellers/me/draft")).andExpect(status().is4xxClientError());
        mockMvc.perform(put("/sellers/me/draft").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentStep\":2}")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete("/sellers/me/draft")).andExpect(status().is4xxClientError());

        verifyNoInteractions(drafts);
    }

    @Test
    void readUsesAuthenticatedAccountIdAndIgnoresCallerSuppliedIdentity() throws Exception {
        when(authService.requireUser("buyer-session")).thenReturn(user("owner-1", "BUYER"));
        when(drafts.get("owner-1")).thenReturn(Map.of("exists", false));

        mockMvc.perform(get("/sellers/me/draft?userId=other-account")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));

        verify(drafts).get("owner-1");
        verifyNoMoreInteractions(drafts);
    }

    @Test
    void writeAndDeleteUseAuthenticatedAccountId() throws Exception {
        when(authService.requireUser("buyer-session")).thenReturn(user("owner-1", "BUYER"));
        when(drafts.save(eq("owner-1"), anyMap())).thenReturn(Map.of("success", true, "currentStep", 2));

        mockMvc.perform(put("/sellers/me/draft")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"other-account\",\"currentStep\":2,\"shopName\":\"Example\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(delete("/sellers/me/draft")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(drafts).save(eq("owner-1"), anyMap());
        verify(drafts).delete("owner-1");
        verifyNoMoreInteractions(drafts);
    }

    private UserEntity user(String id, String role) {
        return UserEntity.builder().userId(id).email(id + "@example.test")
                .name(id).role(role).build();
    }
}
