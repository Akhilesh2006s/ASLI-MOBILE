import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uiTheme } from './theme';

type Props = {
  title: string;
  onBack?: () => void;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
};

export default function AppHeader({ title, onBack, rightActionIcon, onRightAction }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack} disabled={!onBack}>
        {onBack ? <Ionicons name="arrow-back" size={20} color={uiTheme.colors.text} /> : null}
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity style={styles.iconButton} onPress={onRightAction} disabled={!onRightAction}>
        {rightActionIcon && onRightAction ? (
          <Ionicons name={rightActionIcon} size={20} color={uiTheme.colors.text} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: uiTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: uiTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: uiTheme.colors.text,
  },
});
