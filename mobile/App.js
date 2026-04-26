import 'react-native-gesture-handler';
import React, { useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider, useCart } from './src/contexts/CartContext';

import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderConfirmScreen from './src/screens/OrderConfirmScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { colors } from './src/theme';

import { linking, pathForPush } from './src/lib/linking';
import { usePushNotifications } from './src/lib/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CartIconLabel({ focused }) {
  const { count } = useCart();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: focused ? colors.saffron : colors.tealDim, fontSize: 12 }}>Cart</Text>
      {count > 0 && (
        <View style={{ marginLeft: 4, backgroundColor: colors.saffron, borderRadius: 999, minWidth: 16, paddingHorizontal: 4, alignItems: 'center' }}>
          <Text style={{ color: colors.teal, fontSize: 10, fontWeight: '700' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.saffron,
        tabBarInactiveTintColor: colors.tealDim,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarLabel: ({ focused }) => <CartIconLabel focused={focused} /> }}
      />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const navigationRef = useRef(null);

  const onPushTap = useCallback((data) => {
    const target = pathForPush(data);
    if (!target || !navigationRef.current) return;
    try {
      // navigate(name, params) — also works for nested navigators via { screen, params }
      navigationRef.current.navigate(target.name, target.params);
    } catch (e) {
      console.warn('[push] nav failed', e?.message);
    }
  }, []);

  usePushNotifications(onPushTap);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout' }} />
        <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} options={{ headerShown: true, title: 'Order confirmed', headerBackVisible: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: 'Sign in' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Create account' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationRoot />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
