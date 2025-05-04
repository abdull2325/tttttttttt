import { StyleSheet } from 'react-native';

const Colors = {
  background: 'black',
  primary: 'red',
  secondary: '#333',
  text: 'white',
  textMuted: '#ccc',
  accent: '#800000', // Maroon red
  border: '#444',    // Grey for borders and switches
  card: '#232323',   // Card/dark background
  error: '#FF4C4C',  // Error red
  textSecondary: '#E0E0E0', // Light grey for secondary text
};

// Add the Fonts object for custom font usage
const Fonts = {
  regular: 'Montserrat-Regular',
  bold: 'Montserrat-Bold',
};

const CommonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Colors.secondary,
    color: Colors.text,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
});

export { Colors, Fonts, CommonStyles };
// Fonts is now exported and can be used in your components
