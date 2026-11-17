import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getMyOrders, Product, searchProducts, sendLoginOtp, LoginChannel, verifyLoginOtp, getRegisteredRoles, createRoleHandoff, redeemRoleHandoff, getRoleOnboardingStatus, MobileRole, mobileApi, MobileRecord } from './api';
import { clearSession, MobileUser, readSession, saveSession } from './session';

type Tab = 'shop' | 'orders' | 'account';

const money = (value: unknown) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function App() {
  const [session, setSession] = useState<{ token: string; user: MobileUser } | null>(null);
  const [booting, setBooting] = useState(true);
  const [channel, setChannel] = useState<LoginChannel>('PHONE');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('shop');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [registeredRoles, setRegisteredRoles] = useState<MobileRole[]>(['BUYER']);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleStatus, setRoleStatus] = useState('');
  const [roleData, setRoleData] = useState<MobileRecord>({});
  const [roleOtp, setRoleOtp] = useState('');
  const [roleActionBusy, setRoleActionBusy] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocality, setDeliveryLocality] = useState(session?.user.locality || 'Kurali');
  const [checkoutBusy, setCheckoutBusy] = useState(false);


  useEffect(() => {
    readSession().then(setSession).finally(() => setBooting(false));
  }, []);

  const loadShop = useCallback(async () => {
    setLoadingData(true);
    try {
      const [catalogue, orderHistory] = await Promise.all([
        searchProducts(query),
        session ? getMyOrders(session.token).catch(() => []) : Promise.resolve([]),
      ]);
      setProducts(catalogue);
      setOrders(orderHistory);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load KuraliUpdates right now.');
    } finally {
      setLoadingData(false);
    }
  }, [query, session]);

  useEffect(() => {
    if (session) void loadShop();
  }, [session, loadShop]);


  const activeRole = ((session?.user.role || 'BUYER').toUpperCase() as MobileRole);
  const refreshRoleDashboard = useCallback(async () => {
    if (!session) return;
    setLoadingData(true);
    try {
      if (activeRole === 'SELLER') {
        const [profile, products, orders] = await Promise.all([mobileApi.sellerMe(session.token), mobileApi.sellerProducts(session.token), mobileApi.sellerOrders(session.token)]);
        setRoleData({ profile, products, orders });
      } else if (activeRole === 'DELIVERY') {
        const [profile, available, mine] = await Promise.all([mobileApi.deliveryMe(session.token), mobileApi.deliveryAvailable(session.token), mobileApi.deliveryMine(session.token)]);
        setRoleData({ profile, available, mine });
      } else if (activeRole === 'PROFESSIONAL') {
        if (!session.user.phone) throw new Error('Your account needs a verified phone number for Daily Help.');
        const profile = await mobileApi.dailyProfessional(session.token, session.user.phone);
        const id = String(profile.professionalId || profile.id || '');
        if (!id) throw new Error('Daily Help professional profile is not available yet. Complete registration and wait for admin review.');
        const [available, mine] = await Promise.all([mobileApi.dailyAvailable(session.token, id), mobileApi.dailyMine(session.token, id)]);
        setRoleData({ profile, available, mine });
      } else {
        setRoleData({});
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load this role dashboard.');
    } finally { setLoadingData(false); }
  }, [session, activeRole]);

  const runRoleAction = async (key: string, action: () => Promise<unknown>) => {
    setRoleActionBusy(key); setError('');
    try { await action(); await refreshRoleDashboard(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); }
    finally { setRoleActionBusy(''); }
  };

  const switchRole = useCallback(async (role: MobileRole) => {
    if (!session || roleBusy || (session.user.role || 'BUYER').toUpperCase() === role) return;
    setRoleBusy(true);
    setError('');
    setRoleStatus('');
    try {
      const handoff = await createRoleHandoff(session.token, role);
      if (!handoff.success || !handoff.code) throw new Error('This role is not available for your account.');
      const redeemed = await redeemRoleHandoff(handoff.code);
      if (!redeemed.success || !redeemed.token) throw new Error('Could not securely switch roles. Please sign in again.');
      const nextUser = redeemed.user || { ...session.user, role: redeemed.role || role };
      await saveSession(redeemed.token, nextUser);
      setSession({ token: redeemed.token, user: nextUser });
      setTab('shop');
      const status = await getRoleOnboardingStatus(redeemed.token, role).catch(() => null);
      if (status?.status && status.status !== 'APPROVED') {
        setRoleStatus(`Your ${role === 'PROFESSIONAL' ? 'Daily Help' : role.toLowerCase()} access is ${status.status.toLowerCase()}. Some actions may be unavailable until approval.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to switch role.');
    } finally {
      setRoleBusy(false);
    }
  }, [session, roleBusy]);

  useEffect(() => {
    if (!session) {
      setRegisteredRoles(['BUYER']);
      return;
    }
    let active = true;
    getRegisteredRoles(session.token)
      .then(roles => { if (active) setRegisteredRoles(roles.length ? roles : ['BUYER']); })
      .catch(() => { if (active) setRegisteredRoles(['BUYER']); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => { if (session && activeRole !== 'BUYER') void refreshRoleDashboard(); }, [session, activeRole, refreshRoleDashboard]);


  const cartItems = products.filter(p => (cart[p.productId] || 0) > 0);
  const cartTotal = cartItems.reduce((sum, p) => sum + Number(p.sellerPrice ?? p.price ?? 0) * (cart[p.productId] || 0), 0);
  const setProductQuantity = (productId: string, delta: number) => setCart(previous => {
    const next = Math.max(0, Math.min(99, (previous[productId] || 0) + delta));
    const copy = { ...previous };
    if (next === 0) delete copy[productId]; else copy[productId] = next;
    return copy;
  });
  const checkout = async () => {
    if (!session || !cartItems.length || checkoutBusy) return;
    if (!deliveryAddress.trim() || !deliveryLocality.trim()) { setError('Enter your delivery address and locality before checkout.'); return; }
    const phone = String(session.user.phone || '').replace(/\\D/g, '').slice(-10);
    if (!/^\\d{10}$/.test(phone)) { setError('Add a verified 10-digit mobile number to your account before ordering.'); return; }
    const sellerIds = [...new Set(cartItems.map(p => p.sellerId || p.seller?.sellerId).filter(Boolean))] as string[];
    if (cartItems.some(p => !(p.sellerId || p.seller?.sellerId))) { setError('A product is missing its seller identity. Refresh the catalogue before checkout.'); return; }
    if (sellerIds.length > 3) { setError('Your cart exceeds the current three-seller checkout limit. Remove items from one or more sellers.'); return; }
    setCheckoutBusy(true); setError('');
    try {
      const items = cartItems.map(p => ({ productId: p.productId, quantity: cart[p.productId] }));
      if (sellerIds.length > 1) {
        await mobileApi.buyerCheckout(session.token, { deliveryAddress: deliveryAddress.trim(), deliveryLocality: deliveryLocality.trim(), paymentMethod: 'COD', fulfilmentMode: 'DELIVERY', items });
      } else {
        await mobileApi.buyerPlaceOrder(session.token, {
          buyerName: session.user.name || 'Buyer', buyerPhone: phone, buyerEmail: session.user.email || undefined,
          deliveryAddress: deliveryAddress.trim(), deliveryLocality: deliveryLocality.trim(), sellerId: sellerIds[0],
          subtotal: cartTotal, discountAmount: 0, deliveryFee: 0, finalPayable: cartTotal,
          paymentMethod: 'COD', items,
        });
      }
      setCart({});
      await loadShop();
      setTab('orders');
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not be completed.'); }
    finally { setCheckoutBusy(false); }
  };

  const sendCode = async () => {
    if (!identifier.trim()) { setError(channel === 'PHONE' ? 'Enter your mobile number.' : 'Enter your email address.'); return; }
    setBusy(true); setError('');
    try {
      const result = await sendLoginOtp(identifier, channel);
      if (!result.success) throw new Error(result.message || 'Could not send OTP.');
      setOtpSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send OTP.'); }
    finally { setBusy(false); }
  };

  const signIn = async () => {
    if (otp.trim().length < 4) { setError('Enter the verification code.'); return; }
    setBusy(true); setError('');
    try {
      const result = await verifyLoginOtp(identifier, otp, channel);
      if (!result.success || !result.token) throw new Error(result.message || 'OTP verification failed.');
      const user = result.user || {};
      await saveSession(result.token, user);
      setSession({ token: result.token, user });
      setOtpSent(false); setOtp('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await clearSession(); setSession(null); setProducts([]); setOrders([]); setTab('shop'); };
  const greeting = useMemo(() => session?.user.name?.split(' ')[0] || 'there', [session]);

  if (booting) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#087f5b" /></SafeAreaView>;

  if (!session) return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>K</Text></View>
        <Text style={styles.brand}>KuraliUpdates</Text>
        <Text style={styles.tagline}>Your neighbourhood, a little closer.</Text>
        <View style={styles.loginCard}>
          <Text style={styles.heading}>{otpSent ? 'Verify your account' : 'Welcome back'}</Text>
          <Text style={styles.muted}>{otpSent ? `Enter the code sent to ${identifier}` : 'Sign in to shop local and manage your orders.'}</Text>
          {!otpSent ? <>
            <View style={styles.segment}>
              {(['PHONE', 'EMAIL'] as LoginChannel[]).map(item => <Pressable key={item} onPress={() => { setChannel(item); setError(''); }} style={[styles.segmentItem, channel === item && styles.segmentActive]}><Text style={[styles.segmentText, channel === item && styles.segmentTextActive]}>{item === 'PHONE' ? 'Mobile number' : 'Email'}</Text></Pressable>)}
            </View>
            <TextInput value={identifier} onChangeText={setIdentifier} placeholder={channel === 'PHONE' ? '+91 mobile number' : 'you@example.com'} keyboardType={channel === 'PHONE' ? 'phone-pad' : 'email-address'} autoCapitalize="none" style={styles.input} editable={!busy} />
          </> : <TextInput value={otp} onChangeText={setOtp} placeholder="Enter OTP" keyboardType="number-pad" textContentType="oneTimeCode" maxLength={8} style={styles.input} />}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} onPress={otpSent ? signIn : sendCode} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{otpSent ? 'Verify and sign in' : 'Send verification code'}</Text>}</Pressable>
          {otpSent && <Pressable onPress={() => { setOtpSent(false); setOtp(''); setError(''); }} style={styles.linkButton}><Text style={styles.link}>Change number or email</Text></Pressable>}
        </View>
        <Text style={styles.footnote}>Local shopping and everyday help, powered by Kurali.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View><Text style={styles.brandSmall}>KuraliUpdates</Text><Text style={styles.welcome}>Hello, {greeting}</Text></View>
        <View style={styles.localBadge}><Text style={styles.localBadgeText}>KURALI</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleTabs}>
        {registeredRoles.map(role => <Pressable key={role} disabled={roleBusy} onPress={() => void switchRole(role)} style={[styles.roleChip, (session.user.role || 'BUYER').toUpperCase() === role && styles.roleChipActive]}>
          <Text style={[styles.roleChipText, (session.user.role || 'BUYER').toUpperCase() === role && styles.roleChipTextActive]}>{role === 'PROFESSIONAL' ? 'Daily Help' : role === 'DELIVERY' ? 'Delivery' : role[0] + role.slice(1).toLowerCase()}</Text>
        </Pressable>)}
        {roleBusy && <ActivityIndicator color="#087f5b" />}
      </ScrollView>
      {!!roleStatus && <Text style={styles.roleStatus}>{roleStatus}</Text>}
      {activeRole === 'BUYER' && <View style={styles.tabs}>
        {(['shop', 'orders', 'account'] as Tab[]).map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabSelected]}><Text style={[styles.tabText, tab === item && styles.tabTextSelected]}>{item === 'shop' ? 'Shop' : item === 'orders' ? 'My orders' : 'Account'}</Text></Pressable>)}
      </View>}
      {activeRole !== 'BUYER' && <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={loadingData} onRefresh={refreshRoleDashboard} />}>
        <Text style={styles.sectionTitle}>{activeRole === 'SELLER' ? 'Seller workspace' : activeRole === 'DELIVERY' ? 'Delivery workspace' : 'Daily Help workspace'}</Text>
        {!!roleStatus && <Text style={styles.muted}>{roleStatus}</Text>}
        {activeRole === 'SELLER' && <>
          <Text style={styles.sectionTitle}>Store</Text>
          <Text style={styles.muted}>{String(roleData.profile?.storeName || roleData.profile?.name || 'Your store')}</Text>
          <Text style={styles.muted}>Approval: {String(roleData.profile?.approvalStatus || roleData.profile?.status || 'Check with admin')}</Text>
          <Pressable style={styles.primary} onPress={() => void runRoleAction('store', () => mobileApi.sellerAvailability(session.token, !(roleData.profile?.open ?? roleData.profile?.isOpen ?? false)))}><Text style={styles.primaryText}>{(roleData.profile?.open ?? roleData.profile?.isOpen) ? 'Close store' : 'Open store'}</Text></Pressable>
          <Text style={styles.sectionTitle}>Products ({roleData.products?.length || 0})</Text>
          {(roleData.products || []).map((p: MobileRecord, i: number) => <View key={String(p.productId || p.id || i)} style={styles.orderCard}><Text style={styles.orderTitle}>{String(p.title || p.name || 'Product')}</Text><Text style={styles.muted}>Stock: {String(p.stock ?? '—')} · Price: {money(p.sellerPrice ?? p.price)}</Text></View>)}
          <Text style={styles.sectionTitle}>Orders ({roleData.orders?.length || 0})</Text>
          {(roleData.orders || []).map((o: MobileRecord, i: number) => <View key={String(o.orderId || o.id || i)} style={styles.orderCard}><Text style={styles.orderTitle}>Order #{String(o.orderId || o.id || '—')}</Text><Text style={styles.muted}>{String(o.status || '—').replaceAll('_',' ')}</Text><Text style={styles.muted}>Status updates remain server-controlled; use the seller portal for the full fulfilment workflow.</Text></View>)}
        </>}
        {activeRole === 'DELIVERY' && <>
          <Text style={styles.muted}>Agent: {String(roleData.profile?.agentId || roleData.profile?.id || '—')} · Status: {String(roleData.profile?.status || '—')}</Text>
          <Pressable style={styles.primary} onPress={() => void runRoleAction('availability', () => mobileApi.deliveryAvailability(session.token, !(roleData.profile?.available ?? false)))}><Text style={styles.primaryText}>{roleData.profile?.available ? 'Go offline' : 'Go online'}</Text></Pressable>
          <Text style={styles.sectionTitle}>Available jobs ({roleData.available?.length || 0})</Text>
          {(roleData.available || []).map((job: MobileRecord, i: number) => { const id=String(job.orderId || job.id || ''); const agentId=String(roleData.profile?.agentId || roleData.profile?.id || ''); return <View key={id || i} style={styles.orderCard}><Text style={styles.orderTitle}>Order #{id || '—'}</Text><Text style={styles.muted}>{String(job.deliveryAddress || job.address || 'Delivery details shown after assignment')}</Text><Pressable disabled={!id || !agentId || !!roleActionBusy} style={styles.primary} onPress={() => void runRoleAction('claim:'+id, () => mobileApi.deliveryClaim(session.token,id,agentId))}><Text style={styles.primaryText}>Claim delivery</Text></Pressable></View>; })}
          <Text style={styles.sectionTitle}>My deliveries ({roleData.mine?.length || 0})</Text>
          {(roleData.mine || []).map((job: MobileRecord, i: number) => { const id=String(job.orderId || job.id || ''); return <View key={id || i} style={styles.orderCard}><Text style={styles.orderTitle}>Order #{id || '—'}</Text><Text style={styles.muted}>{String(job.status || '—').replaceAll('_',' ')}</Text><Pressable style={styles.secondary} onPress={() => void runRoleAction('pickup:'+id, () => mobileApi.deliveryPickup(session.token,id))}><Text style={styles.secondaryText}>Confirm seller pickup</Text></Pressable><TextInput value={roleOtp} onChangeText={setRoleOtp} placeholder="4-digit customer OTP" keyboardType="number-pad" maxLength={4} style={styles.input}/><Pressable style={styles.secondary} onPress={() => void runRoleAction('otp:'+id, () => mobileApi.deliveryVerifyOtp(session.token,id,roleOtp))}><Text style={styles.secondaryText}>Verify delivery OTP</Text></Pressable><Pressable style={styles.linkButton} onPress={() => void runRoleAction('resend:'+id, () => mobileApi.deliveryResendOtp(session.token,id))}><Text style={styles.link}>Resend OTP</Text></Pressable></View>; })}
        </>}
        {activeRole === 'PROFESSIONAL' && <>
          <Text style={styles.muted}>Professional: {String(roleData.profile?.name || session.user.name || '—')} · Approval: {String(roleData.profile?.status || 'Check with admin')}</Text>
          <Pressable style={styles.primary} onPress={() => { const id=String(roleData.profile?.professionalId || roleData.profile?.id || ''); void runRoleAction('professional-availability', () => mobileApi.dailyAvailability(session.token,id,!(roleData.profile?.available ?? roleData.profile?.isAvailable ?? false))); }}><Text style={styles.primaryText}>{(roleData.profile?.available ?? roleData.profile?.isAvailable) ? 'Pause availability' : 'Accepting new jobs'}</Text></Pressable>
          <Text style={styles.sectionTitle}>Available jobs ({roleData.available?.length || 0})</Text>
          {(roleData.available || []).map((job: MobileRecord, i: number) => { const id=String(job.bookingId || job.id || ''); const pid=String(roleData.profile?.professionalId || roleData.profile?.id || ''); return <View key={id || i} style={styles.orderCard}><Text style={styles.orderTitle}>Booking #{id || '—'}</Text><Text style={styles.muted}>{String(job.serviceName || job.service || 'Daily Help request')} · {String(job.scheduledStart || '')}</Text><Pressable style={styles.primary} onPress={() => void runRoleAction('accept:'+id, () => mobileApi.dailyAccept(session.token,pid,id))}><Text style={styles.primaryText}>Accept job</Text></Pressable></View>; })}
          <Text style={styles.sectionTitle}>My jobs ({roleData.mine?.length || 0})</Text>
          {(roleData.mine || []).map((job: MobileRecord, i: number) => { const id=String(job.bookingId || job.id || ''); const pid=String(roleData.profile?.professionalId || roleData.profile?.id || ''); const status=String(job.status || '').toUpperCase(); return <View key={id || i} style={styles.orderCard}><Text style={styles.orderTitle}>Booking #{id || '—'}</Text><Text style={styles.muted}>{status || '—'} · {String(job.scheduledStart || '')}</Text>{status !== 'IN_PROGRESS' && <><TextInput value={roleOtp} onChangeText={setRoleOtp} placeholder="Customer start OTP" keyboardType="number-pad" maxLength={6} style={styles.input}/><Pressable style={styles.primary} onPress={() => void runRoleAction('start:'+id, () => mobileApi.dailyStart(session.token,id,pid,roleOtp))}><Text style={styles.primaryText}>Start service with OTP</Text></Pressable></>}{status === 'IN_PROGRESS' && <Pressable style={styles.primary} onPress={() => void runRoleAction('complete:'+id, () => mobileApi.dailyComplete(session.token,id,pid))}><Text style={styles.primaryText}>Complete service</Text></Pressable>}</View>; })}
        </>}
        {!!roleActionBusy && <ActivityIndicator color="#087f5b" />}
      </ScrollView>}

      {activeRole === 'BUYER' && tab === 'shop' && <>
        <View style={styles.searchWrap}><TextInput value={query} onChangeText={setQuery} placeholder="Search groceries and local products" returnKeyType="search" style={styles.search} /></View>
        <FlatList
          data={products}
          keyExtractor={item => item.productId}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loadingData} onRefresh={loadShop} tintColor="#087f5b" />}
          ListHeaderComponent={<View style={styles.hero}><Text style={styles.heroEyebrow}>SHOP LOCAL</Text><Text style={styles.heroTitle}>Your everyday needs,{"\n"}right around the corner.</Text><Text style={styles.heroCopy}>Discover products from shops in Kurali.</Text></View>}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{loadingData ? 'Finding local products…' : 'No products found'}</Text><Text style={styles.muted}>Pull down to refresh or try another search.</Text></View>}
          renderItem={({ item }) => <View style={styles.productCard}><View style={styles.productImage}><Text style={styles.productEmoji}>🛍️</Text></View><Text numberOfLines={2} style={styles.productTitle}>{item.name || item.title}</Text><Text numberOfLines={1} style={styles.productSeller}>{item.seller?.name || 'Local seller'}</Text><Text style={styles.price}>{money(item.sellerPrice ?? item.price)} <Text style={styles.unit}>{item.unit || ''}</Text></Text><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}><Pressable accessibilityLabel={`Decrease ${item.name || item.title} quantity`} onPress={() => setProductQuantity(item.productId, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantityValue}>{cart[item.productId] || 0}</Text><Pressable accessibilityLabel={`Increase ${item.name || item.title} quantity`} disabled={Number(item.stock ?? item.stockQty ?? 999) <= (cart[item.productId] || 0)} onPress={() => setProductQuantity(item.productId, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View></View>}\n          ListFooterComponent={cartItems.length ? <View style={styles.orderCard}><Text style={styles.sectionTitle}>Your cart ({cartItems.length} products)</Text>{cartItems.map(p => <View key={p.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}><Text style={styles.muted}>{p.name || p.title} × {cart[p.productId]}</Text><Text style={styles.orderTitle}>{money(Number(p.sellerPrice ?? p.price) * cart[p.productId])}</Text></View>)}<Text style={styles.price}>Total {money(cartTotal)}</Text><Text style={styles.muted}>Cash on delivery · server validates stock, seller eligibility and delivery rules</Text><TextInput value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Full delivery address" multiline style={styles.input}/><TextInput value={deliveryLocality} onChangeText={setDeliveryLocality} placeholder="Locality / village" style={styles.input}/><Pressable disabled={checkoutBusy} onPress={() => void checkout()} style={styles.primary}>{checkoutBusy ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>Place order · {money(cartTotal)}</Text>}</Pressable></View> : null}
        />
      </>}
      {activeRole === 'BUYER' && tab === 'orders' && <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={loadingData} onRefresh={loadShop} />}><Text style={styles.sectionTitle}>Your orders</Text>{orders.length ? orders.map((order, index) => <View key={String(order.orderId || order.id || index)} style={styles.orderCard}><Text style={styles.orderTitle}>Order #{String(order.orderId || order.id || '—')}</Text><Text style={styles.muted}>{String(order.status || 'Status unavailable').replaceAll('_', ' ')}</Text><Text style={styles.price}>{money(order.finalPayable ?? order.totalAmount)}</Text></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>No orders yet</Text><Text style={styles.muted}>Your order history will appear here.</Text></View>}</ScrollView>}
      {activeRole === 'BUYER' && tab === 'account' && <View style={styles.accountCard}><Text style={styles.sectionTitle}>Your account</Text><Text style={styles.accountName}>{session.user.name || 'KuraliUpdates customer'}</Text><Text style={styles.muted}>{session.user.phone || session.user.email || ''}</Text><Text style={styles.muted}>Role: {(session.user.role || 'BUYER').replaceAll('_', ' ')}</Text><Pressable onPress={signOut} style={styles.secondary}><Text style={styles.secondaryText}>Sign out</Text></Pressable></View>}
      {!!error && <Text style={styles.inlineError}>{error}</Text>}
      <View style={styles.bottomNote}><Text style={styles.bottomNoteText}>Made for Kurali · Punjab</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8f6' },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  brandMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#087f5b', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brandMarkText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  brand: { fontSize: 29, fontWeight: '800', color: '#153c30', letterSpacing: -0.8 },
  tagline: { color: '#64756d', fontSize: 15, marginTop: 5, marginBottom: 30 },
  loginCard: { backgroundColor: '#fff', padding: 22, borderRadius: 22, borderWidth: 1, borderColor: '#e6ece7' },
  heading: { fontSize: 23, fontWeight: '800', color: '#173b2f' },
  muted: { color: '#728078', fontSize: 13, lineHeight: 19, marginTop: 5 },
  segment: { flexDirection: 'row', backgroundColor: '#f1f5f1', borderRadius: 12, padding: 4, marginTop: 22, marginBottom: 12 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segmentText: { color: '#758179', fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#087f5b' },
  input: { borderWidth: 1, borderColor: '#dce5de', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#193a2e', marginTop: 10 },
  primary: { backgroundColor: '#087f5b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 18, minHeight: 52, justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#b42318', marginTop: 12, fontSize: 13 },
  linkButton: { alignItems: 'center', padding: 14 },
  link: { color: '#087f5b', fontWeight: '600' },
  footnote: { textAlign: 'center', color: '#89958e', marginTop: 26, fontSize: 12 },
  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandSmall: { color: '#087f5b', fontSize: 13, fontWeight: '800' },
  welcome: { color: '#183b2f', fontSize: 22, fontWeight: '800', marginTop: 2 },
  localBadge: { backgroundColor: '#e2f2e9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  localBadgeText: { color: '#087f5b', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  roleTabs: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  roleChip: { borderWidth: 1, borderColor: '#d9e6dc', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  roleChipActive: { backgroundColor: '#087f5b', borderColor: '#087f5b' },
  roleChipText: { color: '#486154', fontWeight: '700', fontSize: 12 },
  roleChipTextActive: { color: '#fff' },
  roleStatus: { color: '#63766b', paddingHorizontal: 20, paddingBottom: 8, fontSize: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: 20, backgroundColor: '#eaf0eb' },
  tabSelected: { backgroundColor: '#087f5b' },
  tabText: { color: '#617169', fontWeight: '600', fontSize: 13 },
  tabTextSelected: { color: '#fff' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  search: { backgroundColor: '#fff', borderColor: '#e2e9e3', borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 30 },
  hero: { backgroundColor: '#e5f2e9', padding: 19, borderRadius: 18, marginBottom: 16 },
  heroEyebrow: { color: '#087f5b', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heroTitle: { color: '#173b2f', fontSize: 22, fontWeight: '800', lineHeight: 28, marginTop: 7 },
  heroCopy: { color: '#63766b', fontSize: 12, marginTop: 7 },
  productRow: { gap: 12, marginBottom: 12 },
  productCard: { flex: 1, backgroundColor: '#fff', borderRadius: 15, padding: 11, borderWidth: 1, borderColor: '#e9eee9' },
  productImage: { height: 100, borderRadius: 10, backgroundColor: '#f0f5f0', alignItems: 'center', justifyContent: 'center' },
  productEmoji: { fontSize: 36 },
  quantityButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#e5f2e9', alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: '#087f5b', fontSize: 20, fontWeight: '800' },
  quantityValue: { color: '#173b2f', fontWeight: '700', minWidth: 22, textAlign: 'center' },
  productTitle: { color: '#213c30', fontSize: 13, fontWeight: '700', marginTop: 10, minHeight: 34 },
  productSeller: { color: '#849087', fontSize: 11, marginTop: 3 },
  price: { color: '#087f5b', fontSize: 16, fontWeight: '800', marginTop: 7 },
  unit: { color: '#7a877f', fontSize: 10, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 34 },
  emptyTitle: { color: '#294536', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: '#173b2f', fontSize: 21, fontWeight: '800', marginBottom: 14 },
  orderCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e7ede8', marginBottom: 10 },
  orderTitle: { color: '#233e32', fontWeight: '700', fontSize: 14 },
  accountCard: { padding: 20 },
  accountName: { color: '#203d30', fontSize: 18, fontWeight: '700', marginTop: 10 },
  secondary: { borderWidth: 1, borderColor: '#d7e2da', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  secondaryText: { color: '#b42318', fontWeight: '700' },
  inlineError: { color: '#b42318', paddingHorizontal: 18, paddingBottom: 8, fontSize: 12 },
  bottomNote: { padding: 10, alignItems: 'center' },
  bottomNoteText: { color: '#9aa59d', fontSize: 10 },
});
