import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const PORTAL_URL = 'https://kuraliupdates.com/';

const isKuraliUpdatesUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'kuraliupdates.com' || url.hostname.endsWith('.kuraliupdates.com'));
  } catch {
    return false;
  }
};

/**
 * The website is the source of truth for the customer and operations UI.
 * Rendering it in a WebView avoids maintaining a visually divergent second
 * implementation of Buyer, Seller, Delivery and Daily Help portals.
 */
export default function App() {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const handleNavigation = useCallback((request: { url: string }) => {
    if (request.url === 'about:blank' || isKuraliUpdatesUrl(request.url)) return true;
    void Linking.openURL(request.url).catch(() => {
      setLoadError('This link could not be opened. Please try again.');
    });
    return false;
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <WebView
        key={reloadKey}
        source={{ uri: PORTAL_URL }}
        style={styles.webView}
        originWhitelist={['https://*', 'about:blank']}
        onShouldStartLoadWithRequest={handleNavigation}
        onLoadStart={() => { setLoading(true); setLoadError(''); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setLoadError('KuraliUpdates could not be reached. Check your internet connection and retry.');
        }}
        onHttpError={event => {
          if (event.nativeEvent.statusCode >= 500) {
            setLoadError('KuraliUpdates is temporarily unavailable. Please retry in a moment.');
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        geolocationEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color="#087f5b" /></View>}
      />
      {loading && !loadError ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#087f5b" />
          <Text style={styles.loadingText}>Opening KuraliUpdates…</Text>
        </View>
      ) : null}
      {loadError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Unable to open KuraliUpdates</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.retryButton} onPress={() => {
            setLoadError('');
            setLoading(true);
            setReloadKey(value => value + 1);
          }}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  webView: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 12, color: '#52645a', fontSize: 13, fontWeight: '600' },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f8fafc',
  },
  errorTitle: { color: '#173b2f', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: '#64756d', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  retryButton: { backgroundColor: '#087f5b', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 22 },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
