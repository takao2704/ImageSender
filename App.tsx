import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import MainApp from './src/MainApp';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <MainApp />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
