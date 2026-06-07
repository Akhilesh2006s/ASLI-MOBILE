import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../src/theme';

const WEB = {
  purple: '#9333EA',
  purpleLight: '#A855F7',
  blue: '#2563EB',
  blue600: '#2563EB',
  orange: '#F97316',
  orange500: '#F97316',
  green: '#16A34A',
  teal: '#14B8A6',
  sky: '#0EA5E9',
  teal500: '#14B8A6',
  cyan600: '#0891B2',
};

const FEATURES = [
  {
    icon: 'bulb' as const,
    color: '#A855F7',
    title: 'AI Tutor 24/7',
    description:
      'Get instant answers, step-by-step explanations, and personalized guidance from our intelligent AI assistant.',
    highlighted: false,
  },
  {
    icon: 'videocam' as const,
    color: '#3B82F6',
    title: 'Interactive Videos',
    description:
      'Engaging lectures with animations, quizzes, and real-world examples in multiple languages.',
    highlighted: false,
  },
  {
    icon: 'document-text' as const,
    color: '#F97316',
    title: 'Smart Notes & Maps',
    description:
      'Auto-generated summaries, visual mind maps, and voice-enabled Q&A for efficient revision.',
    highlighted: true,
  },
  {
    icon: 'locate' as const,
    color: '#22C55E',
    title: 'Adaptive Tests',
    description:
      'Board-aligned exams with instant AI grading, detailed feedback, and difficulty adjustment.',
    highlighted: false,
  },
  {
    icon: 'people' as const,
    color: '#3B82F6',
    title: 'Teacher Connect',
    description:
      'Real-time doubt resolution, live classes, and interactive whiteboards with expert teachers.',
    highlighted: false,
  },
  {
    icon: 'flash' as const,
    color: '#F97316',
    title: 'Gamification',
    description:
      'Earn badges, climb leaderboards, maintain streaks, and unlock rewards as you progress!',
    highlighted: false,
  },
];

const HERO_STATS = [
  { display: '10K+', color: WEB.purple, label: 'Active Students' },
  { display: '500+', color: WEB.orange500, label: 'Video Lectures' },
  { display: '95%', color: WEB.green, label: 'Success Rate' },
];

const PLATFORM_STATS = [
  { value: '10,000+', label: 'Active Students' },
  { value: '500+', label: 'Expert Teachers' },
  { value: '50+', label: 'Partner Schools' },
  { value: '95%', label: 'Success Rate' },
];

const PRICING_PLANS = [
  {
    id: 'free',
    title: 'Free Explorer',
    subtitle: 'Perfect for trying out the platform',
    price: '₹0',
    period: 'forever',
    popular: false,
    cta: 'Start Free',
    features: [
      'Access to basic video lectures',
      'Limited AI tutor queries (10/day)',
      'Basic practice tests',
      'Community forum access',
      'With ads and watermarks',
    ],
  },
  {
    id: 'premium',
    title: 'Premium Plan',
    subtitle: 'Most popular for serious learners',
    price: '₹249',
    period: '/month',
    popular: true,
    cta: 'Start 7-Day Free Trial',
    features: [
      'Unlimited AI tutor access',
      'All video lectures & animations',
      'Adaptive tests with AI grading',
      'Smart notes & mind maps',
      'Progress analytics',
      'Download offline content',
      'Priority support',
      'No ads or watermarks',
    ],
  },
];

const FLOATING_BLOBS: {
  size: number;
  left: DimensionValue;
  top: DimensionValue;
  colors: [string, string];
  delay: number;
}[] = [
  { size: 200, left: '-20%', top: '-5%', colors: ['#EEF2FF', '#E0E7FF'], delay: 0 },
  { size: 160, left: '70%', top: '8%', colors: ['#ECFEFF', '#CFFAFE'], delay: 1 },
  { size: 140, left: '5%', top: '42%', colors: ['#FAF5FF', '#F3E8FF'], delay: 2 },
  { size: 120, left: '75%', top: '55%', colors: ['#FFF7ED', '#FFEDD5'], delay: 3 },
];

