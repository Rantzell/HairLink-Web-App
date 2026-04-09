import { View } from 'react-native';

export const Container = ({ children }: { children: React.ReactNode }) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = {
  container: {
    flex: 1,
    margin: 24, // Equivalent to m-6 (6 * 4)
  },
};
