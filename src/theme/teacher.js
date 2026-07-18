"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glassCard = exports.TEACHER_SUBJECT_BADGES = exports.PERFORMANCE_COLORS = exports.TEACHER_TYPO = exports.TEACHER_RADIUS = exports.TEACHER_SPACING = exports.TEACHER = void 0;
exports.teacherGreeting = teacherGreeting;
exports.performanceBadge = performanceBadge;
exports.teacherSubjectBadgePalette = teacherSubjectBadgePalette;
/** Clean Classroom — light teacher portal theme */
exports.TEACHER = {
    bg: '#FFFFFF',
    cardBg: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#F1F5F9',
    surfaceBorder: '#E2E8F0',
    surfaceHover: '#EEF2FF',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    primaryLight: '#818CF8',
    secondary: '#F97316',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    headerGradient: ['#7DD3FC', '#BAE6FD', '#DBEAFE'],
    heroGradient: ['#4338CA', '#4F46E5', '#6366F1'],
    cardGradient: ['#EEF2FF', '#FFFFFF'],
    tabBarBg: 'rgba(255,255,255,0.98)',
    tabBarBorder: '#E2E8F0',
    navInactive: '#94A3B8',
    navActiveBg: 'rgba(99,102,241,0.12)',
    navActiveText: '#4F46E5',
    fabGradient: ['#6366F1', '#4F46E5'],
    goldAccent: '#F59E0B',
    shadow: {
        sm: {
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.10,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#64748B',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 6,
        },
    },
};
exports.TEACHER_SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    section: 28,
};
exports.TEACHER_RADIUS = {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    card: 24,
    full: 9999,
    pill: 9999,
    chip: 16,
};
exports.TEACHER_TYPO = {
    hero: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
    section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    body: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
    caption: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    number: { fontSize: 28, fontWeight: '900', letterSpacing: -1.0 },
};
function teacherGreeting() {
    const h = new Date().getHours();
    if (h < 12)
        return 'Good Morning';
    if (h < 17)
        return 'Good Afternoon';
    return 'Good Evening';
}
function performanceBadge(score) {
    if (score >= 75)
        return 'good';
    if (score >= 50)
        return 'average';
    return 'at-risk';
}
exports.PERFORMANCE_COLORS = {
    good: exports.TEACHER.success,
    average: exports.TEACHER.warning,
    'at-risk': exports.TEACHER.danger,
};
/** Teacher subject pills — vivid indigo / violet / amber (not student green). */
exports.TEACHER_SUBJECT_BADGES = [
    { bg: '#C7D2FE', text: '#312E81', border: '#6366F1' },
    { bg: '#FDBA74', text: '#7C2D12', border: '#EA580C' },
    { bg: '#DDD6FE', text: '#5B21B6', border: '#8B5CF6' },
    { bg: '#93C5FD', text: '#1E3A8A', border: '#3B82F6' },
    { bg: '#F9A8D4', text: '#831843', border: '#EC4899' },
    { bg: '#67E8F9', text: '#155E75', border: '#06B6D4' },
];
/** Map common subjects to consistent teacher-theme colors. */
function teacherSubjectBadgePalette(subjectLabel, index = 0) {
    const n = subjectLabel.toLowerCase();
    if (n.includes('physics'))
        return exports.TEACHER_SUBJECT_BADGES[0];
    if (n.includes('chem'))
        return exports.TEACHER_SUBJECT_BADGES[1];
    if (n.includes('math'))
        return exports.TEACHER_SUBJECT_BADGES[3];
    if (n.includes('bio'))
        return exports.TEACHER_SUBJECT_BADGES[5];
    if (n.includes('english'))
        return exports.TEACHER_SUBJECT_BADGES[4];
    return exports.TEACHER_SUBJECT_BADGES[index % exports.TEACHER_SUBJECT_BADGES.length];
}
/** Card style for light surfaces */
exports.glassCard = {
    backgroundColor: exports.TEACHER.cardBg,
    borderWidth: 1,
    borderColor: exports.TEACHER.surfaceBorder,
    borderRadius: exports.TEACHER_RADIUS.lg,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
};
