import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/services/api/api';
import authService from '../../src/services/api/authService';
import { useAuth } from '../../src/context/AuthContext';

const THEME = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  accent: '#6d94db',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  inputBg: '#f9fafb',
  dangerBg: '#fee2e2',
  dangerText: '#dc2626',
};

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { signIn } = useAuth();
  const compact = width < 380;
  const cardWidth = useMemo(() => Math.min(width - 32, 460), [width]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRememberedCredentials = async () => {
      try {
        const rememberedEmail = await SecureStore.getItemAsync('rememberedEmail');
        const rememberedPassword = await SecureStore.getItemAsync('rememberedPassword');
        if (rememberedEmail && rememberedPassword) {
          setFormData({ email: rememberedEmail, password: rememberedPassword });
          setRememberMe(true);
        }
      } catch (err) {
        console.error('Failed to load remembered credentials:', err);
      }
    };
    loadRememberedCredentials();
  }, []);

  const redirectByRole = (role: string) => {
    if (role === 'super-admin') router.replace('/super-admin-dashboard');
    else if (role === 'admin') router.replace('/admin/dashboard');
    else if (role === 'teacher') router.replace('/teacher/dashboard');
    else router.replace('/dashboard');
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await signIn(formData);

      if (rememberMe) {
        await SecureStore.setItemAsync('rememberedEmail', formData.email);
        await SecureStore.setItemAsync('rememberedPassword', formData.password);
      } else {
        await SecureStore.deleteItemAsync('rememberedEmail');
        await SecureStore.deleteItemAsync('rememberedPassword');
      }

      redirectByRole(data?.user?.role || 'student');
    } catch (err: any) {
      const fallback = `Cannot connect to server. Please check network and server status.\n${API_BASE_URL}`;
      setError(err?.friendlyMessage || err?.message || fallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#e0f2fe', '#dbeafe', '#cffafe']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { width: cardWidth, padding: compact ? 20 : 24 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('../../image.png')} style={styles.brandIcon} resizeMode="contain" />
              <Text style={styles.brandText}>ASLILEARN AI</Text>
            </View>
            <Text style={[styles.title, compact && { fontSize: 26 }]}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={THEME.dangerText} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={18} color={THEME.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(email) => setFormData((prev) => ({ ...prev, email }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={18} color={THEME.accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(password) => setFormData((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)} activeOpacity={0.85}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink} onPress={() => router.push('/auth/register')}>
                Sign up
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  header: { alignItems: 'center', marginBottom: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brandIcon: { width: 32, height: 32, marginRight: 8 },
  brandText: { fontSize: 19, fontWeight: '800', color: THEME.accent, letterSpacing: 0.4 },
  title: { fontSize: 28, fontWeight: '800', color: THEME.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted, textAlign: 'center' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorIcon: { marginRight: 8, marginTop: 1 },
  errorText: { flex: 1, color: THEME.dangerText, fontSize: 13, lineHeight: 18 },
  form: { gap: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    height: 54,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: THEME.text },
  passwordInput: { paddingRight: 44 },
  eyeButton: { padding: 4 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  rememberText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  submitButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  footer: {
    marginTop: 20,
    paddingTop: 18,
    borderTopColor: THEME.border,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: { color: THEME.textMuted, fontSize: 14 },
  footerLink: { color: THEME.primaryDark, fontWeight: '700' },
});
