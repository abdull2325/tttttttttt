import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, Text, TouchableOpacity, StyleSheet, Alert, ToastAndroid, Image, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { Colors, Fonts, CommonStyles } from '../styles/CommonStyles';

const logo = require('../assets/images/logo.png'); // Adjust path if needed

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
      <View style={[CommonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ color: Colors.text, fontFamily: Fonts.bold, fontSize: 22, marginTop: 24, marginBottom: 8, textAlign: 'center' }}>
          Please verify your email
        </Text>
        <Text style={{ color: Colors.text, fontFamily: Fonts.regular, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          A verification link has been sent to {email}.{'\n'}
          Please check your inbox and verify your email.
        </Text>
        <TouchableOpacity
          style={[CommonStyles.button, { backgroundColor: Colors.accent }]}
          onPress={handleResendVerification}
        >
          <Text style={CommonStyles.buttonText}>Resend Verification Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[CommonStyles.button, { backgroundColor: '#444' }]}
          onPress={() => setIsVerificationSent(false)}
        >
          <Text style={CommonStyles.buttonText}>Back to Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[CommonStyles.container, { justifyContent: 'flex-start' }]}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 0 }}>
        <Image
          source={logo}
          style={{ width: 280, height: 280, resizeMode: 'contain' }}
        />
      </View>

      {/* Registration form fields */}
      <View style={{ marginTop: 0 }}>
        <TextInput
          placeholder="Full Name"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          style={CommonStyles.input}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          keyboardType="email-address"
          autoCapitalize="none"
          style={CommonStyles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          secureTextEntry={!showPassword}
          style={CommonStyles.input}
        />

        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor={Colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!isLoading}
          secureTextEntry={!showConfirmPassword}
          style={CommonStyles.input}
        />

        {/* Show/Hide toggles below both password fields */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={{ color: Colors.accent, fontFamily: Fonts.regular }}>
              {showPassword ? 'Hide Password' : 'Show Password'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Text style={{ color: Colors.accent, fontFamily: Fonts.regular }}>
              {showConfirmPassword ? 'Hide Password' : 'Show Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <Text style={{ color: Colors.error, fontFamily: Fonts.regular, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          CommonStyles.button,
          { backgroundColor: '#444' } // Grey background for visibility
        ]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <Text style={CommonStyles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      {/* Subtle login text below the button */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
        <Text style={{ color: Colors.text, fontFamily: Fonts.regular, fontSize: 14 }}>
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={{ color: Colors.text, fontFamily: Fonts.bold, fontSize: 14 }}>
            Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Register;
