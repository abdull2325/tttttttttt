import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert, ToastAndroid, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, CommonStyles } from '../styles/CommonStyles';
import Register from './components/Register';

const logo = require('../assets/images/logo.png'); // Adjust path if needed

export default function LoginForm({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
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
    getStoredCredentials();
  }, []);

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
    <View style={[CommonStyles.container, { justifyContent: 'flex-start' }]}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 0 }}>
        <Image
          source={logo}
          style={{ width: 280, height: 280, resizeMode: 'contain' }}
        />
      </View>

      <View style={{ marginTop: 0 }}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
          style={CommonStyles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          secureTextEntry={!showPassword}
          style={CommonStyles.input}
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={{ color: Colors.accent, fontFamily: Fonts.regular, marginBottom: 8 }}>
            {showPassword ? 'Hide Password' : 'Show Password'}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 0 }}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={rememberMe ? Colors.accent : Colors.card}
          />
          <Text
            style={{
              color: Colors.text,
              fontFamily: Fonts.bold,
              marginLeft: 12,
              fontSize: 16,
            }}
          >
            Remember Me
          </Text>
        </View>

        {error ? (
          <Text style={{ color: Colors.error, fontFamily: Fonts.regular, marginBottom: 16 }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            CommonStyles.button,
            { backgroundColor: '#444', marginTop: 0, marginBottom: 0 }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={[CommonStyles.buttonText, { color: Colors.text }]}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
        <Text style={{ color: Colors.text, fontFamily: Fonts.regular, fontSize: 14 }}>
          Don&apos;t have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={{ color: Colors.text, fontFamily: Fonts.bold, fontSize: 14 }}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