function DotGrid() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height * 2}>
        <Defs>
          <Pattern id="homeGrid" width={28} height={28} patternUnits="userSpaceOnUse">
            <Line x1={28} y1={0} x2={28} y2={28} stroke="rgba(15,23,42,0.04)" strokeWidth={0.75} />
            <Line x1={0} y1={28} x2={28} y2={28} stroke="rgba(15,23,42,0.04)" strokeWidth={0.75} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height * 2} fill="url(#homeGrid)" />
      </Svg>
    </View>
  );
}

function FloatingBlob({
  size,
  left,
  top,
  colors,
  delay,
}: (typeof FLOATING_BLOBS)[number]) {
  const drift = useSharedValue(0);

  useEffect(() => {
    const duration = 8000 + delay * 1200;
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [delay, drift]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [0, 18]) },
      { translateY: interpolate(drift.value, [0, 1], [0, 14]) },
      { scale: interpolate(drift.value, [0, 1], [1, 1.06]) },
    ],
  }));

  return (
    <Animated.View
      style={[styles.blobShell, { width: size, height: size, left, top }, style]}
      pointerEvents="none"
    >
      <LinearGradient colors={colors} style={styles.blob} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

function ShimmerButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  gradientColors = [WEB.purple, WEB.purpleLight] as [string, string],
  fullWidth = false,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'blue';
  gradientColors?: [string, string] | [string, string, string];
  fullWidth?: boolean;
}) {
  const shimmer = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-180, 280]) }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === 'primary' || variant === 'blue';
  const colors =
    variant === 'blue'
      ? (['#2563EB', '#3B82F6'] as [string, string])
      : gradientColors;

  return (
    <Animated.View style={[btnStyle, fullWidth && styles.fullWidthBtn]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        style={({ pressed }) => [
          isPrimary ? styles.primaryButton : styles.secondaryButton,
          fullWidth && styles.fullWidthBtn,
          pressed && { opacity: 0.92 },
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={colors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.primaryGradient, fullWidth && styles.fullWidthBtn]}
          >
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
            <Text style={styles.primaryButtonText}>{label}</Text>
          </LinearGradient>
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color={COLORS.textSecondary} /> : null}
            <Text style={styles.secondaryButtonText}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(550).delay(120 + index * 70).springify()}
      style={cardStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 16, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 300 });
        }}
      >
        <View style={[styles.featureCard, feature.highlighted && styles.featureCardHighlighted]}>
          <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
            <Ionicons name={feature.icon} size={22} color="#fff" />
          </View>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PricingCard({
  plan,
  index,
  onPress,
}: {
  plan: (typeof PRICING_PLANS)[number];
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(550).delay(120 + index * 100)} style={styles.pricingCardWrap}>
      {plan.popular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      ) : null}
      <View style={[styles.pricingCard, plan.popular && styles.pricingCardPopular]}>
        <Text style={styles.pricingTitle}>{plan.title}</Text>
        <Text style={styles.pricingSubtitle}>{plan.subtitle}</Text>
        <Text style={styles.pricingPrice}>{plan.price}</Text>
        <Text style={styles.pricingPeriod}>{plan.period}</Text>
        <View style={styles.pricingFeatures}>
          {plan.features.map((item) => (
            <View key={item} style={styles.pricingFeatureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={styles.pricingFeatureText}>{item}</Text>
            </View>
          ))}
        </View>
        <ShimmerButton label={plan.cta} onPress={onPress} variant="blue" fullWidth />
      </View>
    </Animated.View>
  );
}

