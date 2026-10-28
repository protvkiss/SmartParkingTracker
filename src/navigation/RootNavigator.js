import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { Metrics, Palette } from "~/core/theme";
import CheckInScreen from "~/screens/CheckInScreen";
import DashboardScreen from "~/screens/DashboardScreen";
import HistoryLogScreen from "~/screens/HistoryLogScreen";
import PreferencesScreen from "~/screens/PreferencesScreen";
import RadarScreen from "~/screens/RadarScreen";
import SpotDetailScreen from "~/screens/SpotDetailScreen";

const NativeStack = createNativeStackNavigator();
const BottomTabs = createBottomTabNavigator();

const TAB_ELEMENTS = [
  {
    route: "Dashboard",
    label: "Trang chủ",
    iconSelected: "grid",
    iconDefault: "grid-outline",
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
    iconSelected: "options",
    iconDefault: "options-outline",
  },
];

function CustomBottomBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.barFrame}>
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

        const iconIconName = isCurrent ? elem.iconSelected : elem.iconDefault;

        return (
          <Pressable
            key={elem.route}
            onPress={onPressTab}
            accessibilityRole="button"
            accessibilityState={isCurrent ? { selected: true } : {}}
            style={styles.tabItem}
          >
            <View style={[styles.capsuleHighlight, isCurrent && styles.capsuleActive]}>
              <Ionicons
                name={iconIconName}
                size={22}
                color={isCurrent ? Palette.brand : Palette.inkMuted}
              />
            </View>
            <Text
              style={[
                styles.tabLabelText,
                isCurrent && styles.tabLabelActive,
              ]}
            >
              {elem.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabCluster() {
  return (
    <BottomTabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBottomBar {...props} />}
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
          options={{ animation: "slide_from_bottom" }}
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
      </NativeStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  barFrame: {
    flexDirection: "row",
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
    paddingBottom: 16,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  capsuleHighlight: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: Metrics.radiusPill,
  },
  capsuleActive: {
    backgroundColor: Palette.brandLight,
  },
  tabLabelText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: Palette.brand,
    fontWeight: "700",
  },
});
