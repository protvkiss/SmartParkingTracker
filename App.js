import React from "react";
import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "~/navigation/RootNavigator";
import { ParkingStoreProvider } from "~/state/ParkingStore";

function App() {
  return (
    <SafeAreaProvider>
      <ParkingStoreProvider>
        <RootNavigator />
        <StatusBar style="dark" backgroundColor="transparent" translucent />
      </ParkingStoreProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);

export default App;
