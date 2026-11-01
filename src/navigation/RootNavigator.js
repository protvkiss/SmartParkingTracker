import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Elevation, Metrics, Palette } from "~/core/theme";
import CheckInScreen from "~/screens/CheckInScreen";
import DashboardScreen from "~/screens/DashboardScreen";
import HistoryLogScreen from "~/screens/HistoryLogScreen";
import PreferencesScreen from "~/screens/PreferencesScreen";
import RadarScreen from "~/screens/RadarScreen";
import SpotDetailScreen from "~/screens/SpotDetailScreen";
import VehicleManagerScreen from "~/screens/VehicleManagerScreen";

const NativeStack = createNativeStackNavigator();
const BottomTabs = createBottomTabNavigator();

const TAB_ELEMENTS = [
  {
    route: "Dashboard",
    label: "Bản đồ",
    iconSelected: "map",
    iconDefault: "map-outline",
  },
  {
    route: "Logbook",
    label: "Lịch sử",
    iconSelected: "time",
    iconDefault: "time-outline",
  },
  {
    route: "Preferences",
    label: "Cài đặt",
    iconSelected: "cog",
    iconDefault: "cog-outline",
  },
];

function FloatingBottomBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.floatingBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.dockBar}>
        {TAB_ELEMENTS.map((elem, i) => {
          const isCurrent = state.index === i;
          const currentRoute = state.routes[i];

          const onPressTab = () => {
            const ev = navigation.emit({
              type: "tabPress",
              target: currentRoute.key,
              canPreventDefault: true,
            });

            if (!isCurrent && !ev.defaultPrevented) {
              navigation.navigate(elem.route);
            }
          };

          const iconName = isCurrent ? elem.iconSelected : elem.iconDefault;

          return (
            <Pressable
              key={elem.route}
              onPress={onPressTab}
              accessibilityRole="button"
              accessibilityState={isCurrent ? { selected: true } : {}}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}
            >
              <View style={[styles.capsuleHighlight, isCurrent && styles.capsuleActive]}>
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isCurrent ? Palette.brand : Palette.inkMuted}
                />
                {isCurrent ? (
                  <Text style={styles.tabLabelActive}>{elem.label}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MainTabCluster() {
  return (
    <BottomTabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingBottomBar {...props} />}
    >
      <BottomTabs.Screen name="Dashboard" component={DashboardScreen} />
      <BottomTabs.Screen name="Logbook" component={HistoryLogScreen} />
      <BottomTabs.Screen name="Preferences" component={PreferencesScreen} />
    </BottomTabs.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <NativeStack.Navigator screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="MainTabs" component={MainTabCluster} />
        <NativeStack.Screen
          name="CheckIn"
          component={CheckInScreen}
          options={{
            animation: "slide_from_bottom",
            presentation: Platform.OS === "ios" ? "modal" : "card",
          }}
        />
        <NativeStack.Screen
          name="SpotDetail"
          component={SpotDetailScreen}
          options={{ animation: "slide_from_right" }}
        />
        <NativeStack.Screen
          name="Radar"
          component={RadarScreen}
          options={{ animation: "slide_from_right" }}
        />
        <NativeStack.Screen
          name="VehicleManager"
          component={VehicleManagerScreen}
          options={{ animation: "slide_from_right" }}
        />
      </NativeStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  floatingBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    pointerEvents: "box-none",
  },
  dockBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: Metrics.radiusPill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    width: "100%",
    maxWidth: 380,
    justifyContent: "space-around",
    ...Elevation.floating,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabItemPressed: {
    opacity: 0.75,
  },
  capsuleHighlight: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Metrics.radiusPill,
    gap: 6,
  },
  capsuleActive: {
    backgroundColor: Palette.brandLight,
  },
  tabLabelActive: {
    fontSize: Metrics.fontSm,
    color: Palette.brand,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
