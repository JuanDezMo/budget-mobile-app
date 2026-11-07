import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Temporary placeholder screen until the home screen is built (T1.15).
// The app name comes from app.json so no user-facing literal lives in code.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{Constants.expoConfig?.name}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3A21A',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#14161A',
  },
});
