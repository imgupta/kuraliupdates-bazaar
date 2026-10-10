package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpDeliveryService {
    @Value("${app.otp.email.from:}") private String emailFrom;
    @Value("${app.otp.resend.api-key:}") private String resendApiKey;
    @Value("${app.otp.msg91.auth-key:}") private String msg91AuthKey;
    @Value("${app.otp.msg91.template-id:}") private String msg91TemplateId;
    @Value("${app.otp.msg91.country-code:91}") private String countryCode;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public void sendOtp(String identifier, String type, String otp, int expiryMinutes) throws Exception {
        if ("EMAIL".equals(type)) {
            sendEmail(identifier, otp, expiryMinutes);
        } else {
            sendSms(identifier, otp, expiryMinutes);
        }
    }

    public void sendDeliveryOtpEmail(String email, String otp) throws Exception {
        if (email == null || email.isBlank() || otp == null || !otp.matches("\\d{4}")) {
            throw new IllegalArgumentException("A customer email and valid 4-digit delivery OTP are required");
        }
        if (resendApiKey.isBlank() || emailFrom.isBlank()) {
            throw new IllegalStateException("Email OTP provider is not configured");
        }

        String subject = "KuraliUpdates Bazaar delivery handover code";
        String text = "Your KuraliUpdates Bazaar delivery handover OTP is " + otp
                + ". Share it with the delivery partner only when your order is physically handed over to you. "
                + "If you did not request this message, contact KuraliUpdates Bazaar support.";
        String json = "{"
                + "\\"from\\":\\"" + jsonEscape(emailFrom) + "\\","
                + "\\"to\\":[\\"" + jsonEscape(email) + "\\"],"
                + "\\"subject\\":\\"" + jsonEscape(subject) + "\\","
                + "\\"text\\":\\"" + jsonEscape(text) + "\\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            log.warn("Delivery OTP email rejected: status={}", response.statusCode());
            throw new IllegalStateException("Email provider rejected delivery OTP request");
        }
        log.info("Delivery OTP email accepted for recipient={}", maskEmail(email));
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
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() / 100 != 2) {
            String providerBody = response.body() == null ? "" : response.body().trim();
            if (providerBody.length() > 500) {
                providerBody = providerBody.substring(0, 500);
            }
            log.warn("Resend rejected OTP email: status={}, response={}",
                    response.statusCode(), providerBody);
            throw new IllegalStateException(
                    "Email provider rejected OTP request (HTTP " + response.statusCode() + ")");
        }

        log.info("Resend accepted OTP email for recipient={}", maskEmail(email));
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
                .timeout(Duration.ofSeconds(10))
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

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
