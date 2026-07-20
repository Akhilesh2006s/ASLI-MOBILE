import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import { GlassPanel } from '../../src/components/ui';
import { COLORS, FONT, RADIUS, SPACING } from '../../src/theme';

/**
 * Auth palette for the light pastel background. The app-wide <AppBackground>
 * supplies the artwork, so everything here is derived for dark-on-light.
 *
 * `accent` is the role-neutral brand violet used for fills, borders and icons.
 * `accentText` is the darker step used whenever the violet carries *text* on a
 * light surface — #6366F1 only reaches ~4.4:1 on white, which misses 4.5:1.
 */
const PALETTE = {
  accent: '#6366F1',
  accentText: '#4338CA',
  link: '#4F46E5',
  text: '#0f172a',
  muted: '#5B6779',
  hairline: 'rgba(15,23,42,0.10)',
};

function ShimmerButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const shimmer = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 320]) }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={btnStyle}>
      <Pressable
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={onPress}
        style={({ pressed }) => [styles.signInWrap, pressed && !loading && { opacity: 0.95 }]}
      >
        <LinearGradient
          colors={['#4F46E5', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.signInGradient}
        >
          {!loading ? (
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.signInInner}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.signInText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: 'email-address' | 'default';
  delay?: number;
};

function PremiumField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secure,
  showPassword,
  onTogglePassword,
  keyboardType = 'default',
  delay = 0,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, focusAnim]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: focused ? PALETTE.accent : '#D8DEE9',
    shadowOpacity: interpolate(focusAnim.value, [0, 1], [0, 0.12]),
  }));

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(delay)} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.fieldBox, borderStyle]}>
        <LinearGradient
          colors={focused ? ['#EEF2FF', '#ECFEFF'] : ['#F1F5F9', '#F1F5F9']}
          style={styles.fieldIconPill}
        >
          <Ionicons name={icon} size={18} color={focused ? PALETTE.accentText : PALETTE.muted} />
        </LinearGradient>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={PALETTE.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoComplete={keyboardType === 'email-address' ? 'email' : 'password'}
          secureTextEntry={secure && !showPassword}
        />
        {onTogglePassword ? (
          <Pressable
            onPress={onTogglePassword}
            style={styles.eyeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={PALETTE.muted}
            />
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { signIn } = useAuth();
  const cardWidth = useMemo(() => Math.min(width - 28, 440), [width]);
  const logoSize = useMemo(() => Math.min(width * 0.3, 116), [width]);

  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showForm) return;
    const load = async () => {
      try {
        const email = await SecureStore.getItemAsync('rememberedEmail');
        const password = await SecureStore.getItemAsync('rememberedPassword');
        if (email && password) {
          setFormData({ email, password });
          setRememberMe(true);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, [showForm]);

  const redirectByRole = (role: string) => {
    if (role === 'super-admin') router.replace('/super-admin-dashboard');
    else if (role === 'admin') router.replace('/admin/dashboard');
    else if (role === 'teacher') router.replace('/teacher/dashboard');
    else router.replace('/dashboard');
  };

  const handleForgotPassword = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Forgot Password', 'Please contact admin to reset your password.');
  };

  const handleCreateAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Create Account', 'Please contact your school admin to create an account.');
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      redirectByRole(data?.user?.role || 'student');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const fallback = `Cannot connect to server. Please check network and server status.\n${API_BASE_URL}`;
      setError(err?.friendlyMessage || err?.message || fallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* the app-wide pastel artwork is the page background now, so no local gradient */}
      <StatusBar style="dark" />

      {showForm ? (
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View entering={FadeInDown.duration(500)} style={styles.brandHeader}>
                <LinearGradient
                  colors={['#6366F1', '#22D3EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.brandLogoRing,
                    { width: logoSize, height: logoSize, borderRadius: logoSize / 2 },
                  ]}
                >
                  <View
                    style={[
                      styles.brandLogoInner,
                      {
                        width: logoSize - 6,
                        height: logoSize - 6,
                        borderRadius: (logoSize - 6) / 2,
                      },
                    ]}
                  >
                    <Image
                      source={require('../../assets/logo.png')}
                      style={styles.brandLogo}
                      resizeMode="contain"
                      accessibilityLabel="ASLI Learn logo"
                    />
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Glass card */}
              <Animated.View entering={FadeInDown.duration(600).delay(120).springify()} style={{ width: cardWidth }}>
                <GlassPanel style={styles.card} radius={28} tone="strong">
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>Welcome Back</Text>
                  </View>

                  {error ? (
                    <Animated.View entering={FadeIn.duration(250)} style={styles.errorBox}>
                      <View style={styles.errorIconWrap}>
                        <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                      </View>
                      <Text style={styles.errorMsg}>{error}</Text>
                    </Animated.View>
                  ) : null}

                  <View style={styles.form}>
                    <PremiumField
                      label="Email Address"
                      icon="mail-outline"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChangeText={(email) => setFormData((p) => ({ ...p, email }))}
                      keyboardType="email-address"
                      delay={180}
                    />
                    <PremiumField
                      label="Password"
                      icon="lock-closed-outline"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChangeText={(password) => setFormData((p) => ({ ...p, password }))}
                      secure
                      showPassword={showPassword}
                      onTogglePassword={() => setShowPassword((v) => !v)}
                      delay={260}
                    />

                    <Animated.View entering={FadeInDown.duration(450).delay(340)} style={styles.optionsRow}>
                      <Pressable
                        style={styles.rememberRow}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: rememberMe }}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setRememberMe((v) => !v);
                        }}
                      >
                        <LinearGradient
                          colors={rememberMe ? ['#4F46E5', '#4338CA'] : ['#FFFFFF', '#FFFFFF']}
                          style={[styles.checkbox, rememberMe && styles.checkboxOn]}
                        >
                          {rememberMe ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                        </LinearGradient>
                        <Text style={styles.rememberLabel}>Remember me</Text>
                      </Pressable>
                      <Pressable onPress={handleForgotPassword} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.forgotLink}>Forgot password?</Text>
                      </Pressable>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(450).delay(420)}>
                      <ShimmerButton
                        label={isSubmitting ? 'Signing in...' : 'Sign In'}
                        loading={isSubmitting}
                        onPress={handleSubmit}
                      />
                    </Animated.View>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <Pressable
                    style={styles.registerBtn}
                    accessibilityRole="button"
                    onPress={handleCreateAccount}
                  >
                    <Ionicons name="person-add-outline" size={18} color={PALETTE.accentText} />
                    <Text style={styles.registerBtnText}>Create a free account</Text>
                  </Pressable>
                </GlassPanel>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // transparent so the app-wide pastel artwork shows behind the glass card
  root: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
    width: '100%',
  },
  brandLogoRing: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  brandLogoInner: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  card: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTop: {
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: PALETTE.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: FONT.base,
    color: PALETTE.muted,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIconWrap: {
    marginTop: 1,
  },
  errorMsg: {
    flex: 1,
    color: '#991B1B',
    fontSize: FONT.sm,
    lineHeight: 18,
  },
  form: {
    gap: SPACING.lg,
  },
  fieldWrap: {
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: PALETTE.text,
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    // opaque white field on frosted glass: keeps the dark input text legible
    // no matter which pastel hue sits behind the card
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: '#D8DEE9',
    height: 56,
    paddingRight: SPACING.md,
    shadowColor: PALETTE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  fieldIconPill: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: FONT.lg,
    color: COLORS.text,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: SPACING.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.25)',
  },
  checkboxOn: {
    borderColor: 'transparent',
  },
  rememberLabel: {
    fontSize: FONT.base,
    color: PALETTE.text,
    fontWeight: FONT.medium,
  },
  forgotLink: {
    fontSize: FONT.base,
    color: PALETTE.link,
    fontWeight: FONT.bold,
  },
  signInWrap: {
    borderRadius: RADIUS.lg + 2,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  signInGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    opacity: 0.9,
  },
  signInInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  signInText: {
    color: '#fff',
    fontSize: FONT.lg,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.hairline,
  },
  dividerText: {
    fontSize: FONT.sm,
    color: PALETTE.muted,
    fontWeight: FONT.medium,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  registerBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.bold,
    color: PALETTE.accentText,
  },
});
