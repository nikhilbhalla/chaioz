/**
 * React Navigation linking config — handles both:
 *   - Custom URI scheme:   chaioz://order/ABC123
 *   - HTTPS universal:     https://chaioz.com.au/order/ABC123
 *
 * The app is registered for both via `app.json`:
 *   - ios.associatedDomains: ["applinks:chaioz.com.au"]
 *   - android.intentFilters → autoVerify:true with chaioz.com.au host
 *
 * For universal links to actually open the app (instead of Safari/Chrome),
 * the AASA + assetlinks.json files must be served from chaioz.com.au —
 * already provisioned at /app/frontend/public/.well-known/* (and mirrored
 * at /api/well-known/* on the backend for proxying).
 */
import * as Linking from 'expo-linking';

const PREFIXES = [
  Linking.createURL('/'),
  'chaioz://',
  'https://chaioz.com.au',
  'https://www.chaioz.com.au',
];

export const linking = {
  prefixes: PREFIXES,
  config: {
    initialRouteName: 'Tabs',
    screens: {
      Tabs: {
        screens: {
          Home: '',
          Menu: 'menu',
          Cart: 'cart',
          Account: 'account',
        },
      },
      OrderConfirm: 'order/:orderId',
      Login: 'login',
      Register: 'register',
      Checkout: 'checkout',
    },
  },
};

/** Map a push notification payload → a deep-link target. Returns the path
 *  string `navigationRef.navigate` understands, or null. */
export function pathForPush(data) {
  if (!data || !data.type) return null;
  switch (data.type) {
    case 'order_confirmed':
    case 'order_ready':
      return data.order_id ? { name: 'OrderConfirm', params: { orderId: data.order_id } } : null;
    case 'abandoned_cart':
      return { name: 'Tabs', params: { screen: 'Cart' } };
    case 'loyalty_milestone':
      return { name: 'Tabs', params: { screen: 'Account' } };
    case 'marketing':
      return data.path
        ? null  // free-form deep link — Linking.openURL handles it directly
        : { name: 'Tabs', params: { screen: 'Menu' } };
    default:
      return null;
  }
}
