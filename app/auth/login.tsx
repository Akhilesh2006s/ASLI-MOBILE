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
  type DimensionValue,
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
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, FONT, RADIUS, SPACING } from '../../src/theme';

const PALETTE = {
  bgTop: '#0B1220',
  bgMid: '#111827',
  bgBottom: '#1E1B4B',
  accent: '#6366F1',
  accentLight: '#818CF8',
  cyan: '#22D3EE',
  violet: '#A855F7',
  glass: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.14)',
  card: 'rgba(255,255,255,0.96)',
  textOnDark: '#F8FAFC',
  mutedOnDark: 'rgba(248,250,252,0.65)',
};

const ORBS: { size: number; left: DimensionValue; top: DimensionValue; colors: [string, string]; delay: number }[] = [
  { size: 220, left: '-15%', top: '-8%', colors: ['#6366F1', '#4F46E5'], delay: 0 },
  { size: 180, left: '60%', top: '5%', colors: ['#22D3EE', '#0891B2'], delay: 1 },
  { size: 160, left: '10%', top: '55%', colors: ['#A855F7', '#7C3AED'], delay: 2 },
  { size: 140, left: '72%', top: '68%', colors: ['#3B82F6', '#2563EB'], delay: 3 },
];

function MeshOrb({ size, left, top, colors, delay }: (typeof ORBS)[number]) {
  const drift = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const base = 9000 + delay * 1500;
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: base, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: base, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 4000 + delay * 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 4000 + delay * 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [delay, drift, pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [0, 24]) },
      { translateY: interpolate(drift.value, [0, 1], [0, 18]) },
      { scale: pulse.value },
    ],
    opacity: interpolate(drift.value, [0, 1], [0.45, 0.65]),
  }));

  return (
    <Animated.View style={[styles.orbShell, { width: size, height: size, left, top }, style]} pointerEvents="none">
      <LinearGradient colors={colors} style={styles.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

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
          colors={['#6366F1', '#4F46E5', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.signInGradient}
        >
          {!loading ? (
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
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
    borderColor: focused ? PALETTE.accent : '#E2E8F0',
    shadowOpacity: interpolate(focusAnim.value, [0, 1], [0, 0.12]),
  }));

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(delay)} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.fieldBox, borderStyle]}>
        <LinearGradient
          colors={focused ? ['#EEF2FF', '#ECFEFF'] : ['#F8FAFC', '#F8FAFC']}
          style={styles.fieldIconPill}
        >
          <Ionicons name={icon} size={18} color={focused ? PALETTE.accent : '#94A3B8'} />
        </LinearGradient>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
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
          <Pressable onPress={onTogglePassword} style={styles.eyeBtn} hitSlop={10}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
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
  const logoSize = useMemo(() => Math.min(width * 0.28, 108), [width]);

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
      <StatusBar style="light" />
      <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]} style={StyleSheet.absoluteFill} />

      <View style={styles.orbLayer} pointerEvents="none">
        {ORBS.map((orb, i) => (
          <MeshOrb key={i} {...orb} />
        ))}
      </View>

      <View style={styles.gridOverlay} pointerEvents="none" />

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
                    <Image source={require('../../image.png')} style={styles.brandLogo} resizeMode="cover" />
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Glass card */}
              <Animated.View entering={FadeInDown.duration(600).delay(120).springify()} style={{ width: cardWidth }}>
                <LinearGradient
                  colors={['rgba(99,102,241,0.6)', 'rgba(34,211,238,0.4)', 'rgba(168,85,247,0.5)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardBorder}
                >
                  <View style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>Welcome Back</Text>
                    </View>

                    {error ? (
                      <Animated.View entering={FadeIn.duration(250)} style={styles.errorBox}>
                        <View style={styles.errorIconWrap}>
                          <Ionicons name="alert-circle" size={18} color="#DC2626" />
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
                          onPress={() => {
                            Haptics.selectionAsync();
                            setRememberMe((v) => !v);
                          }}
                        >
                          <LinearGradient
                            colors={rememberMe ? ['#6366F1', '#4F46E5'] : ['#F1F5F9', '#F1F5F9']}
                            style={[styles.checkbox, rememberMe && styles.checkboxOn]}
                          >
                            {rememberMe ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                          </LinearGradient>
                          <Text style={styles.rememberLabel}>Remember me</Text>
                        </Pressable>
                        <Pressable onPress={handleForgotPassword} hitSlop={8}>
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
                      onPress={handleCreateAccount}
                    >
                      <Ionicons name="person-add-outline" size={18} color={PALETTE.accent} />
                      <Text style={styles.registerBtnText}>Create a free account</Text>
                    </Pressable>

                  </View>
                </LinearGradient>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  orbLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orbShell: { position: 'absolute' },
  orb: { flex: 1, borderRadius: 9999, opacity: 0.55 },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  brandLogoInner: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  cardBorder: {
    borderRadius: 28,
    padding: 1.5,
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 26.5,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    overflow: 'hidden',
  },
  cardTop: {
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: FONT.base,
    color: '#64748B',
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
    color: '#334155',
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    borderColor: '#CBD5E1',
  },
  checkboxOn: {
    borderColor: 'transparent',
  },
  rememberLabel: {
    fontSize: FONT.base,
    color: '#475569',
    fontWeight: FONT.medium,
  },
  forgotLink: {
    fontSize: FONT.base,
    color: PALETTE.accent,
    fontWeight: FONT.bold,
  },
  signInWrap: {
    borderRadius: RADIUS.lg + 2,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: FONT.sm,
    color: '#94A3B8',
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
    borderColor: '#E0E7FF',
    backgroundColor: '#EEF2FF',
  },
  registerBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.bold,
    color: PALETTE.accent,
  },
});
