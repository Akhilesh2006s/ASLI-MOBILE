"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBJECT_COLORS = exports.STUDENT_TYPO = exports.STUDENT_ANIMATION = exports.STUDENT_RADIUS = exports.STUDENT_SPACING = exports.STUDENT_SHADOW = exports.STUDENT = void 0;
exports.studentGreeting = studentGreeting;
/** Student theme — premium scholar UI */
exports.STUDENT = {
    bg: '#f0fdf4',
    bgAccent: '#ecfdf5',
    surface: '#ffffff',
    surfaceGlass: 'rgba(255,255,255,0.72)',
    surfaceDark: '#0f172a',
    surfaceElevated: '#ffffff',
    surfaceBorder: '#e2e8f0',
    surfaceHover: '#f8fafc',
    primary: '#10b981',
    primaryDark: '#047857',
    primaryLight: '#34d399',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#10b981',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textOnPrimary: '#ffffff',
    headerGradient: ['#006B44', '#00945C', '#00A669'],
    heroGradient: ['#006B44', '#008756', '#00A669'],
    cardGradient: ['#ecfdf5', '#f0fdf4'],
    tabBarBg: 'rgba(255,255,255,0.92)',
    tabBarBorder: 'rgba(16,185,129,0.20)',
    navInactive: '#94a3b8',
    navActiveBg: '#d1fae5',
    navActiveText: '#047857',
    statGradients: {
        today: ['#f97316', '#fb923c'],
        study: ['#2563eb', '#3b82f6'],
        week: ['#0d9488', '#14b8a6'],
        efficiency: ['#7c3aed', '#8b5cf6'],
        rank: ['#2563eb', '#3b82f6'],
        accuracy: ['#16a34a', '#22c55e'],
        questions: ['#d97706', '#f59e0b'],
    },
    shadow: {
        soft: {
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 8,
        },
        sm: {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
        },
        md: {
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 8,
        },
        lg: {
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 12,
        },
    },
};
exports.STUDENT_SHADOW = exports.STUDENT.shadow;
exports.STUDENT_SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};
exports.STUDENT_RADIUS = {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 28,
    card: 24,
    inner: 16,
    full: 9999,
};
exports.STUDENT_ANIMATION = {
    fast: 180,
    normal: 280,
    slow: 420,
};
exports.STUDENT_TYPO = {
    hero: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
    section: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
    body: { fontSize: 15, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '600' },
    label: { fontSize: 11, fontWeight: '700' },
};
exports.SUBJECT_COLORS = [
    '#2563eb',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#06b6d4',
];
function studentGreeting() {
    const h = new Date().getHours();
    if (h < 12)
        return 'Good Morning';
    if (h < 17)
        return 'Good Afternoon';
    return 'Good Evening';
}
