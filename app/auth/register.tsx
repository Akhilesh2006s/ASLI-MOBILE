import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { GlassPanel } from '../../src/components/ui';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    Alert.alert('Create Account', 'Please contact your school admin to create an account.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      {/* the app-wide pastel artwork is the page background now, so no local gradient */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <GlassPanel style={styles.card} radius={24} tone="strong">
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Join thousands of students learning with AI</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#4F46E5" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#5B6779"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#4F46E5" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#5B6779"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#4F46E5" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Password"
                placeholderTextColor="#5B6779"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Ionicons name="eye-off" size={20} color="#5B6779" />
                ) : (
                  <Ionicons name="eye" size={20} color="#5B6779" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#4F46E5" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Confirm Password"
                placeholderTextColor="#5B6779"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                }
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <Ionicons name="eye-off" size={20} color="#5B6779" />
                ) : (
                  <Ionicons name="eye" size={20} color="#5B6779" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Role</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Teacher" value="teacher" />
                  <Picker.Item label="Admin" value="admin" />
                </Picker>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text 
                style={styles.footerLink}
                onPress={() => router.push('/auth/login')}
              >
                Sign in here
              </Text>
            </Text>
          </View>
        </GlassPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows behind the glass card
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5B6779',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // near-opaque white field so the dark input text stays legible over any
    // pastel hue in the background artwork
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 4,
  },
  pickerContainer: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 4,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    overflow: 'hidden',
  },
  picker: {
    height: 56,
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#5B6779',
  },
  footerLink: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#5B6779',
    marginBottom: 32,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

