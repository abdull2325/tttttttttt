import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ToastAndroid, Alert } from 'react-native';
import { 
  TextInput, 
  
  Button, 
  Text, 
  Surface, 
  Switch, 
  Provider as PaperProvider, 
  MD3LightTheme,
  MD3DarkTheme,
  IconButton,
  useTheme
} from 'react-native-paper';
import { Icon, MD3Colors } from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00897B',
    secondary: '#26A69A',
    tertiary: '#80CBC4',
    background: '#E0F2F1',
    surface: '#ffffff',
    error: '#B71C1C',
    text: '#004D40',
    placeholder: '#4DB6AC',
    backdrop: 'rgba(0, 137, 123, 0.1)',
  },
  roundness: 12,
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#80CBC4',
    secondary: '#26A69A',
    tertiary: '#00897B',
    background: '#001C17',
    surface: '#0A2F2A',
    error: '#CF6679',
    text: '#E0F2F1',
    placeholder: '#4DB6AC',
    backdrop: 'rgba(0, 137, 123, 0.1)',
  },
  roundness: 12,
};

export default function LoginForm({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      setIsDarkMode(savedTheme === 'dark');
    };

    const getStoredCredentials = async () => {
      const [storedEmail, storedPassword] = await Promise.all([
        AsyncStorage.getItem('email'),
        AsyncStorage.getItem('password')
      ]);
      if (storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRememberMe(true);
      }
    };

    loadThemePreference();
    getStoredCredentials();
  }, []);

  const toggleTheme = async () => {
    const newThemeMode = !isDarkMode;
    setIsDarkMode(newThemeMode);
    await AsyncStorage.setItem('themeMode', newThemeMode ? 'dark' : 'light');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await auth().signOut();
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in. Would you like us to send a new verification email?',
          [
            {
              text: 'Yes, send email',
              onPress: async () => {
                try {
                  await user.sendEmailVerification();
                  ToastAndroid.show('Verification email sent!', ToastAndroid.SHORT);
                } catch (error) {
                  ToastAndroid.show('Failed to send verification email', ToastAndroid.SHORT);
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setError('Please verify your email before logging in.');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        await Promise.all([
          AsyncStorage.setItem('email', email),
          AsyncStorage.setItem('password', password)
        ]);
      } else {
        await Promise.all([
          AsyncStorage.removeItem('email'),
          AsyncStorage.removeItem('password')
        ]);
      }

      ToastAndroid.show('Login successful!', ToastAndroid.SHORT);
      navigation.navigate('Homepage');
    } catch (error: any) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address. Please check and try again.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
      }

      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <View style={[styles.container, { backgroundColor: isDarkMode ? darkTheme.colors.background : lightTheme.colors.background }]}>
        <IconButton
          icon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"}
          size={24}
          onPress={toggleTheme}
          style={styles.themeToggle}
        />
        <Surface style={styles.surface} elevation={2}>
          <Text variant="headlineLarge" style={[styles.title, { color: isDarkMode ? darkTheme.colors.primary : lightTheme.colors.primary }]}>
            Login
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            disabled={loading}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            right={<TextInput.Icon icon="at" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            disabled={loading}
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.rememberView}>
            <View style={styles.switch}>
              <Switch value={rememberMe} onValueChange={setRememberMe} />
              <Text variant="bodyMedium">Remember Me</Text>
            </View>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            >
              Forgot Password?
            </Button>
          </View>

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="login"
          >
            Login
          </Button>

          <Text variant="bodyMedium" style={styles.orText}>OR LOGIN WITH</Text>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Registration')}
            style={styles.registerButton}
            icon="account-plus"
          >
            Don't have an account? Sign Up
          </Button>
        </Surface>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    marginVertical: 16,
  },
  themeToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  rememberView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotButton: {
    marginLeft: 'auto',
  },
  registerButton: {
    marginTop: 16,
  },
  orText: {
    textAlign: 'center',
    marginVertical: 16,
  },
  errorText: {
    color: '#CF6679',
    textAlign: 'center',
    marginBottom: 16,
  },
});
