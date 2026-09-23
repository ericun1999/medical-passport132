import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export default function TabBar({ state, descriptors, navigation, insets }) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const focused = state.index === index
        const tint = focused ? colors.blue700 : colors.slate400
        const badge = options.tabBarBadge

        function handlePress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel || options.tabBarLabel}
            style={styles.tab}
          >
            <View style={[styles.pill, focused && styles.pillOn]}>
              {options.tabBarIcon?.({ focused, color: tint, size: 20 })}
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: tint }, focused && styles.labelOn]}>
              {options.tabBarLabel || route.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: colors.slate900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  pill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: '#dbeafe' },
  label: { fontSize: 11, fontWeight: '600' },
  labelOn: { fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.red500,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
})
