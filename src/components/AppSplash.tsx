import { useEffect } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
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

export const SPLASH_DURATION_MS = 3500;
const EXIT_DURATION_MS = 450;
/** Max scale from breathe + exit animations — size budget must include this. */
const MAX_LOGO_SCALE = 1.08;
const BRAND_LOGO = require('../../assets/logo.png');

type AppSplashProps = {
  exiting?: boolean;
};

function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.75, 1.45]) }],
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0.55, 0]),
    borderColor: color,
  }));

  return <Animated.View style={[styles.ring, ringStyle]} />;
}

export function AppSplash({ exiting = false }: AppSplashProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const availableWidth = width - insets.left - insets.right;
  const availableHeight = height - insets.top - insets.bottom;
  const logoMeta = Image.resolveAssetSource(BRAND_LOGO);
  const logoAspect = logoMeta.width / logoMeta.height;
  const logoWidth = Math.min(availableWidth * 0.82, (availableHeight * 0.62) / MAX_LOGO_SCALE);
  const logoHeight = logoWidth / logoAspect;
  const stageWidth = logoWidth * MAX_LOGO_SCALE;
  const stageHeight = logoHeight * MAX_LOGO_SCALE;

  const logoScale = useSharedValue(0.45);
  const logoOpacity = useSharedValue(0);
  const breathe = useSharedValue(1);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 11, stiffness: 95, mass: 0.9 });
    logoOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });

    breathe.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [breathe, logoOpacity, logoScale]);

  useEffect(() => {
    if (!exiting) return;

    breathe.value = withTiming(1, { duration: 200 });
    logoScale.value = withTiming(MAX_LOGO_SCALE, {
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    containerOpacity.value = withTiming(0, { duration: EXIT_DURATION_MS, easing: Easing.in(Easing.cubic) });
  }, [breathe, containerOpacity, exiting, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value * breathe.value }],
    opacity: logoOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const ringBase = Math.min(logoWidth, logoHeight) * 0.62;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <Animated.View exiting={FadeOut.duration(EXIT_DURATION_MS)} style={[styles.container, containerStyle]}>
        <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
          <PulseRing size={ringBase} delay={0} color="rgba(37,99,235,0.45)" />
          <PulseRing size={ringBase} delay={600} color="rgba(20,184,166,0.4)" />
          <PulseRing size={ringBase} delay={1200} color="rgba(147,51,234,0.35)" />

          <Animated.View style={[styles.logoWrap, { width: logoWidth, height: logoHeight }, logoStyle]}>
            <Image
              source={BRAND_LOGO}
              style={{ width: logoWidth, height: logoHeight }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

export const SPLASH_EXIT_DURATION_MS = EXIT_DURATION_MS;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
