package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class OtpDeliveryService {
    @Value("${app.otp.email.from:}") private String emailFrom;
    @Value("${app.otp.resend.api-key:}") private String resendApiKey;
    @Value("${app.otp.msg91.auth-key:}") private String msg91AuthKey;
    @Value("${app.otp.msg91.template-id:}") private String msg91TemplateId;
    @Value("${app.otp.msg91.country-code:91}") private String countryCode;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(10))
            .build();

    public void sendOtp(String identifier, String type, String otp, int expiryMinutes) throws Exception {
        if ("EMAIL".equals(type)) {
            sendEmail(identifier, otp, expiryMinutes);
        } else {
            sendSms(identifier, otp, expiryMinutes);
        }
    }

    private void sendEmail(String email, String otp, int expiryMinutes) throws Exception {
        if (resendApiKey.isBlank() || emailFrom.isBlank()) {
            throw new IllegalStateException("Email OTP provider is not configured");
        }

        String subject = "KuraliUpdates Bazaar verification code";
        String text = "Your KuraliUpdates Bazaar verification code is " + otp
                + ". It expires in " + expiryMinutes
                + " minutes. If you did not request this code, ignore this message.";

        String json = "{"
                + "\"from\":\"" + jsonEscape(emailFrom) + "\","
                + "\"to\":[\"" + jsonEscape(email) + "\"],"
                + "\"subject\":\"" + jsonEscape(subject) + "\","
                + "\"text\":\"" + jsonEscape(text) + "\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .timeout(java.time.Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Email provider rejected OTP request");
        }
    }

    private void sendSms(String phone, String otp, int expiryMinutes) throws Exception {
        if (msg91AuthKey.isBlank() || msg91TemplateId.isBlank()) {
            throw new IllegalStateException("SMS OTP provider is not configured");
        }

        String mobile = countryCode + phone;
        String query = "otp=" + enc(otp)
                + "&mobile=" + enc(mobile)
                + "&unicode=0"
                + "&otp_expiry=" + expiryMinutes
                + "&otp_length=6"
                + "&template_id=" + enc(msg91TemplateId)
                + "&realTimeResponse=1"
                + "&authkey=" + enc(msg91AuthKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://control.msg91.com/api/v5/otp?" + query))
                .timeout(java.time.Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

        String body = response.body() == null ? "" : response.body();
        if (response.statusCode() / 100 != 2
                || body.contains("\"type\":\"error\"")
                || body.contains("\"code\":\"201\"")) {
            throw new IllegalStateException("SMS provider rejected OTP request");
        }
    }

    private String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String jsonEscape(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}
