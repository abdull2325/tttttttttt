import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ToastAndroid, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, Provider as PaperProvider, MD3LightTheme,} from 'react-native-paper';
import auth from '@react-native-firebase/auth';
import { ActivityIndicator } from 'react-native';

const theme = {
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


const Register = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;
    
    if (isVerificationSent) {
      const interval = setInterval(async () => {
        try {
          const user = auth().currentUser;
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              clearInterval(interval);
              ToastAndroid.show('Email verified successfully!', ToastAndroid.SHORT);
              await auth().signOut();
              navigation.navigate('Login');
            }
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      }, 3000);

      unsubscribe = () => clearInterval(interval);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isVerificationSent, navigation]);

  const handleRegister = async () => {
    if (!email || !password || !name || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      await user.updateProfile({
        displayName: name,
      });

      await user.sendEmailVerification();
      
      setIsVerificationSent(true);
      Alert.alert(
        'Verification Email Sent',
        'Please check your inbox and verify your email address before logging in.',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      setIsLoading(false);
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      setError(errorMessage);
      console.error(error);
      ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
    }
  };

  const handleResendVerification = async () => {
    const user = auth().currentUser;
    if (user) {
      try {
        await user.sendEmailVerification();
        ToastAndroid.show('Verification email resent!', ToastAndroid.SHORT);
      } catch (error) {
        console.error('Error resending verification:', error);
        ToastAndroid.show('Failed to resend verification email', ToastAndroid.SHORT);
      }
    }
  };

  if (isVerificationSent) {
    return (
      <PaperProvider theme={theme}>
        <Surface style={styles.verificationContainer} elevation={2}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="headlineMedium" style={styles.verificationTitle}>Please verify your email</Text>
          <Text variant="bodyLarge" style={styles.verificationText}>
            A verification link has been sent to {email}.{'\n'}
            Please check your inbox and verify your email.
          </Text>
          <Button 
            mode="contained" 
            onPress={handleResendVerification}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="email-check"
          >
            Resend Verification Email
          </Button>
          <Button 
            mode="outlined"
            onPress={() => setIsVerificationSent(false)}
            style={[styles.button, styles.outlinedButton]}
            contentStyle={styles.buttonContent}
            icon="arrow-left"
          >
            Back to Register
          </Button>
        </Surface>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={styles.surface} elevation={2}>
          <Text variant="headlineLarge" style={styles.title}>Create Account</Text>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            disabled={isLoading}
            style={styles.input}
            right={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            disabled={isLoading}
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
            disabled={isLoading}
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            disabled={isLoading}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            right={
              <TextInput.Icon 
                icon={showConfirmPassword ? "eye-off" : "eye"}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            disabled={isLoading}
            loading={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="account-plus"
          >
            Register
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.textButton}
            icon="login"
          >
            Already have an account? Login
          </Button>
        </Surface>
      </ScrollView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  surface: {
    padding: 24,
    borderRadius: theme.roundness,
    marginVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  verificationContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  verificationTitle: {
    textAlign: 'center',
    marginTop: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  verificationText: {
    textAlign: 'center',
    marginVertical: 16,
    color: theme.colors.text,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  outlinedButton: {
    marginTop: 8,
    borderColor: theme.colors.primary,
  },
  textButton: {
    marginTop: 16,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default Register;
