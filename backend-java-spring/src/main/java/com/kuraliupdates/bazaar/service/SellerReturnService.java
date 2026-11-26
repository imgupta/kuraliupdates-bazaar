package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SellerReturnService {
    private final JdbcTemplate jdbc;
    private final DeliveryAgentRepository agents;

    @Transactional
    public Map<String,Object> request(String orderId, String itemId, int quantity, String reason, UserEntity buyer) {
        if (quantity < 1 || reason == null || reason.isBlank() || reason.trim().length() > 500)
            throw new ApiException(HttpStatus.BAD_REQUEST, "A valid quantity and return reason are required");
        Map<String,Object> order = one("SELECT ORDER_ID,SELLER_ID,BUYER_USER_ID,STATUS,PAYMENT_METHOD FROM ORDERS WHERE ORDER_ID=? FOR UPDATE", orderId);
        if (!buyer.getUserId().equals(str(order,"BUYER_USER_ID")))
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        if (!Set.of("DELIVERED","COMPLETED").contains(str(order,"STATUS").toUpperCase(Locale.ROOT)))
            throw new ApiException(HttpStatus.CONFLICT, "A return can only be requested for a delivered order");
        Map<String,Object> item = one("SELECT ITEM_ID,QUANTITY,UNIT_PRICE,NEGOTIATED_PRICE,TOTAL_PRICE FROM ORDER_ITEMS WHERE ITEM_ID=? AND ORDER_ID=?", itemId, orderId);
        int already = Optional.ofNullable(jdbc.queryForObject("SELECT NVL(SUM(QUANTITY),0) FROM SELLER_RETURN_CASES WHERE ITEM_ID=? AND STATUS NOT IN ('REJECTED','CANCELLED')", Integer.class, itemId)).orElse(0);
        if (quantity > ((Number)item.get("QUANTITY")).intValue() - already)
            throw new ApiException(HttpStatus.CONFLICT, "Return quantity exceeds the unreturned quantity");
        BigDecimal lineTotal = (BigDecimal)item.get("TOTAL_PRICE");
        BigDecimal unit = lineTotal.divide(BigDecimal.valueOf(((Number)item.get("QUANTITY")).intValue()), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal amount = unit.multiply(BigDecimal.valueOf(quantity));
        String id = id("RET");
        LocalDateTime now = LocalDateTime.now();
        String sellerId = str(order,"SELLER_ID"), method = str(order,"PAYMENT_METHOD").toUpperCase(Locale.ROOT);
        if (!Set.of("UPI","COD").contains(method)) throw new ApiException(HttpStatus.CONFLICT,"Unsupported original payment mode for refund");
        jdbc.update("INSERT INTO SELLER_RETURN_CASES (RETURN_ID,ORDER_ID,ITEM_ID,BUYER_USER_ID,SELLER_ID,QUANTITY,RETURN_AMOUNT,ORIGINAL_PAYMENT_METHOD,REASON,STATUS,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,?,?,?,?,'REQUESTED',?,?)",
                id, orderId, itemId, buyer.getUserId(), sellerId, quantity, amount, method, reason.trim(), now, now);
        event(id,buyer.getUserId(),"BUYER","RETURN_REQUESTED",null,"REQUESTED",null,reason.trim());
        return buyerCase(id,buyer.getUserId());
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> buyerCases(String buyerId) {
        return jdbc.queryForList("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",ITEM_ID AS \"itemId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",ORIGINAL_PAYMENT_METHOD AS \"originalPaymentMethod\",REASON AS \"reason\",STATUS AS \"status\",REFUND_METHOD AS \"refundMethod\",REFUND_REFERENCE AS \"refundReference\",CREATED_AT AS \"createdAt\",UPDATED_AT AS \"updatedAt\" FROM SELLER_RETURN_CASES WHERE BUYER_USER_ID=? ORDER BY CREATED_AT DESC",buyerId);
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> sellerCases(String sellerId) {
        return jdbc.queryForList("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",ITEM_ID AS \"itemId\",BUYER_USER_ID AS \"buyerUserId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",ORIGINAL_PAYMENT_METHOD AS \"originalPaymentMethod\",REASON AS \"reason\",STATUS AS \"status\",DELIVERY_AGENT_ID AS \"deliveryAgentId\",PICKUP_REFERENCE AS \"pickupReference\",SELLER_RECEIPT_REFERENCE AS \"sellerReceiptReference\",REFUND_METHOD AS \"refundMethod\",REFUND_REFERENCE AS \"refundReference\",CREATED_AT AS \"createdAt\" FROM SELLER_RETURN_CASES WHERE SELLER_ID=? ORDER BY CREATED_AT DESC",sellerId);
    }

    @Transactional
    public Map<String,Object> sellerDecision(String sellerId,String returnId,boolean approve,String reason,String actor) {
        Map<String,Object> c=locked(returnId,sellerId);
        requireStatus(c,"REQUESTED");
        if(!approve && (reason==null || reason.isBlank())) throw new ApiException(HttpStatus.BAD_REQUEST,"A rejection reason is required");
        String next=approve?"APPROVED":"REJECTED";
        jdbc.update("UPDATE SELLER_RETURN_CASES SET STATUS=?,SELLER_DECISION_REASON=?,UPDATED_AT=? WHERE RETURN_ID=?",next,reason,LocalDateTime.now(),returnId);
        event(returnId,actor,"SELLER",approve?"RETURN_APPROVED":"RETURN_REJECTED","REQUESTED",next,null,reason);
        return sellerCase(returnId,sellerId);
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> availablePickupJobs(UserEntity user) {
        DeliveryAgentEntity agent=agent(user);
        if(!"ACTIVE".equalsIgnoreCase(agent.getStatus()) || Boolean.FALSE.equals(agent.getAvailableForJobs())) return List.of();
        return jdbc.queryForList("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",SELLER_ID AS \"sellerId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",REASON AS \"reason\",STATUS AS \"status\" FROM SELLER_RETURN_CASES WHERE STATUS='APPROVED' AND DELIVERY_AGENT_ID IS NULL ORDER BY CREATED_AT");
    }

    @Transactional
    public Map<String,Object> claim(String returnId,UserEntity user) {
        DeliveryAgentEntity agent=agent(user);
        if(!"APPROVED".equalsIgnoreCase(agent.getStatus()) || Boolean.FALSE.equals(agent.getAvailableForJobs()))
            throw new ApiException(HttpStatus.FORBIDDEN,"An approved, available delivery profile is required");
        Map<String,Object> c=locked(returnId,null);
        requireStatus(c,"APPROVED");
        jdbc.update("UPDATE SELLER_RETURN_CASES SET DELIVERY_AGENT_ID=?,STATUS='PICKUP_ASSIGNED',UPDATED_AT=? WHERE RETURN_ID=?",agent.getAgentId(),LocalDateTime.now(),returnId);
        event(returnId,user.getUserId(),"DELIVERY","RETURN_PICKUP_ASSIGNED","APPROVED","PICKUP_ASSIGNED",agent.getAgentId(),null);
        return deliveryCase(returnId,agent.getAgentId());
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> assigned(UserEntity user) {
        DeliveryAgentEntity a=agent(user);
        return jdbc.queryForList("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",SELLER_ID AS \"sellerId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",REASON AS \"reason\",STATUS AS \"status\",PICKUP_REFERENCE AS \"pickupReference\" FROM SELLER_RETURN_CASES WHERE DELIVERY_AGENT_ID=? AND STATUS IN ('PICKUP_ASSIGNED','PICKED_UP') ORDER BY UPDATED_AT",a.getAgentId());
    }

    @Transactional
    public Map<String,Object> pickup(String returnId,String reference,UserEntity user) {
        DeliveryAgentEntity a=agent(user); Map<String,Object> c=locked(returnId,null); assignedTo(c,a);
        requireStatus(c,"PICKUP_ASSIGNED"); requireReference(reference,"Collection proof/reference");
        jdbc.update("UPDATE SELLER_RETURN_CASES SET STATUS='PICKED_UP',PICKUP_REFERENCE=?,UPDATED_AT=? WHERE RETURN_ID=?",reference.trim(),LocalDateTime.now(),returnId);
        event(returnId,user.getUserId(),"DELIVERY","RETURN_COLLECTED","PICKUP_ASSIGNED","PICKED_UP",reference,null);
        return deliveryCase(returnId,a.getAgentId());
    }

    @Transactional
    public Map<String,Object> handover(String returnId,String reference,UserEntity user) {
        DeliveryAgentEntity a=agent(user); Map<String,Object> c=locked(returnId,null); assignedTo(c,a);
        requireStatus(c,"PICKED_UP"); requireReference(reference,"Seller handover proof/reference");
        jdbc.update("UPDATE SELLER_RETURN_CASES SET STATUS='RECEIVED_BY_SELLER',SELLER_RECEIPT_REFERENCE=?,UPDATED_AT=? WHERE RETURN_ID=?",reference.trim(),LocalDateTime.now(),returnId);
        event(returnId,user.getUserId(),"DELIVERY","RETURN_HANDED_TO_SELLER","PICKED_UP","RECEIVED_BY_SELLER",reference,null);
        return deliveryCase(returnId,a.getAgentId());
    }

    @Transactional
    public Map<String,Object> sellerRefund(String sellerId,String returnId,String action,String method,String reference,String actor) {
        Map<String,Object> c=locked(returnId,sellerId); String status=str(c,"STATUS");
        if("INITIATE".equalsIgnoreCase(action)) {
            requireStatus(c,"RECEIVED_BY_SELLER");
            jdbc.update("UPDATE SELLER_RETURN_CASES SET STATUS='REFUND_PENDING',REFUND_METHOD=?,UPDATED_AT=? WHERE RETURN_ID=?",str(c,"ORIGINAL_PAYMENT_METHOD"),LocalDateTime.now(),returnId);
            event(returnId,actor,"SELLER","REFUND_PREPARED",status,"REFUND_PENDING",str(c,"ORIGINAL_PAYMENT_METHOD"),"Seller must execute refund outside platform");
        } else if("COMPLETE".equalsIgnoreCase(action)) {
            requireStatus(c,"REFUND_PENDING");
            String original=str(c,"ORIGINAL_PAYMENT_METHOD").toUpperCase(Locale.ROOT);
            String supplied=method==null?"":method.trim().toUpperCase(Locale.ROOT);
            if(!original.equals(supplied)) throw new ApiException(HttpStatus.CONFLICT,"Refund must use the original payment mode: "+original);
            requireReference(reference,"Actual seller refund proof/reference");
            jdbc.update("UPDATE SELLER_RETURN_CASES SET STATUS='REFUNDED',REFUND_METHOD=?,REFUND_REFERENCE=?,REFUND_COMPLETED_AT=?,UPDATED_AT=? WHERE RETURN_ID=?",original,reference.trim(),LocalDateTime.now(),LocalDateTime.now(),returnId);
            event(returnId,actor,"SELLER","REFUND_RECORDED",status,"REFUNDED",reference,"Seller-confirmed external refund; platform did not move funds");
        } else throw new ApiException(HttpStatus.BAD_REQUEST,"Action must be INITIATE or COMPLETE");
        return sellerCase(returnId,sellerId);
    }

    private Map<String,Object> buyerCase(String id,String buyer){return one("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",ITEM_ID AS \"itemId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",ORIGINAL_PAYMENT_METHOD AS \"originalPaymentMethod\",STATUS AS \"status\",REASON AS \"reason\" FROM SELLER_RETURN_CASES WHERE RETURN_ID=? AND BUYER_USER_ID=?",id,buyer);}
    private Map<String,Object> sellerCase(String id,String seller){return one("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",ITEM_ID AS \"itemId\",QUANTITY AS \"quantity\",RETURN_AMOUNT AS \"returnAmount\",ORIGINAL_PAYMENT_METHOD AS \"originalPaymentMethod\",STATUS AS \"status\",REASON AS \"reason\",REFUND_METHOD AS \"refundMethod\",REFUND_REFERENCE AS \"refundReference\" FROM SELLER_RETURN_CASES WHERE RETURN_ID=? AND SELLER_ID=?",id,seller);}
    private Map<String,Object> deliveryCase(String id,String agent){return one("SELECT RETURN_ID AS \"returnId\",ORDER_ID AS \"orderId\",SELLER_ID AS \"sellerId\",STATUS AS \"status\",PICKUP_REFERENCE AS \"pickupReference\" FROM SELLER_RETURN_CASES WHERE RETURN_ID=? AND DELIVERY_AGENT_ID=?",id,agent);}
    private Map<String,Object> locked(String id,String seller){try{return seller==null?one("SELECT * FROM SELLER_RETURN_CASES WHERE RETURN_ID=? FOR UPDATE",id):one("SELECT * FROM SELLER_RETURN_CASES WHERE RETURN_ID=? AND SELLER_ID=? FOR UPDATE",id,seller);}catch(ApiException e){throw e;}}
    private Map<String,Object> one(String sql,Object... args){try{return jdbc.queryForMap(sql,args);}catch(org.springframework.dao.EmptyResultDataAccessException e){throw new ApiException(HttpStatus.NOT_FOUND,"Return case or related order was not found");}}
    private DeliveryAgentEntity agent(UserEntity user){return agents.findByUserId(user.getUserId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Delivery profile not found"));}
    private void assignedTo(Map<String,Object> c,DeliveryAgentEntity a){if(!a.getAgentId().equals(str(c,"DELIVERY_AGENT_ID")))throw new ApiException(HttpStatus.FORBIDDEN,"Return pickup is not assigned to your profile");}
    private void requireStatus(Map<String,Object> c,String status){if(!status.equalsIgnoreCase(str(c,"STATUS")))throw new ApiException(HttpStatus.CONFLICT,"Return case must be "+status);}
    private String str(Map<String,Object> m,String key){Object v=m.get(key);return v==null?"":String.valueOf(v);}
    private void requireReference(String value,String label){if(value==null||!value.trim().matches("[A-Za-z0-9._:/-]{4,100}"))throw new ApiException(HttpStatus.BAD_REQUEST,label+" is required");}
    private String id(String prefix){return prefix+"-"+UUID.randomUUID().toString().replace("-","").substring(0,20).toUpperCase(Locale.ROOT);}
    private void event(String id,String actor,String role,String type,String from,String to,String ref,String note){jdbc.update("INSERT INTO SELLER_RETURN_EVENTS (EVENT_ID,RETURN_ID,ACTOR_USER_ID,ACTOR_ROLE,EVENT_TYPE,FROM_STATUS,TO_STATUS,REFERENCE_VALUE,NOTE,CREATED_AT) VALUES (?,?,?,?,?,?,?,?,?,?)",id("REV"),id,actor,role,type,from,to,ref,note,LocalDateTime.now());}
}