function HomeNavbar({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const [menuOpen, setMenuOpen] = useState(false);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [glow]);

  const brandGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.85, 1]),
    textShadowRadius: interpolate(glow.value, [0, 1], [0, 8]),
  }));

  const handleLogin = () => {
    setMenuOpen(false);
    onLogin();
  };

  const handleRegister = () => {
    setMenuOpen(false);
    onRegister();
  };

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.navbar}>
      <View style={styles.navbarInner}>
        <Pressable style={styles.logoContainer} accessibilityRole="header">
          <View style={styles.logoFrame}>
            <Image source={require('../image.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Animated.Text
            style={[styles.brandName, compact && styles.brandNameCompact, brandGlowStyle]}
            numberOfLines={1}
          >
            ASLILEARN AI
          </Animated.Text>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => {
            Haptics.selectionAsync();
            setMenuOpen((prev) => !prev);
          }}
          accessibilityRole="button"
          accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={22} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      {menuOpen ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.menuDropdown}>
          <NavBarButton label="Login" variant="outline" onPress={handleLogin} compact={compact} fullWidth />
          <NavBarButton label="Get Started" variant="gradient" onPress={handleRegister} compact={compact} fullWidth />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function NavBarButton({
  label,
  variant,
  onPress,
  compact,
  fullWidth,
}: {
  label: string;
  variant: 'outline' | 'gradient';
  onPress: () => void;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidthBtn]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.94, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        style={({ pressed }) => [
          variant === 'outline' ? styles.navLoginBtn : styles.navStartBtnWrap,
          fullWidth && styles.fullWidthBtn,
          compact && (variant === 'outline' ? styles.navLoginBtnCompact : styles.navStartBtnWrapCompact),
          variant === 'outline' && pressed && styles.navLoginBtnPressed,
        ]}
      >
        {variant === 'gradient' ? (
          <LinearGradient
            colors={[WEB.sky, WEB.teal500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.navStartGradient,
              fullWidth && styles.fullWidthBtn,
              compact && styles.navStartGradientCompact,
            ]}
          >
            <Text style={[styles.navStartText, compact && styles.navBtnTextCompact]}>{label}</Text>
          </LinearGradient>
        ) : (
          <Text style={[styles.navLoginText, compact && styles.navBtnTextCompact]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function OpeningSplash({ onFinish }: { onFinish: () => void }) {
  const ring = useSharedValue(0.85);
  const ring2 = useSharedValue(0.7);
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 500 });
    ring.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 1200, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
    ring2.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.28, { duration: 1400, easing: Easing.out(Easing.ease) }),
          withTiming(0.7, { duration: 1400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    const timer = setTimeout(onFinish, 1200);
    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, onFinish, ring, ring2]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: interpolate(ring.value, [0.85, 1.18], [0.45, 0]),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: interpolate(ring2.value, [0.7, 1.28], [0.3, 0]),
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <Animated.View exiting={FadeOut.duration(350)} style={styles.splashOverlay}>
      <Animated.View style={[styles.splashRing, ringStyle]} />
      <Animated.View style={[styles.splashRing, styles.splashRingOuter, ring2Style]} />
      <Animated.View style={logoStyle}>
        <Image source={require('../image.png')} style={styles.splashLogoPlain} resizeMode="contain" />
      </Animated.View>
      <Animated.Text entering={FadeInUp.duration(450).delay(250)} style={styles.splashBrand}>
        ASLILEARN AI
      </Animated.Text>
      <Animated.Text entering={FadeInUp.duration(450).delay(380)} style={styles.splashTagline}>
        Learn Smarter. Achieve Faster.
      </Animated.Text>
    </Animated.View>
  );
}

export default function HomePage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const featuresOffset = useRef(0);
  const [showSplash, setShowSplash] = useState(true);
  const { isLoading } = useAuth();

  const scrollToFeatures = () => {
    scrollRef.current?.scrollTo({ y: featuresOffset.current, animated: true });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WEB.blue600} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.bgLayer} pointerEvents="none">
        <DotGrid />
        {FLOATING_BLOBS.map((blob, i) => (
          <FloatingBlob key={i} {...blob} />
        ))}
      </View>

      {showSplash ? <OpeningSplash onFinish={() => setShowSplash(false)} /> : null}

      <HomeNavbar
        onLogin={() => router.push('/auth/login')}
        onRegister={() => router.push('/auth/register')}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.flexScroll}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Animated.View entering={FadeInDown.duration(550).delay(80)} style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={WEB.blue600} />
            <Text style={styles.badgeText}>AI-Powered Learning Platform</Text>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(600).delay(160)} style={styles.heroTitle}>
            Learn Smarter{'\n'}Achieve Faster!
          </Animated.Text>

          <Animated.Text entering={FadeInDown.duration(600).delay(240)} style={styles.heroDescription}>
            Master CBSE, ICSE, State Boards, NEET, JEE & more with personalized AI tutoring,
            interactive videos, and gamified learning. Join 100,000+ students transforming their education!
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(600).delay(320)} style={styles.ctaButtons}>
            <ShimmerButton
              label="Start Learning Free"
              icon="flash"
              gradientColors={[WEB.purple, WEB.purpleLight]}
              onPress={() => router.push('/auth/login')}
            />
            <ShimmerButton
              label="View Demo"
              icon="trophy"
              variant="secondary"
              onPress={scrollToFeatures}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.heroStatsRow}>
            {HERO_STATS.map((stat) => (
              <View key={stat.label} style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: stat.color }]}>{stat.display}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Features */}
        <View
          style={styles.featuresSection}
          onLayout={(e) => {
            featuresOffset.current = e.nativeEvent.layout.y;
          }}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.sectionHeader}>
            <View style={styles.sectionBadgeOrange}>
              <Ionicons name="sparkles" size={14} color={WEB.orange} />
              <Text style={styles.sectionBadgeOrangeText}>Powerful Features</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Everything You Need to <Text style={styles.sectionTitleAccent}>Excel</Text>
            </Text>
            <Text style={styles.sectionDescription}>
              Comprehensive tools designed to make learning engaging, effective, and fun for students of all levels.
            </Text>
          </Animated.View>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </View>
        </View>

        {/* Platform Stats */}
        <View style={styles.platformStatsSection}>
          <View style={styles.platformStatsGrid}>
            {PLATFORM_STATS.map((stat, index) => (
              <Animated.View
                key={stat.label}
                entering={FadeInUp.duration(500).delay(index * 80)}
                style={styles.platformStatItem}
              >
                <Text style={styles.platformStatValue}>{stat.value}</Text>
                <Text style={styles.platformStatLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Student Success Stories */}
        <View style={styles.successSection}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.sectionHeader}>
            <View style={styles.quoteBadge}>
              <Text style={styles.quoteMark}>"</Text>
              <Text style={styles.quoteBadgeText}>Student Success Stories</Text>
              <Text style={styles.quoteMark}>"</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Loved by <Text style={styles.tealText}>10,000+</Text>{' '}
              <Text style={styles.purpleText}>Students</Text>
            </Text>
          </Animated.View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.sectionHeader}>
            <View style={styles.sectionBadgeOrange}>
              <Ionicons name="ribbon" size={14} color={WEB.orange} />
              <Text style={styles.sectionBadgeOrangeText}>Flexible Pricing</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Choose Your <Text style={styles.purpleText}>Learning Plan</Text>
            </Text>
            <Text style={styles.sectionDescription}>
              Start with our free plan or unlock unlimited potential with premium features. No hidden charges, cancel anytime.
            </Text>
          </Animated.View>

          {PRICING_PLANS.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              index={index}
              onPress={() => router.push('/auth/login')}
            />
          ))}

          <Animated.View entering={FadeInUp.duration(450)} style={styles.schoolDiscount}>
            <Ionicons name="school" size={16} color={WEB.blue600} />
            <Text style={styles.schoolDiscountText}>
              Special discounts available for schools and institutions. Contact us for bulk pricing.
            </Text>
          </Animated.View>
        </View>

        {/* Final CTA */}
        <Animated.View entering={FadeInUp.duration(550)} style={styles.finalCtaSection}>
          <Text style={styles.finalCtaTitle}>Ready to Transform Your Learning Journey?</Text>
          <Text style={styles.finalCtaDescription}>
            Join thousands of students achieving their academic dreams with AI-powered education
          </Text>
          <View style={styles.finalCtaButtons}>
            <ShimmerButton
              label="Start Free Trial Today"
              variant="blue"
              gradientColors={[WEB.sky, WEB.cyan600]}
              onPress={() => router.push('/auth/login')}
              fullWidth
            />
            <ShimmerButton
              label="Explore Demo"
              variant="secondary"
              onPress={scrollToFeatures}
              fullWidth
            />
          </View>
        </Animated.View>

        {/* Footer */}
        <LinearGradient colors={['#581C87', '#6B21A8']} style={styles.footer}>
          <Text style={styles.footerBrand}>AsliLearn</Text>
          <Text style={styles.footerTagline}>
            Empowering Indian students with world-class AI-driven education
          </Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerDivider}>|</Text>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerDivider}>|</Text>
            <Text style={styles.footerLink}>Contact Us</Text>
          </View>
          <Text style={styles.footerCopy}>© 2025 AsliLearn. All rights reserved.</Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  blobShell: { position: 'absolute' },
  blob: { flex: 1, borderRadius: 9999, opacity: 0.85 },
  flexScroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  navbar: {
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  navbarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  logoFrame: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.12)',
    ...SHADOW.sm,
  },
  logoImage: { width: 30, height: 30 },
  brandName: {
    fontSize: 17,
    fontWeight: FONT.extrabold,
    color: WEB.blue600,
    letterSpacing: 0.4,
    flexShrink: 1,
    textShadowColor: 'rgba(37,99,235,0.35)',
    textShadowOffset: { width: 0, height: 0 },
  },
  brandNameCompact: { fontSize: 14 },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#FFFFFF',
    gap: SPACING.sm,
    ...SHADOW.md,
  },
  navLoginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: WEB.blue600,
    backgroundColor: '#FFFFFF',
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLoginBtnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
  },
  navLoginBtnPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1D4ED8',
  },
  navLoginText: { color: WEB.blue600, fontWeight: FONT.semibold, fontSize: FONT.sm },
  navStartBtnWrap: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  navStartBtnWrapCompact: {
    ...SHADOW.sm,
  },
  navStartGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navStartGradientCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
  },
  navStartText: { color: '#FFFFFF', fontWeight: FONT.semibold, fontSize: FONT.sm },
  navBtnTextCompact: { fontSize: FONT.xs },
  heroSection: { padding: SPACING.lg, paddingTop: SPACING.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: SPACING.sm,
  },
  badgeText: { fontSize: FONT.xs, fontWeight: FONT.semibold, color: '#1D4ED8' },
  heroTitle: {
    fontSize: 28,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    lineHeight: 36,
    marginBottom: SPACING.sm,
  },
  heroDescription: {
    fontSize: FONT.base,
    color: '#374151',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  ctaButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fullWidthBtn: { width: '100%' },
  primaryButton: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.md },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    overflow: 'hidden',
  },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 80 },
  primaryButtonText: { color: '#FFFFFF', fontSize: FONT.sm, fontWeight: FONT.semibold },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#374151', fontSize: FONT.sm, fontWeight: FONT.semibold },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: FONT.xxl, fontWeight: FONT.extrabold },
  heroStatLabel: { fontSize: 10, color: '#4B5563', marginTop: 4, textAlign: 'center' },
  featuresSection: { padding: SPACING.lg, backgroundColor: '#FFFFFF' },
  sectionHeader: { alignItems: 'center', marginBottom: SPACING.lg, gap: SPACING.sm },
  sectionBadgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sectionBadgeOrangeText: { fontSize: FONT.xs, fontWeight: FONT.semibold, color: '#C2410C' },
  sectionTitle: {
    fontSize: 24,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionTitleAccent: { color: WEB.orange500 },
  tealText: { color: '#14B8A6' },
  purpleText: { color: WEB.purple },
  sectionDescription: {
    fontSize: FONT.base,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
    lineHeight: 22,
  },
  featuresGrid: { gap: SPACING.md },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: SPACING.sm,
  },
  featureCardHighlighted: { borderColor: '#BFDBFE', ...SHADOW.sm },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: { fontSize: FONT.lg, fontWeight: FONT.extrabold, color: COLORS.text },
  featureDescription: { fontSize: FONT.sm, color: '#4B5563', lineHeight: 20 },
  platformStatsSection: { padding: SPACING.lg, backgroundColor: '#FFFFFF' },
  platformStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  platformStatItem: { width: '47%', alignItems: 'center', paddingVertical: SPACING.sm },
  platformStatValue: {
    fontSize: FONT.h1,
    fontWeight: FONT.extrabold,
    color: WEB.blue600,
  },
  platformStatLabel: {
    fontSize: FONT.sm,
    color: '#374151',
    fontWeight: FONT.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  successSection: { padding: SPACING.lg, backgroundColor: '#FFFFFF' },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  quoteMark: { fontSize: FONT.xxl, color: WEB.orange, lineHeight: 24 },
  quoteBadgeText: { fontSize: FONT.xs, fontWeight: FONT.semibold, color: '#C2410C' },
  pricingSection: { padding: SPACING.lg, backgroundColor: '#FFFFFF' },
  pricingCardWrap: { marginBottom: SPACING.lg, position: 'relative', alignItems: 'center' },
  popularBadge: {
    position: 'absolute',
    top: -12,
    zIndex: 2,
    backgroundColor: WEB.orange500,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  popularBadgeText: { color: '#FFFFFF', fontSize: FONT.xs, fontWeight: FONT.semibold },
  pricingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    gap: SPACING.xs,
  },
  pricingCardPopular: { borderColor: '#99F6E4', ...SHADOW.lg },
  pricingTitle: { fontSize: FONT.xxl, fontWeight: FONT.extrabold, color: COLORS.text, textAlign: 'center' },
  pricingSubtitle: { fontSize: FONT.sm, color: '#4B5563', textAlign: 'center' },
  pricingPrice: {
    fontSize: 32,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  pricingPeriod: { fontSize: FONT.sm, color: '#4B5563', textAlign: 'center', marginBottom: SPACING.md },
  pricingFeatures: { gap: SPACING.sm, marginBottom: SPACING.lg },
  pricingFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  pricingFeatureText: { flex: 1, fontSize: FONT.sm, color: '#374151', lineHeight: 20 },
  schoolDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: SPACING.sm,
  },
  schoolDiscountText: { flex: 1, fontSize: FONT.xs, color: '#1D4ED8', lineHeight: 18 },
  finalCtaSection: {
    padding: SPACING.xxl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: SPACING.md,
  },
  finalCtaTitle: {
    fontSize: 26,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    textAlign: 'center',
  },
  finalCtaDescription: {
    fontSize: FONT.lg,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  finalCtaButtons: { width: '100%', gap: SPACING.sm, marginTop: SPACING.sm },
  footer: {
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  footerBrand: { fontSize: FONT.xxl, fontWeight: FONT.extrabold, color: '#FFFFFF' },
  footerTagline: { fontSize: FONT.lg, color: '#E9D5FF', textAlign: 'center' },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm },
  footerLink: { fontSize: FONT.sm, color: '#E9D5FF' },
  footerDivider: { color: '#A855F7' },
  footerCopy: { fontSize: FONT.sm, color: '#C4B5FD', marginTop: SPACING.md },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: { marginTop: SPACING.md, fontSize: FONT.lg, color: COLORS.textMuted },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.35)',
  },
  splashRingOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  splashLogoPlain: { width: 88, height: 88 },
  splashBrand: {
    marginTop: SPACING.lg,
    fontSize: FONT.xxl,
    fontWeight: FONT.extrabold,
    color: WEB.blue600,
    letterSpacing: 0.5,
  },
  splashTagline: { marginTop: SPACING.xs, fontSize: FONT.sm, color: COLORS.textMuted },
});
