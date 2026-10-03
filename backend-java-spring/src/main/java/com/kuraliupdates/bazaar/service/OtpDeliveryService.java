package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class OtpDeliveryService {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    @Value("${app.otp.email.from:}") private String emailFrom;
    @Value("${app.otp.msg91.auth-key:}") private String msg91AuthKey;
    @Value("${app.otp.msg91.template-id:}") private String msg91TemplateId;
    @Value("${app.otp.msg91.country-code:91}") private String countryCode;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void sendOtp(String identifier, String type, String otp, int expiryMinutes) throws Exception {
        if ("EMAIL".equals(type)) sendEmail(identifier, otp, expiryMinutes);
        else sendSms(identifier, otp, expiryMinutes);
    }

    private void sendEmail(String email, String otp, int expiryMinutes) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null || emailFrom.isBlank()) {
            throw new IllegalStateException("Email OTP provider is not configured");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(emailFrom);
        message.setTo(email);
        message.setSubject("KuraliUpdates Bazaar verification code");
        message.setText("Your KuraliUpdates Bazaar verification code is " + otp
                + ". It expires in " + expiryMinutes
                + " minutes. If you did not request this code, ignore this message.");
        sender.send(message);
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
}