import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import { ActionButton } from '../../src/components/ui';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../src/theme';

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
      <StatusBar style="light" />
      <LinearGradient colors={[...COLORS.gradientBlue]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image source={require('../../image.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.card, { width: cardWidth, padding: compact ? SPACING.xl : SPACING.xxl }]}>
          <Text style={[styles.title, compact && { fontSize: FONT.xxxl }]}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={(email) => setFormData((prev) => ({ ...prev, email }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={formData.password}
                onChangeText={(password) => setFormData((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <Ionicons name="checkmark" size={14} color={COLORS.textInverse} /> : null}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            <ActionButton
              label="Sign In"
              onPress={handleSubmit}
              loading={isSubmitting}
              icon="log-in-outline"
              gradient={COLORS.gradientBlue}
            />
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
    padding: SPACING.lg,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    ...SHADOW.lg,
  },
  title: {
    fontSize: FONT.h1,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: FONT.sm,
    lineHeight: 18,
  },
  form: { gap: SPACING.md },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
    paddingHorizontal: SPACING.lg,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: FONT.lg, color: COLORS.text },
  passwordInput: { paddingRight: 40 },
  eyeButton: { padding: SPACING.xs },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rememberText: { color: COLORS.textSecondary, fontSize: FONT.base, fontWeight: FONT.medium },
});
